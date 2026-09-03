const express = require("express");
const router = express.Router();
const c = require("../../controllers/courseController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadAny, uploadCourseMedia, handleUploadError } = require("../../middleware/upload");
const CERT_PERMS = require("../../constants/certificationPermissions");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────────────────────────────────────
//  ALL ROUTES BELOW REQUIRE AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

// ── Course CRUD ───────────────────────────────────────────────────────────────
router.get("/", checkPermission("view_courses"), createRateLimiter("default"), c.getAll);
router.get("/slug/:slug", checkPermission("view_courses"), createRateLimiter("default"), c.getBySlug);
router.get("/:id", checkPermission("view_courses"), createRateLimiter("default"), c.getById);
router.post("/", checkPermission("create_courses"), createRateLimiter("create"), c.create);
router.post("/bulk", checkPermission("create_courses"), createRateLimiter("create"), c.bulkCreate);

/**
 * POST /api/courses/create-full
 * ─────────────────────────────
 * Accepts multipart/form-data.
 *
 * Text fields (all as form strings):
 *   title, slug, description, price, isFree, level, status, certificationId
 *
 * JSON-stringified fields:
 *   header      → '{"headline":"...","subHeadline":"...","bgColor":"#fff","textColor":"#000"}'
 *   footer      → '{"content":"...","bgColor":"#000","textColor":"#fff"}'
 *   media       → '[{"title":"Intro","type":"video","isPreview":true,"order":1}, ...]'
 *                  (each entry may reference a file by field name e.g. "fieldName":"mediaFile_0")
 *   questions   → '[{"questionText":"...","type":"single","options":[...],"order":1}, ...]'
 *
 * File fields (multiple allowed):
 *   thumbnail            → course thumbnail image (single)
 *   headerThumbnail      → header section image (single)
 *   mediaFiles           → array of media files (multiple) — matched to media[] by index/order
 *
 * multer .fields() captures named file inputs:
 */
const createFullUpload = uploadCourseMedia.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "introVideo", maxCount: 1 },
  { name: "videoThumbnail", maxCount: 1 },
  { name: "headerThumbnail", maxCount: 1 },
  { name: "mediaFiles", maxCount: 20 },
]);

router.post(
  "/create-full",
  checkPermission("create_courses"),
  createRateLimiter("create"),
  createFullUpload,
  handleUploadError,
  c.createFull
);

router.put(
  "/:id/update-full",
  checkPermission(["edit_courses", "create_courses"], "OR"),
  createRateLimiter("update"),
  createFullUpload,
  handleUploadError,
  c.updateFull
);

// Public detail-page formatted data for frontend CourseDetail
router.get("/:id/view", createRateLimiter("default"), c.getDetailPageData);

router.put("/:id", checkPermission("edit_courses"), createRateLimiter("update"), c.update);
router.delete("/:id", checkPermission("delete_courses"), createRateLimiter("delete"), c.deleteCourse);
router.patch("/:id/publish", checkPermission(["publish_courses", "create_courses"], "OR"), createRateLimiter("update"), c.publish);
router.patch(
  "/:id/content-approval",
  checkPermission(["approve_courses", "approve_own_courses"], "OR"),
  createRateLimiter("update"),
  c.setContentApproval
);
router.patch("/:id/archive", checkPermission("edit_courses"), createRateLimiter("update"), c.archive);

// ── Header & Footer ───────────────────────────────────────────────────────────
router.put("/:id/header", checkPermission("edit_courses"), createRateLimiter("update"), c.updateHeader);
router.put("/:id/footer", checkPermission("edit_courses"), createRateLimiter("update"), c.updateFooter);

// ── Certification assign/remove ───────────────────────────────────────────────
router.post("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.assignCertification);
router.delete("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.removeCertification);

// ── Media ─────────────────────────────────────────────────────────────────────
router.post("/:id/media", checkPermission("edit_courses"), createRateLimiter("create"), c.addMedia);
router.put("/:id/media/:mediaId", checkPermission("edit_courses"), createRateLimiter("update"), c.updateMedia);
router.delete("/:id/media/:mediaId", checkPermission("edit_courses"), createRateLimiter("delete"), c.deleteMedia);

// ── Questions ─────────────────────────────────────────────────────────────────
router.post("/:id/questions", checkPermission("edit_courses"), createRateLimiter("create"), c.addQuestion);
router.post("/:id/questions/bulk", checkPermission("edit_courses"), createRateLimiter("create"), c.addQuestionsBulk);
router.put("/:id/questions/:questionId", checkPermission("edit_courses"), createRateLimiter("update"), c.updateQuestion);
router.delete("/:id/questions/:questionId", checkPermission("edit_courses"), createRateLimiter("delete"), c.deleteQuestion);

module.exports = router;
