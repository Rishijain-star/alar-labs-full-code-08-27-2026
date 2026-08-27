const express = require("express");
const router = express.Router();
const c = require("../../controllers/assessmentConfigController");
const { checkPermission } = require("../../middleware/rbac");
const rbacService = require("../../services/rbac/roleService");
const assessmentConfigService = require("../../services/assessmentConfigService");
const { createRateLimiter } = require("../../middleware/rateLimit");

/**
 * Write guard with a create-vs-edit split:
 *  - first save (config not yet initialized) requires `create_programs`
 *  - subsequent saves require `edit_programs`
 *  - `manage_programs` always satisfies either
 */
async function requireAssessmentWrite(req, res, next) {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const initialized = await assessmentConfigService.isInitialized();
    const required = initialized
      ? ["edit_programs", "manage_programs"]
      : ["create_programs", "manage_programs"];

    const ok = await rbacService.checkUserHasPermission(user_id, required, "OR");
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        code: "PERMISSION_DENIED",
        requiredPermissions: required,
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Permission check failed",
      code: "PERMISSION_CHECK_ERROR",
    });
  }
}

router.get(
  "/assessment/config",
  checkPermission(["view_programs", "edit_programs", "create_programs", "manage_programs"]),
  createRateLimiter("default"),
  c.getAdminConfig,
);

router.put(
  "/assessment/config",
  requireAssessmentWrite,
  createRateLimiter("update"),
  c.upsertConfig,
);

// Admin preview of the auto-matched courses/labs for an outcome's keywords.
router.post(
  "/assessment/recommend-preview",
  checkPermission(["view_programs", "edit_programs", "create_programs", "manage_programs"]),
  createRateLimiter("default"),
  c.previewRecommend,
);

module.exports = router;
