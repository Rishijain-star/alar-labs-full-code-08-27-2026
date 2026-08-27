import { hasAnyPermission } from "@/utils/permissions";

/** Any of these grants access to Exam Topics admin */
export const EXAM_TOPICS_ADMIN_PERMISSIONS = [
  "view_exam_topics",
  "create_exam_topics",
  "edit_exam_topics",
  "delete_exam_topics",
  "publish_exam_topics",
];

export const EXAM_TOPICS_APPROVE_PERMISSIONS = [
  "approve_exam_topics",
  "approve_own_exam_topics",
];

export function canAccessExamTopicsAdmin() {
  return hasAnyPermission(EXAM_TOPICS_ADMIN_PERMISSIONS);
}

export function canCreateExamTopics() {
  return hasAnyPermission(["create_exam_topics"]);
}

export function canEditExamTopics() {
  return hasAnyPermission(["edit_exam_topics"]);
}

export function canDeleteExamTopics() {
  return hasAnyPermission(["delete_exam_topics"]);
}

export function canPublishExamTopics() {
  return hasAnyPermission(["publish_exam_topics", "create_exam_topics"]);
}

export function canApproveExamTopics() {
  return hasAnyPermission([
    ...EXAM_TOPICS_APPROVE_PERMISSIONS,
    "approve_courses",
    "approve_labs",
  ]);
}
