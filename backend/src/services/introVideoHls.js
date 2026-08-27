/**
 * Transcode overview intro videos to HLS (index.m3u8 + .ts segments).
 * Used for course/lab/skill-builder hero videos on public overview pages.
 *
 * All uploads schedule FFmpeg in the background so create-full/update-full
 * respond before Nginx/proxy timeouts (~60s).
 */
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const ffmpeg = require("fluent-ffmpeg");
const logger = require("../lib/logger");

/**
 * @param {string} inputPath - path to source video on disk
 * @param {string} outputDir - directory for playlist + segments
 * @returns {Promise<string>} absolute path to index.m3u8
 */
async function transcodeFileToHls(inputPath, outputDir) {
  await fsp.mkdir(outputDir, { recursive: true });
  const m3u8Path = path.join(outputDir, "index.m3u8");

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-hls_time 6",
        "-hls_list_size 0",
        "-hls_playlist_type vod",
        "-hls_flags independent_segments",
        "-hls_segment_filename",
        path.join(outputDir, "seg%03d.ts"),
      ])
      .output(m3u8Path)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  return m3u8Path;
}

/**
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} outputDir
 */
async function transcodeBufferToHls(buffer, originalName, outputDir) {
  await fsp.mkdir(outputDir, { recursive: true });
  const ext = path.extname(originalName || "") || ".mp4";
  const tempPath = path.join(outputDir, `_source${ext}`);
  await fsp.writeFile(tempPath, buffer);
  try {
    return await transcodeFileToHls(tempPath, outputDir);
  } finally {
    try {
      await fsp.unlink(tempPath);
    } catch {
      /* ignore */
    }
  }
}

function labIntroHlsUrl(labId) {
  return `/api/labs/intro-media/${labId}/index.m3u8`;
}

function courseIntroHlsUrl(courseId) {
  return `/api/courses/stream/${courseId}/_intro/master.m3u8`;
}

function isHlsUrl(url) {
  return typeof url === "string" && /\.m3u8($|\?)/i.test(url.trim());
}

const RAW_DIR = path.join(__dirname, "../temp/raw");
const INTRO_LESSON_ID = "_intro";

function parseLabMetadata(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return typeof p === "object" && p !== null && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Course intro — metadata update is fast; file write + HLS run in background.
 */
async function scheduleCourseIntroUpload(courseId, file, userId, oldIntroUrl = null) {
  const courseService = require("./courseService");
  const { processVideoToHLS } = require("./videoProcessor");
  const { parseMetadata } = require("../utils/coursePublicDetail");
  const mediaStorage = require("./mediaStorageService");

  const course = await courseService.getById(courseId);
  const meta = parseMetadata(course.metadata);
  const previousUrl =
    oldIntroUrl || meta.intro_video_url || meta.introVideoUrl || null;
  if (previousUrl) {
    await mediaStorage.deleteMediaUrl(previousUrl);
  }
  const playUrl = courseIntroHlsUrl(courseId);
  meta.intro_video_url = playUrl;
  meta.introVideoUrl = playUrl;
  meta.intro_video_status = "processing";
  await courseService.update(courseId, {
    metadata: meta,
    updated_by: userId,
  });

  const buffer = Buffer.from(file.buffer);
  const originalName = file.originalname || "intro.mp4";

  setImmediate(() => {
    (async () => {
      try {
        await fsp.mkdir(RAW_DIR, { recursive: true });
        const ext = path.extname(originalName) || ".mp4";
        const videoPath = path.join(RAW_DIR, `${courseId}_${INTRO_LESSON_ID}${ext}`);
        await fsp.writeFile(videoPath, buffer);
        const result = await processVideoToHLS(videoPath, "courses", courseId, INTRO_LESSON_ID);
        const updated = await courseService.getById(courseId);
        const m = parseMetadata(updated.metadata);
        m.intro_video_status = "ready";
        // With Azure enabled the local _intro files are deleted after upload, so the
        // /api/courses/stream/.../_intro route would 404. Point the intro URL at the
        // full Azure blob URL instead. Locally (no Azure) keep the stream route.
        if (result?.masterUrl) {
          m.intro_video_url = result.masterUrl;
          m.introVideoUrl = result.masterUrl;
        }
        await courseService.update(courseId, { metadata: m, updated_by: userId });
      } catch (err) {
        logger.error("[introVideo] course intro background failed:", err);
        try {
          const updated = await courseService.getById(courseId);
          const m = parseMetadata(updated.metadata);
          m.intro_video_status = "failed";
          await courseService.update(courseId, { metadata: m, updated_by: userId });
        } catch {
          /* ignore */
        }
      }
    })();
  });

  return playUrl;
}

/** @deprecated Use scheduleCourseIntroUpload — kept for existing imports */
async function processCourseIntroUpload(courseId, file, userId) {
  return scheduleCourseIntroUpload(courseId, file, userId);
}

/**
 * Lab + Skill Builder intro — same background pattern as hands-on labs.
 */
async function scheduleLabIntroUpload(labId, file, userId, labService, oldIntroUrl = null) {
  const introUrl = labIntroHlsUrl(labId);
  const buffer = Buffer.from(file.buffer);
  const originalName = file.originalname || "intro.mp4";
  const mediaStorage = require("./mediaStorageService");

  const full = await labService.repo.findByIdFull(labId);
  const metaAfter = parseLabMetadata(full?.metadata);
  const previousUrl =
    oldIntroUrl || metaAfter.intro_video_url || metaAfter.introVideoUrl || null;
  if (previousUrl) {
    await mediaStorage.deleteMediaUrl(previousUrl);
  }
  metaAfter.introVideoUrl = introUrl;
  metaAfter.intro_video_url = introUrl;
  metaAfter.intro_video_status = "processing";
  await labService.update(labId, { metadata: metaAfter, updated_by: userId });

  setImmediate(() => {
    (async () => {
      try {
        const finalUrl = await mediaStorage.processVideoToHlsAndUpload(
          buffer,
          originalName,
          {
            blobPrefix: `labs/intro/${labId}`,
            localApiUrl: introUrl,
            localDir: path.join(__dirname, "../../uploads/labs/intro", String(labId)),
          },
        );
        const updated = await labService.repo.findByIdFull(labId);
        const m = parseLabMetadata(updated?.metadata);
        m.intro_video_status = "ready";
        m.introVideoUrl = finalUrl;
        m.intro_video_url = finalUrl;
        await labService.update(labId, { metadata: m, updated_by: userId });
      } catch (err) {
        logger.error("[introVideo] lab intro background failed:", err);
        try {
          const updated = await labService.repo.findByIdFull(labId);
          const m = parseLabMetadata(updated?.metadata);
          m.intro_video_status = "failed";
          await labService.update(labId, { metadata: m, updated_by: userId });
        } catch {
          /* ignore */
        }
      }
    })();
  });

  return introUrl;
}

module.exports = {
  transcodeFileToHls,
  transcodeBufferToHls,
  labIntroHlsUrl,
  courseIntroHlsUrl,
  isHlsUrl,
  scheduleCourseIntroUpload,
  scheduleLabIntroUpload,
  processCourseIntroUpload,
  INTRO_LESSON_ID,
};
