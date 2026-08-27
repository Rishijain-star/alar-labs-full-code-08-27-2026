const { Session } = require("../models");
const redisManager = require("../lib/redisManager");
const config = require("../config");
const { hash, secureCompare } = require("../utils/crypto");
const logger = require("../lib/logger");

/**
 * Session Service (Hybrid: Database + Redis Cache)
 * - Primary storage: Database (persistent)
 * - Cache layer: Redis (fast access)
 *
 * FIXED:
 * - createSession() now accepts and stores accessToken (needed for JTI blacklisting)
 * - getUserSessions() now returns full session objects (not just IDs)
 * - updateSession() updates accessToken in cache when token is refreshed
 */
class SessionService {
  constructor() {
    this.sessionPrefix = "session:";
    this.userSessionsPrefix = "user_sessions:";
    this.sessionTTL = config.session.ttl || 900;
    this.cacheTTL = 900; // Cache for 15 minutes
  }

  _getSessionCacheKey(session_id) {
    return `${this.sessionPrefix}${session_id}`;
  }

  _getUserSessionsCacheKey(user_id) {
    return `${this.userSessionsPrefix}${user_id}`;
  }

  /**
   * Create a new session in database and cache
   *
   * ✅ FIX: Added `access_token` parameter (3rd arg).
   * It is stored in Redis cache so _blacklistUserTokens can decode the JTI.
   * It is NOT stored in the database (sensitive — only needed short-term).
   *
   * @param {string} session_id
   * @param {string} user_id
   * @param {string} access_token  - Raw JWT access token (stored in cache only)
   * @param {string} refresh_token - Plain refresh token (hashed before DB storage)
   * @param {Object} metadata
   * @param {number} ttl
   */
  async createSession(
    session_id,
    user_id,
    access_token,
    refresh_token,
    metadata = {},
    ttl = null,
  ) {
    try {
      const session_ttl = ttl || this.sessionTTL;
      const expires_at = new Date(Date.now() + session_ttl * 1000);

      // 1. Save to database (no access_token stored — sensitive)
      const session = await Session.create({
        session_id,
        user_id,
        refresh_token_hash: hash(refresh_token),
        ip_address: metadata.ip_address || "unknown",
        user_agent: metadata.user_agent || "",
        device_info: metadata.device_info || {},
        device_fingerprint: metadata.device_fingerprint || null,
        is_trusted: metadata.is_trusted || false,
        mfa_verified: metadata.mfa_verified || false,
        device_verified: metadata.device_verified || false,
        remember_me: metadata.remember_me || false,
        is_active: true,
        last_activity: new Date(),
        expires_at,
      });

      // 2. Cache in Redis — include access_token so blacklist can read JTI
      const redis = await redisManager.getClientSafe();
      if (redis) {
        const session_data = {
          ...session.toJSON(),
          access_token, // ✅ stored in cache only (expires with cacheTTL)
        };
        const cacheKey = this._getSessionCacheKey(session_id);
        await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(session_data));

        // ✅ FIX: store full session data in user sessions set (as JSON strings)
        // so getUserSessions() can return full objects, not just IDs
        const userSessionsKey = this._getUserSessionsCacheKey(user_id);
        await redis.hSet(
          userSessionsKey,
          session_id,
          JSON.stringify(session_data),
        );
        await redis.expire(userSessionsKey, this.cacheTTL);
      }

      return true;
    } catch (error) {
      throw new Error("Session creation failed");
    }
  }

  /**
   * Get session data (cache first, then database)
   */
  async getSession(session_id) {
    try {
      const redis = await redisManager.getClientSafe();
      const cacheKey = this._getSessionCacheKey(session_id);

      // 1. Try cache first
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 2. Cache miss — get from database

      const session = await Session.findOne({
        where: { session_id, is_active: true },
      });

      if (!session) return null;

      if (session.isExpired()) {
        await this.deleteSession(session_id);
        return null;
      }

      await session.update({ last_activity: new Date() });

      // NOTE: access_token is NOT in DB, so cache will not have it after a miss.
      // That's acceptable — the token will have expired by then anyway.
      const session_data = session.toJSON();

      if (redis) {
        await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(session_data));
      }

      return session_data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active sessions for a user as FULL OBJECTS (not just IDs).
   *
   * ✅ FIX: Previously returned string[] of session IDs.
   * Now returns Object[] so _blacklistUserTokens can read access_token/jti.
   *
   * @param {string} user_id
   * @returns {Promise<Object[]>} Array of session data objects
   */
  async getUserSessions(user_id) {
    try {
      const redis = await redisManager.getClientSafe();
      const userSessionsKey = this._getUserSessionsCacheKey(user_id);

      // 1. Try Redis hash (contains full session objects)
      if (redis) {
        const cached = await redis.hGetAll(userSessionsKey);
        if (cached && Object.keys(cached).length > 0) {
          return Object.values(cached)
            .map((v) => {
              try {
                return JSON.parse(v);
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
      }

      // 2. Cache miss — load from database
      const sessions = await Session.findAll({
        where: { user_id, is_active: true },
        order: [["last_activity", "DESC"]],
      });

      if (sessions.length === 0) return [];

      const session_objects = sessions.map((s) => s.toJSON());

      // 3. Rebuild Redis hash (no access_token available from DB — that's fine,
      //    tokens that have expired won't be blacklisted anyway)
      if (redis && session_objects.length > 0) {
        const pipeline = session_objects.reduce((acc, s) => {
          acc[s.session_id] = JSON.stringify(s);
          return acc;
        }, {});
        await redis.hSet(userSessionsKey, pipeline);
        await redis.expire(userSessionsKey, this.cacheTTL);
      }

      return session_objects;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get session IDs only (used internally / for display purposes)
   */
  async getUserSessionIds(user_id) {
    try {
      const redis = await redisManager.getClientSafe();
      const userSessionsKey = this._getUserSessionsCacheKey(user_id);

      if (redis) {
        const ids = await redis.hKeys(userSessionsKey);
        if (ids && ids.length > 0) return ids;
      }

      const sessions = await Session.findAll({
        where: { user_id, is_active: true },
        attributes: ["session_id"],
        order: [["last_activity", "DESC"]],
      });

      return sessions.map((s) => s.session_id);
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate refresh token against stored hash
   */
  async validateRefreshToken(session_id, refresh_token) {
    try {
      const session = await this.getSession(session_id);

      if (!session) {
        return null;
      }

      const provided_hash = hash(refresh_token);

      if (!secureCompare(provided_hash, session.refresh_token_hash)) {
        await this.deleteSession(session_id);
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update session with new refresh token (and optionally new access_token)
   *
   * ✅ FIX: Also updates access_token in Redis cache when token is refreshed,
   * so the next blacklist check can still find the latest JTI.
   *
   * @param {string} session_id
   * @param {string} new_refresh_token
   * @param {Object} session_data - may include new_access_token
   */
  async updateSession(session_id, new_refresh_token, session_data = null) {
    try {
      const session = await Session.findOne({
        where: { session_id, is_active: true },
      });

      if (!session) throw new Error("Session not found");

      await session.update({
        refresh_token_hash: hash(new_refresh_token),
        last_activity: new Date(),
      });

      const redis = await redisManager.getClientSafe();
      if (redis) {
        const cacheKey = this._getSessionCacheKey(session_id);
        const updated_data = {
          ...session.toJSON(),
          // ✅ preserve or update access_token if caller provides one
          ...(session_data?.new_access_token && {
            access_token: session_data.new_access_token,
          }),
        };
        await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(updated_data));

        // Also update the hash entry
        const user_id = session.user_id;
        const userSessionsKey = this._getUserSessionsCacheKey(user_id);
        await redis.hSet(
          userSessionsKey,
          session_id,
          JSON.stringify(updated_data),
        );
      }

      return true;
    } catch (error) {
      throw new Error("Session update failed");
    }
  }

  /**
   * Delete a single session
   */
  async deleteSession(session_id) {
    try {
      const session = await Session.findOne({
        where: { session_id },
        attributes: ["user_id"],
      });

      const result = await Session.destroy({ where: { session_id } });

      const redis = await redisManager.getClientSafe();
      if (redis) {
        await redis.del(this._getSessionCacheKey(session_id));

        if (session) {
          const userSessionsKey = this._getUserSessionsCacheKey(session.user_id);
          await redis.hDel(userSessionsKey, session_id); // ✅ hDel instead of sRem
        }
      }

      if (result > 0) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(user_id) {
    try {
      const sessions = await Session.findAll({
        where: { user_id, is_active: true },
        attributes: ["session_id"],
      });

      const session_ids = sessions.map((s) => s.session_id);

      const count = await Session.destroy({
        where: { user_id, is_active: true },
      });

      const redis = await redisManager.getClientSafe();
      if (redis && session_ids.length > 0) {
        const cacheKeys = session_ids.map((id) => this._getSessionCacheKey(id));
        await redis.del(cacheKeys);
        await redis.del(this._getUserSessionsCacheKey(user_id)); // ✅ deletes the hash
      }

      return count;
    } catch (error) {
      throw new Error("Failed to delete user sessions");
    }
  }

  /**
   * Get session count for a user
   */
  async getUserSessionCount(user_id) {
    try {
      const sessions = await this.getUserSessions(user_id);
      return sessions.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Store challenge for WebAuthn/MFA (Redis only - temporary)
   */
  async storeChallenge(user_id, challenge) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) throw new Error("Redis client not available");

      const challengeKey = `challenge:${user_id}`;
      await redis.setEx(challengeKey, 5 * 60, challenge);
    } catch (error) {
      throw new Error("Failed to store challenge");
    }
  }

  /**
   * Get challenge for WebAuthn/MFA
   */
  async getChallenge(user_id) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) return null;

      const challengeKey = `challenge:${user_id}`;
      const challenge = await redis.get(challengeKey);
      if (challenge) await redis.del(challengeKey);
      return challenge;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(session_id, additional_ttl = null) {
    try {
      const ttl = additional_ttl || this.sessionTTL;
      const new_expires_at = new Date(Date.now() + ttl * 1000);

      const session = await Session.findOne({
        where: { session_id, is_active: true },
      });

      if (!session) return false;

      await session.update({ expires_at: new_expires_at });

      const redis = await redisManager.getClientSafe();
      if (redis) {
        await redis.expire(this._getSessionCacheKey(session_id), ttl);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions() {
    try {
      const { Op } = require("sequelize");

      const expired_sessions = await Session.findAll({
        where: { expires_at: { [Op.lt]: new Date() } },
        attributes: ["session_id", "user_id"],
      });

      const count = await Session.destroy({
        where: { expires_at: { [Op.lt]: new Date() } },
      });

      const redis = await redisManager.getClientSafe();
      if (redis && expired_sessions.length > 0) {
        for (const s of expired_sessions) {
          await redis.del(this._getSessionCacheKey(s.session_id));
          await redis.hDel(this._getUserSessionsCacheKey(s.user_id), s.session_id);
        }
      }

      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Enforce concurrent session limit for a user
   * Terminates oldest session(s) if limit exceeded
   * @param {string} user_id
   * @param {number} max_concurrent_sessions
   */
  async enforceConcurrentSessionLimit(user_id, max_concurrent_sessions = 5) {
    try {
      const sessions = await this.getUserSessions(user_id);

      if (sessions.length <= max_concurrent_sessions) {
        return { enforced: false, sessions_terminated: 0 };
      }

      // Sort by last_activity, oldest first
      const sorted_sessions = sessions.sort(
        (a, b) => new Date(a.last_activity) - new Date(b.last_activity)
      );

      // Terminate oldest sessions
      const sessions_to_terminate = sorted_sessions.slice(0, sessions.length - max_concurrent_sessions);
      let terminated = 0;

      for (const session of sessions_to_terminate) {
        await this.terminateSession(session.session_id, 'Concurrent session limit exceeded');
        terminated++;
      }

      logger.info(
        `[SessionService] Enforced concurrent limit for user ${user_id}: terminated ${terminated} sessions`
      );

      return {
        enforced: true,
        sessions_terminated: terminated,
        remaining_sessions: max_concurrent_sessions,
      };
    } catch (error) {
      logger.error('[SessionService] Enforce concurrent limit error:', error);
      return { enforced: false, sessions_terminated: 0 };
    }
  }

  /**
   * Terminate a session explicitly
   * @param {string} session_id
   * @param {string} reason - Reason for termination
   */
  async terminateSession(session_id, reason = 'User logout') {
    try {
      const session = await Session.findOne({
        where: { session_id },
      });

      if (!session) return false;

      await session.update({
        is_active: false,
        terminated_at: new Date(),
        terminated_reason: reason,
      });

      // Clear from cache
      const redis = await redisManager.getClientSafe();
      if (redis) {
        await redis.del(this._getSessionCacheKey(session_id));
        const user_sessions_key = this._getUserSessionsCacheKey(session.user_id);
        await redis.hDel(user_sessions_key, session_id);
      }

      logger.debug(`[SessionService] Terminated session ${session_id}: ${reason}`);
      return true;
    } catch (error) {
      logger.error('[SessionService] Terminate session error:', error);
      return false;
    }
  }

  /**
   * Terminate all other sessions for a user (keep current session)
   * @param {string} user_id
   * @param {string} current_session_id - Session to keep active
   */
  async terminateOtherSessions(user_id, current_session_id) {
    try {
      const sessions = await this.getUserSessions(user_id);
      let terminated = 0;

      for (const session of sessions) {
        if (session.session_id !== current_session_id) {
          await this.terminateSession(session.session_id, 'User logged out other devices');
          terminated++;
        }
      }

      logger.info(`[SessionService] Terminated ${terminated} other sessions for user ${user_id}`);
      return terminated;
    } catch (error) {
      logger.error('[SessionService] Terminate other sessions error:', error);
      return 0;
    }
  }

  /**
   * Get sessions by device fingerprint
   * Useful for checking all sessions from same device
   */
  async getSessionsByDeviceFingerprint(device_fingerprint) {
    try {
      const sessions = await Session.findAll({
        where: { device_fingerprint, is_active: true },
        order: [['last_activity', 'DESC']],
      });
      return sessions.map(s => s.toJSON());
    } catch (error) {
      logger.error('[SessionService] Get sessions by device fingerprint error:', error);
      return [];
    }
  }

  /**
   * Detect suspicious session activity
   * Returns anomaly score and recommendation
   */
  async detectSuspiciousActivity(session_id) {
    try {
      const session = await this.getSession(session_id);
      if (!session) return null;

      let anomaly_score = 0;

      // Check if session is inactive
      const last_activity = new Date(session.last_activity);
      const inactive_minutes = (Date.now() - last_activity.getTime()) / (1000 * 60);
      if (inactive_minutes > 60) {
        anomaly_score += 0.1;
      }

      // Check if activity is at unusual time
      const hour = new Date().getHours();
      if (hour < 6 || hour > 23) {
        anomaly_score += 0.15;
      }

      // Check concurrent sessions from same user
      const user_sessions = await this.getUserSessions(session.user_id);
      if (user_sessions.length > 3) {
        anomaly_score += 0.1 * (user_sessions.length - 3);
      }

      // Check IP changes
      if (session.metadata?.lastKnownIP && session.metadata.lastKnownIP !== session.ip_address) {
        anomaly_score += 0.2;
      }

      // Update session anomaly score
      if (anomaly_score > 0) {
        await Session.update(
          { anomaly_score },
          { where: { session_id } }
        );
      }

      return {
        session_id,
        anomaly_score: Math.min(anomaly_score, 1.0),
        requires_mfa: anomaly_score > 0.3,
        requires_verification: anomaly_score > 0.5,
        recommendation: anomaly_score > 0.7 ? 'BLOCK' :
          anomaly_score > 0.5 ? 'REQUIRE_VERIFICATION' :
            anomaly_score > 0.3 ? 'REQUIRE_MFA' : 'ALLOW',
      };
    } catch (error) {
      logger.error('[SessionService] Detect suspicious activity error:', error);
      return null;
    }
  }

  /**
   * Get detailed session info for user display
   * Includes device info and location
   */
  async getDetailedSessionInfo(session_id) {
    try {
      const session = await this.getSession(session_id);
      if (!session) return null;

      const last_activity = new Date(session.last_activity);
      const user_id = session.user_id;

      return {
        session_id: session.session_id,
        device_info: session.device_info || {},
        ip_address: session.ip_address,
        location: session.location || 'Unknown',
        user_agent: session.user_agent,
        is_trusted: session.is_trusted,
        mfa_verified: session.mfa_verified,
        device_verified: session.device_verified,
        last_activity_at: last_activity.toISOString(),
        last_activity_ago: this._getTimeAgo(last_activity),
        expires_at: new Date(session.expires_at).toISOString(),
        is_expired: new Date() > new Date(session.expires_at),
        is_active: session.is_active,
      };
    } catch (error) {
      logger.error('[SessionService] Get detailed session info error:', error);
      return null;
    }
  }

  /**
   * Helper: Convert time difference to human-readable string
   */
  _getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return Math.floor(seconds / 604800) + 'w ago';
  }

  /**
   * Summary of all user sessions
   */
  async getUserSessionsSummary(user_id) {
    try {
      const sessions = await this.getUserSessions(user_id);

      return {
        total_sessions: sessions.length,
        active_sessions: sessions.filter(s => s.is_active).length,
        mfa_verified: sessions.filter(s => s.mfa_verified).length,
        trusted_devices: sessions.filter(s => s.is_trusted).length,
        sessions: await Promise.all(
          sessions.map(s => this.getDetailedSessionInfo(s.session_id))
        ),
      };
    } catch (error) {
      logger.error('[SessionService] Get sessions summary error:', error);
      return {
        total_sessions: 0,
        active_sessions: 0,
        sessions: [],
      };
    }
  }

  /**
   * Clear session cache
   */
  async clearCache(user_id = null) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) return;

      if (user_id) {
        const user_sessions_key = this._getUserSessionsCacheKey(user_id);
        const session_ids = await redis.hKeys(user_sessions_key); // ✅ hKeys for hash

        if (session_ids.length > 0) {
          const cache_keys = session_ids.map((id) =>
            this._getSessionCacheKey(id),
          );
          await redis.del([...cache_keys, user_sessions_key]);
        }
      } else {
        const keys = await redis.keys(`${this.sessionPrefix}*`);
        if (keys.length > 0) await redis.del(keys);
      }
    } catch (error) {
      console.error("Failed to clear session cache:", error);
    }
  }
}

module.exports = new SessionService();
