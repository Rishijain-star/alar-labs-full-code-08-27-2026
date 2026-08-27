const express = require("express");
const router = express.Router();
const roleController = require("../../controllers/rbac/roleController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

/**
 * ROLE ROUTES
 * All routes require authentication
 * Different routes require different permissions
 */

// Apply authentication to all routes
router.use(authenticate);

/* =====================================================
   BASIC ROLE OPERATIONS
===================================================== */

/**
 * @route   GET /api/rbac/roles
 * @desc    Get all roles with pagination and filters
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getAllRoles,
);

/**
 * @route   GET /api/rbac/roles/:role_id
 * @desc    Get single role by ID with permissions
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/:role_id",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getRoleById,
);

/**
 * @route   GET /api/rbac/roles/:role_id/complete
 * @desc    Get complete role details (permissions + routes + groups)
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/:role_id/complete",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getRoleComplete,
);

/**
 * @route   POST /api/rbac/roles
 * @desc    Create new role
 * @access  Requires 'create_roles' permission
 */
router.post(
  "/",
  checkPermission("create_roles"),
  createRateLimiter("createRole"),
  roleController.createRole,
);

/**
 * @route   PUT /api/rbac/roles/:role_id
 * @desc    Update role details
 * @access  Requires 'edit_roles' permission
 */
router.put(
  "/:role_id",
  checkPermission("edit_roles"),
  createRateLimiter("updateRole"),
  roleController.updateRole,
);

/**
 * @route   DELETE /api/rbac/roles/:role_id
 * @desc    Delete role
 * @access  Requires 'delete_roles' permission
 */
router.delete(
  "/:role_id",
  checkPermission("delete_roles"),
  createRateLimiter("deleteRole"),
  roleController.deleteRole,
);

/**
 * @route   POST /api/rbac/roles/:role_id/duplicate
 * @desc    Duplicate an existing role
 * @access  Requires 'create_roles' permission
 */
router.post(
  "/:role_id/duplicate",
  checkPermission("create_roles"),
  createRateLimiter("createRole"),
  roleController.duplicateRole,
);

/* =====================================================
   PERMISSION MANAGEMENT
===================================================== */

/**
 * @route   GET /api/rbac/roles/:role_id/permissions
 * @desc    Get all permissions for a specific role
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/:role_id/permissions",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getRolePermissions,
);

/**
 * @route   POST /api/rbac/roles/:role_id/permissions
 * @desc    Assign permissions to role
 * @access  Requires 'edit_roles' permission
 */
router.post(
  "/:role_id/permissions",
  checkPermission("edit_roles"),
  createRateLimiter("updateRole"),
  roleController.assignPermissionsToRole,
);

/**
 * @route   DELETE /api/rbac/roles/:role_id/permissions/:permission_id
 * @desc    Remove permission from role
 * @access  Requires 'edit_roles' permission
 */
router.delete(
  "/:role_id/permissions/:permission_id",
  checkPermission("edit_roles"),
  createRateLimiter("updateRole"),
  roleController.removePermissionFromRole,
);

/* =====================================================
   ROUTE MANAGEMENT
===================================================== */

/**
 * @route   GET /api/rbac/roles/:role_id/routes
 * @desc    Get all routes for a specific role
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/:role_id/routes",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getRoleRoutes,
);

/**
 * @route   POST /api/rbac/roles/:role_id/routes
 * @desc    Assign routes to role
 * @access  Requires 'edit_roles' permission
 */
router.post(
  "/:role_id/routes",
  checkPermission("edit_roles"),
  createRateLimiter("updateRole"),
  roleController.assignRoutesToRole,
);

/**
 * @route   DELETE /api/rbac/roles/:role_id/routes/:route_id
 * @desc    Remove route from role
 * @access  Requires 'edit_roles' permission
 */
router.delete(
  "/:role_id/routes/:route_id",
  checkPermission("edit_roles"),
  createRateLimiter("updateRole"),
  roleController.removeRouteFromRole,
);

/* =====================================================
   USER MANAGEMENT
===================================================== */

/**
 * @route   GET /api/rbac/roles/:role_id/users
 * @desc    Get all users assigned to a role
 * @access  Requires 'view_roles' permission
 */
router.get(
  "/:role_id/users",
  checkPermission("view_roles"),
  createRateLimiter("authenticatedDefault"),
  roleController.getRoleUsers,
);

module.exports = router;
