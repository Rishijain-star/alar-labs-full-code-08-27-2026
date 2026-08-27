const logger = require("../lib/logger");
const rbacService = require("../services/rbac/roleService");

/**
 * RBAC Middleware for Sequelize + Redis
 * Provides comprehensive role and permission-based access control
 */

/**
 * Check if user has specific permission(s)
 * @param {string|string[]} requiredPermission - Permission(s) required
 * @param {string} operator - 'AND' or 'OR' for multiple permissions
 */
function checkPermission(requiredPermission, operator = "OR") {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        logger.warn("Permission check failed: No user ID");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Convert single permission to array
      const permissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      // If no permissions specified, allow access
      if (permissions.length === 0) {
        return next();
      }
      const has_permission = await rbacService.checkUserHasPermission(
        user_id,
        permissions,
        operator,
      );

      // CRITICAL: Deny if user does NOT have permission
      if (!has_permission) {
        logger.warn(
          `Permission denied for user ${user_id}: Required ${permissions.join(", ")}`,
        );
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          code: "PERMISSION_DENIED",
          requiredPermissions: permissions,
        });
      }

      // User has required permission(s) - allow access
      logger.debug(
        `Permission granted for user ${user_id}: ${permissions.join(", ")}`,
      );
      next();
    } catch (error) {
      logger.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
}

/**
 * Check if user has specific role
 * @param {string|string[]} requiredRole - Role name(s) required
 */
function checkRole(requiredRole) {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        logger.warn("Role check failed: No user ID");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Get user's role
      const user_role = await rbacService.getUserRole(user_id);

      if (!user_role) {
        logger.warn(`Role check failed: User ${user_id} has no role assigned`);
        return res.status(403).json({
          success: false,
          error: "No role assigned",
          code: "NO_ROLE_ASSIGNED",
        });
      }

      // Convert single role to array
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      // Check if user's role matches any required role
      if (!roles.includes(user_role.name)) {
        logger.warn(
          `Role denied for user ${user_id}: Required ${roles.join(", ")}, has ${user_role.name}`,
        );
        return res.status(403).json({
          success: false,
          error: "Insufficient role",
          code: "ROLE_DENIED",
          requiredRoles: roles,
          userRole: user_role.name,
        });
      }

      logger.debug(`Role granted for user ${user_id}: ${user_role.name}`);
      next();
    } catch (error) {
      logger.error("Role check error:", error);
      return res.status(500).json({
        success: false,
        error: "Role check failed",
        code: "ROLE_CHECK_ERROR",
      });
    }
  };
}

/**
 * Check if user owns the resource
 * @param {string} resourceIdParam - Name of the route parameter containing resource ID
 * @param {string} resourceType - Type of resource (user, course, etc.)
 */
function checkOwnership(resourceIdParam = "user_id", resourceType = "user") {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;
      const resource_id = req.params[resourceIdParam];

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // For user resources, check if the resource belongs to the user
      if (resourceType === "user" && resource_id !== user_id) {
        logger.warn(
          `Ownership check failed: User ${user_id} accessing resource ${resource_id}`,
        );
        return res.status(403).json({
          success: false,
          error: "Access denied to this resource",
          code: "OWNERSHIP_DENIED",
        });
      }

      // For other resource types, implement custom logic here
      // Example: Check database to verify ownership

      logger.debug(
        `Ownership granted for user ${user_id} on resource ${resource_id}`,
      );
      next();
    } catch (error) {
      logger.error("Ownership check error:", error);
      return res.status(500).json({
        success: false,
        error: "Ownership check failed",
        code: "OWNERSHIP_CHECK_ERROR",
      });
    }
  };
}

/**
 * Combined permission and ownership check
 * User must have permission OR own the resource
 *
 * @param {string} permission - Required permission
 * @param {string} resourceIdParam - Parameter name containing resource ID
 */
function checkPermissionOrOwnership(permission, resourceIdParam = "user_id") {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;
      const resource_id = req.params[resourceIdParam];

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Check if user owns the resource
      const is_owner = resource_id === user_id;

      if (is_owner) {
        // User owns the resource, allow access
        logger.debug(`Access granted: User ${user_id} owns resource`);
        return next();
      }

      // User doesn't own it, check permission
      const has_permission = await rbacService.checkUserHasPermission(
        user_id,
        permission,
      );

      if (!has_permission) {
        logger.warn(
          `Access denied for user ${user_id}: No permission and not owner`,
        );
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions or not resource owner",
          code: "ACCESS_DENIED",
          requiredPermission: permission,
        });
      }

      logger.debug(
        `Access granted: User ${user_id} has permission ${permission}`,
      );
      next();
    } catch (error) {
      logger.error("Permission/Ownership check error:", error);
      return res.status(500).json({
        success: false,
        error: "Access check failed",
        code: "ACCESS_CHECK_ERROR",
      });
    }
  };
}

/**
 * Super admin check - bypasses all other checks
 */
function checkSuperAdmin() {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const user_role = await rbacService.getUserRole(user_id);

      const rn = String(user_role?.name || "").trim().toLowerCase();
      if (!user_role || (rn !== "super_admin" && rn !== "super admin")) {
        logger.warn(`Super admin check failed for user ${user_id}`);
        return res.status(403).json({
          success: false,
          error: "Super admin access required",
          code: "SUPER_ADMIN_REQUIRED",
        });
      }

      logger.debug(`Super admin access granted for user ${user_id}`);
      next();
    } catch (error) {
      logger.error("Super admin check error:", error);
      return res.status(500).json({
        success: false,
        error: "Admin check failed",
        code: "ADMIN_CHECK_ERROR",
      });
    }
  };
}

/**
 * Attach user's permissions and role to request object
 * This middleware should run after authentication
 */
async function attachUserPermissions(req, res, next) {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      return next();
    }

    // Get user's permissions and role
    const [permissions, role] = await Promise.all([
      rbacService.getUserPermissions(user_id),
      rbacService.getUserRole(user_id),
    ]);

    // Attach to request object
    req.user_permissions = permissions;
    req.user_role = role;

    logger.debug(
      `Attached permissions for user ${user_id}: ${permissions.length} permissions`,
    );
    next();
  } catch (error) {
    logger.error("Attach user permissions error:", error);
    // Don't fail the request, just continue without permissions
    next();
  }
}

/**
 * Check if user has permission for a specific resource
 * @param {string} resourceType - Type of resource (e.g., 'course', 'lab')
 * @param {string} action - Action to perform (e.g., 'read', 'update')
 * @param {string} resourceIdParam - Name of the route parameter containing resource ID
 */
function checkResourcePermission(resourceType, action, resourceIdParam = 'resource_id') {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        logger.warn("Resource permission check failed: No user ID");
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      const resource_id = req.params[resourceIdParam];

      if (!resource_id) {
        logger.warn(`Resource permission check failed: No ${resourceIdParam} param`);
        return res.status(400).json({
          success: false,
          error: `Missing ${resourceIdParam} parameter`,
          code: "MISSING_RESOURCE_ID",
        });
      }

      // Check resource permission
      const resourcePermissionService = require('../services/rbac/resourcePermissionService');
      const has_permission = await resourcePermissionService.checkResourcePermission(
        user_id,
        resourceType,
        resource_id,
        action
      );

      if (!has_permission) {
        logger.warn(
          `Resource permission denied for user ${user_id}: ${action} on ${resourceType} ${resource_id}`
        );
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions for this resource",
          code: "RESOURCE_PERMISSION_DENIED",
          resourceType,
          action,
          resourceId: resource_id,
        });
      }

      logger.debug(
        `Resource permission granted for user ${user_id}: ${action} on ${resourceType} ${resource_id}`
      );
      next();
    } catch (error) {
      logger.error("Resource permission check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
}

/**
 * Check attribute-based access control conditions
 * @param {Object} conditions - Conditions to evaluate
 * @param {Function} getAttributes - Function to get user attributes
 */
function checkAttributeAccess(conditions, getAttributes) {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Get user attributes
      let userAttributes;
      if (typeof getAttributes === 'function') {
        userAttributes = await getAttributes(user_id, req);
      } else {
        userAttributes = req.user;
      }

      // Check attribute conditions
      const resourcePermissionService = require('../services/rbac/resourcePermissionService');
      const has_access = resourcePermissionService.checkAttributeConditions(userAttributes, conditions);

      if (!has_access) {
        logger.warn(`Attribute access denied for user ${user_id}`);
        return res.status(403).json({
          success: false,
          error: "Attribute conditions not met",
          code: "ATTRIBUTE_ACCESS_DENIED",
        });
      }

      logger.debug(`Attribute access granted for user ${user_id}`);
      next();
    } catch (error) {
      logger.error("Attribute access check error:", error);
      return res.status(500).json({
        success: false,
        error: "Access check failed",
        code: "ACCESS_CHECK_ERROR",
      });
    }
  };
}

/**
 * Combined check: Permission OR Ownership OR Resource Permission
 * User must satisfy at least one of these conditions
 */
function checkAccessByAny(...checks) {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      let has_access = false;
      const failed_checks = [];

      for (const check of checks) {
        try {
          const result = await check(req);
          if (result === true) {
            has_access = true;
            break;
          }
          failed_checks.push(result.reason);
        } catch (error) {
          failed_checks.push(error.message);
        }
      }

      if (!has_access) {
        logger.warn(`Multi-check access denied for user ${user_id}: ${failed_checks.join(', ')}`);
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          code: "ACCESS_DENIED",
          details: failed_checks,
        });
      }

      logger.debug(`Multi-check access granted for user ${user_id}`);
      next();
    } catch (error) {
      logger.error("Multi-check access error:", error);
      return res.status(500).json({
        success: false,
        error: "Access check failed",
        code: "ACCESS_CHECK_ERROR",
      });
    }
  };
}

/**
 * Audit logging middleware for permission checks
 * Log all permission-related actions
 */
function auditPermissionCheck(action) {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.user_id;
      const auditService = require('../services/auditService');

      // Log after response is sent
      res.on('finish', async () => {
        await auditService.logAction({
          user_id,
          action: `permission_check:${action}`,
          resource_type: req.params.resource_type || null,
          resource_id: req.params.resource_id || null,
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
      });

      next();
    } catch (error) {
      logger.error("Audit permission check error:", error);
      next(); // Don't fail the request
    }
  };
}

module.exports = {
  checkPermission,
  checkRole,
  checkOwnership,
  checkPermissionOrOwnership,
  checkSuperAdmin,
  checkResourcePermission,
  checkAttributeAccess,
  checkAccessByAny,
  auditPermissionCheck,
  attachUserPermissions,

};
