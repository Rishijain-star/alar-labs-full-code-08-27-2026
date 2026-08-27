/**
 * Chunked upload for large files (videos, PDFs, etc.)
 * Default: 5 MB per chunk — 100 MB video ≈ 20 requests.
 */
import axiosInstance from "@/lib/axios";

export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * @param {Object} opts
 * @param {File|Blob} opts.file
 * @param {string} opts.uploadUrl - e.g. /owner/upload/chunk
 * @param {Object} opts.headers - x-course-id, x-lesson-id, etc.
 * @param {number} [opts.chunkSize]
 * @param {function} [opts.onProgress] - ({ loaded, total, chunkIndex, totalChunks })
 */
export async function uploadFileInChunks({
  file,
  uploadUrl,
  headers = {},
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
}) {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
  const uploadId = crypto.randomUUID();
  const filename = file.name || "upload.bin";
  let uploaded = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    await axiosInstance.post(uploadUrl, chunk, {
      headers: {
        "Content-Type": "application/octet-stream",
        "x-upload-id": uploadId,
        "x-chunk-index": String(chunkIndex),
        "x-total-chunks": String(totalChunks),
        "x-filename": filename,
        "x-is-last": chunkIndex === totalChunks - 1 ? "1" : "0",
        ...headers,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      onUploadProgress: (evt) => {
        const chunkLoaded = evt.loaded || 0;
        const loaded = uploaded + chunkLoaded;
        onProgress?.({
          loaded,
          total: file.size,
          chunkIndex,
          totalChunks,
          percent: Math.round((loaded / file.size) * 100),
        });
      },
    });

    uploaded += chunk.size;
    onProgress?.({
      loaded: uploaded,
      total: file.size,
      chunkIndex: chunkIndex + 1,
      totalChunks,
      percent: Math.round((uploaded / file.size) * 100),
    });
  }

  return { uploadId, totalChunks, filename };
}

/**
 * Poll until HLS is ready (backend sets hls_ready in DB).
 */
export async function pollHlsReady(statusUrl, { intervalMs = 3000, maxAttempts = 120 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await axiosInstance.get(statusUrl);
    const body = data?.data ?? data;
    if (body?.ready && body?.hlsPath) {
      return body.hlsPath;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Video processing timed out. HLS not ready yet.");
}
