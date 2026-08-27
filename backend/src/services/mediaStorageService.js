/**
 * Unified media pipeline:
 * - Images → Sharp compress (webp) → Azure Blob (or local fallback)
 * - PDF / audio / zip → Azure Blob (or local)
 * - Video → local merge → FFmpeg HLS → Azure upload → delete local temp
 */
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const azure = require("./azureBlobService");

const LOCAL_UPLOAD_ROOT = path.join(__dirname, "../../uploads");
const TEMP_ROOT = path.join(__dirname, "../temp");
const PROCESSED_COURSES = path.join(__dirname, "../processed/courses");

function isOurStoredMediaUrl(url) {
  if (!url || typeof url !== "string") return false;
  const s = url.trim().split("?")[0];
  if (!s || s.startsWith("blob:")) return false;
  if (s.startsWith("/uploads/")) return true;
  if (s.includes("blob.core.windows.net")) return true;
  if (s.includes("/api/labs/instruction-media/")) return true;
  if (s.includes("/api/labs/intro-media/")) return true;
  if (s.includes("/api/courses/stream/")) return true;
  return false;
}

function parseAzurePublicUrl(url) {
  try {
    const u = new URL(url.split("?")[0]);
    if (!u.hostname.includes("blob.core.windows.net")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { container: parts[0], blobPath: parts.slice(1).join("/") };
  } catch {
    return null;
  }
}

/**
 * Delete a previously stored media URL (Azure blob, HLS prefix, or local uploads/).
 */
async function deleteMediaUrl(url) {
  if (!isOurStoredMediaUrl(url)) return;

  const clean = String(url).trim().split("?")[0];

  if (clean.startsWith("/uploads/")) {
    const rel = clean.replace(/^\/uploads\//, "");
    const localPath = path.join(LOCAL_UPLOAD_ROOT, rel);
    try {
      const stat = await fsp.stat(localPath);
      if (stat.isDirectory()) {
        await fsp.rm(localPath, { recursive: true, force: true });
      } else {
        await fsp.unlink(localPath);
      }
    } catch {
      /* already gone */
    }
    return;
  }

  const instrMatch = clean.match(/\/api\/labs\/instruction-media\/([^/]+)/);
  if (instrMatch) {
    const dir = path.join(LOCAL_UPLOAD_ROOT, "labs/instruction-media", instrMatch[1]);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    return;
  }

  const introMatch = clean.match(/\/api\/labs\/intro-media\/([^/]+)/);
  if (introMatch) {
    const dir = path.join(LOCAL_UPLOAD_ROOT, "labs/intro", introMatch[1]);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    return;
  }

  const courseStreamMatch = clean.match(/\/api\/courses\/stream\/([^/]+)\/([^/]+)\//);
  if (courseStreamMatch) {
    const [, courseId, lessonId] = courseStreamMatch;
    const dir = path.join(PROCESSED_COURSES, courseId, lessonId);
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    return;
  }

  if (!azure.isAzureEnabled()) return;

  const parsed = parseAzurePublicUrl(clean);
  if (!parsed) return;

  if (/\.m3u8$/i.test(parsed.blobPath)) {
    const prefix = parsed.blobPath.replace(/\/[^/]+\.m3u8$/i, "");
    await azure.deletePrefixInContainer(parsed.container, prefix);
    return;
  }

  await azure.deleteBlobInContainer(parsed.container, parsed.blobPath);
}

async function ensureLocalDir(subdir) {
  const dir = path.join(LOCAL_UPLOAD_ROOT, subdir);
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function localPublicUrl(subdir, filename) {
  return `/uploads/${subdir}/${filename}`.replace(/\\/g, "/");
}

/**
 * Image: Sharp → webp → Azure or /uploads/...
 */
async function saveImage(buffer, originalName, { folder = "images", outName, replaceUrl } = {}) {
  if (replaceUrl) {
    await deleteMediaUrl(replaceUrl);
  }
  const ext = (path.extname(originalName || "") || "").toLowerCase();
  const id = uuidv4();
  const isVector = ext === ".svg" || ext === ".ico";

  let outBuffer;
  let finalName;
  let contentType;

  if (isVector) {
    outBuffer = buffer;
    finalName = outName || `${id}${ext}`;
    contentType = ext === ".svg" ? "image/svg+xml" : "image/x-icon";
  } else {
    outBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
    finalName = outName || `${id}.webp`;
    contentType = "image/webp";
  }

  const blobPath = `${folder}/${finalName}`;

  if (azure.isAzureEnabled()) {
    return azure.uploadBuffer(outBuffer, blobPath, {
      containerKind: "images",
      contentType,
    });
  }

  const dir = await ensureLocalDir(folder);
  await fsp.writeFile(path.join(dir, finalName), outBuffer);
  return localPublicUrl(folder, finalName);
}

/**
 * Generic file (pdf, zip, mp3, etc.)
 */
async function saveFile(buffer, originalName, { folder = "documents", containerKind = "documents" } = {}) {
  const ext = path.extname(originalName || "") || ".bin";
  const outName = `${uuidv4()}${ext}`;
  const blobPath = `${folder}/${outName}`;

  if (azure.isAzureEnabled()) {
    return azure.uploadBuffer(buffer, blobPath, { containerKind });
  }

  const dir = await ensureLocalDir(folder);
  await fsp.writeFile(path.join(dir, outName), buffer);
  return localPublicUrl(folder, outName);
}

/**
 * Route upload by MIME: images → saveImage; audio/zip/pdf → saveFile.
 */
async function saveByMime(buffer, originalName, mimetype, { folder = "files" } = {}) {
  const mime = String(mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) {
    return saveImage(buffer, originalName, { folder });
  }
  if (mime.startsWith("audio/")) {
    return saveFile(buffer, originalName, { folder, containerKind: "audio" });
  }
  if (mime === "application/zip" || mime === "application/x-zip-compressed") {
    return saveFile(buffer, originalName, { folder, containerKind: "files" });
  }
  if (mime === "application/pdf") {
    return saveFile(buffer, originalName, { folder, containerKind: "documents" });
  }
  return saveFile(buffer, originalName, { folder, containerKind: "files" });
}

/**
 * After FFmpeg HLS in localDir, upload all segments to Azure and remove local files.
 */
async function uploadHlsDirectoryAndCleanup(localDir, blobPrefix, { deleteSourceMp4 = null } = {}) {
  if (!azure.isAzureEnabled()) {
    const masterLocal = path.join(localDir, "master.m3u8");
    const indexLocal = path.join(localDir, "index.m3u8");
    if (fs.existsSync(masterLocal) || fs.existsSync(indexLocal)) {
      return { masterUrl: null, prefix: localDir, local: true };
    }
    return { masterUrl: null, prefix: localDir, local: true };
  }

  const result = await azure.uploadDirectory(localDir, blobPrefix, { containerKind: "hls" });

  try {
    await fsp.rm(localDir, { recursive: true, force: true });
  } catch (_) { /* ignore */ }

  if (deleteSourceMp4 && fs.existsSync(deleteSourceMp4)) {
    try {
      await fsp.unlink(deleteSourceMp4);
    } catch (_) { /* ignore */ }
  }

  return result;
}

/**
 * Video: FFmpeg HLS locally → upload to Azure (or keep on disk when Azure disabled).
 * @returns {Promise<string>} playable URL (Azure blob or /api/... path)
 */
async function processVideoToHlsAndUpload(buffer, originalName, { blobPrefix, localApiUrl, localDir } = {}) {
  const workDir = path.join(TEMP_ROOT, "hls-work", path.basename(String(blobPrefix).replace(/[/\\]/g, "_")));
  const hlsDir = path.join(workDir, "hls");
  await fsp.mkdir(hlsDir, { recursive: true });

  const ext = path.extname(originalName || "") || ".mp4";
  const tempMp4 = path.join(workDir, `source${ext}`);
  await fsp.writeFile(tempMp4, buffer);

  const m3u8Path = path.join(hlsDir, "index.m3u8");
  await new Promise((resolve, reject) => {
    ffmpeg(tempMp4)
      .outputOptions([
        "-hls_time", "10",
        "-hls_list_size", "0",
        "-hls_segment_filename", path.join(hlsDir, "segment%03d.ts"),
      ])
      .output(m3u8Path)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const destDir = localDir || path.join(LOCAL_UPLOAD_ROOT, blobPrefix);
  await fsp.mkdir(destDir, { recursive: true });
  const entries = await fsp.readdir(hlsDir);
  for (const name of entries) {
    await fsp.copyFile(path.join(hlsDir, name), path.join(destDir, name));
  }

  if (azure.isAzureEnabled()) {
    const result = await uploadHlsDirectoryAndCleanup(hlsDir, blobPrefix, {
      deleteSourceMp4: tempMp4,
    });
    try {
      await fsp.rm(workDir, { recursive: true, force: true });
    } catch (_) { /* ignore */ }
    // Prefer stable app-served HLS URL for embedded lesson players
    if (localApiUrl) return localApiUrl;
    if (!result.masterUrl) {
      throw new Error("HLS upload to Azure did not return a master playlist URL");
    }
    return result.masterUrl;
  }

  try {
    await fsp.rm(workDir, { recursive: true, force: true });
  } catch (_) { /* ignore */ }
  return localApiUrl || `/uploads/${blobPrefix}/index.m3u8`.replace(/\\/g, "/");
}

/**
 * Accept video buffer, respond with a stable HLS URL immediately, transcode in background.
 * Avoids proxy/client timeouts during long FFmpeg runs.
 */
function scheduleInstructionMediaHls(buffer, originalName, { mediaId, localApiUrl, localDir, blobPrefix } = {}) {
  const id = mediaId || uuidv4();
  const apiUrl = localApiUrl || `/api/labs/instruction-media/${id}/index.m3u8`;
  const dir = localDir || path.join(LOCAL_UPLOAD_ROOT, "labs/instruction-media", id);
  const prefix = blobPrefix || `labs/instruction-media/${id}`;
  const buf = Buffer.from(buffer);

  setImmediate(() => {
    processVideoToHlsAndUpload(buf, originalName, {
      blobPrefix: prefix,
      localApiUrl: apiUrl,
      localDir: dir,
    }).catch((err) => {
      const logger = require("../lib/logger");
      logger.error("[instructionMedia] background HLS failed:", err?.message || err);
    });
  });

  return apiUrl;
}

module.exports = {
  saveImage,
  saveFile,
  saveByMime,
  processVideoToHlsAndUpload,
  scheduleInstructionMediaHls,
  uploadHlsDirectoryAndCleanup,
  deleteMediaUrl,
  isOurStoredMediaUrl,
  isAzureEnabled: azure.isAzureEnabled,
};
