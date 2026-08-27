const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Permission Invalidation Service
 * Handles permission changes and token/session invalidation
 */
class PermissionInvalidationService {
    constructor(redisClient, sessionService, tokenBlacklistService) {
        this.redis = redisClient;
        this.sessionService = sessionService;
        this.tokenBlacklistService = tokenBlacklistService;

        // Redis keys
        this.PERMISSION_VERSION_KEY = 'permission_version:';
        this.ROLE_PERMISSION_HASH_KEY = 'role_permission_hash:';
    }

    /**
     * Get current permission version for a role
     */
    async getRolePermissionVersion(roleId) {
        try {
            const version = await this.redis.get(`${this.PERMISSION_VERSION_KEY}${roleId}`);
            return version ? parseInt(version) : 0;
        } catch (error) {
            logger.error('Error getting permission version:', error);
            return 0;
        }
    }

    /**
     * Increment permission version when role permissions change
     */
    async invalidateRolePermissions(roleId) {
        try {
            // Increment version
            const newVersion = await this.redis.incr(`${this.PERMISSION_VERSION_KEY}${roleId}`);

            // Set expiry (keep for 30 days)
            await this.redis.expire(`${this.PERMISSION_VERSION_KEY}${roleId}`, 30 * 24 * 60 * 60);

            logger.info(`Role ${roleId} permissions invalidated. New version: ${newVersion}`);

            // Optionally: Force logout all users with this role
            // await this.forceLogoutByRole(roleId);

            return newVersion;
        } catch (error) {
            logger.error('Error invalidating role permissions:', error);
            throw error;
        }
    }

    /**
     * Store permission version in user session
     */
    async storeUserPermissionVersion(sessionId, roleId, version) {
        try {
            const key = `session:${sessionId}:permission_version`;
            await this.redis.set(key, version.toString(), 'EX', 24 * 60 * 60); // 24 hours
        } catch (error) {
            logger.error('Error storing user permission version:', error);
        }
    }

    /**
     * Check if user's permission version is outdated
     */
    async isPermissionVersionOutdated(sessionId, roleId) {
        try {
            const key = `session:${sessionId}:permission_version`;
            const userVersion = await this.redis.get(key);
            const currentVersion = await this.getRolePermissionVersion(roleId);

            if (!userVersion) {
                // First time, store current version
                await this.storeUserPermissionVersion(sessionId, roleId, currentVersion);
                return false;
            }

            return parseInt(userVersion) < currentVersion;
        } catch (error) {
            logger.error('Error checking permission version:', error);
            // On error, assume permissions are valid to avoid false positives
            return false;
        }
    }

    /**
     * Force logout all users with a specific role
     */
    async forceLogoutByRole(roleId) {
        try {
            // Get all sessions with this role
            const sessions = await this.sessionService.getSessionsByRole(roleId);

            logger.info(`Force logout ${sessions.length} users with role ${roleId}`);

            // Blacklist all users with this role temporarily
            const userIds = [...new Set(sessions.map(s => s.userId))];

            for (const userId of userIds) {
                // Add to blacklist with expiry
                await this.tokenBlacklistService.blacklistUser(userId, 'Role permissions changed');

                // Delete all sessions for this user
                await this.sessionService.deleteAllUserSessions(userId);
            }

            return userIds.length;
        } catch (error) {
            logger.error('Error forcing logout by role:', error);
            throw error;
        }
    }

    /**
     * Soft invalidation - mark sessions as needing permission refresh
     */
    async markSessionsForRefresh(roleId) {
        try {
            const sessions = await this.sessionService.getSessionsByRole(roleId);

            for (const session of sessions) {
                const key = `session:${session.sessionId}:needs_refresh`;
                await this.redis.set(key, '1', 'EX', 60 * 60); // 1 hour
            }

            logger.info(`Marked ${sessions.length} sessions for permission refresh`);
            return sessions.length;
        } catch (error) {
            logger.error('Error marking sessions for refresh:', error);
            throw error;
        }
    }

    /**
     * Check if session needs permission refresh
     */
    async needsPermissionRefresh(sessionId) {
        try {
            const key = `session:${sessionId}:needs_refresh`;
            const needsRefresh = await this.redis.get(key);
            return needsRefresh === '1';
        } catch (error) {
            logger.error('Error checking refresh status:', error);
            return false;
        }
    }

    /**
     * Clear refresh flag after permissions are updated
     */
    async clearRefreshFlag(sessionId) {
        try {
            const key = `session:${sessionId}:needs_refresh`;
            await this.redis.del(key);
        } catch (error) {
            logger.error('Error clearing refresh flag:', error);
        }
    }

    /**
     * Get fresh permissions from database (bypass cache)
     */
    async getFreshUserPermissions(userId) {
        try {
            // This should query the database directly, not cache
            const { User, Role, Permission } = require('../models');

            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: { attributes: [] }
                    }]
                }]
            });

            if (!user || !user.role) {
                return [];
            }

            return user.role.permissions.map(p => ({
                id: p.id,
                label: p.label,
                action: p.action
            }));
        } catch (error) {
            logger.error('Error getting fresh permissions:', error);
            return [];
        }
    }
}

module.exports = PermissionInvalidationService;