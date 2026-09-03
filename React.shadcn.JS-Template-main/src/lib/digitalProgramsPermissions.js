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
  "approve_cloud_services",
  "approve_career_offerings",
  "manage_cloud_services",
  "manage_career_offerings",
  "view_cloud_services",
  "view_career_offerings",
  "approve_courses",
  "approve_labs",
  "approve_exam_topics",
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
