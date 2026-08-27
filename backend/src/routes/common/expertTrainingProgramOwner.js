const express = require("express");
const router = express.Router();
const c = require("../../controllers/expertTrainingProgramController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadImage, handleUploadError } = require("../../middleware/upload");

router.post(
  "/upload-banner",
  checkPermission(["manage_programs", "create_programs", "edit_programs"]),
  uploadImage.single("file"),
  handleUploadError,
  createRateLimiter("authenticatedDefault"),
  c.uploadBanner
);
router.get(
  "/",
  checkPermission([]),
  createRateLimiter("authenticatedDefault"),
  c.listAdmin
);
router.get(
  "/:id/enrollments",
  checkPermission(["manage_programs", "create_programs", "edit_programs"]),
  createRateLimiter("authenticatedDefault"),
  c.listEnrollments
);
router.post(
  "/",
  checkPermission(["manage_programs", "create_programs"]),
  createRateLimiter("authenticatedDefault"),
  c.create
);
router.get(
  "/:id",
  checkPermission([]),
  createRateLimiter("authenticatedDefault"),
  c.getById
);
router.put(
  "/:id",
  checkPermission(["manage_programs", "edit_programs"]),
  createRateLimiter("authenticatedDefault"),
  c.update
);
router.delete(
  "/:id",
  checkPermission(["manage_programs", "delete_programs"]),
  createRateLimiter("authenticatedDefault"),
  c.remove
);

module.exports = router;
