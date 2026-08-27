const crypto = require('crypto');
const {
    Device
} = require('../models');
const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');

/**
 * Device Service (Hybrid: Database + Redis Cache)
 * - Primary storage: Database (persistent)
 * - Cache layer: Redis (fast device trust checks)
 */
class DeviceService {
    constructor() {
        this.devicePrefix = 'device:';
        this.userDevicesPrefix = 'user_devices:';
        this.cacheTTL = 3600; // Cache for 1 hour
    }

    /**
     * Get cache key for device
     */
    _getDeviceCacheKey(user_id, fingerprint) {
        return `${this.devicePrefix}${user_id}:${fingerprint}`;
    }

    /**
     * Get cache key for user's devices list
     */
    _getUserDevicesCacheKey(user_id) {
        return `${this.userDevicesPrefix}${user_id}`;
    }

    /**
     * Generate device fingerprint from device data
     * @param {Object} device_data - Device information
     * @returns {string} Device fingerprint hash
     */
    generateFingerprint(device_data) {
        const {
            user_agent,
            ip_address,
            ...other
        } = device_data;
        const data = `${user_agent}|${ip_address}|${JSON.stringify(other)}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Trust a device for a user
     * @param {string} user_id - User identifier
     * @param {string} fingerprint - Device fingerprint
     * @param {Object} device_info - Device information
     * @param {number} trust_days - Days to trust device
     */
    async trustDevice(user_id, fingerprint, device_info = {}, trust_days = 30) {
        try {
            const {
                user_agent = '',
                ip_address = '',
                browser = 'Unknown',
                browser_version = '',
                os = 'Unknown',
                os_version = '',
                device_type = 'unknown',
                device_name = null
            } = device_info;

            const trust_expires_at = new Date(Date.now() + trust_days * 24 * 60 * 60 * 1000);

            // 1. Update or create in database
            let device = await Device.findOne({
                where: {
                    device_fingerprint: fingerprint
                }
            });

            if (device) {
              
                await device.update({
                    is_trusted: true,
                    verified_at: new Date(),
                    last_used: new Date(),
                    is_active: true,
                    trust_expires_at
                });
            } else {
                device = await Device.create({
                    user_id,
                    device_fingerprint: fingerprint,
                    device_name: device_name || `${device_type} - ${browser}`,
                    device_type,
                    browser,
                    browser_version,
                    os,
                    os_version,
                    user_agent,
                    ip_address,
                    is_trusted: true,
                    is_active: true,
                    verified_at: new Date(),
                    last_used: new Date(),
                    trust_expires_at
                });
            }

            // 2. Cache the device
            const redis = await redisManager.getClientSafe();
            if (redis) {
                const cache_key = this._getDeviceCacheKey(user_id, fingerprint);
                const device_data = device.toJSON();
                await redis.setEx(cache_key, this.cacheTTL, JSON.stringify(device_data));

                // Add to user's devices set
                const user_devices_key = this._getUserDevicesCacheKey(user_id);
                await redis.sAdd(user_devices_key, fingerprint);
                await redis.expire(user_devices_key, this.cacheTTL);
            }

            logger.info(`Device trusted for user ${user_id}: ${fingerprint}`);
            return device;
        } catch (error) {
            logger.error('Failed to trust device:', error);
            throw new Error('Failed to trust device');
        }
    }

    /**
     * Check if device is trusted (cache-first)
     * @param {string} user_id - User identifier
     * @param {string} fingerprint - Device fingerprint
     * @returns {boolean} True if device is trusted
     */
    async isTrusted(user_id, fingerprint) {
        try {
            const redis = await redisManager.getClientSafe();
            const cache_key = this._getDeviceCacheKey(user_id, fingerprint);

            // 1. Check cache first
            if (redis) {
                const cached = await redis.get(cache_key);
                if (cached) {
                    const device = JSON.parse(cached);

                    // Verify trust hasn't expired
                    if (device.is_trusted && (!device.trust_expires_at || new Date(device.trust_expires_at) > new Date())) {
                        logger.debug(`Device trust cache hit: ${fingerprint}`);

                        // Update last used in background (don't wait)
                        this._updateLastUsedBackground(user_id, fingerprint);

                        return true;
                    }
                }
            }

            // 2. Check database
            const {
                Op
            } = require('sequelize');
            const device = await Device.findOne({
                where: {
                    user_id,
                    device_fingerprint: fingerprint,
                    is_trusted: true,
                    is_active: true,
                    [Op.or]: [{
                        trust_expires_at: null
                    },
                    {
                        trust_expires_at: {
                            [Op.gt]: new Date()
                        }
                    }
                    ]
                }
            });

            if (device) {
                // Update cache
                if (redis) {
                    await redis.setEx(cache_key, this.cacheTTL, JSON.stringify(device.toJSON()));
                }

                // Update last used
                await device.update({
                    last_used: new Date()
                });

                return true;
            }

            return false;
        } catch (error) {
            logger.error('Failed to check device trust:', error);
            return false;
        }
    }

    /**
     * Update last used timestamp in background (non-blocking)
     */
    async _updateLastUsedBackground(user_id, fingerprint) {
        Device.update({
            last_used: new Date()
        }, {
            where: {
                user_id,
                device_fingerprint: fingerprint
            }
        }).catch(err => {
            logger.error('Failed to update device last used:', err);
        });
    }

    /**
     * Get all trusted devices for a user
     * @param {string} user_id - User identifier
     * @returns {Array} Array of trusted devices
     */
    async getTrustedDevices(user_id) {
        try {
            const {
                Op
            } = require('sequelize');

            const devices = await Device.findAll({
                where: {
                    user_id,
                    is_trusted: true,
                    is_active: true,
                    [Op.or]: [{
                        trust_expires_at: null
                    },
                    {
                        trust_expires_at: {
                            [Op.gt]: new Date()
                        }
                    }
                    ]
                },
                order: [
                    ['last_used', 'DESC']
                ],
                attributes: {
                    exclude: ['user_agent']
                }
            });

            return devices;
        } catch (error) {
            logger.error('Failed to get trusted devices:', error);
            return [];
        }
    }

    /**
     * Get all devices for a user
     * @param {string} user_id - User identifier
     * @param {boolean} include_inactive - Include inactive devices
     * @returns {Array} Array of devices
     */
    async getUserDevices(user_id, include_inactive = false) {
        try {
            const where = {
                user_id
            };
            if (!include_inactive) {
                where.is_active = true;
            }

            const devices = await Device.findAll({
                where,
                order: [
                    ['last_used', 'DESC']
                ],
                attributes: {
                    exclude: ['user_agent']
                }
            });

            return devices;
        } catch (error) {
            logger.error('Failed to get user devices:', error);
            return [];
        }
    }

    /**
     * Remove trusted device
     * @param {string} user_id - User identifier
     * @param {string} fingerprint - Device fingerprint
     */
    async removeTrustedDevice(user_id, fingerprint) {
        try {
            // 1. Delete from database
            const result = await Device.destroy({
                where: {
                    user_id,
                    device_fingerprint: fingerprint
                }
            });

            // 2. Clear cache
            const redis = await redisManager.getClientSafe();
            if (redis) {
                const cache_key = this._getDeviceCacheKey(user_id, fingerprint);
                await redis.del(cache_key);

                const user_devices_key = this._getUserDevicesCacheKey(user_id);
                await redis.sRem(user_devices_key, fingerprint);
            }

            if (result > 0) {
                logger.info(`Device removed for user ${user_id}: ${fingerprint}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Failed to remove trusted device:', error);
            throw new Error('Failed to remove device');
        }
    }

    /**
     * Revoke trust for a device (soft delete)
     * @param {string} user_id - User identifier
     * @param {string} fingerprint - Device fingerprint
     */
    async revokeTrust(user_id, fingerprint) {
        try {
            // 1. Update database
            const device = await Device.findOne({
                where: {
                    user_id,
                    device_fingerprint: fingerprint
                }
            });

            if (!device) {
                return false;
            }

            await device.update({
                is_trusted: false,
                verified_at: null,
                trust_expires_at: null
            });

            // 2. Clear cache
            const redis = await redisManager.getClientSafe();
            if (redis) {
                const cache_key = this._getDeviceCacheKey(user_id, fingerprint);
                await redis.del(cache_key);
            }

            logger.info(`Device trust revoked for user ${user_id}: ${fingerprint}`);
            return true;
        } catch (error) {
            logger.error('Failed to revoke device trust:', error);
            return false;
        }
    }

    /**
     * Revoke all trusted devices for a user
     * @param {string} user_id - User identifier
     */
    async revokeAllTrustedDevices(user_id) {
        try {
            // 1. Get all device fingerprints
            const devices = await Device.findAll({
                where: {
                    user_id,
                    is_trusted: true
                },
                attributes: ['device_fingerprint']
            });

            const fingerprints = devices.map(d => d.device_fingerprint);

            // 2. Update database
            const result = await Device.update({
                is_trusted: false,
                verified_at: null,
                trust_expires_at: null
            }, {
                where: {
                    user_id,
                    is_trusted: true
                }
            });

            // 3. Clear cache
            const redis = await redisManager.getClientSafe();
            if (redis && fingerprints.length > 0) {
                const cache_keys = fingerprints.map(fp => this._getDeviceCacheKey(user_id, fp));
                await redis.del(cache_keys);

                const user_devices_key = this._getUserDevicesCacheKey(user_id);
                await redis.del(user_devices_key);
            }

            logger.info(`All trusted devices revoked for user ${user_id}`);
            return result[0];
        } catch (error) {
            logger.error('Failed to revoke all trusted devices:', error);
            return 0;
        }
    }

    /**
     * Register or update a device (without trusting it)
     * @param {string} user_id - User identifier
     * @param {Object} device_data - Device information
     */
    async registerDevice(user_id, device_data) {
        try {
            const fingerprint = this.generateFingerprint(device_data);
            const {
                user_agent = '',
                ip_address = '',
                browser = 'Unknown',
                browser_version = '',
                os = 'Unknown',
                os_version = '',
                device_type = 'unknown',
                device_name = null
            } = device_data;

            // Check if device exists
            let device = await Device.findOne({
                where: {
                    device_fingerprint: fingerprint
                }
            });

            if (device) {
                await device.update({
                    last_used: new Date(),
                    ip_address,
                    is_active: true
                });

                return device;
            }

            // Create new device
            device = await Device.create({
                user_id,
                device_fingerprint: fingerprint,
                device_name: device_name || `${device_type} - ${browser}`,
                device_type,
                browser,
                browser_version,
                os,
                os_version,
                user_agent,
                ip_address,
                is_trusted: false,
                is_active: true,
                last_used: new Date()
            });

            logger.info(`Device registered for user ${user_id}: ${fingerprint}`);
            return device;
        } catch (error) {
            logger.error('Failed to register device:', error);
            throw new Error('Failed to register device');
        }
    }

    /**
     * Extend device trust expiration
     * @param {string} user_id - User identifier
     * @param {string} fingerprint - Device fingerprint
     * @param {number} days - Days to extend
     */
    async extendTrust(user_id, fingerprint, days = 30) {
        try {
            const device = await Device.findOne({
                where: {
                    user_id,
                    device_fingerprint: fingerprint
                }
            });

            if (!device) {
                return false;
            }

            const new_expiry = new Date();
            new_expiry.setDate(new_expiry.getDate() + days);

            await device.update({
                trust_expires_at: new_expiry
            });

            // Update cache
            const redis = await redisManager.getClientSafe();
            if (redis) {
                const cache_key = this._getDeviceCacheKey(user_id, fingerprint);
                await redis.setEx(cache_key, this.cacheTTL, JSON.stringify(device.toJSON()));
            }

            logger.info(`Device trust extended for user ${user_id}: ${fingerprint}`);
            return true;
        } catch (error) {
            logger.error('Failed to extend device trust:', error);
            return false;
        }
    }

    /**
     * Cleanup expired device trust
     */
    async cleanupExpiredTrust() {
        try {
            const {
                Op
            } = require('sequelize');

            const result = await Device.update({
                is_trusted: false,
                verified_at: null
            }, {
                where: {
                    trust_expires_at: {
                        [Op.lt]: new Date()
                    },
                    is_trusted: true
                }
            });

            logger.info(`Cleaned up ${result[0]} expired device trusts`);
            return result[0];
        } catch (error) {
            logger.error('Failed to cleanup expired device trust:', error);
            return 0;
        }
    }

    /**
     * Cleanup inactive devices
     * @param {number} days_inactive - Days of inactivity before cleanup
     */
    async cleanupInactiveDevices(days_inactive = 90) {
        try {
            const {
                Op
            } = require('sequelize');
            const cutoff_date = new Date();
            cutoff_date.setDate(cutoff_date.getDate() - days_inactive);

            const count = await Device.destroy({
                where: {
                    last_used: {
                        [Op.lt]: cutoff_date
                    },
                    is_trusted: false
                }
            });

            logger.info(`Cleaned up ${count} inactive devices`);
            return count;
        } catch (error) {
            logger.error('Failed to cleanup inactive devices:', error);
            return 0;
        }
    }

    /**
     * Clear device cache for a user
     * @param {string} user_id - User identifier
     */
    async clearCache(user_id) {
        try {
            const redis = await redisManager.getClientSafe();
            if (!redis) return;

            const user_devices_key = this._getUserDevicesCacheKey(user_id);
            const fingerprints = await redis.sMembers(user_devices_key);

            if (fingerprints.length > 0) {
                const cache_keys = fingerprints.map(fp => this._getDeviceCacheKey(user_id, fp));
                await redis.del([...cache_keys, user_devices_key]);
            }

            logger.info(`Device cache cleared for user: ${user_id}`);
        } catch (error) {
            logger.error('Failed to clear device cache:', error);
        }
    }
}

module.exports = new DeviceService();