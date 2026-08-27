// routes/stream.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../database/db");

const PROCESSED_DIR = path.join(__dirname, "../processed/courses");

// ──────────────────────────────────────────────────────────────────
//  SESSION-BASED CHUNK ACCESS
//
//  How it works (no tokens, no AWS):
//  1. Frontend calls GET /stream/init/:lessonId  → server sets a
//     signed cookie (lessonId + timestamp + HMAC secret).
//  2. Every .m3u8 and .ts request checks this cookie is valid.
//  3. Cookie expires in 4 hours. No JWT. No user auth check.
// ──────────────────────────────────────────────────────────────────

const COOKIE_SECRET = process.env.STREAM_COOKIE_SECRET || "changeme_in_env";
const COOKIE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── Sign a cookie value ─────────────────────────────────────────
const signCookie = (lessonId, timestamp) => {
  const payload = `${lessonId}:${timestamp}`;
  const sig = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
};

// ── Verify a cookie value ───────────────────────────────────────
const verifyCookie = (value, lessonId) => {
  if (!value) return false;

  const parts = value.split(":");
  if (parts.length !== 3) return false;

  const [cookieLessonId, timestamp, sig] = parts;

  // Must match requested lesson
  if (cookieLessonId !== lessonId) return false;

  // Must not be expired
  if (Date.now() - parseInt(timestamp, 10) > COOKIE_TTL_MS) return false;

  // Verify HMAC
  const expected = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(`${cookieLessonId}:${timestamp}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

// ──────────────────────────────────────────────────────────────────
//  STEP 1 — Frontend requests a stream session
//  GET /stream/init/:labId
//  → Sets a signed cookie, returns the master playlist URL
// ──────────────────────────────────────────────────────────────────
router.get("/init/:labId", async (req, res) => {
  const { labId } = req.params;

  // Check lab exists and HLS is ready
  const [rows] = await db.query(
    "SELECT hls_ready, hls_path, course_id FROM labs WHERE id = ?",
    [labId]
  );

  if (!rows.length || !rows[0].hls_ready) {
    return res.status(404).json({ success: false, message: "Video not ready yet." });
  }

  // Set signed cookie
  const cookieVal = signCookie(labId, Date.now());

  res.cookie(`stream_${labId}`, cookieVal, {
    httpOnly: true,        // JS can't read it
    sameSite: "strict",    // No cross-site requests
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_TTL_MS,
  });

  res.json({
    success: true,
    playlistUrl: `/stream/play/${labId}/master.m3u8`,
  });
});

// ──────────────────────────────────────────────────────────────────
//  CHUNK CHECK MIDDLEWARE
//  Runs before every .m3u8 and .ts request
// ──────────────────────────────────────────────────────────────────
const checkStreamCookie = (req, res, next) => {
  const { labId } = req.params;
  const cookieVal = req.cookies[`stream_${labId}`];

  if (!verifyCookie(cookieVal, labId)) {
    return res.status(401).json({ success: false, message: "Stream session invalid or expired. Re-init." });
  }
  next();
};

// SECURITY: only allow simple HLS filenames (no path separators / traversal).
const SAFE_HLS_FILE = /^[A-Za-z0-9._-]+$/;
const isSafeHlsFile = (name) =>
  typeof name === "string" && SAFE_HLS_FILE.test(name) && !name.includes("..");

// ──────────────────────────────────────────────────────────────────
//  STEP 2 — Serve playlist and chunks
//  GET /stream/play/:labId/:filename
// ──────────────────────────────────────────────────────────────────
router.get("/play/:labId/:filename", checkStreamCookie, (req, res) => {
  const { labId, filename } = req.params;

  if (!isSafeHlsFile(filename)) {
    return res.status(400).send("Invalid filename");
  }

  // 1. Get courseId for this lab (needed for directory structure)
  db.query("SELECT course_id FROM labs WHERE id = ?", [labId])
    .then(([rows]) => {
      if (!rows.length) return res.status(404).send("Lab not found");
      const courseId = rows[0].course_id || "standalone"; // support standalone labs

      const filePath = path.join(PROCESSED_DIR, courseId, labId, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      // Set content types
      if (filename.endsWith(".m3u8")) {
        res.set("Content-Type", "application/vnd.apple.mpegurl");
      } else if (filename.endsWith(".ts")) {
        res.set("Content-Type", "video/MP2T");
      }

      fs.createReadStream(filePath).pipe(res);
    })
    .catch(err => {
      console.error("Stream error:", err);
      res.status(500).send("Server error");
    });
});

// ─── 4. Serve AES-128 decryption key ──────────────────────────────────────
// SECURITY: gated by the same signed stream cookie as the playlist/segments.
// Falls back to the course lesson key table so course videos work after the
// local key file has been cleaned up post-Azure-upload.
router.get("/key/:labId", checkStreamCookie, async (req, res) => {
  try {
    const { labId } = req.params;

    let [keyRecord] = await db.query(
      "SELECT enc_key FROM lab_encryption_keys WHERE lab_id = ?",
      [labId]
    );
    if (!keyRecord.length) {
      [keyRecord] = await db.query(
        "SELECT enc_key FROM lesson_encryption_keys WHERE lesson_id = ?",
        [labId]
      );
    }

    if (!keyRecord.length) return res.status(404).send("Key not found");

    // Send raw binary key (16 bytes)
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

module.exports = router;