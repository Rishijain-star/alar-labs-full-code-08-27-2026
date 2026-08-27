const express = require("express");
const router = express.Router();
const c = require("../controllers/courseController");
const { createRateLimiter } = require("../middleware/rateLimit");
const { authenticate, optionalAuthenticate } = require("../middleware/auth");
const { checkCourseStreamingAccess } = require("../middleware/accessControl");
const path = require("path");
const fs = require("fs");

const PROCESSED_DIR = path.join(__dirname, "../processed/courses");

function courseHlsPath(courseId, lessonId) {
  // Routable streaming URL (mounted at /api/courses/stream/...), NOT the on-disk
  // storage path — the player requests this directly.
  return `/api/courses/stream/${courseId}/${lessonId}/master.m3u8`;
}

/**
 * @route GET /api/courses/slug/:slug
 * @description Get a course by its slug.
 * @access Public
 */
router.get("/slug/:slug", createRateLimiter("default"), c.getBySlug);
router.get("/slug/:slug/overview", optionalAuthenticate, createRateLimiter("default"), c.getOverviewBySlug);
router.get("/slug/:slug/view", optionalAuthenticate, createRateLimiter("default"), c.getDetailPageDataBySlug);

/**
 * @route GET /api/courses/:id/view
 * @description Get public detail-page shaped data for a course (labs, media lock).
 * @access Public (optional Bearer for enrollment / unlock)
 */
router.get("/:id/view", optionalAuthenticate, createRateLimiter("default"), c.getDetailPageData);

/**
 * @route GET /api/courses/:id
 * @description Get a course by its ID.
 * @access Public
 */
router.get("/:id", createRateLimiter("default"), c.getById);

/**
 * @route GET /api/courses
 * @description Get all courses.
 * @access Public
 */
router.get("/", createRateLimiter("default"), c.getAll);

/**
 * @route GET /api/courses/:course_id/video-status/:lesson_id
 * @description Get the video processing status for a lesson.
 * @access Public
 */
router.get("/:course_id/video-status/:lesson_id", async (req, res) => {
  const { course_id, lesson_id } = req.params;
  const master_path = path.join(PROCESSED_DIR, course_id, lesson_id, "master.m3u8");
  const localReady = fs.existsSync(master_path);
  let storedHlsPath = null;

  try {
    const { CourseMedia } = require("../models");
    const media = await CourseMedia.findOne({
      where: { course_id, lesson_id, type: "video" },
      attributes: ["url"],
    });
    if (typeof media?.url === "string" && /\.m3u8($|\?)/i.test(media.url)) {
      storedHlsPath = media.url;
    }
  } catch (_) { }

  const ready = localReady || !!storedHlsPath;

  // Disable caching so clients always get fresh readiness status
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  res.status(200).json({
    ready,
    hlsPath: storedHlsPath || (ready ? courseHlsPath(course_id, lesson_id) : null),
  });

});

/**
 * @route GET /api/courses/stream/:course_id/:lesson_id/*
 * @description Stream course content.
 * @access Public (thumbnails/previews), Private (videos/TS segments)
 */
router.get("/stream/:course_id/:lesson_id/*",
  authenticate, // First try to authenticate (non-blocking if header missing)
  checkCourseStreamingAccess, // Then check access (exempts thumbnails/previews)
  (req, res) => {
    const { course_id, lesson_id } = req.params;
    const file = req.params[0];

    if (file.includes("..")) return res.status(400).send("Bad path");

    const file_path = path.join(PROCESSED_DIR, course_id, lesson_id, file);

    if (!fs.existsSync(file_path)) return res.status(404).send("Not found");

    // Disable caching to avoid 304/empty-body issues in Hls.js
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    const ext = path.extname(file);
    if (ext === ".m3u8") {
      // Block direct navigation to the playlist in browser tabs, allow XHR/fetch for players
      const secDest = (req.headers["sec-fetch-dest"] || "").toString().toLowerCase();
      const accept = (req.headers["accept"] || "").toString().toLowerCase();
      const directNavigate = secDest === "document" || secDest === "navigate" || accept.includes("text/html");
      if (directNavigate) return res.status(403).send("Forbidden");
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    }
    if (ext === ".ts") res.setHeader("Content-Type", "video/mp2t");
    if (ext === ".jpg" || ext === ".jpeg") res.setHeader("Content-Type", "image/jpeg");
    if (ext === ".png") res.setHeader("Content-Type", "image/png");
    if (ext === ".webp") res.setHeader("Content-Type", "image/webp");

    res.sendFile(file_path);
  });

/**
 * @route GET /api/courses/:course_id/content/key/:lesson_id
 * @description Get the encryption key for a lesson.
 * @access Private (requires enrollment)
 */
router.get("/:course_id/content/key/:lesson_id",
  authenticate,
  checkCourseStreamingAccess, // Use same access check for keys
  (req, res) => {
    const { course_id, lesson_id } = req.params;
    const key_path = path.join(PROCESSED_DIR, course_id, lesson_id, "enc.key");

    if (!fs.existsSync(key_path)) return res.status(404).send("Not found");

    res.sendFile(key_path);
  });

/**
 * @route GET /api/courses/lesson-key/:course_id/:lesson_id
 * @description AES-128 key for a lesson's encrypted HLS, served from the DB
 *   (course_media.enc_key). Works after local files are cleaned up and from
 *   Azure-hosted playlists. The player attaches the Bearer token via hls.js.
 * @access Private (authenticated + course streaming access)
 */
router.get(
  "/lesson-key/:course_id/:lesson_id",
  authenticate,
  checkCourseStreamingAccess,
  async (req, res) => {
    try {
      const { CourseMedia } = require("../models");
      const { course_id, lesson_id } = req.params;
      const row = await CourseMedia.findOne({
        where: { course_id, lesson_id, type: "video" },
        attributes: ["enc_key"],
      });
      if (!row || !row.enc_key) return res.status(404).send("Key not found");
      res.set({
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
      });
      return res.send(Buffer.from(row.enc_key, "hex"));
    } catch (e) {
      return res.status(500).send("Key error");
    }
  }
);

module.exports = router;
