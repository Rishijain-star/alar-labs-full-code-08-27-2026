const response = require("../utils/response");
const systemSettingsService = require("../services/systemSettingsService");
const emailService = require("../services/emailService");
const rbacService = require("../services/rbac/roleService");
const logger = require("../lib/logger");

const SECTION_VIEW_PERMS = {
  general: ["view_settings", "view_system_settings", "edit_settings", "manage_system_settings"],
  notifications: ["view_notifications", "manage_notification_settings"],
  security: ["view_security_settings", "view_2fa_settings", "enable_2fa", "manage_security_settings", "manage_2fa_settings"],
  payments: ["view_billing", "manage_billing"],
  email: ["view_email_templates", "manage_email_templates", "send_emails"],
  legal: ["view_settings", "edit_settings", "manage_system_settings"],
};

const SECTION_EDIT_PERMS = {
  general: ["edit_settings", "manage_system_settings"],
  notifications: ["manage_notification_settings"],
  security: ["manage_security_settings", "manage_2fa_settings"],
  payments: ["manage_billing"],
  email: ["manage_email_templates", "send_emails"],
};

async function userCan(userId, perms) {
  if (!userId || !perms?.length) return false;
  return rbacService.checkUserHasPermission(userId, perms, "OR");
}

async function allowedSectionsForUser(userId) {
  const sections = [];
  for (const [section, perms] of Object.entries(SECTION_VIEW_PERMS)) {
    if (section === "legal") continue;
    if (await userCan(userId, perms)) sections.push(section);
  }
  return sections;
}

class SettingsController {
  getAll = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const sections = await allowedSectionsForUser(userId);
      if (!sections.length) {
        return response.fail(res, "Insufficient permissions to view settings", 403);
      }
      const data = await systemSettingsService.getAllForClient(sections);
      const editable = {};
      for (const s of sections) {
        editable[s] = await userCan(userId, SECTION_EDIT_PERMS[s] || []);
      }
      return response.success(res, "Settings fetched", 200, { settings: data, sections, editable });
    } catch (err) {
      logger.error("getAll settings error:", err);
      return response.fail(res, err.message || "Failed to load settings", 500);
    }
  };

  getSection = async (req, res) => {
    try {
      const { section } = req.params;
      const userId = req.user?.user_id;
      const viewPerms = SECTION_VIEW_PERMS[section];
      if (!viewPerms || !(await userCan(userId, viewPerms))) {
        return response.fail(res, "Insufficient permissions", 403);
      }
      const data = await systemSettingsService.getSectionForClient(section);
      const canEdit = await userCan(userId, SECTION_EDIT_PERMS[section] || []);
      return response.success(res, "OK", 200, { section, data, canEdit });
    } catch (err) {
      return response.fail(res, err.message || "Failed", 500);
    }
  };

  updateSection = async (req, res) => {
    try {
      const { section } = req.params;
      const userId = req.user?.user_id;
      const editPerms = SECTION_EDIT_PERMS[section];
      if (!editPerms || !(await userCan(userId, editPerms))) {
        return response.fail(res, "Insufficient permissions to update this section", 403);
      }
      const data = await systemSettingsService.upsertSection(section, req.body || {}, userId);
      emailService.invalidateTransporter?.();
      return response.success(res, "Settings saved", 200, { section, data });
    } catch (err) {
      return response.fail(res, err.message || "Failed to save", 500);
    }
  };

  sendTestEmail = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const canSend = await userCan(userId, ["manage_email_templates", "send_emails"]);
      if (!canSend) {
        return response.fail(res, "Insufficient permissions to send test email", 403);
      }
      const to = req.body?.to || req.user?.email;
      if (!to) return response.fail(res, "Recipient email required", 400);
      await emailService.sendCustom(
        to,
        "SMTP test — ALAR Labs",
        "verification.html",
        {
          OTP: "123456",
          PURPOSE: "SMTP Configuration Test",
          EMAIL: to,
          EXPIRY_MINUTES: "5",
          YEAR: new Date().getFullYear(),
          APP_NAME: "ALAR Labs",
        }
      );
      return response.success(res, "Test email sent", 200, { to });
    } catch (err) {
      return response.fail(res, err.message || "Failed to send test email", 500);
    }
  };
}

module.exports = new SettingsController();
