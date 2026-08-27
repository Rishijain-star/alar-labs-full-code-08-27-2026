import { hasAnyPermission } from "@/utils/permissions";
import { isApprover } from "@/lib/auth";

/** Any of these grants access to Digital Programs admin section */
export const DIGITAL_PROGRAMS_ADMIN_PERMISSIONS = [
  "view_programs",
  "create_programs",
  "edit_programs",
  "delete_programs",
  "manage_programs",
  "create_webinars",
  "create_cloud_services",
  "create_expert_led_training",
];

export function canAccessDigitalProgramsAdmin() {
  return hasAnyPermission(DIGITAL_PROGRAMS_ADMIN_PERMISSIONS);
}

export function canEditDigitalPrograms() {
  if (isApprover()) return false;
  return hasAnyPermission(["edit_programs", "manage_programs"]);
}

export function canDeleteDigitalPrograms() {
  if (isApprover()) return false;
  return hasAnyPermission(["delete_programs", "manage_programs"]);
}
