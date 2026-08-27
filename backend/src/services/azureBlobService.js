const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { BlobServiceClient } = require("@azure/storage-blob");

function isAzureEnabled() {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  return process.env.AZURE_STORAGE_ENABLED !== "false" && !!cs;
}

function normalizeConnectionString(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  // Fix common typo: DefaultEndpointsProtocol="https;AccountName=...
  s = s.replace(/DefaultEndpointsProtocol="https/i, "DefaultEndpointsProtocol=https");
  return s;
}

function getPublicBaseUrl() {
  const custom = process.env.AZURE_STORAGE_PUBLIC_BASE_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  if (account) return `https://${account}.blob.core.windows.net`;
  return "";
}

let _client = null;

function getClient() {
  if (!isAzureEnabled()) {
    throw new Error("Azure Blob Storage is not configured");
  }
  if (!_client) {
    _client = BlobServiceClient.fromConnectionString(
      normalizeConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING),
    );
  }
  return _client;
}

function containerName(kind = "images") {
  // Single container (e.g. lcms-data) — use folder prefixes inside blobs
  const single = process.env.AZURE_CONTAINER_DEFAULT?.trim();
  if (single) return single;

  const map = {
    image: process.env.AZURE_CONTAINER_IMAGES || "images",
    images: process.env.AZURE_CONTAINER_IMAGES || "images",
    video: process.env.AZURE_CONTAINER_VIDEOS || "videos",
    videos: process.env.AZURE_CONTAINER_VIDEOS || "videos",
    document: process.env.AZURE_CONTAINER_DOCUMENTS || "documents",
    documents: process.env.AZURE_CONTAINER_DOCUMENTS || "documents",
    pdf: process.env.AZURE_CONTAINER_DOCUMENTS || "documents",
    audio: process.env.AZURE_CONTAINER_AUDIO || "audio",
    file: process.env.AZURE_CONTAINER_MISC || "files",
    files: process.env.AZURE_CONTAINER_MISC || "files",
    hls: process.env.AZURE_CONTAINER_VIDEOS || "videos",
  };
  return map[kind] || map.images;
}

/** Folder prefix inside container when using AZURE_CONTAINER_DEFAULT */
function blobPrefixForKind(kind = "images") {
  const single = process.env.AZURE_CONTAINER_DEFAULT?.trim();
  if (!single) return "";
  const folders = {
    image: "images",
    images: "images",
    video: "videos",
    videos: "videos",
    hls: "videos",
    document: "documents",
    documents: "documents",
    pdf: "documents",
    audio: "audio",
    file: "files",
    files: "files",
  };
  return folders[kind] || "files";
}

function buildBlobUrl(container, blobPath) {
  const base = getPublicBaseUrl();
  if (!base) return `/${container}/${blobPath}`;
  return `${base}/${container}/${blobPath}`;
}

async function ensureContainer(container) {
  const client = getClient();
  const cc = client.getContainerClient(container);
  await cc.createIfNotExists({ access: "blob" });
  return cc;
}

/**
 * Upload buffer to Azure Blob.
 * @returns {Promise<string>} public URL
 */
async function uploadBuffer(buffer, blobPath, { containerKind = "images", contentType } = {}) {
  const container = containerName(containerKind);
  const cc = await ensureContainer(container);
  const prefix = blobPrefixForKind(containerKind);
  const fullPath = prefix ? `${prefix}/${blobPath.replace(/^\/+/, "")}` : blobPath.replace(/^\/+/, "");
  const block = cc.getBlockBlobClient(fullPath);
  await block.uploadData(buffer, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
  });
  return buildBlobUrl(container, fullPath);
}

/**
 * Upload local file to Azure Blob.
 */
async function uploadFile(localPath, blobPath, options = {}) {
  const buffer = await fsp.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    options.contentType ||
    ({
      ".m3u8": "application/vnd.apple.mpegurl",
      ".ts": "video/mp2t",
      ".mp4": "video/mp4",
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".mp3": "audio/mpeg",
    }[ext] ||
      "application/octet-stream");
  return uploadBuffer(buffer, blobPath, { ...options, contentType });
}

/**
 * Upload every file in a directory (e.g. HLS output: master.m3u8 + .ts segments).
 */
async function uploadDirectory(localDir, blobPrefix, { containerKind = "hls" } = {}) {
  const container = containerName(containerKind);
  const cc = await ensureContainer(container);
  const kindFolder = blobPrefixForKind(containerKind);
  const prefix = [kindFolder, blobPrefix.replace(/^\/+|\/+$/g, "")].filter(Boolean).join("/");
  const entries = await fsp.readdir(localDir, { withFileTypes: true });
  const urls = {};

  // SECURITY: never publish HLS encryption keys to blob storage.
  const KEY_FILES = new Set(["enc.key", "key.info"]);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (KEY_FILES.has(entry.name) || entry.name.endsWith(".key") || entry.name.endsWith(".info")) {
      continue;
    }
    const localPath = path.join(localDir, entry.name);
    const blobPath = `${prefix}/${entry.name}`;
    const block = cc.getBlockBlobClient(blobPath);
    const ext = path.extname(entry.name).toLowerCase();
    const contentType =
      ext === ".m3u8"
        ? "application/vnd.apple.mpegurl"
        : ext === ".ts"
          ? "video/mp2t"
          : "application/octet-stream";
    const data = await fsp.readFile(localPath);
    await block.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
    urls[entry.name] = buildBlobUrl(container, blobPath);
  }

  return {
    urls,
    masterUrl: urls["master.m3u8"] || urls["index.m3u8"] || null,
    prefix: `${getPublicBaseUrl()}/${container}/${prefix}`,
  };
}

async function deleteBlob(blobPath, containerKind = "images") {
  if (!isAzureEnabled()) return;
  const container = containerName(containerKind);
  const prefix = blobPrefixForKind(containerKind);
  const fullPath = prefix
    ? `${prefix}/${String(blobPath).replace(/^\/+/, "")}`
    : String(blobPath).replace(/^\/+/, "");
  await deleteBlobInContainer(container, fullPath);
}

async function deleteBlobInContainer(container, blobPath) {
  if (!isAzureEnabled()) return;
  const cc = getClient().getContainerClient(container);
  await cc.getBlockBlobClient(String(blobPath).replace(/^\/+/, "")).deleteIfExists();
}

async function deletePrefixInContainer(container, prefix) {
  if (!isAzureEnabled()) return;
  const cc = getClient().getContainerClient(container);
  const p = String(prefix).replace(/^\/+|\/+$/g, "");
  if (!p) return;
  for await (const blob of cc.listBlobsFlat({ prefix: p })) {
    await cc.getBlockBlobClient(blob.name).deleteIfExists();
  }
}

async function deleteDirectoryPrefix(blobPrefix, containerKind = "hls") {
  if (!isAzureEnabled()) return;
  const container = containerName(containerKind);
  const kindFolder = blobPrefixForKind(containerKind);
  const prefix = [kindFolder, String(blobPrefix).replace(/^\/+|\/+$/g, "")]
    .filter(Boolean)
    .join("/");
  await deletePrefixInContainer(container, prefix);
}

module.exports = {
  isAzureEnabled,
  getPublicBaseUrl,
  uploadBuffer,
  uploadFile,
  uploadDirectory,
  deleteBlob,
  deleteBlobInContainer,
  deletePrefixInContainer,
  deleteDirectoryPrefix,
  buildBlobUrl,
  containerName,
};
