const { BlacklistedToken } = require("../models");
const redisManager = require('../lib/redisManager');
const { hash } = require("../utils/crypto");
const logger = require("../lib/logger");

/**
 * Token Blacklist Service (Hybrid: Database + Redis Cache)
 * - Primary storage: Database (persistent)
 * - Cache layer: Redis (fast token checks)
 */
class TokenBlacklistService {
  constructor() {
    this.blacklistPrefix = "blacklist:";
    this.userBlacklistPrefix = "user_blacklist:";
    this.cacheTTL = 3600; // Cache for 1 hour
  }

  /**
   * Get cache key for token
   */
  _getTokenCacheKey(tokenHash) {
    return `${this.blacklistPrefix}${tokenHash}`;
  }

  /**
   * Get cache key for user blacklist status
   */
  _getUserBlacklistCacheKey(user_id) {
    return `${this.userBlacklistPrefix}${user_id}`;
  }

  async blacklist(token, ttl, metadata = {}) {
    try {
      const token_hash = hash(token);
      const jti = metadata.jti || require("jsonwebtoken").decode(token)?.jti;

      // ✅ Safe TTL
      const safe_ttl = ttl > 0 ? Math.floor(ttl) : 3600;
      const expires_at = new Date(Date.now() + safe_ttl * 1000);

      const [blacklistedToken, created] = await BlacklistedToken.findOrCreate({
        where: { token_hash: token_hash },
        defaults: {
          token: token.substring(0, 50) + "...",
          token_hash: token_hash,
          jti,
          user_id: metadata.user_id || "system",
          token_type: metadata.token_type || "access",
          reason: metadata.reason || "user_logout",
          ip_address: metadata.ip_address || null,
          user_agent: metadata.user_agent || null,
          blacklisted_by: metadata.user_id || "system",
          expires_at: expires_at,
        },
      });

      if (!created) {
        logger.info(
          `Token already blacklisted: ${token_hash.substring(0, 10)}...`,
        );
        return blacklistedToken;
      }

      // ✅ Cache by JTI (what isJtiBlacklisted() looks up in Redis)
      const redis = await redisManager.getClientSafe();
      if (redis && jti) {
        await redis.setEx(`blacklist:jti:${jti}`, safe_ttl, "1");
      }

      logger.info(`Token blacklisted: jti=${jti}`);
      return blacklistedToken;
    } catch (error) {
      logger.error("Failed to blacklist token:", {
        message: error.message,
        fields: error.errors?.map((e) => ({ field: e.path, msg: e.message })),
      });
      throw new Error("Failed to blacklist token: " + error.message);
    }
  }

  /**
   * Check if a token is blacklisted (cache-first)
   * @param {string} token - Token to check
   * @returns {boolean} True if token is blacklisted
   */
  async isBlacklisted(token) {
    try {
      const token_hash = hash(token);
      const redis = await redisManager.getClientSafe();
      const cache_key = this._getTokenCacheKey(token_hash);

      // 1. Check cache first (fastest)
      if (redis) {
        const cached = await redis.get(cache_key);
        if (cached) {
          logger.debug(
            `Token blacklist cache hit: ${token_hash.substring(0, 10)}...`,
          );
          return true;
        }
      }

      // 2. Check database
      const { Op } = require("sequelize");
      const entry = await BlacklistedToken.findOne({
        where: {
          token_hash,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });

      const is_blacklisted = !!entry;

      // 3. Cache the result if blacklisted
      if (is_blacklisted && redis) {
        const ttl = Math.floor((entry.expires_at - new Date()) / 1000);
        await redis.setEx(cache_key, ttl, "1");
      }

      return is_blacklisted;
    } catch (error) {
      logger.error("Failed to check if token is blacklisted:", error);
      return false; // Fail open
    }
  }

  /**
   * Blacklist all tokens for a user
   * @param {string} user_id - User identifier
   * @param {string} reason - Reason for blacklisting
   */
  async blacklistUserTokens(user_id, reason = "user_revoke_all") {
    try {
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + 7); // Expire in 7 days

      // 1. Save to database
      const blacklistedToken = await BlacklistedToken.create({
        token: `ALL_TOKENS_${user_id}`,
        token_hash: `user_all_${user_id}_${Date.now()}`,
        user_id,
        token_type: "all",
        reason,
        blacklisted_by: user_id,
        expires_at,
      });

      // 2. Cache user blacklist status
      const redis = await redisManager.getClientSafe();
      if (redis) {
        const cache_key = this._getUserBlacklistCacheKey(user_id);
        const ttl = 7 * 24 * 60 * 60; // 7 days
        await redis.setEx(cache_key, ttl, "1");
      }

      logger.warn(`All tokens blacklisted for user: ${user_id}`);
      return blacklistedToken;
    } catch (error) {
      logger.error("Failed to blacklist user tokens:", error);
      throw new Error("Failed to blacklist user tokens");
    }
  }

  /**
   * Check if all user tokens are blacklisted (cache-first)
   * @param {string} user_id - User identifier
   * @returns {boolean} True if user is blacklisted
   */
  async isUserBlacklisted(user_id) {
    try {
      const redis = await redisManager.getClientSafe();
      const cache_key = this._getUserBlacklistCacheKey(user_id);

      logger.warn(`Checking user blacklist for user_id: ${user_id}`);
      logger.warn(`Cache key: ${cache_key}`);

      // 1. Check cache first
      if (redis) {
        const cached = await redis.get(cache_key);
        if (cached) {
          logger.warn(
            `⚠️ User blacklist cache hit for user_id: ${user_id} - User IS blacklisted`,
          );
          return true;
        }
        logger.debug(`Cache miss for user_id: ${user_id}`);
      }

      // 2. Check database
      const { Op } = require("sequelize");
      const entry = await BlacklistedToken.findOne({
        where: {
          user_id,
          token_type: "all",
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });

      const is_blacklisted = !!entry;

      if (entry) {
        logger.warn(`⚠️ Database entry found for user_id: ${user_id}`, {
          token_hash: entry.token_hash,
          reason: entry.reason,
          expires_at: entry.expires_at,
          created_at: entry.created_at,
        });
      } else {
        logger.debug(`✅ No blacklist entry found for user_id: ${user_id}`);
      }

      // 3. Cache the result if blacklisted
      if (is_blacklisted && redis) {
        const ttl = Math.floor((entry.expires_at - new Date()) / 1000);
        await redis.setEx(cache_key, ttl, "1");
        logger.debug(
          `Cached blacklist status for user_id: ${user_id} with TTL: ${ttl}s`,
        );
      }

      return is_blacklisted;
    } catch (error) {
      logger.error("Failed to check if user is blacklisted:", error);
      // Return false on error to allow access (fail open)
      return false;
    }
  }

  /**
   * Remove user blacklist
   * @param {string} user_id - User identifier
   */
  async removeUserBlacklist(user_id) {
    try {
      // 1. Delete from database
      const result = await BlacklistedToken.destroy({
        where: {
          user_id,
          token_type: "all",
        },
      });

      // 2. Clear cache
      const redis = await redisManager.getClientSafe();
      if (redis) {
        const cache_key = this._getUserBlacklistCacheKey(user_id);
        await redis.del(cache_key);
      }

      logger.info(
        `✅ User blacklist removed for user_id: ${user_id} (${result} entries deleted)`,
      );
      return result;
    } catch (error) {
      logger.error("Failed to remove user blacklist:", error);
      throw new Error("Failed to remove user blacklist");
    }
  }

  /**
   * Get blacklisted tokens for a user
   * @param {string} user_id - User identifier
   * @param {number} limit - Maximum number of tokens to return
   * @returns {Array} Array of blacklisted tokens
   */
  async getUserBlacklistedTokens(user_id, limit = 50) {
    try {
      const tokens = await BlacklistedToken.findAll({
        where: {
          user_id,
        },
        order: [["created_at", "DESC"]],
        limit,
      });

      return tokens;
    } catch (error) {
      logger.error("Failed to get user blacklisted tokens:", error);
      return [];
    }
  }

  /**
   * Cleanup expired blacklisted tokens
   * @returns {number} Number of tokens deleted
   */
  async cleanupExpired() {
    try {
      const { Op } = require("sequelize");

      const count = await BlacklistedToken.destroy({
        where: {
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${count} expired blacklisted tokens`);
      return count;
    } catch (error) {
      logger.error("Failed to cleanup expired tokens:", error);
      return 0;
    }
  }

  /**
   * Get count of blacklisted tokens for a user
   * @param {string} user_id - User identifier
   * @returns {number} Count of blacklisted tokens
   */
  async getUserBlacklistCount(user_id) {
    try {
      const { Op } = require("sequelize");

      return await BlacklistedToken.count({
        where: {
          user_id,
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get user blacklist count:", error);
      return 0;
    }
  }

  /**
   * Blacklist a refresh token
   * @param {string} token - Refresh token
   * @param {number} ttl - Time to live
   * @param {Object} metadata - Additional metadata
   */
  async blacklistRefreshToken(token, ttl, metadata = {}) {
    return await this.blacklist(token, ttl, {
      ...metadata,
      token_type: "refresh",
    });
  }

  /**
   * Blacklist an access token
   * @param {string} token - Access token
   * @param {number} ttl - Time to live
   * @param {Object} metadata - Additional metadata
   */
  async blacklistAccessToken(token, ttl, metadata = {}) {
    return await this.blacklist(token, ttl, {
      ...metadata,
      token_type: "access",
    });
  }

  /**
   * Get blacklist statistics
   * @returns {Object} Statistics object
   */
  async getStats() {
    try {
      const { Op, fn, col } = require("sequelize");

      const total = await BlacklistedToken.count();
      const active = await BlacklistedToken.count({
        where: {
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
      });
      const expired = total - active;

      const by_type = await BlacklistedToken.findAll({
        attributes: ["token_type", [fn("COUNT", col("id")), "count"]],
        where: {
          expires_at: {
            [Op.gt]: new Date(),
          },
        },
        group: ["token_type"],
      });

      return {
        total,
        active,
        expired,
        by_type: by_type.reduce((acc, item) => {
          acc[item.token_type] = parseInt(item.get("count"));
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error("Failed to get blacklist stats:", error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        by_type: {},
      };
    }
  }

  /**
   * Remove specific blacklisted token
   * @param {string} token - Token to remove from blacklist
   */
  async removeBlacklist(token) {
    try {
      const token_hash = hash(token);

      // 1. Delete from database
      const result = await BlacklistedToken.destroy({
        where: {
          token_hash,
        },
      });

      // 2. Clear cache
      const redis = await redisManager.getClientSafe();
      if (redis && result > 0) {
        const cacheKey = this._getTokenCacheKey(token_hash);
        await redis.del(cacheKey);
        logger.info(
          `Token removed from blacklist: ${token_hash.substring(0, 10)}...`,
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Failed to remove blacklist:", error);
      return false;
    }
  }

  /**
   * Clear all blacklist cache
   */
  async clearCache() {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) return;

      const keys = await redis.keys(`${this.blacklistPrefix}*`);
      const userKeys = await redis.keys(`${this.userBlacklistPrefix}*`);

      if (keys.length > 0 || userKeys.length > 0) {
        await redis.del([...keys, ...userKeys]);
      }

      logger.info("Blacklist cache cleared");
    } catch (error) {
      logger.error("Failed to clear blacklist cache:", error);
    }
  }
}

module.exports = new TokenBlacklistService();
