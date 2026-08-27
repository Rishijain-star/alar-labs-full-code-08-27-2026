/**
 * User-Level Rate Limiting Middleware
 * Implements sliding window rate limiting per user ID and IP address
 */

const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');
const { AppError } = require('./errorHandler');

class UserRateLimitService {
  constructor() {
    this.defaultWindow = 3600; // 1 hour in seconds
    this.defaultLimit = 100;   // max requests per window
    this.failedAttemptWindow = 900; // 15 minutes for failed attempts
    this.failedAttemptLimit = 5;    // max 5 failed attempts
    this.exponentialBackoff = true;
  }

  /**
   * Get rate limit key for user/IP
   */
  _getKey(userId, ipAddress, type = 'requests') {
    if (type === 'failed') {
      return `ratelimit:failed:${userId || ipAddress}`;
    }
    return `ratelimit:${type}:${userId || ipAddress}`;
  }

  /**
   * Check if request should be allowed
   */
  async checkLimit(userId, ipAddress, options = {}) {
    try {
      const {
        window = this.defaultWindow,
        limit = this.defaultLimit,
        type = 'requests',
      } = options;

      const redis = await this._getRedis();
      if (!redis) {
        logger.warn('[RateLimit] Redis unavailable, allowing request');
        return { allowed: true, remaining: limit };
      }

      const key = this._getKey(userId, ipAddress, type);
      const current = await redis.incr(key);

      // Set expiration on first request
      if (current === 1) {
        await redis.expire(key, window);
      }

      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;

      if (!allowed) {
        logger.warn(`[RateLimit] Limit exceeded for key ${key}: ${current}/${limit}`);
      }

      return {
        allowed,
        current,
        limit,
        remaining,
        retryAfter: allowed ? null : window,
      };
    } catch (error) {
      logger.error('[RateLimit] Check limit error:', error);
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: limit };
    }
  }

  /**
   * Record failed authentication attempt
   */
  async recordFailedAttempt(userId, ipAddress) {
    try {
      const redis = await this._getRedis();
      if (!redis) return { attempts: 0 };

      const key = this._getKey(userId || ipAddress, ipAddress, 'failed');
      const attempts = await redis.incr(key);

      if (attempts === 1) {
        await redis.expire(key, this.failedAttemptWindow);
      }

      logger.warn(`[RateLimit] Failed attempt recorded for ${key}: ${attempts}/${this.failedAttemptLimit}`);

      return {
        attempts,
        limit: this.failedAttemptLimit,
        window: this.failedAttemptWindow,
        shouldLock: attempts >= this.failedAttemptLimit,
      };
    } catch (error) {
      logger.error('[RateLimit] Record failed attempt error:', error);
      return { attempts: 0 };
    }
  }

  /**
   * Clear failed attempts after successful login
   */
  async clearFailedAttempts(userId, ipAddress) {
    try {
      const redis = await this._getRedis();
      if (!redis) return true;

      const key = this._getKey(userId || ipAddress, ipAddress, 'failed');
      await redis.del(key);

      logger.debug(`[RateLimit] Cleared failed attempts for ${key}`);
      return true;
    } catch (error) {
      logger.error('[RateLimit] Clear failed attempts error:', error);
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(userId, ipAddress, options = {}) {
    try {
      const redis = await this._getRedis();
      if (!redis) {
        return {
          allowed: true,
          current: 0,
          limit: options.limit || this.defaultLimit,
          remaining: options.limit || this.defaultLimit,
        };
      }

      const key = this._getKey(userId, ipAddress, options.type || 'requests');
      const current = await redis.get(key);
      const ttl = await redis.ttl(key);

      return {
        current: parseInt(current || 0),
        limit: options.limit || this.defaultLimit,
        remaining: Math.max(0, (options.limit || this.defaultLimit) - parseInt(current || 0)),
        ttl: ttl > 0 ? ttl : null,
      };
    } catch (error) {
      logger.error('[RateLimit] Get status error:', error);
      return {
        current: 0,
        limit: options.limit || this.defaultLimit,
        remaining: options.limit || this.defaultLimit,
      };
    }
  }

  /**
   * Reset rate limit for a user
   */
  async reset(userId, ipAddress, type = 'requests') {
    try {
      const redis = await this._getRedis();
      if (!redis) return true;

      const key = this._getKey(userId, ipAddress, type);
      await redis.del(key);

      logger.debug(`[RateLimit] Reset rate limit for ${key}`);
      return true;
    } catch (error) {
      logger.error('[RateLimit] Reset error:', error);
      return false;
    }
  }

  /**
   * Get lazy-loaded Redis client
   */
  async _getRedis() {
    try {
      if (!redisManager.isReady()) {
        return null;
      }
      return await redisManager.getClientSafe();
    } catch (error) {
      return null;
    }
  }
}

const rateLimitService = new UserRateLimitService();

/**
 * Middleware: Rate limit by user ID
 * Should be applied after authentication middleware
 */
function rateLimitByUser(options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        // Not authenticated, skip user rate limit
        return next();
      }

      const limit = await rateLimitService.checkLimit(
        userId,
        null,
        {
          limit: options.limit || 100,
          window: options.window || 3600,
          type: 'user_requests',
        }
      );

      // Add headers
      res.set('X-RateLimit-Limit', limit.limit);
      res.set('X-RateLimit-Remaining', limit.remaining);
      if (limit.retryAfter) {
        res.set('Retry-After', limit.retryAfter);
      }

      if (!limit.allowed) {
        logger.warn(`[RateLimit] User ${userId} exceeded rate limit`);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: limit.retryAfter,
        });
      }

      next();
    } catch (error) {
      logger.error('[RateLimit] User rate limit middleware error:', error);
      next(); // Fail open
    }
  };
}

/**
 * Middleware: Rate limit by IP address
 * For unauthenticated requests
 */
function rateLimitByIP(options = {}) {
  return async (req, res, next) => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      const limit = await rateLimitService.checkLimit(
        null,
        ipAddress,
        {
          limit: options.limit || 50,
          window: options.window || 3600,
          type: 'ip_requests',
        }
      );

      // Add headers
      res.set('X-RateLimit-Limit', limit.limit);
      res.set('X-RateLimit-Remaining', limit.remaining);
      if (limit.retryAfter) {
        res.set('Retry-After', limit.retryAfter);
      }

      if (!limit.allowed) {
        logger.warn(`[RateLimit] IP ${ipAddress} exceeded rate limit`);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: limit.retryAfter,
        });
      }

      next();
    } catch (error) {
      logger.error('[RateLimit] IP rate limit middleware error:', error);
      next(); // Fail open
    }
  };
}

/**
 * Middleware: Strict rate limit for login attempts
 */
function loginAttemptRateLimit(options = {}) {
  return async (req, res, next) => {
    try {
      const { email, phone } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const identifier = email || phone || ipAddress;

      // Check failed attempts
      const status = await rateLimitService.recordFailedAttempt(identifier, ipAddress);

      res.set('X-Login-Attempts', status.attempts);
      res.set('X-Login-Attempt-Limit', status.limit);

      if (status.shouldLock) {
        logger.warn(`[RateLimit] Login attempt limit exceeded for ${identifier}`);
        return res.status(429).json({
          success: false,
          error: 'Too many failed login attempts',
          code: 'LOGIN_ATTEMPT_LIMIT_EXCEEDED',
          retryAfter: this.failedAttemptWindow,
        });
      }

      // Store attempt info for clearing on success
      req.loginAttemptIdentifier = identifier;
      req.loginAttemptIpAddress = ipAddress;

      next();
    } catch (error) {
      logger.error('[RateLimit] Login attempt rate limit error:', error);
      next(); // Fail open
    }
  };
}

/**
 * Helper to clear failed attempts after successful login
 */
async function clearLoginAttempts(identifier, ipAddress) {
  return rateLimitService.clearFailedAttempts(identifier, ipAddress);
}

module.exports = {
  rateLimitService,
  rateLimitByUser,
  rateLimitByIP,
  loginAttemptRateLimit,
  clearLoginAttempts,
};
