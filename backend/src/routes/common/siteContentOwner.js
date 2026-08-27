const express = require("express");
const router = express.Router();
const c = require("../../controllers/siteContentController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadImage, handleUploadError } = require("../../middleware/upload");

router.get(
  "/branding",
  checkPermission(["view_content", "edit_content", "manage_banners"]),
  createRateLimiter("authenticatedDefault"),
  c.getBranding
);
router.put(
  "/branding",
  checkPermission(["edit_content"]),
  createRateLimiter("authenticatedDefault"),
  c.putBranding
);
router.post(
  "/upload",
  checkPermission(["edit_content", "manage_banners"]),
  uploadImage.single("file"),
  handleUploadError,
  createRateLimiter("authenticatedDefault"),
  c.uploadAsset
);

router.get(
  "/banners",
  checkPermission(["manage_banners"]),
  createRateLimiter("authenticatedDefault"),
  c.listBanners
);
router.post(
  "/banners",
  checkPermission(["manage_banners"]),
  createRateLimiter("authenticatedDefault"),
  c.createBanner
);
router.put(
  "/banners/:id",
  checkPermission(["manage_banners"]),
  createRateLimiter("authenticatedDefault"),
  c.updateBanner
);
router.delete(
  "/banners/:id",
  checkPermission(["manage_banners"]),
  createRateLimiter("authenticatedDefault"),
  c.deleteBanner
);

module.exports = router;
