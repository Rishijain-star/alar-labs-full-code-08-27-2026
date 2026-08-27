// routes/uploadChunk.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { processVideoToHLS } = require("../services/videoProcessor");

const TEMP_DIR = path.join(__dirname, "../temp/chunks");
const UPLOAD_DIR = path.join(__dirname, "../temp/raw");

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * POST /upload/chunk
 * 
 * Headers (sent by frontend per chunk):
 *   x-upload-id    → unique ID for this upload session (uuid from frontend)
 *   x-chunk-index  → 0-based chunk index
 *   x-total-chunks → total number of chunks
 *   x-filename     → original filename
 *   x-course-id    → course ID
 *   x-lesson-id    → lesson ID
 * 
 * Body: raw binary chunk (Content-Type: application/octet-stream)
 */
router.post("/chunk", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
    const uploadId = req.headers["x-upload-id"];
    const chunkIndex = parseInt(req.headers["x-chunk-index"], 10);
    const totalChunks = parseInt(req.headers["x-total-chunks"], 10);
    const filename = req.headers["x-filename"];
    const courseId = req.headers["x-course-id"];
    const lessonId = req.headers["x-lesson-id"];

    // ── Basic validation ────────────────────────────────────────────
    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !filename || !courseId || !lessonId) {
        return res.status(400).json({ success: false, message: "Missing required headers." });
    }

    // ── SECURITY: sanitize client-controlled values used in fs paths ──
    // uploadId is attacker-controlled and was used directly in path.join →
    // path traversal / arbitrary file write. Enforce a safe id and bounds.
    const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
    if (!SAFE_ID.test(uploadId)) {
        return res.status(400).json({ success: false, message: "Invalid upload id." });
    }
    if (chunkIndex < 0 || totalChunks < 1 || totalChunks > 100000 || chunkIndex >= totalChunks) {
        return res.status(400).json({ success: false, message: "Invalid chunk range." });
    }
    // Only keep a safe extension derived from the filename.
    const rawExt = path.extname(String(filename)).toLowerCase();
    const ext = /^\.[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : ".mp4";

    // ── Save chunk to temp folder ───────────────────────────────────
    const chunkDir = path.join(TEMP_DIR, uploadId);
    // Defense-in-depth: ensure the resolved path stays under TEMP_DIR.
    if (!chunkDir.startsWith(TEMP_DIR + path.sep)) {
        return res.status(400).json({ success: false, message: "Invalid upload id." });
    }
    fs.mkdirSync(chunkDir, { recursive: true });

    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, req.body);

    // Count how many chunks we have now
    const receivedChunks = fs.readdirSync(chunkDir).length;

    res.json({
        success: true,
        received: receivedChunks,
        total: totalChunks,
        done: receivedChunks === totalChunks,
    });

    // ── All chunks received → merge + process ──────────────────────
    if (receivedChunks === totalChunks) {
        try {
            const outputPath = path.join(UPLOAD_DIR, `${uploadId}${ext}`);
            const writeStream = fs.createWriteStream(outputPath);

            // Merge chunks in order
            for (let i = 0; i < totalChunks; i++) {
                const data = fs.readFileSync(path.join(chunkDir, `chunk_${i}`));
                writeStream.write(data);
            }

            writeStream.end();
            writeStream.on("finish", async () => {
                // Clean up temp chunks
                fs.rmSync(chunkDir, { recursive: true, force: true });

                console.log(`✅ All chunks merged → ${outputPath}`);
                console.log(`🎬 Starting FFmpeg processing for lesson ${lessonId}...`);

                // Process video to HLS (async, frontend can poll status).
                // Signature is (inputPath, parentType, parentId, lessonId).
                processVideoToHLS(outputPath, "courses", courseId, lessonId)
                    .then(() => console.log(`✅ HLS ready for lesson ${lessonId}`))
                    .catch((err) => console.error(`❌ FFmpeg failed:`, err));
            });
        } catch (err) {
            console.error("Merge error:", err);
        }
    }
});

/**
 * GET /upload/status/:lessonId
 * Frontend polls this to know when HLS is ready
 */
router.get("/status/:lessonId", async (req, res) => {
    const db = require("../database/db");
    const [rows] = await db.query(
        "SELECT hls_ready, hls_path FROM lessons WHERE id = ?",
        [req.params.lessonId]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Lesson not found" });

    res.json({
        success: true,
        ready: !!rows[0].hls_ready,
        hlsPath: rows[0].hls_path || null,
    });
});

module.exports = router;