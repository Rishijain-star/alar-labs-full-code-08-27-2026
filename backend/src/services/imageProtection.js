// services/imageProtection.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const db = require("../database/db");

const UPLOADS_DIR = path.join(__dirname, "../uploads/images");

// ✅ Serve image with optional watermark
const serveProtectedImage = async (req, res, imageId, userId) => {
  try {
    // Lookup real filename from DB
    const [image] = await db.query(
      "SELECT filename, course_id FROM course_images WHERE id = ?",
      [imageId]
    );

    if (!image.length) return res.status(404).json({ message: "Not found" });

    const filePath = path.join(UPLOADS_DIR, image[0].filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // ─── Add invisible watermark with user ID ──────────────────────────────
    const watermarkedImage = await sharp(filePath)
      .composite([{
        input: Buffer.from(
          `<svg width="400" height="30">
            <text x="5" y="20" font-size="14" fill="rgba(255,255,255,0.15)" 
                  font-family="Arial">
              User:${userId} - Protected Content
            </text>
          </svg>`
        ),
        gravity: "southeast",
        blend: "over",
      }])
      .jpeg({ quality: 85 })
      .toBuffer();

    // ─── Security headers ──────────────────────────────────────────────────
    res.set({
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store, no-cache",    // prevent browser caching
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",                   // no download prompt
    });

    return res.send(watermarkedImage);

  } catch (err) {
    console.error("Image serve error:", err);
    return res.status(500).json({ message: "Error serving image" });
  }
};

module.exports = { serveProtectedImage };