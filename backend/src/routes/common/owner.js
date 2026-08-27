const express = require("express");
const router = express.Router();
const ownerController = require("../../controllers/common/ownerController");
// Clear permission cache for this user
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadImage } = require("../../middleware/upload");
const mfaRoute = require("./mfa");
const certificationRoute = require("./certification");
const courseRoute = require("./course");
const labRoute = require("./lab");
const digitalProgramSectionRoute = require("./digitalProgramSections");
const webinarOwnerRoute = require("./webinarOwner");
const voucherOwnerRoute = require("./voucherOwner");
const supportOwnerRoute = require("./supportOwner");
const legalOwnerRoute = require("./legalOwner");
const siteContentOwnerRoute = require("./siteContentOwner");
const settingsOwnerRoute = require("./settingsOwner");
const expertTrainingProgramOwnerRoute = require("./expertTrainingProgramOwner");
const assessmentOwnerRoute = require("./assessmentOwner");
const examTopicsOwnerRoute = require("./examTopicsOwner");
const cloudServiceOwnerRoute = require("./cloudServiceOwner");
const careerOfferingOwnerRoute = require("./careerOfferingOwner");
router.use("/mfa", mfaRoute);
router.use("/certifications", certificationRoute);
router.use("/courses", courseRoute);
router.use("/labs", labRoute);
router.use("/", digitalProgramSectionRoute);
router.use("/", assessmentOwnerRoute);
router.use("/", examTopicsOwnerRoute);
router.use("/cloud-services", cloudServiceOwnerRoute);
router.use("/careers", careerOfferingOwnerRoute);
router.use("/webinars", webinarOwnerRoute);
router.use("/vouchers", voucherOwnerRoute);
router.use("/support", supportOwnerRoute);
router.use("/legal", legalOwnerRoute);
router.use("/settings", settingsOwnerRoute);
router.use("/site", siteContentOwnerRoute);
router.use("/training-programs", expertTrainingProgramOwnerRoute);

/* =====================================================
   SPECIFIC USER ACCESS (Admin only)
===================================================== */
router.post(
  "/refresh",
  createRateLimiter("refreshToken"),
  ownerController.refreshToken,
);
/**
 * @route   GET /api/rbac/users/:user_id/access-summary
 * @desc    Get specific user's complete access summary
 * @access  Requires 'view_users' permission or viewing own data
 */
router.get(
  "/users/:user_id/access-summary",
  createRateLimiter("authenticatedDefault"),
  ownerController.getUserAccessSummary,
);

/**
 * @route   GET /api/rbac/users/:user_id/permissions
 * @desc    Get specific user's permissions
 * @access  Requires 'view_users' permission or viewing own data
 */
router.get(
  "/users/:user_id/permissions",
  createRateLimiter("authenticatedDefault"),
  ownerController.getUserPermissions,
);

/**
 * @route   GET /api/rbac/users/:user_id/permissions
 * @desc    Get specific user's permissions
 * @access  Requires 'view_users' permission or viewing own data
 */
router.get(
  "/users/:user_id/creator-activity",
  checkPermission(["view_users"]),
  createRateLimiter("authenticatedDefault"),
  ownerController.getUserCreatorActivity,
);

router.get(
  "/users",
  createRateLimiter("authenticatedDefault"),
  ownerController.getAllUsers,
);

/**
 * @route   GET /api/rbac/users/:user_id/permissions
 * @desc    Get specific user's permissions
 * @access  Requires 'view_users' permission or viewing own data
 */
router.get(
  "/user/:user_id",
  createRateLimiter("authenticatedDefault"),
  ownerController.getUserById,
);
router.put(
  "/users/:user_id",
  checkPermission(["manage_users", "edit_users"]),
  createRateLimiter("authenticatedDefault"),
  ownerController.updateUserById,
);

router.delete(
  "/users/bulk-delete",
  checkPermission(["manage_users", "delete_users"]),
  createRateLimiter("authenticatedDefault"),
  ownerController.bulkDeleteUsers,
);

router.delete(
  "/users/:user_id",
  checkPermission(["manage_users", "delete_users"]),
  createRateLimiter("authenticatedDefault"),
  ownerController.deleteUserById,
);

router.post(
  "/add-user",
  createRateLimiter("authenticatedDefault"),
  ownerController.addUser,
);

/**
 * @route   GET /api/rbac/users/:user_id/role
 * @desc    Get specific user's role
 * @access  Requires 'view_users' permission or viewing own data
 */
router.get(
  "/users/:user_id/role",
  createRateLimiter("authenticatedDefault"),
  ownerController.getUserRole,
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate current session
 * @access  Public
 * @limit   60 requests per minute per IP
 */
router.get(
  "/validate",
  createRateLimiter("validateSession"),
  ownerController.validateSession,
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout from current session
 * @access  Public (graceful handling if not authenticated)
 * @limit   No rate limit (graceful endpoint)
 */
router.post("/logout", ownerController.logout);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.post(
  "/logout-all",
  createRateLimiter("authenticatedDefault"),
  ownerController.logoutAll,
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.get(
  "/sessions",
  createRateLimiter("authenticatedDefault"),
  ownerController.getSessions,
);

/**
 * @route   DELETE /api/auth/sessions/:session_id
 * @desc    Delete specific session
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.delete(
  "/sessions/:session_id",
  createRateLimiter("authenticatedDefault"),
  ownerController.deleteSession,
);

/**
 * @route   GET /api/rbac/me/access-summary
 * @desc    Get current user's complete access summary
 * @access  Authenticated users
 */
router.get(
  "/me/access-summary",
  createRateLimiter("authenticatedDefault"),
  ownerController.getMyAccessSummary,
);

/**
 * @route   GET /api/rbac/me/permissions
 * @desc    Get current user's permissions
 * @access  Authenticated users
 */
router.get(
  "/me/permissions",
  createRateLimiter("authenticatedDefault"),
  ownerController.getMyPermissions,
);

/**
 * @route   GET /api/owner/me/role
 * @desc    Get current user's role
 * @access  Authenticated users
 */
router.get(
  "/me/role",
  createRateLimiter("authenticatedDefault"),
  ownerController.getMyRole,
);

const dashboardController = require("../../controllers/dashboardController");
router.get(
  "/dashboard/stats",
  createRateLimiter("authenticatedDefault"),
  dashboardController.getStats,
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user details
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.get(
  "/me",
  createRateLimiter("authenticatedDefault"),
  ownerController.getCurrentUser,
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user details
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.put(
  "/me",
  uploadImage.single("image"), // ← multer middleware (field name: profile_image)
  createRateLimiter("authenticatedDefault"),
  ownerController.updateCurrentUser,
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user details
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.get(
  "/audit-logs",
  createRateLimiter("authenticatedDefault"),
  ownerController.getAuditLogs,
);

router.get(
  "/get-security-overview",
  createRateLimiter("authenticatedDefault"),
  ownerController.getSecurityOverview,
);

/**
 * @route   PUT /api/admin/users/:user_id/role
 * @desc    Update user's role
 * @access  Requires 'manage_users' or 'edit_users' permission
 */
router.put(
  "/users/:user_id/role",
  checkPermission(["manage_users", "edit_users"]),
  createRateLimiter("authenticatedDefault"),
  ownerController.updateUserRole,
);

router.get(
  "/get-ip-whitelist",
  createRateLimiter("authenticatedDefault"),
  ownerController.getIpWhitelist,
);

router.post(
  "/add-ip-whitelist",
  createRateLimiter("authenticatedDefault"),
  ownerController.addIpToWhitelist,
);

router.post(
  "/ip-whitelist/toggle",
  createRateLimiter("authenticatedDefault"),
  ownerController.toggleIpWhitelist,
);

router.get(
  "/devices",
  createRateLimiter("enableMfaComplete"),
  ownerController.getTrustedDevices,
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for logged-in user
 * @access  Private
 * @limit   5 attempts per 15 minutes per user
 */
router.post(
  "/change-password",
  createRateLimiter("changePassword"),
  ownerController.changePassword,
);

module.exports = router;
