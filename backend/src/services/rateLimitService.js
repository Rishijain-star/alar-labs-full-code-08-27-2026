const redisManager = require('../lib/redisManager');
const config = require('../config');
const logger = require('../lib/logger');

class RateLimitService {
  constructor() {
    this.refreshPrefix = 'rate:refresh:';
    this.limit = config.rateLimit.refreshLimit;
    this.window = config.rateLimit.refreshWindow;
  }

  /**
   * Check and increment rate limit counter
   * @param {string} sessionId - Session identifier
   * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
   */
  async checkRefreshLimit(sessionId) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) {
        logger.debug('Redis unavailable, rate limiting skipped');
        return {
          allowed: true,
          count: 0,
          remaining: this.limit,
          limit: this.limit,
          resetAt: Date.now() + (this.window * 1000),
        };
      }

      const key = `${this.refreshPrefix}${sessionId}`;

      // Increment counter
      let count;
      try {
        count = await redis.incr(key);
      } catch (incrError) {
        logger.error(`Failed to increment rate limit counter for ${key}:`, incrError.message);
        throw incrError;
      }

      // Set expiry on first request
      if (count === 1) {
        try {
          await redis.expire(key, this.window);
        } catch (expireError) {
          logger.warn(`Failed to set expiry for rate limit key ${key}:`, expireError.message);
          // Continue anyway - counter still works
        }
      }

      // Get TTL for reset time
      let ttl;
      try {
        ttl = await redis.ttl(key);
      } catch (ttlError) {
        logger.warn(`Failed to get TTL for ${key}:`, ttlError.message);
        ttl = this.window; // Use default window
      }

      const resetAt = Date.now() + (ttl * 1000);

      const allowed = count <= this.limit;
      const remaining = Math.max(0, this.limit - count);

      if (!allowed) {
        logger.warn(`Rate limit exceeded for session: ${sessionId} (${count}/${this.limit})`);
      }

      return {
        allowed,
        count,
        remaining,
        limit: this.limit,
        resetAt,
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error.message);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        count: 0,
        remaining: this.limit,
        limit: this.limit,
        resetAt: Date.now() + (this.window * 1000),
      };
    }
  }

  /**
   * Reset rate limit for a session
   * @param {string} sessionId - Session identifier
   */
  async resetLimit(sessionId) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) {
        logger.debug('Redis unavailable, cannot reset rate limit');
        return;
      }

      const key = `${this.refreshPrefix}${sessionId}`;
      try {
        await redis.del(key);
        logger.info(`Rate limit reset for session: ${sessionId}`);
      } catch (delError) {
        logger.error(`Failed to delete rate limit key ${key}:`, delError.message);
      }
    } catch (error) {
      logger.error(`Failed to reset rate limit for session ${sessionId}:`, error.message);
    }
  }

  /**
   * Get current rate limit status
   * @param {string} sessionId - Session identifier
   * @returns {Object} Current status
   */
  async getStatus(sessionId) {
    try {
      const redis = await redisManager.getClientSafe();
      if (!redis) {
        logger.debug('Redis unavailable, returning default rate limit status');
        return {
          count: 0,
          remaining: this.limit,
          limit: this.limit,
          resetAt: null,
        };
      }

      const key = `${this.refreshPrefix}${sessionId}`;

      let count, ttl;
      try {
        count = await redis.get(key);
      } catch (getError) {
        logger.error(`Failed to get rate limit count for ${key}:`, getError.message);
        count = null;
      }

      try {
        ttl = await redis.ttl(key);
      } catch (ttlError) {
        logger.error(`Failed to get TTL for rate limit key ${key}:`, ttlError.message);
        ttl = -1;
      }

      if (!count || ttl < 0) {
        return {
          count: 0,
          remaining: this.limit,
          limit: this.limit,
          resetAt: null,
        };
      }

      return {
        count: parseInt(count, 10),
        remaining: Math.max(0, this.limit - parseInt(count, 10)),
        limit: this.limit,
        resetAt: Date.now() + (ttl * 1000),
      };
    } catch (error) {
      logger.error(`Failed to get rate limit status for session ${sessionId}:`, error.message);
      return {
        count: 0,
        remaining: this.limit,
        limit: this.limit,
        resetAt: null,
      };
    }
  }
}

module.exports = new RateLimitService();
