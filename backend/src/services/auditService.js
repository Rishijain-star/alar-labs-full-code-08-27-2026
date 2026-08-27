const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');
const {
    AuditLog
} = require('../models');

/**
 * Audit Service (Hybrid: Database + Redis Cache)
 * - Primary storage: Database (persistent audit trail)
 * - Cache layer: Redis (recent logs for fast access)
 */
class AuditService {
    constructor() {
        this.auditPrefix = 'audit:';
        this.userAuditPrefix = 'user_audit:';
        this.auditTTL = 90 * 24 * 60 * 60; // 90 days
        this.cacheTTL = 3600; // Cache for 1 hour

        this.initialized = false;
    }


    /**
     * Log an audit event (database + Redis cache)
     * @param {Object} event - Audit event details
     */
    async log(event) {
        try {
            if (!AuditLog) {
                logger.warn('Audit logging unavailable - database not initialized');
                return false;
            }

            // 1. Save to database (primary storage)
            const audit_entry = await AuditLog.create({
                user_id: event.user_id || null,
                action: event.action,
                resource_type: event.resource_type || null,
                resource_id: event.resource_id || null,
                metadata: event.metadata || event.details || {},
                ip_address: event.ip_address || null,
                user_agent: event.user_agent || null,
                success: event.success !== undefined ? event.success : true,
                error_message: event.error_message || null
            });

            // 2. Cache recent logs in Redis for fast access
            const redis = await redisManager.getClientSafe();
            if (redis) {
                const timestamp = Date.now();

                // Store in global audit log (sorted set)
                const audit_key = `${this.auditPrefix}recent`;
                await redis.zAdd(audit_key, {
                    score: timestamp,
                    value: JSON.stringify(audit_entry.toJSON())
                });
                await redis.expire(audit_key, this.cacheTTL);

                // Add to user's audit log (sorted set for easy retrieval)
                const user_id = event.user_id;
                if (user_id) {
                    const user_audit_key = `${this.userAuditPrefix}${user_id}`;
                    await redis.zAdd(user_audit_key, {
                        score: timestamp,
                        value: JSON.stringify(audit_entry.toJSON())
                    });
                    await redis.expire(user_audit_key, this.cacheTTL);
                }
            }

            logger.info('Audit log created:', {
                id: audit_entry.id,
                user_id: event.user_id,
                action: event.action
            });

            return true;
        } catch (error) {
            logger.error('Failed to log audit event:', error);
            // Don't throw - audit logging should not break the main flow
            return false;
        }
    }

    /**
     * Get user's audit logs (cache-first for recent, then database)
     * @param {string} user_id - User identifier
     * @param {Object} options - Query options
     * @returns {Object} Paginated audit logs
     */
    async getUserLogs(user_id, options = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                action = null
            } = options;

            // Try cache for first page only
            if (page === 1 && !action) {
                const redis = await redisManager.getClientSafe();
                if (redis) {
                    const user_audit_key = `${this.userAuditPrefix}${user_id}`;
                    const cached = await redis.zRange(user_audit_key, -limit, -1, {
                        REV: true
                    });

                    if (cached && cached.length > 0) {
                        logger.debug(`User audit logs cache hit: ${user_id}`);
                        const logs = cached.map(log => JSON.parse(log));
                        return {
                            logs,
                            page: 1,
                            limit,
                            total: cached.length,
                            totalPages: 1,
                            cached: true
                        };
                    }
                }
            }

            // Get from database
            const where = {
                user_id
            };
            if (action) {
                where.action = action;
            }

            const offset = (page - 1) * limit;

            const {
                count,
                rows
            } = await AuditLog.findAndCountAll({
                where,
                order: [
                    ['created_at', 'DESC']
                ],
                limit,
                offset
            });

            return {
                logs: rows,
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            };
        } catch (error) {
            logger.error('Failed to get user audit logs:', error);
            return {
                logs: [],
                page: 1,
                limit,
                total: 0,
                totalPages: 0
            };
        }
    }

    /**
     * Get recent login attempts for a user
     * @param {string} user_id - User identifier
     * @param {number} count - Number of recent logins to retrieve
     * @returns {Array} Array of login audit logs
     */
    async getRecentLogins(user_id, count = 5) {
        try {
            const {
                Op
            } = require('sequelize');

            const logs = await AuditLog.findAll({
                where: {
                    user_id,
                    action: {
                        [Op.in]: ['LOGIN_SUCCESS', 'OAUTH_LOGIN_SUCCESS', 'WEBAUTHN_LOGIN_SUCCESS']
                    }
                },
                order: [
                    ['created_at', 'DESC']
                ],
                limit: count
            });

            return logs;
        } catch (error) {
            logger.error('Failed to get recent logins:', error);
            return [];
        }
    }

    /**
     * Get audit logs by action
     * @param {string} action - Action type
     * @param {number} limit - Maximum number of logs
     * @returns {Array} Array of audit logs
     */
    async getLogsByAction(action, limit = 100) {
        try {
            const logs = await AuditLog.findAll({
                where: {
                    action
                },
                order: [
                    ['created_at', 'DESC']
                ],
                limit
            });

            return logs;
        } catch (error) {
            logger.error('Failed to get logs by action:', error);
            return [];
        }
    }

    /**
     * Get security events for monitoring
     * @param {number} hours - Hours to look back
     * @returns {Array} Array of security events
     */
    async getSecurityEvents(hours = 24) {
        try {
            const {
                Op
            } = require('sequelize');
            const cutoff_date = new Date();
            cutoff_date.setHours(cutoff_date.getHours() - hours);

            const security_actions = [
                'LOGIN_BLOCKED',
                'MFA_VERIFICATION_FAILED',
                'INVALID_REFRESH_TOKEN',
                'TOKEN_REVOKED',
                'ALL_TOKENS_REVOKED',
                'SUSPICIOUS_ACTIVITY',
                'LOGIN_FAILED',
                'UNAUTHORIZED_ACCESS'
            ];

            const events = await AuditLog.findAll({
                where: {
                    action: {
                        [Op.in]: security_actions
                    },
                    created_at: {
                        [Op.gte]: cutoff_date
                    }
                },
                order: [
                    ['created_at', 'DESC']
                ],
                limit: 500
            });

            return events;
        } catch (error) {
            logger.error('Failed to get security events:', error);
            return [];
        }
    }

    /**
     * Get failed login attempts for a user
     * @param {string} user_id - User identifier
     * @param {number} hours - Hours to look back
     * @returns {Array} Array of failed login attempts
     */
    async getFailedLogins(user_id, hours = 24) {
        try {
            const {
                Op
            } = require('sequelize');
            const cutoff_date = new Date();
            cutoff_date.setHours(cutoff_date.getHours() - hours);

            const logs = await AuditLog.findAll({
                where: {
                    user_id,
                    action: 'LOGIN_FAILED',
                    created_at: {
                        [Op.gte]: cutoff_date
                    }
                },
                order: [
                    ['created_at', 'DESC']
                ]
            });

            return logs;
        } catch (error) {
            logger.error('Failed to get failed logins:', error);
            return [];
        }
    }

    /**
     * Get audit statistics
     * @param {Object} options - Filter options
     * @returns {Object} Statistics object
     */
    async getStats(options = {}) {
        try {
            const {
                user_id = null, hours = 24
            } = options;
            const {
                Op,
                fn,
                col
            } = require('sequelize');

            const cutoff_date = new Date();
            cutoff_date.setHours(cutoff_date.getHours() - hours);

            const where = {
                created_at: {
                    [Op.gte]: cutoff_date
                }
            };

            if (user_id) {
                where.user_id = user_id;
            }

            const total = await AuditLog.count({
                where
            });

            const successful = await AuditLog.count({
                where: {
                    ...where,
                    success: true
                }
            });

            const failed = total - successful;

            // Get top actions
            const top_actions = await AuditLog.findAll({
                attributes: [
                    'action',
                    [fn('COUNT', col('id')), 'count']
                ],
                where,
                group: ['action'],
                order: [
                    [fn('COUNT', col('id')), 'DESC']
                ],
                limit: 10
            });

            return {
                total,
                successful,
                failed,
                top_actions: top_actions.map(item => ({
                    action: item.action,
                    count: parseInt(item.get('count'))
                }))
            };
        } catch (error) {
            logger.error('Failed to get audit stats:', error);
            return {
                total: 0,
                successful: 0,
                failed: 0,
                top_actions: []
            };
        }
    }

    /**
     * Delete old audit logs (run periodically)
     * @param {number} days_to_keep - Number of days to keep logs
     * @returns {number} Number of logs deleted
     */
    async cleanupOldLogs(days_to_keep = 90) {
        try {
            const {
                Op
            } = require('sequelize');
            const cutoff_date = new Date();
            cutoff_date.setDate(cutoff_date.getDate() - days_to_keep);

            const count = await AuditLog.destroy({
                where: {
                    created_at: {
                        [Op.lt]: cutoff_date
                    }
                }
            });

            logger.info(`Cleaned up ${count} old audit logs`);
            return count;
        } catch (error) {
            logger.error('Failed to cleanup old logs:', error);
            return 0;
        }
    }

    /**
     * Search audit logs
     * @param {Object} criteria - Search criteria
     * @returns {Array} Array of matching logs
     */
    async search(criteria) {
        try {
            const {
                Op
            } = require('sequelize');
            const where = {};

            if (criteria.user_id) where.user_id = criteria.user_id;
            if (criteria.action) where.action = criteria.action;
            if (criteria.resource_type) where.resource_type = criteria.resource_type;
            if (criteria.success !== undefined) where.success = criteria.success;

            if (criteria.start_date || criteria.end_date) {
                where.created_at = {};
                if (criteria.start_date) {
                    where.created_at[Op.gte] = new Date(criteria.start_date);
                }
                if (criteria.end_date) {
                    where.created_at[Op.lte] = new Date(criteria.end_date);
                }
            }

            const logs = await AuditLog.findAll({
                where,
                order: [
                    ['created_at', 'DESC']
                ],
                limit: criteria.limit || 100
            });

            return logs;
        } catch (error) {
            logger.error('Failed to search audit logs:', error);
            return [];
        }
    }

    /**
     * Clear audit cache for a user
     * @param {string} user_id - User identifier
     */
    async clearCache(user_id = null) {
        try {
            const redis = await redisManager.getClientSafe();
            if (!redis) return;

            if (user_id) {
                const user_audit_key = `${this.userAuditPrefix}${user_id}`;
                await redis.del(user_audit_key);
            } else {
                const keys = await redis.keys(`${this.userAuditPrefix}*`);
                if (keys.length > 0) {
                    await redis.del(keys);
                }
            }

            logger.debug(`Audit cache cleared${user_id ? ` for user: ${user_id}` : ''}`);
        } catch (error) {
            logger.error('Failed to clear audit cache:', error);
        }
    }
}

module.exports = new AuditService();