const rateLimitConfig = require("../config/rateLimitConfig");
const logger = require("../lib/logger");
const redisManager = require("../lib/redisManager");

/**
 * Advanced Rate Limiter Factory
 * Supports per-route configuration with flexible key generation
 */
function createRateLimiter(options = {}) {
  // If options is a string, use it to get config from rateLimitConfig
  let config = {};

  // If options is string → fetch config
  if (typeof options === "string") {
    config = rateLimitConfig[options];

    if (!config) {
      logger.warn(`Rate limit config "${options}" not found. Using defaults.`);
      config = {};
    }
  } else {
    config = options || {};
  }

  const {
    max = 100,
    windowMs = 15 * 60 * 1000,
    message = "Too many requests",
    keyPrefix = "rate",
    keyGenerator = null,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    handler = null,
  } = config;

  return async (req, res, next) => {
    try {
      const redis = await redisManager.getClientSafe();

      // If Redis is unavailable, skip rate limiting but allow request
      if (!redis) {
        logger.debug("Redis unavailable, skipping rate limit check");
        return next();
      }

      // Generate rate limit key safely
      let key;
      try {
        if (keyGenerator && typeof keyGenerator === "function") {
          key = keyGenerator(req);
        } else {
          // Default: Use IP address + route path
          const identifier = req.user?.userId || req.ip || "unknown";
          key = `${keyPrefix}:${identifier}`;
        }
      } catch (keyGenError) {
        logger.warn("Failed to generate rate limit key:", keyGenError.message);
        return next(); // Skip rate limiting if key generation fails
      }

      const rateLimitKey = `ratelimit:${key}`;

      // Get current count with error handling
      let current = 0;
      try {
        const result = await redis.get(rateLimitKey);
        current = result ? parseInt(result, 10) : 0;
      } catch (getError) {
        logger.warn(`Failed to get rate limit count for ${rateLimitKey}:`, getError.message);
        return next(); // Skip rate limiting if we can't read
      }

      // Check if limit exceeded
      if (current >= max) {
        let ttl = -1;
        try {
          ttl = await redis.ttl(rateLimitKey);
        } catch (ttlError) {
          logger.warn(`Failed to get TTL for ${rateLimitKey}:`, ttlError.message);
          ttl = Math.ceil(windowMs / 1000); // Use default window
        }

        const resetAt = Date.now() + ttl * 1000;
        const retryAfter = Math.ceil(ttl);

        // Set rate limit headers
        res.set({
          "X-RateLimit-Limit": max,
          "X-RateLimit-Remaining": 0,
          "X-RateLimit-Reset": new Date(resetAt).toISOString(),
          "Retry-After": retryAfter,
        });

        logger.warn(`Rate limit exceeded: ${key}`);

        // Use custom handler if provided
        if (handler && typeof handler === "function") {
          return handler(req, res);
        }

        return res.status(429).json({
          success: false,
          error: message,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
          resetAt: new Date(resetAt).toISOString(),
        });
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      let requestCounted = false;

      // Intercept response to handle skipSuccessfulRequests/skipFailedRequests
      res.json = function (data) {
        const isSuccess =
          data && (data.success === true || res.statusCode < 400);
        const isFailure = !isSuccess;

        // Determine if we should count this request
        const shouldCount =
          (!skipSuccessfulRequests || !isSuccess) &&
          (!skipFailedRequests || !isFailure);

        if (shouldCount && !requestCounted) {
          incrementCounter(redis, rateLimitKey, windowMs).catch((err) => {
            logger.warn("Failed to increment rate limit counter:", err.message);
          });
          requestCounted = true;
        }

        return originalJson(data);
      };

      // If not using skip options, increment immediately
      if (!skipSuccessfulRequests && !skipFailedRequests) {
        try {
          await incrementCounter(redis, rateLimitKey, windowMs);
          requestCounted = true;
        } catch (incrError) {
          logger.warn("Failed to increment rate limit counter on request start:", incrError.message);
          // Continue anyway - allow the request
        }
      }

      // Get TTL for reset time with error handling
      let ttl = -1;
      try {
        ttl = await redis.ttl(rateLimitKey);
      } catch (ttlError) {
        logger.warn(`Failed to get TTL for rate limit reset:`, ttlError.message);
        ttl = Math.ceil(windowMs / 1000);
      }

      const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + windowMs;

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": max,
        "X-RateLimit-Remaining": Math.max(0, max - current - 1),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      });

      next();
    } catch (error) {
      logger.error("Rate limiter error:", error.message);
      // Fail open - allow request to proceed on any error
      next();
    }
  };
}

/**
 * Increment rate limit counter with error handling
 */
async function incrementCounter(redis, key, windowMs) {
  try {
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await redis.incr(key);

      // Set expiry only on first increment
      if (current === 1) {
        try {
          await redis.expire(key, windowSeconds);
        } catch (expireError) {
          logger.warn(`Failed to set expiry for rate limit key ${key}:`, expireError.message);
          // Continue anyway - counter still works, just may expire later
        }
      }

      return current;
    } catch (incrError) {
      logger.error(`Failed to increment rate limit counter ${key}:`, incrError.message);
      // Return a safe default to prevent crash
      return 0;
    }
  } catch (error) {
    logger.error('Error in incrementCounter:', error.message);
    return 0;
  }
}

/**
 * Create IP-based rate limiter (for public routes)
 */
function createIpRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      return `${options.keyPrefix || "ip"}:${ip}`;
    },
  });
}

/**
 * Create user-based rate limiter (for authenticated routes)
 */
function createUserRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      const userId = req.user?.userId || req.ip || "unknown";
      return `${options.keyPrefix || "user"}:${userId}`;
    },
  });
}

/**
 * Create session-based rate limiter
 */
function createSessionRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      const config = require("../config");
      const sessionId =
        req.cookies?.[config.session.cookieName] ||
        req.body?.sessionId ||
        "unknown";
      return `${options.keyPrefix || "session"}:${sessionId}`;
    },
  });
}

/**
 * Create endpoint-specific rate limiter
 * Combines IP and endpoint path for granular control
 */
function createEndpointRateLimiter(options = {}) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => {
      const ip = req.ip || "unknown";
      const endpoint = req.path.replace(/\//g, "_");
      return `${options.keyPrefix || "endpoint"}:${ip}:${endpoint}`;
    },
  });
}

/**
 * Global rate limiter for all routes
 */
function createGlobalRateLimiter(options = {}) {
  const defaultOptions = {
    max: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: "Too many requests from this IP. Please try again later.",
    keyPrefix: "global",
  };

  return createIpRateLimiter({
    ...defaultOptions,
    ...options,
  });
}

/**
 * Reset rate limit for a specific key (admin function)
 */
async function resetRateLimit(key) {
  try {
    const redisManager = require("../lib/redisManager");
    const redis = await redisManager.getClientSafe();

    if (!redis) {
      logger.warn("Redis unavailable, cannot reset rate limit");
      return false;
    }

    const rateLimitKey = `ratelimit:${key}`;
    try {
      await redis.del(rateLimitKey);
      logger.info(`Rate limit reset for: ${key}`);
      return true;
    } catch (delError) {
      logger.error(`Failed to delete rate limit key ${rateLimitKey}:`, delError.message);
      return false;
    }
  } catch (error) {
    logger.error("Failed to reset rate limit:", error.message);
    return false;
  }
}

/**
 * Get rate limit status for a key
 */
async function getRateLimitStatus(key) {
  try {
    const redisManager = require("../lib/redisManager");
    const redis = await redisManager.getClientSafe();

    if (!redis) {
      logger.warn("Redis unavailable, cannot get rate limit status");
      return null;
    }

    const rateLimitKey = `ratelimit:${key}`;

    try {
      const count = await redis.get(rateLimitKey);
      let ttl = 0;

      try {
        ttl = await redis.ttl(rateLimitKey);
      } catch (ttlError) {
        logger.warn(`Failed to get TTL for ${rateLimitKey}:`, ttlError.message);
        ttl = 0;
      }

      return {
        count: count ? parseInt(count, 10) : 0,
        ttl: ttl > 0 ? ttl : 0,
        resetAt: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null,
      };
    } catch (getError) {
      logger.error(`Failed to get rate limit status for ${rateLimitKey}:`, getError.message);
      return null;
    }
  } catch (error) {
    logger.error("Failed to get rate limit status:", error.message);
    return null;
  }
}

module.exports = {
  createRateLimiter,
  createIpRateLimiter,
  createUserRateLimiter,
  createSessionRateLimiter,
  createEndpointRateLimiter,
  createGlobalRateLimiter,
  resetRateLimit,
  getRateLimitStatus,
};
