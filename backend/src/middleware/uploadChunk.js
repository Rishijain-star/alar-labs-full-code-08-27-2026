// routes/uploadChunk.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { processVideoToHLS } = require("../services/videoProcessor");

const TEMP_DIR = path.join(__dirname, "../temp/chunks");
const RAW_DIR = path.join(__dirname, "../temp/raw");

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });

router.post("/chunk", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
    const uploadId = req.headers["x-upload-id"];    // unique ID frontend generates
    const chunkIndex = parseInt(req.headers["x-chunk-index"]);
    const totalChunks = parseInt(req.headers["x-total-chunks"]);
    const filename = req.headers["x-filename"];
    const courseId = req.headers["x-course-id"];
    const lessonId = req.headers["x-lesson-id"];

    // Save this chunk to a temp folder
    const chunkDir = path.join(TEMP_DIR, uploadId);
    fs.mkdirSync(chunkDir, { recursive: true });
    fs.writeFileSync(path.join(chunkDir, `chunk_${chunkIndex}`), req.body);

    const receivedCount = fs.readdirSync(chunkDir).length;

    res.json({ received: receivedCount, total: totalChunks });

    // All chunks arrived → merge into one file → run your FFmpeg
    if (receivedCount === totalChunks) {
        const ext = path.extname(filename) || ".mp4";
        const finalPath = path.join(RAW_DIR, `${uploadId}${ext}`);
        const writeStream = fs.createWriteStream(finalPath);

        for (let i = 0; i < totalChunks; i++) {
            const data = fs.readFileSync(path.join(chunkDir, `chunk_${i}`));
            writeStream.write(data);
        }

        writeStream.end();
        writeStream.on("finish", () => {
            fs.rmSync(chunkDir, { recursive: true }); // cleanup temp chunks

            // Your existing function — nothing changed here
            processVideoToHLS(finalPath, courseId, lessonId);
        });
    }
});

module.exports = router;