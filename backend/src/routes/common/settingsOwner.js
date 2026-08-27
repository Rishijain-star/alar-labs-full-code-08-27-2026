const express = require("express");
const router = express.Router();
const settingsController = require("../../controllers/settingsController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

const VIEW_ANY_SETTINGS = [
  "view_settings",
  "view_system_settings",
  "edit_settings",
  "manage_system_settings",
  "view_notifications",
  "manage_notification_settings",
  "view_security_settings",
  "view_2fa_settings",
  "enable_2fa",
  "manage_security_settings",
  "view_billing",
  "manage_billing",
  "view_email_templates",
  "manage_email_templates",
  "send_emails",
  "view_smtp_settings",
  "manage_smtp_settings",
  "view_payment_settings",
  "manage_payment_settings",
];

router.get(
  "/",
  createRateLimiter("default"),
  checkPermission(VIEW_ANY_SETTINGS, "OR"),
  settingsController.getAll
);

router.post(
  "/email/test",
  createRateLimiter("default"),
  checkPermission(["manage_email_templates", "send_emails", "manage_smtp_settings"], "OR"),
  settingsController.sendTestEmail
);

router.get(
  "/:section",
  createRateLimiter("default"),
  checkPermission(VIEW_ANY_SETTINGS, "OR"),
  settingsController.getSection
);

router.put(
  "/:section",
  createRateLimiter("updateRole"),
  checkPermission(
    [
      "edit_settings",
      "manage_system_settings",
      "manage_notification_settings",
      "manage_security_settings",
      "manage_billing",
      "manage_email_templates",
      "send_emails",
      "manage_smtp_settings",
      "manage_payment_settings",
    ],
    "OR"
  ),
  settingsController.updateSection
);

module.exports = router;
