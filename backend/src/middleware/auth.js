const sessionService = require("../services/sessionService");
const rbacService = require("../services/rbac/roleService");
const config = require("../config");
const logger = require("../lib/logger");
const { verifyAccessToken, isJtiBlacklisted } = require("../utils/token"); // ✅ added isJtiBlacklisted
const response = require("../utils/response");

/** Routes that may proceed without a Bearer token (cookie/session refresh, logout). */
const PUBLIC_AUTH_PATHS = [
  /^\/api\/owner\/refresh\/?$/,
  /^\/api\/owner\/logout\/?$/,
];

function isPublicAuthRoute(req) {
  const path = (req.originalUrl || req.url || req.path || "").split("?")[0];
  return PUBLIC_AUTH_PATHS.some((re) => re.test(path));
}

/**
 * @summary Authenticate a user
 * @description Middleware to authenticate a user using a JWT.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 * @returns {Promise<void>}
 */
async function authenticate(req, res, next) {
  try {
    // ── 1. Extract token ──────────────────────────────────────────────────
    const auth_header = req.headers.authorization;

    if (!auth_header || !auth_header.startsWith("Bearer ")) {
      if (isPublicAuthRoute(req)) {
        return next();
      }
      return response.fail(res, "Authentication required", 401);
    }

    const token = auth_header.substring(7);

    // ── 2. Verify JWT signature + expiry ──────────────────────────────────
    let decoded;
    try {
      decoded = await verifyAccessToken(token);
    } catch (error) {
      // verifyAccessToken throws 'Token expired' or 'Invalid token'
      const is_expired = error.message === "Token expired";
      return response.fail(res, error.message, 400);
    }

    // ── 3. ✅ Blacklist check (Redis first → DB fallback) ─────────────────
    // Runs after signature verification so we only hit the blacklist store
    // for tokens that are cryptographically valid.
    //
    // isJtiBlacklisted is fail-open: if Redis AND the DB are both down it
    // returns false so legitimate users are never accidentally locked out.
    const is_revoked = await isJtiBlacklisted(decoded.jti, decoded.exp);
    if (is_revoked) {
      logger.info(
        `[auth] Revoked token used — user_id=${decoded.user_id} jti=${decoded.jti}`,
      );
      return response.fail(
        res,
        "Something went wrong , Please log in again.",
        400,
      );
    }

    const user_id = decoded.user_id || decoded.id || decoded.sub || decoded.userId;
    if (!user_id) {
      return response.fail(res, "Invalid token payload", 400);
    }

    // ── 4. Validate session (optional but recommended) ────────────────────
    const session_id =
      req.cookies?.[config.session.cookieName] || req.headers["x-session-id"];

    if (session_id) {
      const session = await sessionService.getSession(session_id);

      if (!session || session.user_id !== user_id) {
        // JWT is valid — do not block the request when the session cookie/id is stale
        // (common with cross-origin SPAs or after server session store reset).
        logger.warn(
          `[auth] Stale session ignored for user_id=${user_id} session_id=${session_id}`,
        );
      }

      // await sessionService.updateSessionActivity(session_id);
    }

    // ── 5. Load permissions + role into cache ─────────────────────────────
    // ✅ FIX: Promise.all returns 2 values — was destructured into 3 before
    const [permissions, role] = await Promise.all([
      rbacService.getUserPermissions(user_id),
      rbacService.getUserRole(user_id),
    ]);

    // ── 6. Attach to request ──────────────────────────────────────────────
    req.user = {
      ...decoded,
      user_id: String(user_id),
      role_id: decoded.role_id,
      session_id,
    };

    req.user_permissions = permissions;
    req.user_role = role;

    logger.debug(
      `[auth] Authenticated: user_id=${user_id} permissions=${permissions.length}`,
    );

    next();
  } catch (error) {
    logger.error("[auth] Unexpected error in authenticate middleware:", error);
    return response.fail(res, "Authentication failed", 401);
  }
}

/**
 * @summary Optionally authenticate a user
 * @description Middleware to optionally authenticate a user using a JWT.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 * @returns {Promise<void>}
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const auth_header = req.headers.authorization;

    if (!auth_header || !auth_header.startsWith("Bearer ")) {
      return next();
    }

    const token = auth_header.substring(7);

    try {
      // Verify signature (async JWT verify)
      const decoded = await verifyAccessToken(token);

      // ✅ Blacklist check — silently skip if revoked
      const is_revoked = await isJtiBlacklisted(decoded.jti, decoded.exp);
      if (is_revoked) {
        logger.debug(
          `[auth:optional] Revoked token ignored — user_id=${decoded.user_id}`,
        );
        return next(); // Treat as unauthenticated, don't error
      }

      const user_id = decoded.user_id || decoded.id || decoded.sub || decoded.userId;
      if (!user_id) {
        logger.debug("[auth:optional] Token missing user id — continuing unauthenticated");
        return next();
      }

      const [permissions, role] = await Promise.all([
        rbacService.getUserPermissions(user_id),
        rbacService.getUserRole(user_id),
      ]);

      req.user = {
        ...decoded,
        user_id: String(user_id),
        role_id: decoded.role_id,
      };

      req.user_permissions = permissions;
      req.user_role = role;

      logger.debug(`[auth:optional] Identified: user_id=${user_id}`);
    } catch (error) {
      // Invalid/expired token is fine for optional auth — just skip
      logger.debug(
        "[auth:optional] No valid token — continuing unauthenticated",
      );
    }

    next();
  } catch (error) {
    logger.error("[auth:optional] Unexpected error:", error);
    next(); // Always continue for optional auth
  }
}

module.exports = { authenticate, optionalAuthenticate };
