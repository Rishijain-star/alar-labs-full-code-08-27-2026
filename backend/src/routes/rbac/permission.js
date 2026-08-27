const express = require("express");
const router = express.Router();
const permissionController = require("../../controllers/rbac/permissionController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/common/permissions
 * @desc    Get all permissions with pagination and filters
 * @access  Requires 'view_permissions' permission
 */
router.get(
  "/",
  checkPermission("view_permissions"),
  createRateLimiter("authenticatedDefault"),
  permissionController.getAllPermissions,
);

/**
 * @route   GET /api/common/permissions/:permission_id
 * @desc    Get permission by ID
 * @access  Requires 'view_permissions' permission
 */
router.get(
  "/:permission_id",
  checkPermission("view_permissions"),
  createRateLimiter("authenticatedDefault"),
  permissionController.getPermissionById,
);

/**
 * @route   POST /api/common/permissions
 * @desc    Create new permission
 * @access  Requires 'create_permissions' permission
 */
router.post(
  "/",
  checkPermission("create_permissions"),
  createRateLimiter("createRole"),
  permissionController.createPermission,
);

/**
 * @route   PUT /api/common/permissions/:permission_id
 * @desc    Update permission
 * @access  Requires 'edit_permissions' permission
 */
router.put(
  "/:permission_id",
  checkPermission("edit_permissions"),
  createRateLimiter("updateRole"),
  permissionController.updatePermission,
);

/**
 * @route   DELETE /api/common/permissions/:permission_id
 * @desc    Delete permission
 * @access  Requires 'delete_permissions' permission
 */
router.delete(
  "/:permission_id",
  checkPermission("delete_permissions"),
  createRateLimiter("deleteRole"),
  permissionController.deletePermission,
);

/**
 * @route   GET /api/common/permissions/:permission_id/roles
 * @desc    Get roles that have this permission
 * @access  Requires 'view_permissions' permission
 */
router.get(
  "/:permission_id/roles",
  checkPermission("view_permissions"),
  createRateLimiter("authenticatedDefault"),
  permissionController.getPermissionRoles,
);

module.exports = router;
