const express = require("express");
const router = express.Router();
const c = require("../../controllers/certificationController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadCertTemplate, handleUploadError } = require("../../middleware/upload");
const CERT_PERMS = require("../../constants/certificationPermissions");


// ── Certification CRUD ─────────────────────────────────────────────────────────
router.get("/", checkPermission(CERT_PERMS.VIEW), createRateLimiter("default"), c.getAll);
router.get("/:id", checkPermission(CERT_PERMS.VIEW), createRateLimiter("default"), c.getById);

/**
 * POST /api/certifications
 * Supports optional templateUrl (link) OR templateFile (actual file upload)
 * File field: templateFile → certificate template image/PDF
 */
router.post(
  "/",
  checkPermission(CERT_PERMS.CREATE),
  createRateLimiter("create"),
  uploadCertTemplate.single("templateFile"),
  handleUploadError,
  c.create
);

/**
 * PUT /api/certifications/:id
 * Same — optionally re-upload the template
 */
router.put(
  "/:id",
  checkPermission(CERT_PERMS.EDIT),
  createRateLimiter("update"),
  uploadCertTemplate.single("templateFile"),
  handleUploadError,
  c.update
);

router.delete("/:id", checkPermission(CERT_PERMS.DELETE), createRateLimiter("delete"), c.deleteCertification);

module.exports = router;