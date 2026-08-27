const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');

/**
 * Feature Flags System
 * Enables safe rollout of MFA fixes and improvements
 */
class FeatureFlags {
    constructor() {
        this.flagPrefix = 'feature_flag:';
        this.userFlagPrefix = 'user_feature_flag:';
        this.cacheTTL = 5 * 60; // 5 minutes cache
        this.localCache = new Map();
        this.lastCacheUpdate = new Map();

        // Default flag configurations
        this.defaultFlags = {
            // MFA Verification Flags
            'mfa.wideTimeWindow': {
                enabled: false,
                description: 'Use wider time window (±5 steps) for TOTP verification',
                rolloutPercentage: 0,
                enabledForUsers: []
            },
            'mfa.enhancedLogging': {
                enabled: true,
                description: 'Enable detailed MFA verification logging',
                rolloutPercentage: 100,
                enabledForUsers: []
            },
            'mfa.qrCodeValidation': {
                enabled: false,
                description: 'Validate QR code immediately after generation',
                rolloutPercentage: 0,
                enabledForUsers: []
            },
            'mfa.secretRegeneration': {
                enabled: false,
                description: 'Allow users to regenerate secret if verification fails',
                rolloutPercentage: 0,
                enabledForUsers: []
            },
            'mfa.setupVerificationRetries': {
                enabled: true,
                description: 'Allow multiple verification attempts during setup',
                rolloutPercentage: 100,
                enabledForUsers: [],
                config: { maxRetries: 3 }
            },
            'mfa.clockSkewDetection': {
                enabled: true,
                description: 'Detect and warn about clock skew issues',
                rolloutPercentage: 100,
                enabledForUsers: []
            },

            // Testing & Debug Flags
            'mfa.debugMode': {
                enabled: false,
                description: 'Enable debug endpoints and detailed logging',
                rolloutPercentage: 0,
                enabledForUsers: []
            },
            'mfa.testTokenGeneration': {
                enabled: false,
                description: 'Generate test tokens for verification debugging',
                rolloutPercentage: 0,
                enabledForUsers: []
            },

            // Gradual Rollout Flags
            'mfa.newVerificationFlow': {
                enabled: false,
                description: 'Use new verification flow with improved error handling',
                rolloutPercentage: 0,
                enabledForUsers: []
            }
        };
    }

    /* ====================================
       FLAG EVALUATION
    ==================================== */

    /**
     * Check if a feature flag is enabled
     * @param {string} flagName - Feature flag name
     * @param {string} userId - Optional user ID for user-specific flags
     * @returns {Promise<boolean>}
     */
    async isEnabled(flagName, userId = null) {
        try {
            // Check cache first
            const cached = this._getFromCache(flagName, userId);
            if (cached !== null) {
                return cached;
            }

            const flag = await this._getFlag(flagName);
            if (!flag) {
                logger.warn(`Feature flag not found: ${flagName}`);
                return false;
            }

            // Check if explicitly enabled/disabled
            if (flag.enabled === true) {
                this._setCache(flagName, userId, true);
                return true;
            }
            if (flag.enabled === false && !userId) {
                this._setCache(flagName, userId, false);
                return false;
            }

            // Check user-specific override
            if (userId && flag.enabledForUsers.includes(userId)) {
                this._setCache(flagName, userId, true);
                return true;
            }

            // Check rollout percentage
            if (userId && flag.rolloutPercentage > 0) {
                const isInRollout = this._isUserInRollout(userId, flagName, flag.rolloutPercentage);
                this._setCache(flagName, userId, isInRollout);
                return isInRollout;
            }

            this._setCache(flagName, userId, false);
            return false;
        } catch (error) {
            logger.error(`Error evaluating feature flag ${flagName}:`, error);
            return false;
        }
    }

    /**
     * Get flag configuration
     * @param {string} flagName - Feature flag name
     * @returns {Promise<Object|null>}
     */
    async getConfig(flagName) {
        try {
            const flag = await this._getFlag(flagName);
            return flag?.config || null;
        } catch (error) {
            logger.error(`Error getting flag config ${flagName}:`, error);
            return null;
        }
    }

    /**
     * Check multiple flags at once
     * @param {string[]} flagNames - Array of feature flag names
     * @param {string} userId - Optional user ID
     * @returns {Promise<Object>} Map of flag names to boolean values
     */
    async checkFlags(flagNames, userId = null) {
        const results = {};
        await Promise.all(
            flagNames.map(async (flagName) => {
                results[flagName] = await this.isEnabled(flagName, userId);
            })
        );
        return results;
    }

    /* ====================================
       FLAG MANAGEMENT
    ==================================== */

    /**
     * Enable a feature flag globally
     * @param {string} flagName - Feature flag name
     */
    async enable(flagName) {
        try {
            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.enabled = true;
            await this._saveFlag(flagName, flag);
            this._invalidateCache(flagName);

            logger.info(`Feature flag enabled: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error enabling feature flag ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Disable a feature flag globally
     * @param {string} flagName - Feature flag name
     */
    async disable(flagName) {
        try {
            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.enabled = false;
            await this._saveFlag(flagName, flag);
            this._invalidateCache(flagName);

            logger.info(`Feature flag disabled: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error disabling feature flag ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Set rollout percentage for gradual rollout
     * @param {string} flagName - Feature flag name
     * @param {number} percentage - Percentage (0-100)
     */
    async setRolloutPercentage(flagName, percentage) {
        try {
            if (percentage < 0 || percentage > 100) {
                throw new Error('Percentage must be between 0 and 100');
            }

            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.rolloutPercentage = percentage;
            await this._saveFlag(flagName, flag);
            this._invalidateCache(flagName);

            logger.info(`Feature flag rollout set to ${percentage}%: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error setting rollout percentage for ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Enable flag for specific users
     * @param {string} flagName - Feature flag name
     * @param {string[]} userIds - Array of user IDs
     */
    async enableForUsers(flagName, userIds) {
        try {
            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.enabledForUsers = [...new Set([...flag.enabledForUsers, ...userIds])];
            await this._saveFlag(flagName, flag);

            // Invalidate cache for these users
            userIds.forEach(userId => this._invalidateCache(flagName, userId));

            logger.info(`Feature flag enabled for ${userIds.length} users: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error enabling flag for users ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Disable flag for specific users
     * @param {string} flagName - Feature flag name
     * @param {string[]} userIds - Array of user IDs
     */
    async disableForUsers(flagName, userIds) {
        try {
            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.enabledForUsers = flag.enabledForUsers.filter(id => !userIds.includes(id));
            await this._saveFlag(flagName, flag);

            // Invalidate cache for these users
            userIds.forEach(userId => this._invalidateCache(flagName, userId));

            logger.info(`Feature flag disabled for ${userIds.length} users: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error disabling flag for users ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Update flag configuration
     * @param {string} flagName - Feature flag name
     * @param {Object} config - Configuration object
     */
    async updateConfig(flagName, config) {
        try {
            const flag = await this._getFlag(flagName);
            if (!flag) {
                throw new Error(`Feature flag not found: ${flagName}`);
            }

            flag.config = { ...flag.config, ...config };
            await this._saveFlag(flagName, flag);
            this._invalidateCache(flagName);

            logger.info(`Feature flag config updated: ${flagName}`);
            return true;
        } catch (error) {
            logger.error(`Error updating flag config ${flagName}:`, error);
            throw error;
        }
    }

    /* ====================================
       INITIALIZATION & UTILITIES
    ==================================== */

    /**
     * Initialize feature flags (load defaults into Redis)
     */
    async initialize() {
        try {
            const redis =await  redisClient.getClient();

            for (const [flagName, flagConfig] of Object.entries(this.defaultFlags)) {
                const key = `${this.flagPrefix}${flagName}`;
                const exists = await redis.exists(key);

                if (!exists) {
                    await redis.set(key, JSON.stringify(flagConfig));
                    logger.info(`Initialized feature flag: ${flagName}`);
                }
            }

            logger.info('Feature flags initialized');
        } catch (error) {
            logger.error('Failed to initialize feature flags:', error);
            throw error;
        }
    }

    /**
     * List all feature flags
     * @returns {Promise<Object>}
     */
    async listFlags() {
        try {
            const redis =await  redisClient.getClient();
            const keys = await redis.keys(`${this.flagPrefix}*`);

            const flags = {};
            for (const key of keys) {
                const flagName = key.replace(this.flagPrefix, '');
                const data = await redis.get(key);
                flags[flagName] = JSON.parse(data);
            }

            return flags;
        } catch (error) {
            logger.error('Failed to list feature flags:', error);
            throw error;
        }
    }

    /**
     * Get flag status for a specific user
     * @param {string} userId - User ID
     * @returns {Promise<Object>}
     */
    async getUserFlags(userId) {
        try {
            const allFlags = await this.listFlags();
            const userFlags = {};

            for (const [flagName, flagConfig] of Object.entries(allFlags)) {
                userFlags[flagName] = {
                    enabled: await this.isEnabled(flagName, userId),
                    description: flagConfig.description,
                    isUserSpecific: flagConfig.enabledForUsers.includes(userId),
                    rolloutPercentage: flagConfig.rolloutPercentage
                };
            }

            return userFlags;
        } catch (error) {
            logger.error('Failed to get user flags:', error);
            throw error;
        }
    }

    /* ====================================
       PRIVATE METHODS
    ==================================== */

    /**
     * Get flag from Redis
     * @private
     */
    async _getFlag(flagName) {
        try {
            const redis =await  redisClient.getClient();
            const key = `${this.flagPrefix}${flagName}`;
            const data = await redis.get(key);

            if (!data) {
                // Return default if exists
                return this.defaultFlags[flagName] || null;
            }

            return JSON.parse(data);
        } catch (error) {
            logger.error(`Error getting flag ${flagName}:`, error);
            return this.defaultFlags[flagName] || null;
        }
    }

    /**
     * Save flag to Redis
     * @private
     */
    async _saveFlag(flagName, flagData) {
        try {
            const redis =await  redisClient.getClient();
            const key = `${this.flagPrefix}${flagName}`;
            await redis.set(key, JSON.stringify(flagData));
        } catch (error) {
            logger.error(`Error saving flag ${flagName}:`, error);
            throw error;
        }
    }

    /**
     * Determine if user is in rollout based on percentage
     * Uses consistent hashing for stable assignments
     * @private
     */
    _isUserInRollout(userId, flagName, percentage) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5')
            .update(`${userId}:${flagName}`)
            .digest('hex');

        const hashInt = parseInt(hash.substring(0, 8), 16);
        const userPercentage = (hashInt % 100) + 1;

        return userPercentage <= percentage;
    }

    /**
     * Get from local cache
     * @private
     */
    _getFromCache(flagName, userId) {
        const cacheKey = userId ? `${flagName}:${userId}` : flagName;
        const lastUpdate = this.lastCacheUpdate.get(cacheKey);

        if (!lastUpdate || Date.now() - lastUpdate > this.cacheTTL * 1000) {
            return null;
        }

        return this.localCache.get(cacheKey) ?? null;
    }

    /**
     * Set local cache
     * @private
     */
    _setCache(flagName, userId, value) {
        const cacheKey = userId ? `${flagName}:${userId}` : flagName;
        this.localCache.set(cacheKey, value);
        this.lastCacheUpdate.set(cacheKey, Date.now());
    }

    /**
     * Invalidate cache
     * @private
     */
    _invalidateCache(flagName, userId = null) {
        if (userId) {
            const cacheKey = `${flagName}:${userId}`;
            this.localCache.delete(cacheKey);
            this.lastCacheUpdate.delete(cacheKey);
        } else {
            // Clear all cache entries for this flag
            for (const key of this.localCache.keys()) {
                if (key.startsWith(flagName)) {
                    this.localCache.delete(key);
                    this.lastCacheUpdate.delete(key);
                }
            }
        }
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.localCache.clear();
        this.lastCacheUpdate.clear();
        logger.info('Feature flags cache cleared');
    }
}

module.exports = new FeatureFlags();