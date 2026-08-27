const express = require("express");
const router = express.Router();
const c = require("../../controllers/webinarController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadImage, handleUploadError } = require("../../middleware/upload");

const webinarWritePermissions = ["manage_programs", "create_programs", "edit_programs"];

router.post(
  "/upload-image",
  checkPermission(webinarWritePermissions),
  uploadImage.single("file"),
  handleUploadError,
  createRateLimiter("authenticatedDefault"),
  c.uploadImage
);
router.get("/", checkPermission([]), createRateLimiter("default"), c.listAdmin);
router.get("/:id/registrations", checkPermission(webinarWritePermissions), createRateLimiter("default"), c.listRegistrations);
router.get("/:id", checkPermission([]), createRateLimiter("default"), c.getById);
router.post("/", checkPermission(webinarWritePermissions), createRateLimiter("create"), c.create);
router.put("/:id", checkPermission(webinarWritePermissions), createRateLimiter("update"), c.update);
router.delete("/:id", checkPermission(webinarWritePermissions), createRateLimiter("delete"), c.remove);

module.exports = router;
