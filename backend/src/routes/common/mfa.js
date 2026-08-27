const express = require("express");
const router = express.Router();
const ownerController = require("../../controllers/common/ownerController");
// Clear permission cache for this user
const { checkPermission } = require("../../middleware/rbac");

const { createRateLimiter } = require("../../middleware/rateLimit");

/**
 * @route   POST /api/auth/mfa/enable/start
 * @desc    Start MFA setup (get QR code and backup codes)
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.post(
  "/enable/start",
  createRateLimiter("authenticatedDefault"),
  ownerController.enableMfaStart,
);

/**
 * @route   POST /api/auth/mfa/enable/complete
 * @desc    Complete MFA setup (verify code and activate)
 * @access  Private
 * @limit   5 attempts per 5 minutes per user
 */
router.post(
  "/enable/complete",
  createRateLimiter("enableMfaComplete"),
  ownerController.enableMfaComplete,
);

/**
 * @route   POST /api/auth/mfa/disable
 * @desc    Disable MFA
 * @access  Private
 * @limit   3 attempts per 15 minutes per user
 */
router.post(
  "/disable",
  createRateLimiter("disableMfa"),
  ownerController.disableMfa,
);

/**
 * @route   GET /api/auth/mfa/status
 * @desc    Get MFA status
 * @access  Private
 * @limit   100 requests per 15 minutes per user
 */
router.get(
  "/status",
  createRateLimiter("authenticatedDefault"),
  ownerController.getMfaStatus,
);

/**
 * @route   POST /api/auth/mfa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private
 * @limit   3 requests per hour per user
 */
router.post(
  "/backup-codes/regenerate",
  createRateLimiter("regenerateBackupCodes"),
  ownerController.regenerateBackupCodes,
);

module.exports = router;
