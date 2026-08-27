const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { processVideoToHLS } = require("./videoProcessor");
const labService = require("./labService");

const RAW_DIR = path.join(__dirname, "..", "temp", "raw");
const PROCESSED_DIR = path.join(__dirname, "..", "processed", "labs");
fs.mkdirSync(RAW_DIR, { recursive: true });

function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function generateThumbWithFfmpeg(inputPath, outDir, filename = "thumb.jpg") {
  const ffmpeg = require("fluent-ffmpeg");
  await ensureDir(outDir);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", () => resolve(path.join(outDir, filename)))
      .on("error", reject)
      .screenshots({
        count: 1,
        timemarks: ["00:00:01.000"],
        filename,
        folder: outDir,
        size: "640x?",
      });
  });
}

async function ensureProcessedThumb({ labId, lessonId, videoPath, uploadedThumbPath }) {
  const outDir = path.join(PROCESSED_DIR, labId, lessonId, "thumbnails");
  await ensureDir(outDir);
  let target;
  if (uploadedThumbPath && fs.existsSync(uploadedThumbPath)) {
    const ext = path.extname(uploadedThumbPath) || ".jpg";
    target = path.join(outDir, `thumb${ext}`);
    await fsp.copyFile(uploadedThumbPath, target);
    try { await fsp.unlink(uploadedThumbPath); } catch { }
  } else {
    target = await generateThumbWithFfmpeg(videoPath, outDir, "thumb.jpg");
  }
  const streamUrl = `/api/labs/stream/${labId}/${lessonId}/thumbnails/${path.basename(target)}`;
  return streamUrl;
}

async function handleLabMediaUploads({ req, labId, mediaMeta = [], uploadedThumbUrl = null }) {
  const mediaFilesArr = req.files?.mediaFiles || [];
  if (mediaFilesArr.length === 0) return [];

  const results = [];

  for (let i = 0; i < mediaFilesArr.length; i++) {
    const file = mediaFilesArr[i];
    if (!file.mimetype?.startsWith("video/")) continue;

    const meta = mediaMeta[i] || {};
    const baseTitle = meta.title || `Video ${i + 1}`;
    const lessonId = meta.lesson_id || meta.lessonId || `${slugify(baseTitle)}_${Date.now()}`;
    const ext = path.extname(file.originalname) || ".mp4";
    const outFilename = `${labId}_${lessonId}${ext}`;
    const videoPath = path.join(RAW_DIR, outFilename);

    await fsp.writeFile(videoPath, file.buffer);

    const playUrl = `/api/labs/stream/${labId}/${lessonId}/master.m3u8`;

    let uploadedThumbPath = null;
    if (uploadedThumbUrl && i === 0) {
      uploadedThumbPath = uploadedThumbUrl;
    }
    const thumbUrl = await ensureProcessedThumb({
      labId,
      lessonId,
      videoPath,
      uploadedThumbPath,
    });

    processVideoToHLS(videoPath, "labs", labId, lessonId).catch((e) =>
      console.error("FFmpeg failed:", e)
    );

    results.push({ lesson_id: lessonId, url: playUrl, thumbnail: thumbUrl });
  }

  return results;
}

module.exports = { handleLabMediaUploads };
