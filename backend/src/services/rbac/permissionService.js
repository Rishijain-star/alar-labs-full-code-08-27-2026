const {
    Permission,
    RolePermission,
    sequelize,
} = require('../../models');
const { Op } = require('sequelize');
const redisManager = require('../../lib/redisManager');
const logger = require('../../lib/logger');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Permission Service (Sequelize + Redis)
 * Handles permission management with caching
 */
class PermissionService {
    constructor() {
        this.CACHE_TTL = {
            PERMISSION: 1800,                    // 30 minutes - single permission
            PERMISSIONS_LIST: 7 * 24 * 60 * 60, // 7 days for the full list
        };

        this.CACHE_PREFIX = {
            PERMISSION: 'permission:',
            PERMISSIONS_LIST: 'permissions:list:',
        };
    }

    /**
     * Get Redis client safely with comprehensive error handling
     */
    async _getRedisClient() {
        try {
            if (!redisManager.isReady()) {
                logger.debug('Redis not ready, skipping cache');
                return null;
            }

            try {
                return await redisManager.getClientSafe();
            } catch (clientError) {
                logger.debug('Failed to get Redis client:', clientError.message);
                return null;
            }
        } catch (error) {
            logger.debug('Redis not available:', error.message);
            return null;
        }
    }

    /**
     * Get all permissions with pagination and filters
     */
    async getAllPermissions(options = {}) {
        try {
            const {
                page = 1,
                limit = 100,
                search = '',
                sort_by = 'created_at',
                sort_order = 'asc'
            } = options;

            const redis = await this._getRedisClient();

            // Create unique cache key based on query parameters
            const cacheKey = `${this.CACHE_PREFIX.PERMISSIONS_LIST}p${page}_l${limit}_s${encodeURIComponent(search)}_sb${sort_by}_so${sort_order}`;

            // Cache-first approach
            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        logger.debug(`Cache HIT - permissions list: ${cacheKey}`);
                        return JSON.parse(cached);
                    }
                } catch (err) {
                    logger.debug('Cache read failed for permissions list, falling back to DB');
                }
            }

            logger.debug(`Cache MISS - permissions list: ${cacheKey}`);

            const where = {};

            if (search) {
                const like = `%${search.toLowerCase()}%`;
                where[Op.or] = [
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('id')), Op.like, like),
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('label')), Op.like, like),
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('description')), Op.like, like),
                ];
            }

            const offset = (page - 1) * limit;

            const { count, rows: permissions } = await Permission.findAndCountAll({
                where,
                limit,
                offset,
                order: [[sort_by, sort_order.toUpperCase()]],
                distinct: true
            });

            const result = {
                permissions: permissions.map(p => p.toJSON()),
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };

            if (redis) {
                try {
                    await redis.setEx(cacheKey, this.CACHE_TTL.PERMISSIONS_LIST, JSON.stringify(result));
                    logger.debug(`Cached permissions list for 7 days: ${cacheKey}`);
                } catch (err) {
                    logger.debug('Cache write failed for permissions list');
                }
            }

            return result;
        } catch (error) {
            logger.error('Get all permissions error:', error);
            throw new AppError('Failed to retrieve permissions', 500, 'GET_PERMISSIONS_ERROR');
        }
    }

    /**
     * Get permission by ID with caching
     */
    async getPermissionById(permission_id) {
        try {
            const redis = await this._getRedisClient();
            const cacheKey = `${this.CACHE_PREFIX.PERMISSION}${permission_id}`;

            if (redis) {
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        logger.debug(`Cache hit for permission: ${permission_id}`);
                        return JSON.parse(cached);
                    }
                } catch (cacheError) {
                    logger.warn('Cache read failed:', cacheError.message);
                }
            }

            logger.debug(`Cache miss for permission: ${permission_id}`);

            const permission = await Permission.findByPk(permission_id);

            if (!permission) {
                throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
            }

            const permission_data = permission.toJSON();

            if (redis) {
                try {
                    await redis.setEx(
                        cacheKey,
                        this.CACHE_TTL.PERMISSION,
                        JSON.stringify(permission_data)
                    );
                } catch (cacheError) {
                    logger.warn('Cache write failed:', cacheError.message);
                }
            }

            return permission_data;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get permission by ID error:', error);
            throw new AppError('Failed to retrieve permission', 500, 'GET_PERMISSION_ERROR');
        }
    }

    /**
     * Create new permission
     */
    async createPermission(permission_data) {
        try {
            const {
                id,
                label,
                description,
                resource,
                action,
                created_by
            } = permission_data;

            const existing_permission = await Permission.findOne({ where: { label } });
            if (existing_permission) {
                throw new AppError('Permission with this label already exists', 400, 'PERMISSION_EXISTS');
            }

            const permission = await Permission.create({
                id,
                label,
                description: description || '',
                resource: resource || null,
                action: action || null,
                created_by: created_by
            });

            await this.clearPermissionCache(permission.id);
            await this.clearPermissionsCache();

            logger.info(`Permission created: ${permission.id} by ${created_by}`);
            return await this.getPermissionById(permission.id);
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Create permission error:', error);
            throw new AppError('Failed to create permission', 500, 'CREATE_PERMISSION_ERROR');
        }
    }

    /**
     * Update permission
     */
    async updatePermission(permission_id, update_data) {
        try {
            const permission = await Permission.findByPk(permission_id);

            if (!permission) {
                throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
            }

            await permission.update({
                ...(update_data.label && { label: update_data.label }),
                ...(update_data.description !== undefined && { description: update_data.description }),
                ...(update_data.resource !== undefined && { resource: update_data.resource }),
                ...(update_data.action !== undefined && { action: update_data.action }),
                updated_by: update_data.updated_by
            });

            await this.clearPermissionCache(permission_id);
            await this.clearPermissionsCache();

            logger.info(`Permission updated: ${permission_id} by ${update_data.updated_by}`);

            return await this.getPermissionById(permission_id);
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Update permission error:', error);
            throw new AppError('Failed to update permission', 500, 'UPDATE_PERMISSION_ERROR');
        }
    }

    /**
     * Delete permission
     */
    async deletePermission(permission_id, deleted_by) {
        try {
            const permission = await Permission.findByPk(permission_id);

            if (!permission) {
                throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
            }

            const role_permission_count = await RolePermission.count({
                where: { permission_id: permission_id }
            });

            if (role_permission_count > 0) {
                throw new AppError(
                    'Cannot delete permission. It is assigned to one or more roles',
                    400,
                    'PERMISSION_IN_USE'
                );
            }

            await permission.destroy();

            await this.clearPermissionCache(permission_id);
            await this.clearPermissionsCache();

            logger.info(`Permission deleted: ${permission_id} by ${deleted_by}`);

            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Delete permission error:', error);
            throw new AppError('Failed to delete permission', 500, 'DELETE_PERMISSION_ERROR');
        }
    }

    /**
     * Bulk create permissions
     */
    async bulkCreatePermissions(permissions_data, created_by) {
        try {
            const created_permissions = [];
            const failed_permissions = [];

            for (const perm_data of permissions_data) {
                try {
                    const permission = await this.createPermission({
                        ...perm_data,
                        created_by
                    });
                    created_permissions.push(permission);
                    logger.debug(`✓ Created permission: ${perm_data.id}`);
                } catch (error) {
                    logger.error(`✗ Failed to create permission ${perm_data.id}:`, error.message);
                    failed_permissions.push({
                        permission: perm_data.id,
                        error: error.message
                    });
                }
            }

            await this.clearPermissionsCache();

            return {
                success: created_permissions.length,
                failed: failed_permissions.length,
                created_permissions,
                failed_permissions
            };
        } catch (error) {
            logger.error('Bulk create permissions error:', error);
            throw new AppError('Failed to bulk create permissions', 500, 'BULK_CREATE_ERROR');
        }
    }

    /**
     * Get all roles that have a specific permission
     */
    async getPermissionRoles(permission_id) {
        try {
            await this.getPermissionById(permission_id);

            const { Role } = require('../../models');

            const rolePermissions = await RolePermission.findAll({
                where: { permission_id: permission_id },
                include: [{
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'description', 'is_active', 'priority']
                }]
            });

            const roles = rolePermissions
                .map(rp => rp.role ? rp.role.toJSON() : null)
                .filter(r => r !== null);

            return roles;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get permission roles error:', error);
            throw new AppError('Failed to retrieve permission roles', 500, 'GET_PERMISSION_ROLES_ERROR');
        }
    }

    /**
     * Clear single permission cache
     */
    async clearPermissionCache(permission_id) {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            await redis.del(`${this.CACHE_PREFIX.PERMISSION}${permission_id}`);
            logger.debug(`Cleared cache for permission: ${permission_id}`);
        } catch (error) {
            logger.warn('Clear permission cache error:', error.message);
        }
    }

    /**
     * Clear all permissions list cache
     *
     * ✅ FIX: The original used cursor as a string ('0') and compared with
     *    !== '0', but some Redis client versions return cursor as a number.
     *    Normalised to always use a numeric cursor (integer), consistent with
     *    how roleService.clearAllRolesListCache() already handles it.
     */
    async clearPermissionsCache() {
        try {
            const redis = await this._getRedisClient();
            if (!redis) return;

            const pattern = `${this.CACHE_PREFIX.PERMISSIONS_LIST}*`;
            // ✅ FIX: Start with numeric 0, not string '0'
            let cursor = 0;
            let deletedCount = 0;
            let iterations = 0;
            const maxIterations = 1000;

            do {
                iterations++;
                if (iterations > maxIterations) {
                    logger.warn('Max iterations reached in clearPermissionsCache');
                    break;
                }

                const reply = await redis.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });

                let newCursor, keys;

                // ✅ FIX: Handle both array and object reply formats
                if (Array.isArray(reply)) {
                    [newCursor, keys] = reply;
                } else if (reply && typeof reply === 'object') {
                    newCursor = reply.cursor;
                    keys = reply.keys;
                } else {
                    logger.error('Unexpected SCAN response format:', reply);
                    break;
                }

                // ✅ FIX: Normalise cursor to number regardless of Redis client version
                cursor = typeof newCursor === 'string' ? parseInt(newCursor, 10) : newCursor;

                if (keys && keys.length > 0) {
                    await redis.del(...keys);
                    deletedCount += keys.length;
                }

            } while (cursor !== 0);

            if (deletedCount > 0) {
                logger.debug(`Cleared ${deletedCount} permissions list cache entries in ${iterations} iterations`);
            } else {
                logger.debug('No permissions list cache keys found to clear');
            }
        } catch (error) {
            logger.warn('Clear permissions list cache error:', error.message);
        }
    }
}

module.exports = new PermissionService();