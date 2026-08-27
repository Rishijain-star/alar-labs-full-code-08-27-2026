// routes/content.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../database/db");
const { protectContent, chunkRateLimit, protectImage } = require("../middleware/contentProtection");
const { serveProtectedImage } = require("../services/imageProtection");
const { jwt } = require("../config");

const PROCESSED_DIR = path.join(__dirname, "../processed/courses");

// ─── 1. Serve master playlist ──────────────────────────────────────────────
router.get(
  "/course/:courseId/lesson/:lessonId/playlist",
  protectContent,
  chunkRateLimit,
  async (req, res) => {
    const { courseId, lessonId } = req.params;
    const playlistPath = path.join(PROCESSED_DIR, courseId, lessonId, "master.m3u8");

    if (!fs.existsSync(playlistPath)) {
      return res.status(404).json({ message: "Video not ready yet" });
    }

    let playlist = fs.readFileSync(playlistPath, "utf8");

    // ✅ Rewrite sub-playlist URLs to go through our protected route
    // Replace relative paths with full backend URLs + JWT token
    const token = req.headers.authorization?.split(" ")[1];
    playlist = playlist.replace(
      /^(720p|480p|360p)\/index\.m3u8$/gm,
      (match, resolution) =>
        `${process.env.API_URL}/content/course/${courseId}/lesson/${lessonId}/stream/${resolution}?token=${token}`
    );

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "private, no-store");
    res.send(playlist);
  }
);

// ─── 2. Serve sub-playlists (720p/480p/360p index.m3u8) ───────────────────
router.get(
  "/course/:courseId/lesson/:lessonId/stream/:resolution",
  protectContent,
  chunkRateLimit,
  async (req, res) => {
    const { courseId, lessonId, resolution } = req.params;

    if (!["720p", "480p", "360p"].includes(resolution)) {
      return res.status(400).json({ message: "Invalid resolution" });
    }

    const playlistPath = path.join(
      PROCESSED_DIR, courseId, lessonId, resolution, "index.m3u8"
    );

    if (!fs.existsSync(playlistPath)) {
      return res.status(404).json({ message: "Stream not found" });
    }

    let playlist = fs.readFileSync(playlistPath, "utf8");

    // ✅ Rewrite .ts chunk URLs to go through our protected route
    const token = req.query.token;
    playlist = playlist.replace(
      /^(seg\d+\.ts)$/gm,
      (match, seg) =>
        `${process.env.API_URL}/content/course/${courseId}/lesson/${lessonId}/chunk/${resolution}/${seg}?token=${token}`
    );

    // ✅ Rewrite key URL to go through our protected route
    playlist = playlist.replace(
      new RegExp(`${process.env.API_URL}/content/key/${lessonId}`, "g"),
      `${process.env.API_URL}/content/key/${lessonId}?token=${token}`
    );

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "private, no-store");
    res.send(playlist);
  }
);

// ─── 3. Serve individual .ts video chunks ─────────────────────────────────
router.get(
  "/course/:courseId/lesson/:lessonId/chunk/:resolution/:segment",
  protectContent,
  chunkRateLimit,
  async (req, res) => {
    const { courseId, lessonId, resolution, segment } = req.params;

    // Sanitize — prevent path traversal attacks
    if (!/^seg\d+\.ts$/.test(segment)) {
      return res.status(400).json({ message: "Invalid segment" });
    }
    if (!["720p", "480p", "360p"].includes(resolution)) {
      return res.status(400).json({ message: "Invalid resolution" });
    }

    const chunkPath = path.join(
      PROCESSED_DIR, courseId, lessonId, resolution, segment
    );

    // Ensure path is within processed dir (extra security)
    if (!chunkPath.startsWith(PROCESSED_DIR)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({ message: "Chunk not found" });
    }

    res.set({
      "Content-Type": "video/MP2T",
      "Cache-Control": "private, max-age=3600",   // cache for 1hr (safe — encrypted)
      "Accept-Ranges": "bytes",
    });

    fs.createReadStream(chunkPath).pipe(res);
  }
);

// ─── 4. Serve AES-128 decryption key ──────────────────────────────────────
router.get("/key/:lessonId", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).send("Unauthorized");

    jwt.verify(token, process.env.JWT_SECRET); // just verify, no enrollment check for key

    const { lessonId } = req.params;
    const [keyRecord] = await db.query(
      "SELECT enc_key FROM lesson_encryption_keys WHERE lesson_id = ?",
      [lessonId]
    );

    if (!keyRecord.length) return res.status(404).send("Key not found");

    // Send raw binary key (16 bytes)
    const keyBuffer = Buffer.from(keyRecord[0].enc_key, "hex");

    res.set({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store",
    });
    res.send(keyBuffer);

  } catch {
    res.status(401).send("Unauthorized");
  }
});

// ─── 5. Serve protected images ─────────────────────────────────────────────
router.get(
  "/image/:courseId/:imageId",
  protectImage,
  async (req, res) => {
    await serveProtectedImage(req, res, req.params.imageId, req.user.user_id);
  }
);

module.exports = router;