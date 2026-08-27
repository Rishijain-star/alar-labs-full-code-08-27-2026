const express = require("express");
const router = express.Router();
const c = require("../../controllers/examTopicsConfigController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

const EXAM_TOPICS_VIEW_PERMISSIONS = [
  "view_exam_topics",
  "create_exam_topics",
  "edit_exam_topics",
  "delete_exam_topics",
  "publish_exam_topics",
];

const EXAM_TOPICS_APPROVE_PERMISSIONS = [
  "approve_exam_topics",
  "approve_own_exam_topics",
  "approve_courses",
  "approve_labs",
];

router.get(
  "/exam-topics/config",
  checkPermission(EXAM_TOPICS_VIEW_PERMISSIONS),
  createRateLimiter("default"),
  c.getAdminConfig
);

router.put(
  "/exam-topics/config",
  checkPermission([
    "create_exam_topics",
    "edit_exam_topics",
    "delete_exam_topics",
  ]),
  createRateLimiter("update"),
  c.upsertConfig
);

router.get(
  "/exam-topics/pending",
  checkPermission(EXAM_TOPICS_APPROVE_PERMISSIONS),
  createRateLimiter("default"),
  c.getPendingSets
);

router.patch(
  "/exam-topics/sets/:type/:setId/publish",
  checkPermission(["publish_exam_topics", "create_exam_topics"], "OR"),
  createRateLimiter("update"),
  c.publishSet
);

router.patch(
  "/exam-topics/sets/:type/:setId/content-approval",
  checkPermission(EXAM_TOPICS_APPROVE_PERMISSIONS),
  createRateLimiter("update"),
  c.setContentApproval
);

router.get(
  "/exam-topics/sets/:type/:setId/review",
  checkPermission(EXAM_TOPICS_APPROVE_PERMISSIONS),
  createRateLimiter("default"),
  c.getSetForReview
);

module.exports = router;
