// middleware/courseUpload.js
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { handleUploadError } = require("./upload"); // your existing file

const TEMP_RAW = path.join(__dirname, "../temp/raw");
fs.mkdirSync(TEMP_RAW, { recursive: true });

// ── Disk storage so ffmpeg can read the file path directly ──────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_RAW),
  filename:    (req, file, cb) => {
    // courseId + lessonId come from req.body (sent alongside the file)
    const ext  = path.extname(file.originalname) || ".mp4";
    const name = `${Date.now()}_${req.body.lessonId || "lesson"}${ext}`;
    cb(null, name);
  },
});

const videoFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska", "video/mpeg"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Invalid file type. Videos only."), false);
};

// Single video field named "video"
const createFullUpload = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).single("video");

module.exports = { createFullUpload };