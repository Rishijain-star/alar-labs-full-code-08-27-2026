const jose = require("jose"); // new: for JWE support
const crypto = require("crypto"); // built-in — no install needed
const { v4: uuid } = require("uuid");
const config = require("../config");
const { generateToken } = require("./crypto");
const logger = require("../lib/logger");
const { BlacklistedToken } = require("../models");
const redisManager = require("../lib/redisManager");
const { ensureKeys } = require("./keys");

// ─── RSA Keys for JWE ────────────────────────────────────────────────────────
const { privateKey, publicKey } = ensureKeys();

// ─── Redis: lazy-loaded to avoid circular-dependency at startup ───────────────

async function _getRedis() {
  try {
    return await redisManager.getClientSafe();
  } catch {
    return null;
  }
}

// Redis key prefix — matches CACHE_PREFIX.TOKEN_BLACKLIST in roleService
const REDIS_BLACKLIST_PREFIX = "blacklist:jti:";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of a string.
 * Used as the `tokenHash` stored in the DB (keeps sensitive material out of DB).
 * @param {string} value
 * @returns {string} 64-char hex string
 */
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Return the number of seconds remaining until a JWE expires.
 * Returns 0 if already expired or undecodable.
 *
 * @param {string} token - Raw JWE string
 * @returns {Promise<number>} Seconds ≥ 0
 */
async function getTokenRemainingTTL(token) {
  try {
    const decoded = await verifyAccessToken(token);
    if (!decoded?.exp) return 0;
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOKEN CREATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a short-lived access token (JWE).
 * Encrypted with the RSA public key — only the server with the private key can read it.
 *
 * Every token now carries a `jti` (JWT ID) — a UUID4 that uniquely identifies
 * this specific token issuance. The jti is the primary key used for blacklisting.
 *
 * @param {string} user_id           - User identifier
 * @param {Object} additionalClaims - Extra claims merged into the JWT payload
 * @returns {string} Encrypted JWE access token
 */
async function createAccessToken(user_id, additionalClaims = {}) {
  if (!user_id) throw new Error("user_id is required to create access token");

  try {
    // 1. Load the RSA public key
    const pubKey = await jose.importSPKI(publicKey, 'RSA-OAEP-256');

    // 2. Prepare the payload
    const payload = {
      user_id,
      type: "access",
      jti: uuid(),
      iat: Math.floor(Date.now() / 1000),
      iss: "auth-service",
      aud: "api",
      ...additionalClaims,
    };

    // 3. Set expiration
    const expiryStr = config.jwt.accessExpiry || '15m';
    let expirySecs;
    if (typeof expiryStr === 'string') {
      const value = parseInt(expiryStr);
      if (expiryStr.endsWith('m')) expirySecs = value * 60;
      else if (expiryStr.endsWith('h')) expirySecs = value * 3600;
      else if (expiryStr.endsWith('d')) expirySecs = value * 86400;
      else expirySecs = value; // default to seconds
    } else {
      expirySecs = expiryStr;
    }
    payload.exp = payload.iat + expirySecs;

    // 4. Encrypt to create a JWE
    return await new jose.CompactEncrypt(
      new TextEncoder().encode(JSON.stringify(payload))
    )
      .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
      .encrypt(pubKey);

  } catch (error) {
    logger.error("Failed to create access token (JWE):", error);
    throw new Error("Token generation failed");
  }
}

/**
 * Create a cryptographically secure opaque refresh token.
 * @returns {string}
 */
function createRefreshToken() {
  return generateToken(32);
}

/**
 * Create a unique session identifier.
 * @returns {string}
 */
function createSessionId() {
  return uuid();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOKEN VERIFICATION / DECODING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a JWE and return its decoded payload.
 * Decrypted with the RSA private key.
 * Throws on expiry, bad signature, or missing token.
 *
 * Returned payload shape: { userId, type, jti, iat, exp, ...additionalClaims }
 *
 * @param {string} token
 * @returns {Object} Decrypted JWT payload
 * @throws {Error}
 */
async function verifyAccessToken(token) {
  if (!token) throw new Error("Token is required");

  try {
    // 1. Load the RSA private key
    const privKey = await jose.importPKCS8(privateKey, 'RSA-OAEP-256');

    // 2. Decrypt the JWE
    const { plaintext } = await jose.compactDecrypt(token, privKey);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));

    // 3. Verify standard claims (exp, iss, aud)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("Token expired");
    }
    if (payload.iss !== "auth-service" || payload.aud !== "api") {
      throw new Error("Invalid token claims");
    }

    return payload;
  } catch (error) {
    if (error.message === "Token expired") throw error;
    logger.warn("JWE Decryption/Verification failed:", error.message);
    throw new Error("Invalid token");
  }
}

/**
 * Decode a JWT without verifying its signature.
 * For JWE, this is NOT possible without the private key.
 *
 * @param {string} token
 * @returns {Object|null}
 */
async function decodeToken(token) {
  try {
    // For JWE, decoding requires decryption.
    return await verifyAccessToken(token);
  } catch (error) {
    logger.warn("Failed to decode token:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DUAL-LAYER TOKEN BLACKLISTING  (Redis + DB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blacklist a token by its `jti` claim.
 *
 * Writes to BOTH layers simultaneously:
 *
 *   Layer 1 — Redis  (speed)
 *     Key:   blacklist:jti:<jti>
 *     Value: "1"
 *     TTL:   exact remaining token lifetime (auto-cleans when token would
 *            have expired anyway — zero wasted memory)
 *
 *   Layer 2 — DB via BlacklistedToken model  (persistence)
 *     tokenHash = SHA-256(jti)        → fits the existing unique tokenHash column
 *     token     = "jti:<jti>"         → human-readable sentinel (not the raw JWT)
 *     Uses your model's existing static blacklistToken() method.
 *
 * Both layers are non-fatal — a failure in one does not abort the other.
 *
 * @param {Object} params
 * @param {string}       params.jti          JWT ID claim from the token
 * @param {string}       params.user_id       Owner of the token
 * @param {number}       params.exp          Unix timestamp (seconds) when token expires
 * @param {string}       [params.reason]     e.g. "role_updated", "logout"
 * @param {string|null}  [params.revoked_by]  user_id of the admin triggering revocation
 * @param {string|null}  [params.ip_address]  Request IP for audit trail
 * @param {string|null}  [params.user_agent]  User-agent for audit trail
 * @returns {Promise<void>}
 */
async function blacklistJti({
  jti,
  user_id,
  exp,
  reason = null,
  revoked_by = null,
  ip_address = null,
  user_agent = null,
}) {
  if (!jti) {
    logger.warn("[blacklist] Called with no jti — skipping");
    return;
  }

  const expires_at = new Date(exp * 1000); // JWT exp is in seconds
  const ttl_secs = Math.max(0, exp - Math.floor(Date.now() / 1000));
  const token_hash = sha256(jti); // fits existing tokenHash column

  // ── Layer 1: Redis ───────────────────────────────────────────────────────
  try {
    const redis = await _getRedis();
    if (redis && ttl_secs > 0) {
      await redis.setEx(`${REDIS_BLACKLIST_PREFIX}${jti}`, ttl_secs, "1");
      logger.debug(`[blacklist:redis] jti=${jti} TTL=${ttl_secs}s`);
    }
  } catch (err) {
    // Non-fatal — DB layer still covers us
    logger.warn("[blacklist:redis] Write failed (non-critical):", err.message);
  }

  // ── Layer 2: DB (BlacklistedToken model) ─────────────────────────────────
  try {
    await BlacklistedToken.blacklistToken({
      token: `jti:${jti}`, // sentinel string — never exposes the raw JWT
      token_hash: token_hash, // SHA-256(jti) — fits unique column perfectly
      user_id: user_id,
      token_type: "access",
      reason,
      ip_address: ip_address,
      user_agent: user_agent,
      expires_at: expires_at,
      blacklisted_by: revoked_by || user_id,
    });
    logger.debug(
      `[blacklist:db] jti=${jti} hash=${token_hash.slice(0, 12)}… expires=${expires_at.toISOString()}`,
    );
  } catch (err) {
    // Non-fatal — Redis layer still covers us for the token's remaining lifetime
    logger.error("[blacklist:db] Write failed:", err.message);
  }
}

/**
 * Check whether a token's `jti` has been blacklisted.
 *
 * Lookup order  (fail-open on errors — a Redis/DB blip never locks users out):
 *
 *   1. Redis        → O(1), sub-millisecond.  Used on every request.
 *   2. DB fallback  → used when Redis is cold (restart, flush, new node).
 *                     On a DB hit the entry is re-warmed back into Redis so
 *                     the next check is fast again.
 *
 * ── How to use this in your auth middleware ──────────────────────────────────
 *
 *   const payload = verifyAccessToken(rawToken);   // throws if expired/invalid
 *   const revoked = await isJtiBlacklisted(payload.jti, payload.exp);
 *   if (revoked) {
 *       return res.status(401).json({ code: 'TOKEN_REVOKED', message: 'Please log in again.' });
 *   }
 *
 * @param {string} jti - The `jti` claim from the already-verified JWT payload
 * @param {number} exp - The `exp` claim (Unix seconds) — needed for Redis re-warm TTL
 * @returns {Promise<boolean>}
 */
async function isJtiBlacklisted(jti, exp) {
  if (!jti) return false;

  // ── 1. Redis fast path ───────────────────────────────────────────────────
  try {
    const redis = await _getRedis();
    if (redis) {
      const val = await redis.get(`${REDIS_BLACKLIST_PREFIX}${jti}`);
      if (val === "1") {
        logger.debug(`[blacklist:redis] HIT jti=${jti}`);
        return true;
      }
    }
  } catch (err) {
    // Fail-open
    logger.warn("[blacklist:redis] Read failed (fail-open):", err.message);
  }

  // ── 2. DB fallback ───────────────────────────────────────────────────────
  try {
    const tokenHash = sha256(jti);
    const isInDb = await BlacklistedToken.isBlacklisted(tokenHash);

    if (isInDb) {
      logger.debug(`[blacklist:db] HIT jti=${jti} — re-warming Redis`);

      // Re-warm Redis so subsequent requests are fast again
      try {
        const redis = await _getRedis();
        const ttlSecs = exp
          ? Math.max(0, exp - Math.floor(Date.now() / 1000))
          : 900;
        if (redis && ttlSecs > 0) {
          await redis.setEx(`${REDIS_BLACKLIST_PREFIX}${jti}`, ttlSecs, "1");
        }
      } catch (rewarmErr) {
        logger.warn(
          "[blacklist:redis] Re-warm failed (non-critical):",
          rewarmErr.message,
        );
      }

      return true;
    }
  } catch (err) {
    // Fail-open — a DB error should never lock out a legitimate user
    logger.warn("[blacklist:db] Read failed (fail-open):", err.message);
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Token creation
  createAccessToken,
  createRefreshToken,
  createSessionId,

  // Token reading
  verifyAccessToken,
  decodeToken,
  getTokenRemainingTTL,

  // Blacklisting (dual-layer: Redis + DB)
  blacklistJti,
  isJtiBlacklisted,

  // Internal helper — exported so roleService can hash jti if needed
  sha256,
};
