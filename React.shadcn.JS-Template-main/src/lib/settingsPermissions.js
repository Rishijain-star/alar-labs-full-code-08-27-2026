import { hasAnyPermission } from "@/utils/permissions";

/** Settings tab → view / edit permission sets (any match grants access). */
export const SETTINGS_TABS = {
  general: {
    label: "General",
    view: ["view_settings", "view_system_settings", "edit_settings", "manage_system_settings"],
    edit: ["edit_settings", "manage_system_settings"],
  },
  notifications: {
    label: "Notifications",
    view: ["view_notifications", "manage_notification_settings"],
    edit: ["manage_notification_settings"],
  },
  security: {
    label: "Security",
    view: ["view_security_settings", "view_2fa_settings", "enable_2fa", "manage_security_settings", "manage_2fa_settings"],
    edit: ["manage_security_settings", "manage_2fa_settings"],
  },
  payments: {
    label: "Payments",
    view: ["view_billing", "manage_billing", "view_payment_settings", "manage_payment_settings"],
    edit: ["manage_billing", "manage_payment_settings"],
  },
  email: {
    label: "Email",
    view: ["view_email_templates", "manage_email_templates", "send_emails", "view_smtp_settings", "manage_smtp_settings"],
    edit: ["manage_email_templates", "send_emails", "manage_smtp_settings"],
  },
  legal: {
    label: "Legal",
    view: ["view_settings", "edit_settings", "manage_system_settings"],
    edit: ["edit_settings", "manage_system_settings"],
  },
};

/** Any permission that grants access to the Settings page */
export const SETTINGS_PAGE_PERMISSIONS = [
  ...new Set(Object.values(SETTINGS_TABS).flatMap((t) => t.view)),
];

export function getVisibleSettingsTabs() {
  return Object.entries(SETTINGS_TABS)
    .filter(([, cfg]) => hasAnyPermission(cfg.view))
    .map(([id, cfg]) => ({ id, ...cfg }));
}

export function canViewSettingsTab(tabId) {
  const cfg = SETTINGS_TABS[tabId];
  return cfg ? hasAnyPermission(cfg.view) : false;
}

export function canEditSettingsTab(tabId) {
  const cfg = SETTINGS_TABS[tabId];
  return cfg ? hasAnyPermission(cfg.edit) : false;
}
