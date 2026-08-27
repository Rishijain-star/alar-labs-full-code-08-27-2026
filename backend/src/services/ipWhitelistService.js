const {
    IPWhitelist
} = require('../models');
const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');

/**
 * IP Whitelist Service (Hybrid: Database + Redis Cache)
 * - Primary storage: Database (persistent)
 * - Cache layer: Redis (fast IP checks)
 */
class IpWhitelistService {
    constructor() {
        this.whitelistPrefix = 'ip_whitelist:';
        this.cacheTTL = 1800; // Cache for 30 minutes
    }

    /**
     * Get cache key for user's whitelist
     */
    _getWhitelistCacheKey(userId) {
        return `${this.whitelistPrefix}${userId}`;
    }

    /**
     * Check if an IP is whitelisted for a user (cache-first)
     * @param {string} userId - User identifier
     * @param {string} ipAddress - IP address to check
     * @returns {boolean} True if IP is whitelisted or whitelist is disabled
     */
    async checkIp(userId, ipAddress) {
        try {
            const redis = await redisManager.getClientSafe();
            const cacheKey = this._getWhitelistCacheKey(userId);

            // 1. Try cache first
            if (redis) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const whitelist = JSON.parse(cached);
                    logger.debug(`IP whitelist cache hit for user: ${userId}`);

                    // If disabled, allow all
                    if (!whitelist.enabled || whitelist.ips.length === 0) {
                        return true;
                    }

                    // Check if IP is in list
                    const isWhitelisted = whitelist.ips.some(item => item.ipAddress === ipAddress);

                    if (isWhitelisted) {
                        // Update last used in background
                        this._updateLastUsedBackground(userId, ipAddress);
                    }

                    return isWhitelisted;
                }
            }

            // 2. Get from database
            const whitelist = await this.getWhitelist(userId);

            // Cache the result
            if (redis) {
                await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(whitelist));
            }

            // If whitelist is disabled, allow all IPs
            if (!whitelist.enabled || whitelist.ips.length === 0) {
                return true;
            }

            // Check if IP exists in whitelist
            const isWhitelisted = whitelist.ips.some(item => item.ipAddress === ipAddress);

            if (isWhitelisted) {
                await this.updateLastUsed(userId, ipAddress);
            }

            return isWhitelisted;
        } catch (error) {
            logger.error('Failed to check IP whitelist:', error);
            return true; // Fail open - allow access on error
        }
    }

    /**
     * Get whitelist configuration for a user
     * @param {string} userId - User identifier
     * @returns {Object} Whitelist configuration
     */
    async getWhitelist(userId) {
        try {
            const {
                Op
            } = require('sequelize');

            const ips = await IPWhitelist.findAll({
                where: {
                    userId,
                    isActive: true,
                    [Op.or]: [{
                            expiresAt: null
                        },
                        {
                            expiresAt: {
                                [Op.gt]: new Date()
                            }
                        }
                    ]
                },
                order: [
                    ['createdAt', 'DESC']
                ]
            });

            // Whitelist is enabled if any active IPs exist
            const enabled = ips.length > 0;

            return {
                enabled,
                ips: ips.map(ip => ({
                    ipAddress: ip.ipAddress,
                    ipRange: ip.ipRange,
                    description: ip.description,
                    addedAt: ip.createdAt,
                    lastUsed: ip.lastUsed
                }))
            };
        } catch (error) {
            logger.error('Failed to get whitelist:', error);
            return {
                enabled: false,
                ips: []
            };
        }
    }

    /**
     * Add IP to whitelist
     * @param {string} userId - User identifier
     * @param {string} ip - IP address
     * @param {string} description - Description of the IP
     * @param {Date} expiresAt - Optional expiration date
     */
    async addIp(userId, ip, description = '', expiresAt = null) {
        try {
            // 1. Update or create in database
            const existing = await IPWhitelist.findOne({
                where: {
                    userId,
                    ipAddress: ip
                }
            });

            let whitelistEntry;

            if (existing) {
                await existing.update({
                    isActive: true,
                    description: description || existing.description,
                    expiresAt,
                    lastUsed: null
                });
                whitelistEntry = existing;
            } else {
                whitelistEntry = await IPWhitelist.create({
                    userId,
                    ipAddress: ip,
                    description,
                    isActive: true,
                    addedBy: userId,
                    expiresAt
                });
            }

            // 2. Invalidate cache
            await this.clearCache(userId);

            logger.info(`IP added to whitelist for user ${userId}: ${ip}`);
            return whitelistEntry;
        } catch (error) {
            logger.error('Failed to add IP to whitelist:', error);
            throw new Error('Failed to add IP to whitelist');
        }
    }

    /**
     * Remove IP from whitelist
     * @param {string} userId - User identifier
     * @param {string} ip - IP address
     */
    async removeIp(userId, ip) {
        try {
            // 1. Delete from database
            const result = await IPWhitelist.destroy({
                where: {
                    userId,
                    ipAddress: ip
                }
            });

            // 2. Invalidate cache
            if (result > 0) {
                await this.clearCache(userId);
                logger.info(`IP removed from whitelist for user ${userId}: ${ip}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Failed to remove IP from whitelist:', error);
            throw new Error('Failed to remove IP from whitelist');
        }
    }

    /**
     * Enable or disable IP whitelist for a user
     * @param {string} userId - User identifier
     * @param {boolean} enabled - Enable or disable
     */
    async setEnabled(userId, enabled) {
        try {
            // Update all IPs for user
            const result = await IPWhitelist.update({
                isActive: enabled
            }, {
                where: {
                    userId
                }
            });

            // Invalidate cache
            await this.clearCache(userId);

            logger.info(`IP whitelist ${enabled ? 'enabled' : 'disabled'} for user: ${userId}`);
            return result[0];
        } catch (error) {
            logger.error('Failed to set whitelist enabled status:', error);
            throw new Error('Failed to update whitelist status');
        }
    }

    /**
     * Update last used timestamp for an IP
     * @param {string} userId - User identifier
     * @param {string} ipAddress - IP address
     */
    async updateLastUsed(userId, ipAddress) {
        try {
            await IPWhitelist.update({
                lastUsed: new Date()
            }, {
                where: {
                    userId,
                    ipAddress
                }
            });
        } catch (error) {
            logger.error('Failed to update IP last used:', error);
        }
    }

    /**
     * Update last used in background (non-blocking)
     */
    async _updateLastUsedBackground(userId, ipAddress) {
        IPWhitelist.update({
            lastUsed: new Date()
        }, {
            where: {
                userId,
                ipAddress
            }
        }).catch(err => {
            logger.error('Failed to update IP last used:', err);
        });
    }

    /**
     * Get all IPs for a user
     * @param {string} userId - User identifier
     * @param {boolean} includeInactive - Include inactive IPs
     * @returns {Array} Array of IP entries
     */
    async getUserIPs(userId, includeInactive = false) {
        try {
            const {
                Op
            } = require('sequelize');
            const where = {
                userId
            };

            if (!includeInactive) {
                where.isActive = true;
                where[Op.or] = [{
                        expiresAt: null
                    },
                    {
                        expiresAt: {
                            [Op.gt]: new Date()
                        }
                    }
                ];
            }

            const ips = await IPWhitelist.findAll({
                where,
                order: [
                    ['createdAt', 'DESC']
                ]
            });

            return ips;
        } catch (error) {
            logger.error('Failed to get user IPs:', error);
            return [];
        }
    }

    /**
     * Check if IP whitelist is enabled for user
     * @param {string} userId - User identifier
     * @returns {boolean} True if enabled
     */
    async isWhitelistEnabled(userId) {
        try {
            const count = await IPWhitelist.count({
                where: {
                    userId,
                    isActive: true
                }
            });

            return count > 0;
        } catch (error) {
            logger.error('Failed to check if whitelist is enabled:', error);
            return false;
        }
    }

    /**
     * Get count of active whitelisted IPs for a user
     * @param {string} userId - User identifier
     * @returns {number} Count of active IPs
     */
    async getActiveCount(userId) {
        try {
            const {
                Op
            } = require('sequelize');

            return await IPWhitelist.count({
                where: {
                    userId,
                    isActive: true,
                    [Op.or]: [{
                            expiresAt: null
                        },
                        {
                            expiresAt: {
                                [Op.gt]: new Date()
                            }
                        }
                    ]
                }
            });
        } catch (error) {
            logger.error('Failed to get active IP count:', error);
            return 0;
        }
    }

    /**
     * Cleanup expired IP whitelist entries
     */
    async cleanupExpired() {
        try {
            const {
                Op
            } = require('sequelize');

            const count = await IPWhitelist.destroy({
                where: {
                    expiresAt: {
                        [Op.lt]: new Date()
                    }
                }
            });

            logger.info(`Cleaned up ${count} expired IP whitelist entries`);
            return count;
        } catch (error) {
            logger.error('Failed to cleanup expired IPs:', error);
            return 0;
        }
    }

    /**
     * Add IP range to whitelist (CIDR notation)
     * @param {string} userId - User identifier
     * @param {string} ipRange - IP range in CIDR notation
     * @param {string} description - Description
     */
    async addIpRange(userId, ipRange, description = '') {
        try {
            const whitelistEntry = await IPWhitelist.create({
                userId,
                ipAddress: ipRange.split('/')[0],
                ipRange,
                description,
                isActive: true,
                addedBy: userId
            });

            // Invalidate cache
            await this.clearCache(userId);

            logger.info(`IP range added to whitelist for user ${userId}: ${ipRange}`);
            return whitelistEntry;
        } catch (error) {
            logger.error('Failed to add IP range to whitelist:', error);
            throw new Error('Failed to add IP range');
        }
    }

    /**
     * Check if IP is in a whitelisted range
     * @param {string} userId - User identifier
     * @param {string} ipAddress - IP address to check
     * @returns {boolean} True if IP is in a whitelisted range
     */
    async checkIpRange(userId, ipAddress) {
        try {
            const {
                Op
            } = require('sequelize');

            const ranges = await IPWhitelist.findAll({
                where: {
                    userId,
                    isActive: true,
                    ipRange: {
                        [Op.ne]: null
                    }
                }
            });

            for (const range of ranges) {
                if (this._isIpInRange(ipAddress, range.ipRange)) {
                    await this.updateLastUsed(userId, range.ipAddress);
                    return true;
                }
            }

            return false;
        } catch (error) {
            logger.error('Failed to check IP range:', error);
            return false;
        }
    }

    /**
     * Check if IP is in CIDR range
     * @param {string} ip - IP address
     * @param {string} cidr - CIDR notation
     * @returns {boolean} True if IP is in range
     */
    _isIpInRange(ip, cidr) {
        try {
            const [range, bits] = cidr.split('/');
            const mask = -1 << (32 - parseInt(bits));

            const ipInt = this._ipToInt(ip);
            const rangeInt = this._ipToInt(range);

            return (ipInt & mask) === (rangeInt & mask);
        } catch (error) {
            logger.error('IP range check error:', error);
            return false;
        }
    }

    /**
     * Convert IP to integer
     * @param {string} ip - IP address
     * @returns {number} Integer representation
     */
    _ipToInt(ip) {
        return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet), 0) >>> 0;
    }

    /**
     * Clear whitelist cache for a user
     * @param {string} userId - User identifier
     */
    async clearCache(userId) {
        try {
            const redis = await redisManager.getClientSafe();
            if (!redis) return;

            const cacheKey = this._getWhitelistCacheKey(userId);
            await redis.del(cacheKey);

            logger.debug(`IP whitelist cache cleared for user: ${userId}`);
        } catch (error) {
            logger.error('Failed to clear IP whitelist cache:', error);
        }
    }
}

module.exports = new IpWhitelistService();