const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { processVideoToHLS } = require("./videoProcessor");
const { courseStreamUrl } = require("./videoProcessor");
const courseService = require("./courseService");

const RAW_DIR = path.join(__dirname, "..", "temp", "raw");
const PROCESSED_DIR = path.join(__dirname, "..", "processed", "courses");
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

async function ensureProcessedThumb({ courseId, lessonId, videoPath, uploadedThumbPath }) {
  const outDir = path.join(PROCESSED_DIR, courseId, lessonId, "thumbnails");
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
  const streamUrl = `/api/courses/stream/${courseId}/${lessonId}/thumbnails/${path.basename(target)}`;
  return streamUrl;
}

/**
 * Handle all uploaded mediaFiles (videos) for a course in one place.
 * - Saves files to RAW_DIR
 * - Creates/updates course_media rows (url + thumbnail)
 * - Starts HLS processing via processVideoToHLS
 *
 * @param {Object} params
 * @param {Object} params.req - Express request (must have req.files.mediaFiles[])
 * @param {string} params.courseId
 * @param {Array} params.mediaMeta - Array aligned with mediaFiles for titles, lessonIds, etc.
 * @param {string|null} params.uploadedThumbUrl - Optional uploaded thumbnail URL (only used for first video)
 */
async function handleCourseMediaUploads({ req, courseId, mediaMeta = [], uploadedThumbUrl = null }) {
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
    const outFilename = `${courseId}_${lessonId}${ext}`;
    const videoPath = path.join(RAW_DIR, outFilename);

    // multer memoryStorage provides buffer
    await fsp.writeFile(videoPath, file.buffer);

    // Create or find media record
    let videoItem = (await courseService.getByIdFull(courseId)).media.find(
      (m) => m.type === "video" && m.title === baseTitle
    );
    if (!videoItem) {
      videoItem = await courseService.addMedia(courseId, {
        title: baseTitle,
        type: "video",
        sort_order: i,
        lesson_id: lessonId, // ✅ Store lessonId
        is_preview: meta.is_preview ?? false,
        url: "",
        thumbnail: null,
      });
    } else {
      // ✅ Also update lessonId if it exists but wasn't set
      await courseService.updateMedia(courseId, videoItem.id, {
        lesson_id: lessonId,
        is_preview: meta.is_preview ?? videoItem.is_preview
      });
    }

    const playUrl = courseStreamUrl(courseId, lessonId);
    await courseService.updateMedia(courseId, videoItem.id, { url: playUrl });

    // Thumbnail generation runs in background — avoids blocking create-full on FFmpeg
    const uploadedThumbPath =
      uploadedThumbUrl && i === 0 ? uploadedThumbUrl : null;
    setImmediate(() => {
      ensureProcessedThumb({
        courseId,
        lessonId,
        videoPath,
        uploadedThumbPath,
      })
        .then((thumbUrl) =>
          courseService.updateMedia(courseId, videoItem.id, { thumbnail: thumbUrl })
        )
        .catch((e) => console.error("Course media thumb failed:", e?.message || e));
    });

    // Start HLS processing in background
    processVideoToHLS(videoPath, "courses", courseId, lessonId).catch((e) =>
      console.error("FFmpeg failed:", e)
    );

    if (lessonId === "_intro" || baseTitle === "Introduction") {
      try {
        const { parseMetadata } = require("../utils/coursePublicDetail");
        const course = await courseService.getById(courseId);
        const meta = parseMetadata(course.metadata);
        meta.intro_video_url = playUrl;
        await courseService.update(courseId, {
          metadata: meta,
          updated_by: req.user?.user_id || null,
        });
      } catch (e) {
        console.error("Failed to set course intro_video_url:", e?.message || e);
      }
    }

    results.push({ lesson_id: lessonId, media_id: videoItem.id, url: playUrl, thumbnail: null });
  }

  return results;
}

module.exports = { handleCourseMediaUploads };
