/**
 * Resource Permission Service
 * Handles resource-based and attribute-based access control (RBAC + ABAC)
 */

const { Permission, Role } = require('../models');
const redisManager = require('../lib/redisManager');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

class ResourcePermissionService {
  constructor() {
    this.CACHE_TTL = 1800; // 30 minutes
    this.CACHE_PREFIX = 'resource_permission:';
  }

  /**
   * Check if user has permission for a specific resource
   * @param {string} user_id - User ID
   * @param {string} resource_type - Type of resource (e.g., 'course', 'lab')
   * @param {string} resource_id - Specific resource ID
   * @param {string} action - Action to perform (e.g., 'read', 'update', 'delete')
   * @returns {Promise<boolean>} True if user has permission
   */
  async checkResourcePermission(user_id, resource_type, resource_id, action) {
    try {
      // Check cache first
      const cache_key = `${this.CACHE_PREFIX}${user_id}:${resource_type}:${resource_id}:${action}`;
      const cached = await this._getFromCache(cache_key);
      if (cached !== null) {
        return cached;
      }

      // Check global permission first (applies to all resources of this type)
      const global_permission = await this._checkGlobalPermission(user_id, resource_type, action);
      if (global_permission) {
        await this._setCache(cache_key, true);
        return true;
      }

      // Check resource-specific permission
      const resource_permission = await this._checkResourceSpecificPermission(user_id, resource_type, resource_id, action);
      if (resource_permission) {
        await this._setCache(cache_key, true);
        return true;
      }

      await this._setCache(cache_key, false);
      return false;
    } catch (error) {
      logger.error('[ResourcePermission] Check resource permission error:', error);
      return false;
    }
  }

  /**
   * Check attribute-based access control condition
   * @param {Object} user_attributes - User attributes for condition evaluation
   * @param {Object} conditions - Conditions to evaluate
   * @returns {boolean} True if conditions are met
   */
  checkAttributeConditions(user_attributes, conditions) {
    try {
      if (!conditions || Object.keys(conditions).length === 0) {
        return true;
      }

      // Evaluate conditions
      for (const [key, value] of Object.entries(conditions)) {
        const user_value = user_attributes[key];

        if (Array.isArray(value)) {
          // Check if user value is in allowed values
          if (!value.includes(user_value)) {
            return false;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Support comparison operators
          if (value.$eq !== undefined && user_value !== value.$eq) return false;
          if (value.$ne !== undefined && user_value === value.$ne) return false;
          if (value.$gt !== undefined && !(user_value > value.$gt)) return false;
          if (value.$lt !== undefined && !(user_value < value.$lt)) return false;
          if (value.$gte !== undefined && !(user_value >= value.$gte)) return false;
          if (value.$lte !== undefined && !(user_value <= value.$lte)) return false;
          if (value.$in && Array.isArray(value.$in) && !value.$in.includes(user_value)) return false;
          if (value.$nin && Array.isArray(value.$nin) && value.$nin.includes(user_value)) return false;
        } else {
          // Direct value comparison
          if (user_value !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('[ResourcePermission] Attribute condition check error:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user on a specific resource
   */
  async getResourcePermissions(user_id, resource_type, resource_id) {
    try {
      // Get user's role and permissions
      const roleService = require('./rbac/roleService');
      const userPermissions = await roleService.getUserPermissions(user_id);

      // Filter for this resource
      const resourcePermissions = userPermissions.filter(perm =>
        perm.resource_type === resource_type &&
        (perm.resource_id === null || perm.resource_id === resource_id)
      );

      return resourcePermissions.map(perm => ({
        id: perm.id,
        label: perm.label,
        action: perm.action,
        scope: perm.scope,
        resource_type: perm.resource_type,
        resource_id: perm.resource_id,
      }));
    } catch (error) {
      logger.error('[ResourcePermission] Get resource permissions error:', error);
      return [];
    }
  }

  /**
   * Grant resource permission to a user
   */
  async grantResourcePermission(user_id, resource_type, resource_id, action, options = {}) {
    try {
      // Create or update permission
      const permission = await Permission.findOrCreate({
        where: {
          label: `${action}:${resource_type}:${resource_id}`,
          resource_type: resource_type,
          resource_id: resource_id,
          action,
        },
        defaults: {
          scope: 'resource',
          description: options.description || `${action.toUpperCase()} ${resource_type}`,
          conditions: options.conditions || null,
        },
      });

      // Assign to user's role
      if (options.role_id) {
        await permission[0].addRole(options.role_id);
      }

      // Clear cache
      await this._clearResourceCache(user_id, resource_type, resource_id);

      logger.info(`[ResourcePermission] Granted ${action} on ${resource_type} ${resource_id} to user ${user_id}`);
      return permission[0];
    } catch (error) {
      logger.error('[ResourcePermission] Grant resource permission error:', error);
      throw new AppError('Failed to grant permission', 500);
    }
  }

  /**
   * Revoke resource permission
   */
  async revokeResourcePermission(user_id, resource_type, resource_id, action) {
    try {
      const permission = await Permission.findOne({
        where: {
          resource_type: resource_type,
          resource_id: resource_id,
          action,
        },
      });

      if (permission) {
        await permission.destroy();
      }

      // Clear cache
      await this._clearResourceCache(user_id, resource_type, resource_id);

      logger.info(`[ResourcePermission] Revoked ${action} on ${resource_type} ${resource_id} from user ${user_id}`);
      return true;
    } catch (error) {
      logger.error('[ResourcePermission] Revoke resource permission error:', error);
      throw new AppError('Failed to revoke permission', 500);
    }
  }

  /**
   * Check global permission (applies to all resources of type)
   */
  async _checkGlobalPermission(user_id, resource_type, action) {
    try {
      const roleService = require('./rbac/roleService');
      const userPermissions = await roleService.getUserPermissions(user_id);

      return userPermissions.some(perm =>
        perm.resource_type === resource_type &&
        perm.resource_id === null && // Global = null resource_id
        perm.action === action
      );
    } catch (error) {
      logger.debug('[ResourcePermission] Global permission check error:', error);
      return false;
    }
  }

  /**
   * Check resource-specific permission
   */
  async _checkResourceSpecificPermission(user_id, resource_type, resource_id, action) {
    try {
      const roleService = require('./rbac/roleService');
      const userPermissions = await roleService.getUserPermissions(user_id);

      return userPermissions.some(perm =>
        perm.resource_type === resource_type &&
        perm.resource_id === resource_id &&
        perm.action === action
      );
    } catch (error) {
      logger.debug('[ResourcePermission] Resource-specific permission check error:', error);
      return false;
    }
  }

  /**
   * Cache methods
   */
  async _getFromCache(key) {
    try {
      const redis = await this._getRedis();
      if (!redis) return null;

      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  async _setCache(key, value) {
    try {
      const redis = await this._getRedis();
      if (!redis) return;

      await redis.setEx(key, this.CACHE_TTL, JSON.stringify(value));
    } catch (error) {
      logger.debug('[ResourcePermission] Cache set error:', error);
    }
  }

  async _clearResourceCache(user_id, resource_type, resource_id) {
    try {
      const redis = await this._getRedis();
      if (!redis) return;

      // Clear all actions for this resource
      const pattern = `${this.CACHE_PREFIX}${user_id}:${resource_type}:${resource_id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.debug('[ResourcePermission] Cache clear error:', error);
    }
  }

  async _clearUserResourceCache(user_id) {
    try {
      const redis = await this._getRedis();
      if (!redis) return;

      const pattern = `${this.CACHE_PREFIX}${user_id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.debug('[ResourcePermission] User cache clear error:', error);
    }
  }

  async _getRedis() {
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
}

module.exports = new ResourcePermissionService();
