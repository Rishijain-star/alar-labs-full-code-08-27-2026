const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams for /courses/:courseId/labs
const c = require("../../controllers/labController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");
const { uploadAny, uploadCourseMedia, handleUploadError } = require("../../middleware/upload");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../../database/db");
const CERT_PERMS = require("../../constants/certificationPermissions");

const PROCESSED_DIR_LABS = path.join(__dirname, "../../processed/labs");
const COOKIE_SECRET = process.env.STREAM_COOKIE_SECRET || "changeme_in_env";
const COOKIE_TTL_MS = 4 * 60 * 60 * 1000;

const signCookie = (labId, lessonId, timestamp) => {
  const payload = `${labId}:${lessonId}:${timestamp}`;
  const sig = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
};

const verifyCookie = (value, labId, lessonId) => {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 4) return false;
  const [cookieLabId, cookieLessonId, timestamp, sig] = parts;
  if (cookieLabId !== labId || cookieLessonId !== lessonId) return false;
  if (Date.now() - parseInt(timestamp, 10) > COOKIE_TTL_MS) return false;
  const expected = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(`${cookieLabId}:${cookieLessonId}:${timestamp}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

const checkStreamCookie = (req, res, next) => {
  const { labId, lessonId } = req.params;
  const cookieVal = req.cookies[`lab_stream_${labId}_${lessonId}`];
  if (!verifyCookie(cookieVal, labId, lessonId)) {
    return res.status(401).json({ success: false, message: "Stream session invalid or expired. Re-init." });
  }
  next();
};

// SECURITY: only allow simple HLS filenames (no path separators / traversal).
const SAFE_HLS_FILE = /^[A-Za-z0-9._-]+$/;
const isSafeHlsFile = (name) =>
  typeof name === "string" && SAFE_HLS_FILE.test(name) && !name.includes("..");

router.use(authenticate);

// ── Lab CRUD ──────────────────────────────────────────────────────────────────
router.get("/", checkPermission("view_labs"), createRateLimiter("default"), c.getAll);
router.get("/:id", checkPermission("view_labs"), createRateLimiter("default"), c.getById);
router.patch(
    "/:id/content-approval",
    checkPermission(
        ["approve_courses", "approve_labs", "approve_own_courses", "approve_own_labs"],
        "OR"
    ),
    createRateLimiter("update"),
    c.setContentApproval
);
router.post("/", checkPermission("create_labs"), createRateLimiter("create"), c.create);

/**
 * POST /api/labs/create-full
 * ─────────────────────────────────────────────────────
 * Accepts multipart/form-data.
 *
 * TEXT FIELDS (plain strings):
 *   title, slug, description, courseId, certificationId,
 *   type, difficulty, status, price, isFree, isAssignable,
 *   timeLimitMinutes, passingScore, maxAttempts
 *
 * JSON STRING FIELDS (stringify before sending):
 *   questions  → '[{"questionText":"...","type":"single","options":[...],"order":1}]'
 *
 * FILE FIELDS:
 *   thumbnail      → lab thumbnail image (single)
 *   mediaFiles     → any supporting files for the lab (multiple, up to 10)
 */
const createFullUpload = uploadCourseMedia.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "introVideo", maxCount: 1 },
    { name: "mediaFiles", maxCount: 10 },
]);

router.post(
    "/create-full",
    checkPermission("create_labs"),
    createRateLimiter("create"),
    createFullUpload,
    handleUploadError,
    c.createFull
);

router.put(
    "/:id/update-full",
    checkPermission(["edit_labs", "create_labs"], "OR"),
    createRateLimiter("update"),
    createFullUpload,
    handleUploadError,
    c.updateFull
);

/** Step 3 instruction images/videos — persist before lab JSON references them */
const instructionMediaUpload = uploadCourseMedia.single("file");
router.post(
    "/upload-instruction-media",
    checkPermission(["create_labs", "edit_labs"]),
    createRateLimiter("create"),
    instructionMediaUpload,
    handleUploadError,
    c.uploadInstructionMedia
);

router.put("/:id", checkPermission("edit_labs"), createRateLimiter("update"), c.update);
router.delete("/:id", checkPermission("delete_labs"), createRateLimiter("delete"), c.deleteLab);

// Reorder labs within a course:  PATCH /courses/:courseId/labs/reorder
router.patch("/reorder", checkPermission("edit_labs"), createRateLimiter("update"), c.reorder);

// ── Certification assign/remove ────────────────────────────────────────────────
router.post("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.assignCertification);
router.delete("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.removeCertification);

// ── Questions ─────────────────────────────────────────────────────────────────
router.post("/:id/questions", checkPermission("edit_labs"), createRateLimiter("create"), c.addQuestion);
router.post("/:id/questions/bulk", checkPermission("edit_labs"), createRateLimiter("create"), c.bulkCreateQuestions);
router.put("/:id/questions/:questionId", checkPermission("edit_labs"), createRateLimiter("update"), c.updateQuestion);
router.delete("/:id/questions/:questionId", checkPermission("edit_labs"), createRateLimiter("delete"), c.deleteQuestion);

// ── Assignments (standalone lab → user) ───────────────────────────────────────
// IMPORTANT: /my/assignments must be before /:id/assignments to avoid conflict
router.get("/my/assignments", checkPermission("view_labs"), createRateLimiter("default"), c.getMyAssignments);
router.get("/:id/assignments", checkPermission("view_labs"), createRateLimiter("default"), c.getAssignments);
router.post("/:id/assignments", checkPermission("assign_labs"), createRateLimiter("create"), c.assignLab);
router.put("/:id/assignments/:assignmentId", checkPermission("edit_labs"), createRateLimiter("update"), c.updateAssignment);
router.delete("/:id/assignments", checkPermission("assign_labs"), createRateLimiter("delete"), c.revokeAssignment);

// Lab streaming endpoints
router.get("/stream/init/:labId/:lessonId", async (req, res) => {
  const { labId, lessonId } = req.params;
  const [rows] = await db.query(
    "SELECT hls_ready FROM labs WHERE id = ?",
    [labId]
  );
  if (!rows.length) {
    return res.status(404).json({ success: false, message: "Lab not found." });
  }
  const cookieVal = signCookie(labId, lessonId, Date.now());
  res.cookie(`lab_stream_${labId}_${lessonId}`, cookieVal, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_TTL_MS,
  });
  res.json({
    success: true,
    playlistUrl: `/api/labs/stream/${labId}/${lessonId}/master.m3u8`,
  });
});

router.get("/stream/:labId/:lessonId/:filename", checkStreamCookie, (req, res) => {
  const { labId, lessonId, filename } = req.params;
  if (!isSafeHlsFile(filename)) {
    return res.status(400).send("Invalid filename");
  }
  const filePath = path.join(PROCESSED_DIR_LABS, labId, lessonId, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  if (filename.endsWith(".m3u8")) {
    res.set("Content-Type", "application/vnd.apple.mpegurl");
  } else if (filename.endsWith(".ts")) {
    res.set("Content-Type", "video/MP2T");
  } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".png")) {
    res.set("Content-Type", `image/${filename.endsWith(".png") ? "png" : "jpeg"}`);
  }
  fs.createReadStream(filePath).pipe(res);
});

router.get("/stream/key/:labId/:lessonId", checkStreamCookie, async (req, res) => {
  try {
    const { labId } = req.params;
    const [keyRecord] = await db.query(
      "SELECT enc_key FROM lab_encryption_keys WHERE lab_id = ?",
      [labId]
    );
    if (!keyRecord.length) return res.status(404).send("Key not found");
    const keyBuffer = Buffer.from(keyRecord[0].enc_key, "hex");
    res.set({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store",
    });
    res.send(keyBuffer);
  } catch (e) {
    res.status(401).send("Unauthorized");
  }
});

router.get("/stream/:labId/:lessonId/thumbnails/:filename", (req, res) => {
  const { labId, lessonId, filename } = req.params;
  if (!isSafeHlsFile(filename)) {
    return res.status(400).send("Invalid filename");
  }
  const filePath = path.join(PROCESSED_DIR_LABS, labId, lessonId, "thumbnails", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".png")) {
    res.set("Content-Type", `image/${filename.endsWith(".png") ? "png" : "jpeg"}`);
  }
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;