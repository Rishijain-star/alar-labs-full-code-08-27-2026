// services/videoProcessor.js
const ffmpeg = require("fluent-ffmpeg");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const db = require("../database/db");
const { v4: uuidv4 } = require("uuid");
const mediaStorage = require("./mediaStorageService");

const PROCESSED_DIR_COURSES = path.join(__dirname, "../processed/courses");
const PROCESSED_DIR_LABS = path.join(__dirname, "../processed/labs");

function courseHlsPath(parentId, lessonId) {
  return `courses/${parentId}/${lessonId}/master.m3u8`;
}

function courseStreamUrl(parentId, lessonId) {
  return `/api/courses/stream/${parentId}/${lessonId}/master.m3u8`;
}

async function updateCourseMediaHlsPath(parentId, lessonId, hlsPath) {
  try {
    const { CourseMedia } = require("../models");
    await CourseMedia.update(
      { url: hlsPath },
      { where: { course_id: parentId, lesson_id: lessonId, type: "video" } }
    );
  } catch (err) {
    console.error("[videoProcessor] Course media update failed:", err?.message || err);
  }
}

const processVideoToHLS = async (inputPath, parentType, parentId, lessonId) => {
  console.log(`[videoProcessor] Starting processing for ${parentType} ${parentId}, lesson ${lessonId}`);
  
  const isCourse = parentType === "courses";
  // Intro/preview videos are PUBLIC marketing clips — never encrypt them. They
  // have no course_media row to hold a key, so an encrypted intro could never be
  // decrypted. Skipping encryption lets them play directly via the stream route.
  const isIntro = lessonId === "_intro";
  const outputDir = path.join(isCourse ? PROCESSED_DIR_COURSES : PROCESSED_DIR_LABS, parentId, lessonId);
  fs.mkdirSync(outputDir, { recursive: true });

  // --- AES-128 Encryption Key ---
  // SECURITY: the key + key.info live in a temp dir OUTSIDE outputDir so the
  // Azure upload (which uploads the whole outputDir) can never publish the key.
  // The key is served to players at runtime from the DB, not from storage.
  const encryptionKey = crypto.randomBytes(16);
  const keyHex = encryptionKey.toString("hex");
  const keyIV = crypto.randomBytes(16).toString("hex");
  const keyDir = path.join(os.tmpdir(), `hlskey-${parentId}-${lessonId}-${uuidv4()}`);
  fs.mkdirSync(keyDir, { recursive: true });
  const tempKeyPath = path.join(keyDir, "enc.key");
  const tempKeyInfoPath = path.join(keyDir, "key.info");
  fs.writeFileSync(tempKeyPath, encryptionKey);

  // Absolute backend base so the key URI in the playlist resolves correctly even
  // when the .m3u8 itself is served from Azure (a different origin).
  const keyBase = String(process.env.PUBLIC_API_URL || process.env.API_URL || "")
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
  const keyUrl = isCourse
    ? `${keyBase}/api/courses/lesson-key/${parentId}/${lessonId}`
    : `/api/labs/stream/key/${parentId}/${lessonId}`;

  fs.writeFileSync(
    tempKeyInfoPath,
    `${keyUrl}\n${tempKeyPath}\n${keyIV}`
  );

  const cleanupKeyDir = () => {
    try { fs.rmSync(keyDir, { recursive: true, force: true }); } catch { /* ignore */ }
  };

  // --- FFmpeg: Convert to HLS ---
  return new Promise((resolve, reject) => {
    console.log(`[videoProcessor] Starting ffmpeg for ${inputPath}`);
    const command = ffmpeg(inputPath);

    // --- HLS settings for a single 720p rendition ---
    const outputOptions = [
      "-c:v libx264",
      "-preset medium",
      "-crf 23",
      "-s 1280x720",
      "-b:v 2000k",
      "-hls_time 6",
      "-hls_list_size 0",
      "-hls_playlist_type vod",
      "-hls_flags independent_segments",
      // Encrypt everything except public intro/preview videos.
      ...(isIntro ? [] : [`-hls_key_info_file ${tempKeyInfoPath}`]),
      "-hls_segment_filename",
      path.join(outputDir, "seg%d.ts"),
    ];

    command
      .outputOptions(outputOptions)
      .output(path.join(outputDir, "master.m3u8"))
      .on("start", (cmd) => console.log("FFmpeg started:", cmd))
      .on("progress", (p) => {
        if (p.percent) {
          console.log(`Processing: ${Math.floor(p.percent)}%`);
        }
      })
      .on("end", async () => {
        console.log(`[videoProcessor] FFmpeg finished for ${parentId}/${lessonId}`);
        try {
          if (!isCourse) {
            // 1. Update Lab in DB (if it's a lab)
            await db.query(
              "UPDATE labs SET hls_ready = true, hls_path = ? WHERE id = ?",
              [`/api/labs/stream/${parentId}/${lessonId}/master.m3u8`, parentId]
            );

            // 2. Save Encryption Key to DB for lab
            const [existingKey] = await db.query(
              "SELECT id FROM lab_encryption_keys WHERE lab_id = ?",
              [parentId]
            );

            if (existingKey.length > 0) {
              await db.query(
                "UPDATE lab_encryption_keys SET enc_key = ? WHERE lab_id = ?",
                [keyHex, parentId]
              );
            } else {
              await db.query(
                "INSERT INTO lab_encryption_keys (id, lab_id, enc_key, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
                [uuidv4(), parentId, keyHex]
              );
            }
          } else {
            // Store a PLAYABLE url. Locally this is the /api stream path; if Azure
            // is enabled it's overwritten with the full blob URL after upload below.
            await updateCourseMediaHlsPath(parentId, lessonId, courseStreamUrl(parentId, lessonId));

            // Persist the AES key on the course_media row (no lessons FK), so the
            // key route can serve it after local files are cleaned up. Best-effort:
            // a failure must never abort the Azure upload / cleanup below.
            // Intro videos are unencrypted, so there is no key to store.
            try {
              if (!isIntro) {
                await db.query(
                  "UPDATE course_media SET enc_key = ? WHERE course_id = ? AND lesson_id = ? AND type = 'video'",
                  [keyHex, parentId, lessonId]
                );
              }
            } catch (keyErr) {
              console.error(
                "[videoProcessor] Course key store failed (non-fatal):",
                keyErr?.message || keyErr
              );
            }
            console.log("[videoProcessor] Course processing complete");
          }

          console.log(`[videoProcessor] DB updated for ${parentType} ${parentId}`);

          // Upload HLS folder to Azure Blob, then delete local processed files + source mp4
          let azureMasterUrl = null;
          if (mediaStorage.isAzureEnabled()) {
            try {
              const blobPrefix = `${parentType}/${parentId}/${lessonId}`;
              const azureResult = await mediaStorage.uploadHlsDirectoryAndCleanup(
                outputDir,
                blobPrefix,
                { deleteSourceMp4: inputPath }
              );
              if (azureResult.masterUrl) {
                azureMasterUrl = azureResult.masterUrl;
                console.log(`[videoProcessor] Azure HLS URL: ${azureResult.masterUrl}`);
                if (!isCourse) {
                  await db.query("UPDATE labs SET hls_path = ? WHERE id = ?", [
                    azureResult.masterUrl,
                    parentId,
                  ]);
                } else {
                  // Full Azure blob URL — playable directly by the HLS player.
                  await updateCourseMediaHlsPath(parentId, lessonId, azureResult.masterUrl);
                }
              }
            } catch (azureErr) {
              console.error("[videoProcessor] Azure upload failed:", azureErr?.message || azureErr);
            }
          } else {
            try { fs.unlinkSync(inputPath); } catch { }
          }

          cleanupKeyDir();
          // masterUrl is the full Azure URL when Azure is on, else null (files stay
          // local and are served via the /api/courses/stream route).
          resolve({ success: true, outputDir, masterUrl: azureMasterUrl });
        } catch (dbError) {
          console.error(`[videoProcessor] DB update failed for ${parentId}:`, dbError);
          cleanupKeyDir();
          reject(dbError);
        }
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        cleanupKeyDir();
        reject(err);
      })
      .run();
  });
};

module.exports = { processVideoToHLS };
module.exports.courseHlsPath = courseHlsPath;
module.exports.courseStreamUrl = courseStreamUrl;
