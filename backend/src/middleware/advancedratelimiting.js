/**
 * Advanced Rate Limiting Examples
 * Demonstrates various rate limiting strategies
 */

const { createRateLimiter, createUserRateLimiter } = require('../middleware/rateLimit');

// ============================================
// EXAMPLE 1: Tier-Based Rate Limiting
// ============================================

/**
 * Different limits based on user subscription tier
 */
function createTierBasedRateLimiter() {
    const tierLimits = {
        free: { max: 100, windowMs: 15 * 60 * 1000 },
        basic: { max: 500, windowMs: 15 * 60 * 1000 },
        premium: { max: 2000, windowMs: 15 * 60 * 1000 },
        enterprise: { max: 10000, windowMs: 15 * 60 * 1000 }
    };

    return async (req, res, next) => {
        const tier = req.user?.tier || 'free';
        const limits = tierLimits[tier];

        const rateLimiter = createUserRateLimiter({
            max: limits.max,
            windowMs: limits.windowMs,
            message: `Rate limit exceeded for ${tier} tier`,
            keyPrefix: `tier_${tier}`
        });

        return rateLimiter(req, res, next);
    };
}

// Usage in routes:
// router.get('/api/data', authenticate, createTierBasedRateLimiter(), controller.getData);

// ============================================
// EXAMPLE 2: Time-of-Day Based Rate Limiting
// ============================================

/**
 * Different limits during peak/off-peak hours
 */
function createTimeBasedRateLimiter(options = {}) {
    return async (req, res, next) => {
        const hour = new Date().getHours();
        const isPeakHours = hour >= 9 && hour <= 17; // 9 AM - 5 PM

        const limits = isPeakHours
            ? { max: 50, windowMs: 15 * 60 * 1000 }  // Stricter during peak
            : { max: 200, windowMs: 15 * 60 * 1000 }; // Lenient during off-peak

        const rateLimiter = createRateLimiter({
            ...limits,
            ...options,
            keyPrefix: options.keyPrefix || 'time_based'
        });

        return rateLimiter(req, res, next);
    };
}

// ============================================
// EXAMPLE 3: Endpoint-Specific User Limits
// ============================================

/**
 * Track rate limits per user per endpoint
 */
function createPerEndpointUserRateLimiter(options = {}) {
    return createRateLimiter({
        ...options,
        keyGenerator: (req) => {
            const userId = req.user?.userId || 'anonymous';
            const endpoint = req.route?.path || req.path;
            return `user_endpoint:${userId}:${endpoint}`;
        }
    });
}

// Usage:
// router.post('/api/upload', 
//   authenticate, 
//   createPerEndpointUserRateLimiter({ max: 10, windowMs: 60 * 1000 }),
//   controller.upload
// );

// ============================================
// EXAMPLE 4: Conditional Rate Limiting
// ============================================

/**
 * Apply rate limiting only under certain conditions
 */
function createConditionalRateLimiter(condition, options = {}) {
    const rateLimiter = createRateLimiter(options);

    return async (req, res, next) => {
        const shouldApplyRateLimit = await condition(req);

        if (shouldApplyRateLimit) {
            return rateLimiter(req, res, next);
        }

        next();
    };
}

// Usage:
// const isPublicRequest = (req) => !req.user;
// router.get('/api/public', 
//   createConditionalRateLimiter(isPublicRequest, { max: 10, windowMs: 60000 }),
//   controller.getData
// );

// ============================================
// EXAMPLE 5: Sliding Window Rate Limiting
// ============================================

/**
 * More accurate rate limiting using sliding window
 */
async function createSlidingWindowRateLimiter(options = {}) {
    const { max = 10, windowMs = 60000, keyPrefix = 'sliding' } = options;

    return async (req, res, next) => {
        try {
            const redisManager = require('../lib/redisManager');
            const key = `${keyPrefix}:${req.user?.userId || req.ip}`;
            const now = Date.now();
            const windowStart = now - windowMs;

            // Remove old entries
            await redisClient.zRemRangeByScore(key, 0, windowStart);

            // Count requests in current window
            const count = await redisClient.zCard(key);

            if (count >= max) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }

            // Add current request
            await redisClient.zAdd(key, { score: now, value: `${now}` });
            await redisClient.expire(key, Math.ceil(windowMs / 1000));

            next();
        } catch (error) {
            next(); // Fail open
        }
    };
}

// ============================================
// EXAMPLE 6: Burst Rate Limiting
// ============================================

/**
 * Allow short bursts but enforce long-term limits
 */
function createBurstRateLimiter(options = {}) {
    const {
        burstMax = 20,        // Allow 20 requests in burst
        burstWindowMs = 1000, // 1 second window for burst
        sustainedMax = 100,   // But only 100 requests
        sustainedWindowMs = 60000, // per minute sustained
        keyPrefix = 'burst'
    } = options;

    const burstLimiter = createRateLimiter({
        max: burstMax,
        windowMs: burstWindowMs,
        keyPrefix: `${keyPrefix}_burst`
    });

    const sustainedLimiter = createRateLimiter({
        max: sustainedMax,
        windowMs: sustainedWindowMs,
        keyPrefix: `${keyPrefix}_sustained`
    });

    return async (req, res, next) => {
        // Check burst limit first
        burstLimiter(req, res, (err) => {
            if (err || res.headersSent) return;

            // Then check sustained limit
            sustainedLimiter(req, res, next);
        });
    };
}

// ============================================
// EXAMPLE 7: Geographic Rate Limiting
// ============================================

/**
 * Different limits based on geographic location
 */
function createGeoBasedRateLimiter(options = {}) {
    const geoLimits = {
        'US': { max: 200, windowMs: 15 * 60 * 1000 },
        'EU': { max: 200, windowMs: 15 * 60 * 1000 },
        'default': { max: 50, windowMs: 15 * 60 * 1000 } // Stricter for other regions
    };

    return async (req, res, next) => {
        // Get country from IP (using a geo-ip service)
        const country = req.geoip?.country || 'default';
        const limits = geoLimits[country] || geoLimits.default;

        const rateLimiter = createRateLimiter({
            ...limits,
            keyPrefix: `geo_${country}`
        });

        return rateLimiter(req, res, next);
    };
}

// ============================================
// EXAMPLE 8: Cost-Based Rate Limiting
// ============================================

/**
 * Each endpoint has a "cost" and user has a budget
 */
class CostBasedRateLimiter {
    constructor(options = {}) {
        this.budget = options.budget || 1000; // Total budget per window
        this.windowMs = options.windowMs || 60 * 60 * 1000; // 1 hour
        this.keyPrefix = options.keyPrefix || 'cost';
    }

    create(cost = 1) {
        return async (req, res, next) => {
            try {
                const redisManager = require('../lib/redisManager');
                const userId = req.user?.userId || req.ip;
                const key = `${this.keyPrefix}:${userId}`;

                // Get current usage
                const currentUsage = parseInt(await redisClient.get(key) || '0', 10);

                if (currentUsage + cost > this.budget) {
                    return res.status(429).json({
                        success: false,
                        error: 'Budget exceeded',
                        code: 'BUDGET_EXCEEDED',
                        current: currentUsage,
                        budget: this.budget,
                        cost
                    });
                }

                // Add cost
                const newUsage = await redisClient.incrBy(key, cost);

                // Set expiry on first request
                if (newUsage === cost) {
                    await redisClient.expire(key, Math.ceil(this.windowMs / 1000));
                }

                // Add headers
                res.set({
                    'X-Cost': cost,
                    'X-Budget-Remaining': Math.max(0, this.budget - newUsage),
                    'X-Budget-Total': this.budget
                });

                next();
            } catch (error) {
                next(); // Fail open
            }
        };
    }
}

// Usage:
// const costLimiter = new CostBasedRateLimiter({ budget: 1000 });
// router.get('/api/cheap', authenticate, costLimiter.create(1), controller.cheap);
// router.get('/api/expensive', authenticate, costLimiter.create(50), controller.expensive);

// ============================================
// EXAMPLE 9: Distributed Rate Limiting
// ============================================

/**
 * Rate limiting across multiple servers
 * (Already works with Redis, but this shows explicit coordination)
 */
function createDistributedRateLimiter(options = {}) {
    return createRateLimiter({
        ...options,
        keyGenerator: (req) => {
            const userId = req.user?.userId || req.ip;
            const serverId = process.env.SERVER_ID || 'default';
            // Use global key to share limits across servers
            return `global:${options.keyPrefix}:${userId}`;
        }
    });
}

// ============================================
// EXAMPLE 10: Adaptive Rate Limiting
// ============================================

/**
 * Automatically adjust limits based on system load
 */
class AdaptiveRateLimiter {
    constructor(options = {}) {
        this.baseMax = options.max || 100;
        this.windowMs = options.windowMs || 15 * 60 * 1000;
        this.keyPrefix = options.keyPrefix || 'adaptive';
    }

    async getSystemLoad() {
        // Get current system load (CPU, memory, etc.)
        const os = require('os');
        const cpuLoad = os.loadavg()[0] / os.cpus().length;
        return cpuLoad;
    }

    create() {
        return async (req, res, next) => {
            const load = await this.getSystemLoad();

            // Reduce limits when under heavy load
            let adjustedMax = this.baseMax;
            if (load > 0.8) {
                adjustedMax = Math.floor(this.baseMax * 0.5); // 50% of normal
            } else if (load > 0.6) {
                adjustedMax = Math.floor(this.baseMax * 0.75); // 75% of normal
            }

            const rateLimiter = createRateLimiter({
                max: adjustedMax,
                windowMs: this.windowMs,
                keyPrefix: this.keyPrefix
            });

            return rateLimiter(req, res, next);
        };
    }
}

module.exports = {
    createTierBasedRateLimiter,
    createTimeBasedRateLimiter,
    createPerEndpointUserRateLimiter,
    createConditionalRateLimiter,
    createSlidingWindowRateLimiter,
    createBurstRateLimiter,
    createGeoBasedRateLimiter,
    CostBasedRateLimiter,
    createDistributedRateLimiter,
    AdaptiveRateLimiter
};