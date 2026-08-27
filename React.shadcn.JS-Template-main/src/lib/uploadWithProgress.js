// src/lib/uploadWithProgress.js
import { start, progress, complete, fail, hide } from "@/store/slices/uploadSlice";
import axiosInstance from "@/lib/axios";
import { buildSkillBuilderPayload } from "@/lib/skillBuilderPayload";
import {
  setActiveUploadAbort,
  clearActiveUploadAbort,
  beginUploadSession,
  endUploadSession,
  getUploadSessionSignal,
  isUploadAbortError,
} from "@/lib/uploadAbortRegistry";

function dispatchUploadFailure(dispatch, err, fallbackMessage) {
  if (isUploadAbortError(err)) {
    dispatch(hide());
    return;
  }
  dispatch(fail(err?.response?.data?.message || err?.message || fallbackMessage));
}

const COURSE_VIDEO_CHUNK_SIZE = 5 * 1024 * 1024;
const COURSE_VIDEO_CHUNK_THRESHOLD = 20 * 1024 * 1024;

// ─── Helper: is this a real uploadable File/Blob? ─────────────────────────────
function isRealFile(f) {
  return f instanceof File || f instanceof Blob;
}

// ─── Multipart config ─────────────────────────────────────────────────────────
// axiosInstance defaults to `Content-Type: application/json`.
// Setting it to `undefined` removes it for this request only —
// the browser then sees a FormData body and sets the correct
// `multipart/form-data; boundary=...` automatically.
// All interceptors (auth token, 401 refresh) still run normally.
function multipartConfig(onUploadProgress) {
  return {
    headers: { "Content-Type": undefined },
    withCredentials: true,
    timeout: 600_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress,
  };
}

// ─── Internal: POST a single file as multipart ────────────────────────────────
async function _postMultipart({ url, fieldName, file, extraFields = {}, onProgress }) {
  if (!isRealFile(file)) {
    throw new Error("No file selected for upload. Re-select the media in the editor and try again.");
  }
  if (!file.size) {
    throw new Error("The selected file is empty. Choose a different file and try again.");
  }
  const formData = new FormData();
  formData.append(fieldName, file, file.name || "upload");
  Object.entries(extraFields).forEach(([k, v]) => formData.append(k, String(v)));
  const sessionSignal = getUploadSessionSignal();
  const controller = sessionSignal ? null : new AbortController();
  if (controller) setActiveUploadAbort(controller);
  const signal = sessionSignal || controller.signal;
  try {
    const response = await axiosInstance.post(
      url,
      formData,
      {
        ...multipartConfig((evt) => onProgress?.({ loaded: evt.loaded, total: evt.total ?? file.size })),
        signal,
      }
    );
    return response.data;
  } finally {
    if (controller) clearActiveUploadAbort(controller);
  }
}

// ─── Helper: extract CDN URL from backend envelope ───────────────────────────
function extractUrl(result) {
  return result?.data?.url || result?.data?.mediaUrl || result?.url || result?.mediaUrl || "";
}

/** Clone lab sections so we can attach server URLs without mutating React state */
function cloneLabSectionsForUpload(sections) {
  return (sections || []).map((s) => {
    if (s.type === "step" && Array.isArray(s.blocks)) {
      return { ...s, blocks: s.blocks.map((b) => ({ ...b })) };
    }
    if (s.type === "content" && Array.isArray(s.blocks)) {
      return { ...s, blocks: s.blocks.map((b) => ({ ...b })) };
    }
    return { ...s };
  });
}

function assertNoOrphanBlobUrlsInModules(modules) {
  const check = (url, label) => {
    if (url && String(url).startsWith("blob:")) {
      throw new Error(
        `${label} was not uploaded. Re-select the file in the editor, then publish again.`
      );
    }
  };
  const checkBlocks = (blocks, ctx) => {
    for (const block of blocks || []) {
      if (block.type === "video" && Array.isArray(block.videos)) {
        block.videos.forEach((v, i) => check(v.url, `${ctx} video ${i + 1}`));
      }
      if (block.type === "image" && Array.isArray(block.images)) {
        block.images.forEach((img, i) => check(img.url, `${ctx} image ${i + 1}`));
      }
      if (block.type === "download" && Array.isArray(block.resources)) {
        block.resources.forEach((res, i) => check(res.url, `${ctx} download ${i + 1}`));
      }
      if (block.type === "pdf" && Array.isArray(block.files)) {
        block.files.forEach((file, i) => check(file.url, `${ctx} PDF ${i + 1}`));
      }
    }
  };
  for (const mod of modules || []) {
    if (Array.isArray(mod.items)) {
      for (const item of mod.items) {
        if (item.type === "lesson") {
          checkBlocks(item.blocks, item.title || "Lesson");
        }
      }
    }
    for (const lesson of mod.lessons || []) {
      checkBlocks(lesson.blocks, lesson.title || "Lesson");
    }
  }
}

function collectLinkedLabRefs(modules) {
  const ids = [];
  for (const mod of modules || []) {
    for (const item of mod.items || []) {
      if (
        (item.type === "skill_builder_lab" || item.type === "normal_lab")
        && item.reference_id
      ) {
        ids.push(String(item.reference_id));
      }
    }
  }
  return [...new Set(ids)];
}

function stripBlockPending(block) {
  if (!block || typeof block !== "object") return block;
  const { _pendingFile, ...rest } = block;
  return rest;
}

function storedReplaceUrl(url) {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  if (!s || s.startsWith("blob:") || s.startsWith("data:")) return null;
  return s;
}

function courseModulesForApi(modules) {
  return (modules || []).map((mod) => ({
    id: mod.id,
    title: mod.title,
    expanded: mod.expanded,
    items: (mod.items || []).map((item) => {
      if (item.type === "skill_builder_lab" || item.type === "normal_lab") {
        return {
          id: item.id,
          type: item.type,
          title: item.title,
          reference_id: item.reference_id,
          duration: item.duration,
          difficulty: item.difficulty,
        };
      }
      return {
        id: item.id,
        type: item.type || "lesson",
        title: item.title,
        blocks: (item.blocks || []).map(stripBlockPending),
      };
    }),
  }));
}

function cloneModulesPreservingFiles(modules) {
  return (modules || []).map((mod) => ({
    ...mod,
    items: (mod.items || []).map((item) => {
      if (item.type !== "lesson") return { ...item };
      return {
        ...item,
        blocks: (item.blocks || []).map((block) => {
          const cloned = { ...block };
          if (block.type === "video" && Array.isArray(block.videos)) {
            cloned.videos = block.videos.map((v) => ({ ...v }));
          }
          if (block.type === "image" && Array.isArray(block.images)) {
            cloned.images = block.images.map((img) => ({ ...img }));
          }
          if (block.type === "download" && Array.isArray(block.resources)) {
            cloned.resources = block.resources.map((res) => ({ ...res }));
          }
          return cloned;
        }),
      };
    }),
    lessons: (mod.lessons || []).map((lesson) => ({
      ...lesson,
      blocks: (lesson.blocks || []).map((block) => {
        const cloned = { ...block };
        if (block.type === "video" && Array.isArray(block.videos)) {
          cloned.videos = block.videos.map((v) => ({ ...v }));
        }
        if (block.type === "image" && Array.isArray(block.images)) {
          cloned.images = block.images.map((img) => ({ ...img }));
        }
        if (block.type === "download" && Array.isArray(block.resources)) {
          cloned.resources = block.resources.map((res) => ({ ...res }));
        }
        return cloned;
      }),
    })),
  }));
}

function collectPendingFilesFromCourseModules(modules) {
  const pendingFiles = [];
  const pushBlockFiles = (blocks) => {
    for (const block of blocks || []) {
      if (block.type === "video" && Array.isArray(block.videos)) {
        block.videos.forEach((video) => {
          if (video.localFile && isRealFile(video.localFile)) {
            pendingFiles.push({
              type: "video",
              videoId: video.id,
              title: video.title || block.title || "Video",
              file: video.localFile,
              replacesUrl: storedReplaceUrl(video.url || video.streamUrl),
            });
          }
        });
      }
      if (block.type === "image" && Array.isArray(block.images)) {
        block.images.forEach((img) => {
          const imageFile = img.file || img.localFile;
          if (imageFile && isRealFile(imageFile)) {
            pendingFiles.push({
              type: "image",
              imageId: img.id,
              file: imageFile,
              replacesUrl: storedReplaceUrl(img.url),
            });
          }
        });
      }
      if (block.type === "download" && Array.isArray(block.resources)) {
        block.resources.forEach((res) => {
          if (res.file && isRealFile(res.file)) {
            pendingFiles.push({
              type: "download",
              resourceId: res.id,
              file: res.file,
              replacesUrl: storedReplaceUrl(res.url),
            });
          }
        });
      }
    }
  };
  for (const mod of modules || []) {
    for (const item of mod.items || []) {
      if (item.type === "lesson") pushBlockFiles(item.blocks);
    }
    for (const lesson of mod.lessons || []) {
      pushBlockFiles(lesson.blocks);
    }
  }
  return pendingFiles;
}

function applyUploadedUrlToCourseModules(modules, uploadItem, url) {
  for (const mod of modules || []) {
    for (const item of mod.items || []) {
      if (item.type !== "lesson") continue;
      for (const block of item.blocks || []) {
        if (block.type === "video" && Array.isArray(block.videos)) {
          block.videos.forEach((video) => {
            if (video.id === uploadItem.videoId) {
              video.url = url;
              delete video.localFile;
            }
          });
        }
        if (block.type === "image" && Array.isArray(block.images)) {
          block.images.forEach((img) => {
            if (img.id === uploadItem.imageId) {
              img.url = url;
              delete img.file;
              delete img.localFile;
            }
          });
        }
        if (block.type === "download" && Array.isArray(block.resources)) {
          block.resources.forEach((res) => {
            if (res.id === uploadItem.resourceId) {
              res.url = url;
              delete res.file;
            }
          });
        }
      }
    }
    for (const lesson of mod.lessons || []) {
      for (const block of lesson.blocks || []) {
        if (block.type === "video" && Array.isArray(block.videos)) {
          block.videos.forEach((video) => {
            if (video.id === uploadItem.videoId) {
              video.url = url;
              delete video.localFile;
            }
          });
        }
        if (block.type === "image" && Array.isArray(block.images)) {
          block.images.forEach((img) => {
            if (img.id === uploadItem.imageId) {
              img.url = url;
              delete img.file;
              delete img.localFile;
            }
          });
        }
        if (block.type === "download" && Array.isArray(block.resources)) {
          block.resources.forEach((res) => {
            if (res.id === uploadItem.resourceId) {
              res.url = url;
              delete res.file;
            }
          });
        }
      }
    }
  }
}

function appendCourseVideoMetadata(fd, videoItems) {
  fd.append("media", JSON.stringify(
    videoItems.map((item, index) => ({
      title: item.title || `Video ${index + 1}`,
      type: "video",
      order: index,
      lesson_id: item.videoId,
      is_preview: index === 0,
    }))
  ));
}

function copyFormDataWithoutFiles(source) {
  const fd = new FormData();
  for (const [key, value] of source.entries()) {
    if (value instanceof File || value instanceof Blob) continue;
    fd.append(key, value);
  }
  return fd;
}

async function postCourseVideoChunks({ baseFormData, item, dispatch, uploadedOffset = 0, totalBytes = 1 }) {
  const file = item.file;
  const totalChunks = Math.max(1, Math.ceil(file.size / COURSE_VIDEO_CHUNK_SIZE));
  const uploadId = crypto.randomUUID();
  let finalResponse = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startByte = chunkIndex * COURSE_VIDEO_CHUNK_SIZE;
    const endByte = Math.min(startByte + COURSE_VIDEO_CHUNK_SIZE, file.size);
    const chunk = file.slice(startByte, endByte);
    const fd = copyFormDataWithoutFiles(baseFormData);

    appendCourseVideoMetadata(fd, [item]);
    fd.append("mediaFiles", chunk, file.name || "course-video.mp4");

    const response = await axiosInstance.post(
      "/owner/courses/create-full",
      fd,
      {
        headers: {
          "Content-Type": undefined,
          "x-upload-id": uploadId,
          "x-chunk-index": String(chunkIndex),
          "x-total-chunks": String(totalChunks),
          "x-filename": file.name || "course-video.mp4",
        },
        withCredentials: true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (evt) => {
          dispatch(progress({
            label: `Uploading MP4 chunk ${chunkIndex + 1} of ${totalChunks}`,
            bytesUploaded: uploadedOffset + startByte + (evt.loaded || 0),
            bytesTotal: totalBytes,
            itemsUploaded: chunkIndex,
          }));
        },
      }
    );
    finalResponse = response;
    dispatch(progress({
      label: chunkIndex + 1 < totalChunks ? "Merging MP4 chunks on server" : "Processing MP4 to HLS",
      bytesUploaded: uploadedOffset + endByte,
      bytesTotal: totalBytes,
      itemsUploaded: chunkIndex + 1,
    }));
  }

  return finalResponse?.data;
}

async function waitForCourseHlsReady({ courseId, lessonId, dispatch, maxAttempts = 120 }) {
  if (!courseId || !lessonId) return null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await axiosInstance.get(`/courses/${courseId}/video-status/${lessonId}`);
    const body = data?.data ?? data;
    if (body?.ready) return body.hlsPath || null;
    dispatch(progress({
      label: "Processing MP4 to HLS in background",
      bytesUploaded: 1,
      bytesTotal: 1,
    }));
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return null;
}

function assertNoOrphanBlobUrls(sections) {
  const check = (src) => {
    if (src && String(src).startsWith("blob:")) {
      throw new Error(
        "A media file was not uploaded. Go to Step 3, re-select each image/video, then publish again."
      );
    }
  };
  for (const s of sections || []) {
    if (s.type === "media") check(s.src);
    if (s.type === "step" && s.blocks) {
      for (const b of s.blocks) {
        if (b.type === "media") check(b.src);
      }
    }
    if (s.type === "content" && s.blocks) {
      for (const b of s.blocks) {
        if (b.type === "media") check(b.src);
      }
    }
  }
}

function cleanupOrphanBlobMediaInSections(sections) {
  let cleaned = 0;
  const scrub = (block) => {
    if (!block || block.type !== "media") return;
    if (isRealFile(block._pendingFile)) return;
    if (block.src && String(block.src).startsWith("blob:")) {
      block.src = "";
      cleaned += 1;
    }
  };
  for (const s of sections || []) {
    scrub(s);
    if (s.type === "step" && s.blocks) {
      for (const b of s.blocks) scrub(b);
    }
    if (s.type === "content" && s.blocks) {
      for (const b of s.blocks) scrub(b);
    }
  }
  return cleaned;
}

/**
 * Upload pending File objects from Step 3 / block media, replace src with /uploads/... URLs.
 * Call before POST /owner/labs/create-full.
 */
export async function resolveLabInstructionMediaUrls(labSections, { dispatch } = {}) {
  const out = cloneLabSectionsForUpload(labSections);
  cleanupOrphanBlobMediaInSections(out);

  const pending = [];
  for (const section of out) {
    if (section.type === "media" && isRealFile(section._pendingFile)) {
      pending.push(section);
    }
    if (section.type === "step" && section.blocks) {
      for (const block of section.blocks) {
        if (block.type === "media" && isRealFile(block._pendingFile)) {
          pending.push(block);
        }
      }
    }
    if (section.type === "content" && section.blocks) {
      for (const block of section.blocks) {
        if (block.type === "media" && isRealFile(block._pendingFile)) {
          pending.push(block);
        }
      }
    }
  }

  const totalBytes = pending.reduce((s, t) => s + (t._pendingFile?.size || 0), 0) || 1;
  if (pending.length && dispatch) {
    dispatch(start({ label: "Uploading lab media…", bytesTotal: totalBytes, itemsTotal: pending.length }));
  }

  let uploaded = 0;
  for (const target of pending) {
    const file = target._pendingFile;
    const result = await _postMultipart({
      url: "/owner/labs/upload-instruction-media",
      fieldName: "file",
      file,
      onProgress: ({ loaded }) => {
        dispatch?.(progress({
          bytesUploaded: uploaded + (loaded || 0),
          bytesTotal: totalBytes,
        }));
      },
    });
    const url = extractUrl(result);
    if (!url) throw new Error("Media upload did not return a URL");
    target.src = url;
    delete target._pendingFile;
    uploaded += file.size || 0;
    dispatch?.(progress({ bytesUploaded: uploaded, bytesTotal: totalBytes }));
  }

  if (pending.length && dispatch) dispatch(complete());

  // Final guard for malformed states that still contain blob URLs.
  assertNoOrphanBlobUrls(out);
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  createCourseFull  →  POST /owner/courses/create-full
// ═════════════════════════════════════════════════════════════════════════════
export async function createCourseFull({ basic, media, labs, settings, dispatch }) {
  const fd = new FormData();

  fd.append("title", basic.title || "");
  // Slug + catalog code: generated on the server from the title.
  fd.append("description", basic.description || "");
  fd.append("shortDescription", basic.description || "");
  fd.append("fullDescription", basic.fullDescription || "");
  // Backend expects category_id; keep category for future use but send category_id too
  fd.append("category", basic.category || "");
  if (basic.category_id || basic.categoryId) {
    fd.append("category_id", basic.category_id || basic.categoryId);
  }
  let courseLevel = (basic.level || "").toLowerCase();
  if (courseLevel === "expert") courseLevel = "advanced";
  fd.append("level", courseLevel || "beginner");
  fd.append("platform", basic.platform || "");
  // Backend expects "duration" as minutes; convert if value/unit provided
  const dv = Number(basic.durationValue || 0);
  const du = (basic.durationUnit || "Hours").toLowerCase();
  const durationMinutes = isFinite(dv)
    ? (du.startsWith("hour") ? dv * 60 : du.startsWith("day") ? dv * 60 * 24 : dv)
    : 0;
  fd.append("duration", String(durationMinutes));
  fd.append("credits", basic.credits || "");
  fd.append("rating", String(Number(basic.rating || 4.8)));
  // Send both snake_case and camelCase flags for compatibility
  fd.append("is_free", String(!!basic.isFree));
  fd.append("isFree", String(!!basic.isFree));
  fd.append("price", String(basic.price ? Number(basic.price) : 0));
  fd.append("currency", basic.currency || "USD");
  fd.append("enrolledCount", String(Number(basic.enrolledCount || 0)));
  fd.append("status", settings.isPublished ? "published" : "draft");
  fd.append("pricingModel", settings.pricingModel || "free");
  fd.append("completionMessage", settings.completionMessage || "");
  fd.append("isPublished", String(!!settings.isPublished));
  fd.append("allowPreview", String(!!settings.allowPreview));
  fd.append("requirePrerequisites", String(!!settings.requirePrerequisites));
  fd.append("privateAccess", String(!!settings.privateAccess));
  fd.append("requireSequential", String(!!settings.requireSequential));
  fd.append("showProgress", String(!!settings.showProgress));
  fd.append("thumbnailUrl", isRealFile(media._thumbnailFile) ? "" : (media.thumbnail || ""));
  fd.append("introVideoUrl", isRealFile(media._introVideoFile) ? "" : (media.introVideoUrl || ""));
  fd.append("techStack", JSON.stringify(basic.techStack || []));
  const learningOutcomes = (media.whatYouLearn || []).filter(Boolean);
  fd.append("learningOutcomes", JSON.stringify(learningOutcomes));

  const modules = media.modules || [];
  const lessonVideos = [];
  const mediaMeta = [];

  // Overview intro (transcoded to HLS on server as course/_intro/master.m3u8)
  if (isRealFile(media._introVideoFile)) {
    fd.append("introVideo", media._introVideoFile);
  } else if (media.introVideoUrl && /\.m3u8($|\?)/i.test(String(media.introVideoUrl))) {
    fd.append("introVideoUrl", media.introVideoUrl.trim());
  }

  // Lesson videos (course content, not overview hero)
  modules.forEach((mod, mIdx) => {
    (mod.lessons || []).forEach((lesson, lIdx) => {
      if (lesson.type === "video") {
        if (isRealFile(lesson._videoFile)) {
          lessonVideos.push(lesson._videoFile);
          mediaMeta.push({
            title: lesson.title,
            type: "video",
            order: mediaMeta.length,
            is_preview: !!lesson.free,
            lesson_id: lesson.id, // Link to the Lab record ID
            module_index: mIdx,
            lesson_index: lIdx
          });
        } else if (lesson.videoUrl) {
          mediaMeta.push({
            title: lesson.title,
            type: "video",
            order: mediaMeta.length,
            is_preview: !!lesson.free,
            url: lesson.videoUrl,
            lesson_id: lesson.id, // Link to the Lab record ID
            module_index: mIdx,
            lesson_index: lIdx
          });
        }
      }
    });
  });

  fd.append("media", JSON.stringify(mediaMeta));

  fd.append(
    "metadata",
    JSON.stringify({
      learning_outcomes: learningOutcomes,
    })
  );
  const hero = media.header || {};
  if (Object.keys(hero).length) {
    fd.append("header", JSON.stringify(hero));
  }
  fd.append("modules", JSON.stringify(
    (media.modules || []).map(({ id, ...m }) => ({
      title: m.title, lessons: m.lessons.map(({ id: _lid, _videoFile, ...l }) => l),
    }))
  ));
  fd.append("labs", JSON.stringify(labs.featuredLabs || []));
  fd.append("courseNotes", JSON.stringify((labs.courseNotes || []).filter(Boolean)));
  fd.append("requirements", JSON.stringify((media.requirements || []).filter(Boolean)));
  fd.append("settings", JSON.stringify({
    pricingModel: settings.pricingModel || "free",
    isPublished: !!settings.isPublished,
    allowPreview: !!settings.allowPreview,
    requireSequential: !!settings.requireSequential,
    requirePrerequisites: !!settings.requirePrerequisites,
    privateAccess: !!settings.privateAccess,
    showProgress: !!settings.showProgress,
    completionMessage: settings.completionMessage || "",
    certificate: settings.certificate || null,
  }));
  if (settings.certificate?.enabled) fd.append("certificate", JSON.stringify(settings.certificate));

  if (isRealFile(media._thumbnailFile)) fd.append("thumbnail", media._thumbnailFile);

  // Append all collected video files
  lessonVideos.forEach(file => {
    fd.append("mediaFiles", file);
  });

  if (import.meta.env.DEV) {
    console.group("[createCourseFull] FormData:"); for (const [k, v] of fd.entries()) console.log(` ${k}:`, v instanceof File ? `[File] ${v.name}` : v); console.groupEnd();
  }

  const thumbBytes = isRealFile(media._thumbnailFile) ? media._thumbnailFile.size : 0;
  const introBytes = isRealFile(media._introVideoFile) ? media._introVideoFile.size : 0;
  const videoBytes = lessonVideos.reduce((acc, f) => acc + f.size, 0);
  const totalBytes = thumbBytes + introBytes + videoBytes;

  dispatch(start({ label: "Creating course…", bytesTotal: totalBytes || 1, itemsTotal: Math.max((thumbBytes > 0 ? 1 : 0) + lessonVideos.length, 1) }));

  try {
    const response = await axiosInstance.post("/owner/courses/create-full", fd,
      multipartConfig((evt) => dispatch(progress({ bytesUploaded: evt.loaded, bytesTotal: evt.total ?? totalBytes })))
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Upload failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  createCourseFullWithModules  →  POST /owner/courses/create-full
//  Course curriculum: modules[].items[] (lessons + linked lab references)
// ═════════════════════════════════════════════════════════════════════════════
export async function createCourseFullWithModules({ course, modules, settings, dispatch }) {
  const workingModules = cloneModulesPreservingFiles(modules);
  const pendingFiles = collectPendingFilesFromCourseModules(workingModules);

  const thumbBytesPending = isRealFile(course._thumbnailFile) ? course._thumbnailFile.size : 0;
  const introBytesPending = isRealFile(course._introVideoFile) ? course._introVideoFile.size : 0;
  const totalBytes =
    pendingFiles.reduce((sum, item) => sum + (item.file?.size || 0), 0) +
    thumbBytesPending +
    introBytesPending;
  const itemsTotal = pendingFiles.length + 1;
  const finalizeBytes = Math.max(thumbBytesPending + introBytesPending, 64 * 1024);
  const grandTotalBytes = (totalBytes || 0) + finalizeBytes;

  if (pendingFiles.length) {
    dispatch(start({
      label: "Uploading course media…",
      bytesTotal: grandTotalBytes || 1,
      itemsTotal: Math.max(itemsTotal, 1),
    }));
    let uploadedBytes = 0;
    for (let i = 0; i < pendingFiles.length; i++) {
      const item = pendingFiles[i];
      const result = await _postMultipart({
        url: "/owner/labs/upload-instruction-media",
        fieldName: "file",
        file: item.file,
        extraFields: item.replacesUrl ? { replaceUrl: item.replacesUrl } : {},
        onProgress: ({ loaded }) => {
          dispatch(progress({
            bytesUploaded: uploadedBytes + (loaded || 0),
            bytesTotal: grandTotalBytes || 1,
            itemsUploaded: i,
            label: `Uploading file ${i + 1} of ${pendingFiles.length}…`,
          }));
        },
      });
      const url = extractUrl(result);
      if (!url) {
        throw new Error("Upload completed but the server did not return a file URL. Please try again.");
      }
      applyUploadedUrlToCourseModules(workingModules, item, url);
      uploadedBytes += item.file?.size || 0;
      dispatch(progress({
        bytesUploaded: uploadedBytes,
        bytesTotal: grandTotalBytes || 1,
        itemsUploaded: i + 1,
        label: i + 1 < pendingFiles.length
          ? `Uploading file ${i + 2} of ${pendingFiles.length}…`
          : "Saving course…",
      }));
    }
  } else {
    dispatch(start({
      label: "Saving course…",
      bytesTotal: finalizeBytes || 1,
      itemsTotal: 1,
    }));
  }

  assertNoOrphanBlobUrlsInModules(workingModules);

  const apiModules = courseModulesForApi(workingModules);
  const linkedLabRefs = collectLinkedLabRefs(workingModules);
  const learningOutcomes = (course.learningOutcomes || []).filter(Boolean);
  const requirements = (course.requirements || []).filter(Boolean);
  const technologies = course.technologies || [];

  let courseLevel = (course.difficulty || "Beginner").toLowerCase();
  if (courseLevel === "expert") courseLevel = "advanced";

  const durationMinutes = parseInt(course.duration, 10) || 0;

  const metadata = {
    modules: apiModules,
    learning_outcomes: learningOutcomes,
    requirements,
    tech_stack: technologies,
    full_description: course.fullDescription || "",
    short_description: course.shortDescription || "",
    platform: course.platform || "",
    rating: course.rating ?? 4.8,
    hasCertificate: !!course.hasCertificate,
    certificateName: course.certificateName || "",
    certificationId: course.certificationId || null,
    hasDiscount: !!course.hasDiscount,
    discountPercentage: course.discountPercentage ?? 0,
    discountStartDate: course.discountStartDate || "",
    discountEndDate: course.discountEndDate || "",
    labs: linkedLabRefs,
    currency: course.currency || "INR",
    settings: settings || {},
  };

  if (settings?.submitForReview && !settings?.isPublished) {
    metadata.content_approval_status = "pending";
  }

  const fd = new FormData();
  fd.append("title", course.title || "");
  fd.append("description", course.shortDescription || "");
  fd.append("shortDescription", course.shortDescription || "");
  fd.append("fullDescription", course.fullDescription || "");
  if (course.categoryId) fd.append("category_id", course.categoryId);
  if (course.certificationId) fd.append("certification_id", course.certificationId);
  fd.append("level", courseLevel || "beginner");
  fd.append("platform", course.platform || "");
  fd.append("duration", String(durationMinutes));
  fd.append("is_free", String(!!course.isFree));
  fd.append("isFree", String(!!course.isFree));
  fd.append("price", String(course.price ? Number(course.price) : 0));
  fd.append("currency", course.currency || "INR");
  fd.append("rating", String(Number(course.rating || 4.8)));
  fd.append("enrolledCount", String(Number(course.studentCount || 0)));
  fd.append("status", settings?.isPublished ? "published" : "draft");
  fd.append("isPublished", String(!!settings?.isPublished));
  fd.append("techStack", JSON.stringify(technologies));
  fd.append("learningOutcomes", JSON.stringify(learningOutcomes));
  fd.append("requirements", JSON.stringify(requirements));
  fd.append("modules", JSON.stringify(apiModules));
  fd.append("labs", JSON.stringify(linkedLabRefs));
  fd.append("metadata", JSON.stringify(metadata));
  fd.append("settings", JSON.stringify(settings || {}));
  if (settings?.certificate?.enabled) {
    fd.append("certificate", JSON.stringify(settings.certificate));
  }
  fd.append("thumbnailUrl", isRealFile(course._thumbnailFile) ? "" : (course.thumbnail || ""));
  fd.append("introVideoUrl", isRealFile(course._introVideoFile) ? "" : (course.introVideoUrl || ""));

  if (isRealFile(course._thumbnailFile)) fd.append("thumbnail", course._thumbnailFile);
  if (isRealFile(course._introVideoFile)) fd.append("introVideo", course._introVideoFile);

  dispatch(progress({
    label: "Saving course…",
    bytesUploaded: totalBytes,
    bytesTotal: grandTotalBytes || 1,
    itemsUploaded: Math.max(pendingFiles.length, 0),
  }));

  try {
    const response = await axiosInstance.post(
      "/owner/courses/create-full",
      fd,
      multipartConfig((evt) => {
        dispatch(progress({
          bytesUploaded: totalBytes + (evt.loaded || 0),
          bytesTotal: totalBytes + (evt.total || finalizeBytes),
          itemsUploaded: Math.max(itemsTotal - 1, 0),
          label: "Saving course…",
        }));
      })
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Course creation failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  updateCourseFullWithModules  →  PUT /owner/courses/:courseId/update-full
// ═════════════════════════════════════════════════════════════════════════════
export async function updateCourseFullWithModules({ courseId, course, modules, settings, dispatch }) {
  const workingModules = cloneModulesPreservingFiles(modules);
  const pendingFiles = collectPendingFilesFromCourseModules(workingModules);

  const thumbBytesPending = isRealFile(course._thumbnailFile) ? course._thumbnailFile.size : 0;
  const introBytesPending = isRealFile(course._introVideoFile) ? course._introVideoFile.size : 0;
  const totalBytes =
    pendingFiles.reduce((sum, item) => sum + (item.file?.size || 0), 0) +
    thumbBytesPending +
    introBytesPending;
  const itemsTotal = pendingFiles.length + 1;
  const finalizeBytes = Math.max(thumbBytesPending + introBytesPending, 64 * 1024);
  const grandTotalBytes = (totalBytes || 0) + finalizeBytes;

  if (pendingFiles.length) {
    dispatch(start({
      label: "Uploading course media…",
      bytesTotal: grandTotalBytes || 1,
      itemsTotal: Math.max(itemsTotal, 1),
    }));
    let uploadedBytes = 0;
    for (let i = 0; i < pendingFiles.length; i++) {
      const item = pendingFiles[i];
      const result = await _postMultipart({
        url: "/owner/labs/upload-instruction-media",
        fieldName: "file",
        file: item.file,
        extraFields: item.replacesUrl ? { replaceUrl: item.replacesUrl } : {},
        onProgress: ({ loaded }) => {
          dispatch(progress({
            bytesUploaded: uploadedBytes + (loaded || 0),
            bytesTotal: grandTotalBytes || 1,
            itemsUploaded: i,
            label: `Uploading file ${i + 1} of ${pendingFiles.length}…`,
          }));
        },
      });
      const url = extractUrl(result);
      if (!url) {
        throw new Error("Upload completed but the server did not return a file URL. Please try again.");
      }
      applyUploadedUrlToCourseModules(workingModules, item, url);
      uploadedBytes += item.file?.size || 0;
    }
  } else {
    dispatch(start({
      label: "Updating course…",
      bytesTotal: finalizeBytes || 1,
      itemsTotal: 1,
    }));
  }

  assertNoOrphanBlobUrlsInModules(workingModules);

  const apiModules = courseModulesForApi(workingModules);
  const linkedLabRefs = collectLinkedLabRefs(workingModules);
  const learningOutcomes = (course.learningOutcomes || []).filter(Boolean);
  const requirements = (course.requirements || []).filter(Boolean);
  const technologies = course.technologies || [];

  let courseLevel = (course.difficulty || "Beginner").toLowerCase();
  if (courseLevel === "expert") courseLevel = "advanced";

  const durationMinutes = parseInt(course.duration, 10) || 0;

  const metadata = {
    modules: apiModules,
    learning_outcomes: learningOutcomes,
    requirements,
    tech_stack: technologies,
    full_description: course.fullDescription || "",
    short_description: course.shortDescription || "",
    platform: course.platform || "",
    rating: course.rating ?? 4.8,
    hasCertificate: !!course.hasCertificate,
    certificateName: course.certificateName || "",
    certificationId: course.certificationId || null,
    hasDiscount: !!course.hasDiscount,
    discountPercentage: course.discountPercentage ?? 0,
    discountStartDate: course.discountStartDate || "",
    discountEndDate: course.discountEndDate || "",
    labs: linkedLabRefs,
    currency: course.currency || "INR",
    settings: settings || {},
  };

  if (settings?.submitForReview && !settings?.isPublished) {
    metadata.content_approval_status = "pending";
  } else if (settings?.isPublished) {
    metadata.content_approval_status = metadata.content_approval_status || "pending";
  }

  const fd = new FormData();
  fd.append("title", course.title || "");
  fd.append("description", course.shortDescription || "");
  fd.append("shortDescription", course.shortDescription || "");
  fd.append("fullDescription", course.fullDescription || "");
  if (course.categoryId) fd.append("category_id", course.categoryId);
  if (course.certificationId) fd.append("certification_id", course.certificationId);
  fd.append("level", courseLevel || "beginner");
  fd.append("platform", course.platform || "");
  fd.append("duration", String(durationMinutes));
  fd.append("is_free", String(!!course.isFree));
  fd.append("isFree", String(!!course.isFree));
  fd.append("price", String(course.price ? Number(course.price) : 0));
  fd.append("currency", course.currency || "INR");
  fd.append("rating", String(Number(course.rating || 4.8)));
  fd.append("enrolledCount", String(Number(course.studentCount || 0)));
  fd.append("status", settings?.isPublished ? "published" : "draft");
  fd.append("isPublished", String(!!settings?.isPublished));
  fd.append("techStack", JSON.stringify(technologies));
  fd.append("learningOutcomes", JSON.stringify(learningOutcomes));
  fd.append("requirements", JSON.stringify(requirements));
  fd.append("modules", JSON.stringify(apiModules));
  fd.append("labs", JSON.stringify(linkedLabRefs));
  fd.append("metadata", JSON.stringify(metadata));
  fd.append("settings", JSON.stringify(settings || {}));
  if (settings?.certificate?.enabled) {
    fd.append("certificate", JSON.stringify(settings.certificate));
  }
  fd.append("thumbnailUrl", isRealFile(course._thumbnailFile) ? "" : (course.thumbnail || ""));
  fd.append("introVideoUrl", isRealFile(course._introVideoFile) ? "" : (course.introVideoUrl || ""));

  if (isRealFile(course._thumbnailFile)) fd.append("thumbnail", course._thumbnailFile);
  if (isRealFile(course._introVideoFile)) fd.append("introVideo", course._introVideoFile);

  dispatch(progress({
    label: "Updating course…",
    bytesUploaded: totalBytes,
    bytesTotal: grandTotalBytes || 1,
    itemsUploaded: Math.max(pendingFiles.length, 0),
  }));

  try {
    const response = await axiosInstance.put(
      `/owner/courses/${courseId}/update-full`,
      fd,
      multipartConfig((evt) => {
        dispatch(progress({
          bytesUploaded: totalBytes + (evt.loaded || 0),
          bytesTotal: totalBytes + (evt.total || finalizeBytes),
          itemsUploaded: Math.max(itemsTotal - 1, 0),
          label: "Updating course…",
        }));
      })
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Course update failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  createLabFull  →  POST /owner/labs/create-full
// ═════════════════════════════════════════════════════════════════════════════
//
//  Called from AdminLabCreate's handlePublish():
//    const responseData = await createLabFull({ basic, media, content, tocData, dispatch });
//
//  Shape of arguments:
//    basic    — Step 1: title, code, description, platform, level, labType,
//                       duration, credits, timerSec, rating, isFree, price, enrolledCount
//    media    — Step 2: thumbnail (URL), _thumbnailFile (File|null),
//                       sections (curriculum accordion), whatYouLearn, requirements
//    content  — Step 3: labSections (runner content blocks)
//    tocData  — Step 4: toc (right-sidebar nav items), setupNotes
//    dispatch — from useDispatch()
// ═════════════════════════════════════════════════════════════════════════════
function labSectionsForApi(sections) {
  return (sections || []).map(({ id, _pendingFile, ...section }) => {
    if (section.type === "step" && Array.isArray(section.blocks)) {
      return {
        ...section,
        blocks: section.blocks.map(({ _pendingFile: _pf, ...block }) => block),
      };
    }
    if (section.type === "content" && Array.isArray(section.blocks)) {
      return {
        ...section,
        blocks: section.blocks.map(({ _pendingFile: _pf, ...block }) => block),
      };
    }
    return section;
  });
}

function labOutlineForApi(outline) {
  if (!outline || typeof outline !== "object") return outline;
  const sections = (outline.sections || []).map((sec) => ({
    ...sec,
    blocks: (sec.blocks || []).map(stripBlockPending),
    tasks: (sec.tasks || []).map((task) => ({
      ...task,
      blocks: (task.blocks || []).map(stripBlockPending),
      steps: (task.steps || []).map((step) => ({
        ...step,
        blocks: (step.blocks || []).map(stripBlockPending),
        subSteps: (step.subSteps || []).map((ss) => ({
          ...ss,
          blocks: (ss.blocks || []).map(stripBlockPending),
        })),
      })),
    })),
  }));
  return { ...outline, sections };
}

function collectOutlineMediaTargets(outline) {
  const pending = [];
  if (!outline?.sections) return pending;
  for (const sec of outline.sections) {
    for (const b of sec.blocks || []) {
      if (b.type === "media" && isRealFile(b._pendingFile)) pending.push(b);
    }
    for (const task of sec.tasks || []) {
      for (const b of task.blocks || []) {
        if (b.type === "media" && isRealFile(b._pendingFile)) pending.push(b);
      }
      for (const step of task.steps || []) {
        for (const b of step.blocks || []) {
          if (b.type === "media" && isRealFile(b._pendingFile)) pending.push(b);
        }
        for (const ss of step.subSteps || []) {
          for (const b of ss.blocks || []) {
            if (b.type === "media" && isRealFile(b._pendingFile)) pending.push(b);
          }
        }
      }
    }
  }
  return pending;
}

function assertNoOrphanBlobsInOutline(outline) {
  const check = (src) => {
    if (src && String(src).startsWith("blob:")) {
      throw new Error(
        "A media file was not uploaded. Re-select each image/video in the lab builder, then publish again."
      );
    }
  };
  if (!outline?.sections) return;
  for (const sec of outline.sections) {
    for (const b of sec.blocks || []) {
      if (b.type === "media") check(b.src);
    }
    for (const task of sec.tasks || []) {
      for (const b of task.blocks || []) {
        if (b.type === "media") check(b.src);
      }
      for (const step of task.steps || []) {
        for (const b of step.blocks || []) {
          if (b.type === "media") check(b.src);
        }
        for (const ss of step.subSteps || []) {
          for (const b of ss.blocks || []) {
            if (b.type === "media") check(b.src);
          }
        }
      }
    }
  }
}

function cleanupOrphanBlobMediaInOutline(outline) {
  let cleaned = 0;
  const scrub = (block) => {
    if (!block || block.type !== "media") return;
    if (isRealFile(block._pendingFile)) return;
    if (block.src && String(block.src).startsWith("blob:")) {
      block.src = "";
      cleaned += 1;
    }
  };
  if (!outline?.sections) return cleaned;
  for (const sec of outline.sections) {
    for (const b of sec.blocks || []) scrub(b);
    for (const task of sec.tasks || []) {
      for (const b of task.blocks || []) scrub(b);
      for (const step of task.steps || []) {
        for (const b of step.blocks || []) scrub(b);
        for (const ss of step.subSteps || []) {
          for (const b of ss.blocks || []) scrub(b);
        }
      }
    }
  }
  return cleaned;
}

function cloneLabOutlineKeepingFiles(outline) {
  // Important: do NOT use JSON.parse(JSON.stringify(...)) here.
  // Files/Blobs become `{}` and media uploads will never run.
  if (!outline || typeof outline !== "object") return outline;

  const cloneBlock = (b) => {
    if (!b || typeof b !== "object") return b;
    const next = Array.isArray(b) ? [] : {};
    for (const [k, v] of Object.entries(b)) {
      // Keep File/Blob references intact
      if (v instanceof File || v instanceof Blob) {
        next[k] = v;
      } else if (v && typeof v === "object") {
        // Clone plain objects/arrays (but do not stringify non-plain things)
        if (Array.isArray(v)) {
          next[k] = v.map((x) => cloneBlock(x));
        } else {
          next[k] = cloneBlock(v);
        }
      } else {
        next[k] = v;
      }
    }
    return next;
  };

  // We only expect this shape here, but we clone generically to be safe.
  return cloneBlock(outline);
}

/** Upload pending media in lab outline blocks (same endpoint as flat lab sections). */
export async function resolveLabOutlineMediaUrls(outline, { dispatch } = {}) {
  if (!outline?.sections?.length) return outline;
  const out = cloneLabOutlineKeepingFiles(outline);
  cleanupOrphanBlobMediaInOutline(out);
  const pending = collectOutlineMediaTargets(out);
  const totalBytes = pending.reduce((s, t) => s + (t._pendingFile?.size || 0), 0) || 1;
  if (pending.length && dispatch) {
    dispatch(start({ label: "Uploading lab media…", bytesTotal: totalBytes, itemsTotal: pending.length }));
  }
  let uploaded = 0;
  for (const target of pending) {
    const file = target._pendingFile;
    const result = await _postMultipart({
      url: "/owner/labs/upload-instruction-media",
      fieldName: "file",
      file,
      onProgress: ({ loaded }) => {
        dispatch?.(progress({
          bytesUploaded: uploaded + (loaded || 0),
          bytesTotal: totalBytes,
        }));
      },
    });
    const url = extractUrl(result);
    if (!url) throw new Error("Media upload did not return a URL");
    target.src = url;
    delete target._pendingFile;
    uploaded += file.size || 0;
    dispatch?.(progress({ bytesUploaded: uploaded, bytesTotal: totalBytes }));
  }
  if (pending.length && dispatch) dispatch(complete());
  assertNoOrphanBlobsInOutline(out);
  return out;
}

export async function createLabFull({ basic, media, content, tocData, dispatch }) {
  let labOutline = content.labOutline && typeof content.labOutline === "object" ? content.labOutline : null;
  if (labOutline?.sections?.length) {
    labOutline = await resolveLabOutlineMediaUrls(labOutline, { dispatch });
  }
  const labSections = await resolveLabInstructionMediaUrls(content.labSections || [], { dispatch });

  const fd = new FormData();

  // ── Scalar fields ─────────────────────────────────────────────────────────
  fd.append("title", basic.title || "");
  // URL slug + instructions.code are generated on the server from the title.
  fd.append("description", basic.description || "");
  fd.append("platform", basic.platform || "");
  fd.append("level", (basic.level || "").toLowerCase());
  fd.append("labType", basic.labType || "Self-paced");
  fd.append("duration", basic.duration || "");
  fd.append("credits", basic.credits || "");
  fd.append("timerSec", String(Number(basic.timerSec || 0)));
  fd.append("rating", String(Number(basic.rating || 4.8)));
  fd.append("isFree", String(!!basic.isFree));
  fd.append("price", String(basic.price ? Number(basic.price) : 0));
  fd.append("enrolledCount", String(Number(basic.enrolledCount || 0)));

  // Only send existing URL when NOT uploading a new file
  fd.append("thumbnailUrl", isRealFile(media._thumbnailFile) ? "" : (media.thumbnail || ""));

  // ── JSON fields ───────────────────────────────────────────────────────────
  fd.append("whatYouLearn", JSON.stringify((media.whatYouLearn || []).filter(Boolean)));
  fd.append("requirements", JSON.stringify((media.requirements || []).filter(Boolean)));

  // Step 2 curriculum — overview accordion on LabOverviewPage
  fd.append("sections", JSON.stringify(
    (media.sections || []).map(({ id, ...s }) => ({
      title: s.title,
      lessons: (s.lessons || []).map(({ id: _lid, ...l }) => l),
    }))
  ));

  // Step 3 hierarchical outline + legacy flat sections
  if (labOutline?.sections?.length) {
    fd.append("labOutline", JSON.stringify(labOutlineForApi(labOutline)));
  } else {
    fd.append("labOutline", JSON.stringify(null));
  }
  fd.append("labSections", JSON.stringify(labSectionsForApi(labSections)));

  // Step 4 TOC — right sidebar nav in LabDetailPage
  fd.append("toc", JSON.stringify(
    (tocData.toc || []).map(({ id, slug, label, indent, isTask }) => ({
      id: slug, label, indent: !!indent, isTask: !!isTask,
    }))
  ));
  fd.append("setupNotes", JSON.stringify((tocData.setupNotes || []).filter(Boolean)));

  // ── Thumbnail file ────────────────────────────────────────────────────────
  if (isRealFile(media._thumbnailFile)) {
    fd.append("thumbnail", media._thumbnailFile);
    console.log("[upload] lab thumbnail:", media._thumbnailFile.name, media._thumbnailFile.size, "bytes");
  }

  fd.append("introVideoUrl", isRealFile(media._introVideoFile) ? "" : (media.introVideoUrl || ""));
  if (isRealFile(media._introVideoFile)) {
    fd.append("introVideo", media._introVideoFile);
  }

  // ── Dev debug ─────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    console.group("[createLabFull] FormData:");
    for (const [k, v] of fd.entries()) {
      console.log(` ${k}:`, v instanceof File ? `[File] ${v.name} (${v.size}b)` : v);
    }
    console.groupEnd();
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  const thumbBytes = isRealFile(media._thumbnailFile) ? media._thumbnailFile.size : 0;
  const introBytes = isRealFile(media._introVideoFile) ? media._introVideoFile.size : 0;
  // Estimate total payload bytes (string fields + file bytes) for better MB display
  let estimatedTotal = thumbBytes + introBytes;
  try {
    for (const [, v] of fd.entries()) {
      if (v instanceof File || v instanceof Blob) {
        estimatedTotal += v.size || 0;
      } else if (typeof v === "string") {
        estimatedTotal += new TextEncoder().encode(v).length;
      }
    }
  } catch { /* ignore */ }

  dispatch(start({ label: "Creating lab…", bytesTotal: estimatedTotal || thumbBytes || introBytes || 1, itemsTotal: 1 }));

  // ── POST ──────────────────────────────────────────────────────────────────
  try {
    const response = await axiosInstance.post(
      "/owner/labs/create-full",
      fd,
      multipartConfig((evt) => {
        const total = (evt && typeof evt.total === "number" && evt.total > 0) ? evt.total : (estimatedTotal || thumbBytes || 1);
        dispatch(progress({
          bytesUploaded: evt?.loaded ?? 0,
          bytesTotal: total,
        }))
      })
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Lab creation failed");
    throw err;
  }
}

export async function updateLabFull({ labId, basic, media, content, tocData, dispatch }) {
  let labOutline = content.labOutline && typeof content.labOutline === "object" ? content.labOutline : null;
  if (labOutline?.sections?.length) {
    labOutline = await resolveLabOutlineMediaUrls(labOutline, { dispatch });
  }
  const labSections = await resolveLabInstructionMediaUrls(content.labSections || [], { dispatch });

  const fd = new FormData();

  // ── Scalar fields ─────────────────────────────────────────────────────────
  fd.append("title", basic.title || "");
  fd.append("description", basic.description || "");
  fd.append("platform", basic.platform || "");
  fd.append("level", (basic.level || "").toLowerCase());
  fd.append("labType", basic.labType || "Self-paced");
  fd.append("duration", basic.duration || "");
  fd.append("credits", basic.credits || "");
  fd.append("timerSec", String(Number(basic.timerSec || 0)));
  fd.append("rating", String(Number(basic.rating || 4.8)));
  fd.append("isFree", String(!!basic.isFree));
  fd.append("price", String(basic.price ? Number(basic.price) : 0));
  fd.append("enrolledCount", String(Number(basic.enrolledCount || 0)));

  // Only send existing URL when NOT uploading a new file
  fd.append("thumbnailUrl", isRealFile(media._thumbnailFile) ? "" : (media.thumbnail || ""));

  // ── JSON fields ───────────────────────────────────────────────────────────
  fd.append("whatYouLearn", JSON.stringify((media.whatYouLearn || []).filter(Boolean)));
  fd.append("requirements", JSON.stringify((media.requirements || []).filter(Boolean)));

  // Step 2 curriculum — overview accordion on LabOverviewPage
  fd.append("sections", JSON.stringify(
    (media.sections || []).map(({ id, ...s }) => ({
      title: s.title,
      lessons: (s.lessons || []).map(({ id: _lid, ...l }) => l),
    }))
  ));

  // Step 3 hierarchical outline + legacy flat sections
  if (labOutline?.sections?.length) {
    fd.append("labOutline", JSON.stringify(labOutlineForApi(labOutline)));
  } else {
    fd.append("labOutline", JSON.stringify(null));
  }
  fd.append("labSections", JSON.stringify(labSectionsForApi(labSections)));

  // Step 4 TOC — right sidebar nav in LabDetailPage
  fd.append("toc", JSON.stringify(
    (tocData.toc || []).map(({ id, slug, label, indent, isTask }) => ({
      id: slug, label, indent: !!indent, isTask: !!isTask,
    }))
  ));
  fd.append("setupNotes", JSON.stringify((tocData.setupNotes || []).filter(Boolean)));

  // ── Thumbnail file ────────────────────────────────────────────────────────
  if (isRealFile(media._thumbnailFile)) {
    fd.append("thumbnail", media._thumbnailFile);
    console.log("[upload] lab thumbnail:", media._thumbnailFile.name, media._thumbnailFile.size, "bytes");
  }

  fd.append("introVideoUrl", isRealFile(media._introVideoFile) ? "" : (media.introVideoUrl || ""));
  if (isRealFile(media._introVideoFile)) {
    fd.append("introVideo", media._introVideoFile);
  }

  // ── Dev debug ─────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    console.group("[updateLabFull] FormData:");
    for (const [k, v] of fd.entries()) {
      console.log(` ${k}:`, v instanceof File ? `[File] ${v.name} (${v.size}b)` : v);
    }
    console.groupEnd();
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  const thumbBytes = isRealFile(media._thumbnailFile) ? media._thumbnailFile.size : 0;
  const introBytes = isRealFile(media._introVideoFile) ? media._introVideoFile.size : 0;
  let estimatedTotal = thumbBytes + introBytes;
  try {
    for (const [, v] of fd.entries()) {
      if (v instanceof File || v instanceof Blob) {
        estimatedTotal += v.size || 0;
      } else if (typeof v === "string") {
        estimatedTotal += new TextEncoder().encode(v).length;
      }
    }
  } catch { /* ignore */ }

  dispatch(start({ label: "Updating lab…", bytesTotal: estimatedTotal || thumbBytes || introBytes || 1, itemsTotal: 1 }));

  // ── PUT ──────────────────────────────────────────────────────────────────
  try {
    const response = await axiosInstance.put(
      `/owner/labs/${labId}/update-full`,
      fd,
      multipartConfig((evt) => {
        const total = (evt && typeof evt.total === "number" && evt.total > 0) ? evt.total : (estimatedTotal || thumbBytes || 1);
        dispatch(progress({
          bytesUploaded: evt?.loaded ?? 0,
          bytesTotal: total,
        }))
      })
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Lab update failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  createSkillBuilderLabFull  →  POST /owner/labs/create-full (skill_builder)
// ═════════════════════════════════════════════════════════════════════════════
export async function createSkillBuilderLabFull({ basic, media, tasks, settings, dispatch }) {
  const payload = buildSkillBuilderPayload({ basic, media, tasks, settings });
  const fd = new FormData();

  fd.append("title", basic.title || "");
  fd.append("description", basic.description || "");
  fd.append("platform", basic.platform || "");
  fd.append("level", (basic.level || "").toLowerCase());
  fd.append("labType", "Skill Builder");
  fd.append("lab_kind", "skill_builder");
  fd.append("duration", basic.duration || "");
  fd.append("credits", basic.credits || "");
  fd.append("timerSec", String(Number(basic.timerSec || 2700)));
  fd.append("rating", String(Number(basic.rating || 4.8)));
  fd.append("isFree", String(!!basic.isFree));
  fd.append("price", String(basic.price ? Number(basic.price) : 0));
  fd.append("currency", basic.currency || "INR");
  fd.append("enrolledCount", String(Number(basic.enrolledCount || 0)));
  fd.append("passing_score", String(payload.settings.passingScore));
  fd.append("max_attempts", String(payload.settings.maxAttempts));
  fd.append("status", payload.settings.isPublished ? "published" : "draft");
  fd.append("skillBuilder", JSON.stringify(payload));
  fd.append("questions", JSON.stringify([]));
  fd.append("whatYouLearn", JSON.stringify(payload.overview.whatYouLearn));
  fd.append("requirements", JSON.stringify(payload.overview.requirements));
  fd.append("sections", JSON.stringify([]));
  fd.append("labSections", JSON.stringify([]));
  fd.append("toc", JSON.stringify([{ id: "overview", label: "Overview", indent: false, isTask: false }]));
  fd.append("setupNotes", JSON.stringify([]));
  fd.append("thumbnailUrl", isRealFile(media._thumbnailFile) ? "" : (media.thumbnail || ""));
  fd.append("introVideoUrl", isRealFile(media._introVideoFile) ? "" : (media.introVideoUrl || ""));

  if (isRealFile(media._thumbnailFile)) {
    fd.append("thumbnail", media._thumbnailFile);
  }
  if (isRealFile(media._introVideoFile)) {
    fd.append("introVideo", media._introVideoFile);
  }

  const thumbBytes = isRealFile(media._thumbnailFile) ? media._thumbnailFile.size : 0;
  const introBytes = isRealFile(media._introVideoFile) ? media._introVideoFile.size : 0;
  let estimatedTotal = thumbBytes + introBytes;
  try {
    for (const [, v] of fd.entries()) {
      if (v instanceof File || v instanceof Blob) estimatedTotal += v.size || 0;
      else if (typeof v === "string") estimatedTotal += new TextEncoder().encode(v).length;
    }
  } catch { /* ignore */ }

  dispatch(start({ label: "Publishing Skill Builder lab…", bytesTotal: estimatedTotal || thumbBytes || introBytes || 1, itemsTotal: 1 }));

  try {
    const response = await axiosInstance.post(
      "/owner/labs/create-full",
      fd,
      multipartConfig((evt) => {
        const total = (evt && typeof evt.total === "number" && evt.total > 0) ? evt.total : (estimatedTotal || thumbBytes || 1);
        dispatch(progress({ bytesUploaded: evt?.loaded ?? 0, bytesTotal: total }));
      })
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Skill Builder lab creation failed");
    throw err;
  }
}

function applyUploadedFileUrlToModules(modules, item, url) {
  modules.forEach((mod) => {
    (mod.lessons || []).forEach((lesson) => {
      (lesson.blocks || []).forEach((block) => {
        if (block.type === "video" && Array.isArray(block.videos)) {
          block.videos.forEach((video) => {
            if (video.id === item.videoId) {
              video.url = url;
              delete video.localFile;
            }
          });
        }
        if (block.type === "image" && Array.isArray(block.images)) {
          block.images.forEach((img) => {
            if (img.id === item.imageId) {
              img.url = url;
              delete img.file;
              delete img.localFile;
            }
          });
        }
        if (block.type === "download" && Array.isArray(block.resources)) {
          block.resources.forEach((res) => {
            if (res.id === item.resourceId) {
              res.url = url;
              delete res.file;
            }
          });
        }
        if (block.type === "pdf" && Array.isArray(block.files)) {
          block.files.forEach((pdfFile) => {
            if (pdfFile.id === item.fileId) {
              pdfFile.url = url;
              delete pdfFile.file;
            }
          });
        }
      });
    });
  });
}

function collectModulePendingFiles(modules) {
  const pendingFiles = [];
  const processModule = (mod) => {
    (mod.lessons || []).forEach((lesson) => {
      (lesson.blocks || []).forEach((block) => {
        if (block.type === "video" && Array.isArray(block.videos)) {
          block.videos.forEach((video) => {
            if (video.localFile && isRealFile(video.localFile)) {
              pendingFiles.push({
                type: "video",
                blockId: block.id,
                videoId: video.id,
                file: video.localFile,
                replacesUrl: storedReplaceUrl(video.url || video.streamUrl),
              });
            }
          });
        }
        if (block.type === "image" && Array.isArray(block.images)) {
          block.images.forEach((img) => {
            const imageFile = img.file || img.localFile;
            if (imageFile && isRealFile(imageFile)) {
              pendingFiles.push({
                type: "image",
                blockId: block.id,
                imageId: img.id,
                file: imageFile,
                replacesUrl: storedReplaceUrl(img.url),
              });
            }
          });
        }
        if (block.type === "download" && Array.isArray(block.resources)) {
          block.resources.forEach((res) => {
            if (res.file && isRealFile(res.file)) {
              pendingFiles.push({
                type: "download",
                blockId: block.id,
                resourceId: res.id,
                file: res.file,
                replacesUrl: storedReplaceUrl(res.url),
              });
            }
          });
        }
        if (block.type === "pdf" && Array.isArray(block.files)) {
          block.files.forEach((pdfFile) => {
            if (pdfFile.file && isRealFile(pdfFile.file)) {
              pendingFiles.push({
                type: "pdf",
                blockId: block.id,
                fileId: pdfFile.id,
                file: pdfFile.file,
                replacesUrl: storedReplaceUrl(pdfFile.url),
              });
            }
          });
        }
      });
    });
  };
  modules.forEach(processModule);
  return pendingFiles;
}

export async function createFullWithModules({ lab, modules, dispatch }) {
  beginUploadSession();
  try {
  const fd = new FormData();
  const pendingFiles = collectModulePendingFiles(modules);

  const thumbBytesPending = isRealFile(lab._thumbnailFile) ? lab._thumbnailFile.size : 0;
  const introBytesPending = isRealFile(lab._introVideoFile) ? lab._introVideoFile.size : 0;
  const totalBytes =
    pendingFiles.reduce((sum, item) => sum + (item.file?.size || 0), 0) +
    thumbBytesPending +
    introBytesPending;
  const itemsTotal = pendingFiles.length + (thumbBytesPending ? 1 : 0) + (introBytesPending ? 1 : 0);

  dispatch(start({ label: "Uploading lab media…", bytesTotal: totalBytes || 1, itemsTotal: Math.max(itemsTotal, 1) }));

  let uploadedBytes = 0;

  for (const item of pendingFiles) {
    try {
      const result = await _postMultipart({
        url: "/owner/labs/upload-instruction-media",
        fieldName: "file",
        file: item.file,
        extraFields: item.replacesUrl ? { replaceUrl: item.replacesUrl } : {},
        onProgress: ({ loaded }) => {
          dispatch(progress({
            bytesUploaded: uploadedBytes + (loaded || 0),
            bytesTotal: totalBytes || 1,
            itemsUploaded: itemsTotal > 0 ? (item === pendingFiles[pendingFiles.length - 1] ? itemsTotal : pendingFiles.indexOf(item)) : 0
          }));
        }
      });

      const url = extractUrl(result);

      applyUploadedFileUrlToModules(modules, item, url);

      uploadedBytes += item.file?.size || 0;
    } catch (err) {
      dispatchUploadFailure(dispatch, err, "Failed to upload media");
      throw err;
    }
  }

  assertNoOrphanBlobUrlsInModules(modules);

  const labPayload = { ...lab };
  const thumbFile = lab._thumbnailFile || (isRealFile(lab.thumbnail) ? lab.thumbnail : null);
  const introFile = lab._introVideoFile || null;
  delete labPayload._thumbnailFile;
  delete labPayload._introVideoFile;
  if (isRealFile(lab.thumbnail)) delete labPayload.thumbnail;

  if (!isRealFile(thumbFile) && typeof lab.thumbnail === "string" && lab.thumbnail.trim()) {
    labPayload.thumbnail = lab.thumbnail.trim();
  }
  if (!isRealFile(introFile) && typeof lab.introVideoUrl === "string" && lab.introVideoUrl.trim()) {
    labPayload.introVideoUrl = lab.introVideoUrl.trim();
  }

  fd.append("lab", JSON.stringify(labPayload));
  fd.append("modules", JSON.stringify(modules));

  if (isRealFile(thumbFile)) {
    fd.append("thumbnail", thumbFile);
  }
  if (isRealFile(introFile)) {
    fd.append("introVideo", introFile);
  }

  let estimatedTotal = uploadedBytes;
  try {
    for (const [, v] of fd.entries()) {
      if (v instanceof File || v instanceof Blob) estimatedTotal += v.size || 0;
      else if (typeof v === "string") estimatedTotal += new TextEncoder().encode(v).length;
    }
  } catch { /* ignore */ }

  dispatch(start({ label: "Creating lab…", bytesTotal: estimatedTotal || 1, itemsTotal: 1 }));

  try {
    const response = await axiosInstance.post(
      "/owner/labs/create-full",
      fd,
      {
        ...multipartConfig((evt) => {
          const total = (evt && typeof evt.total === "number" && evt.total > 0) ? evt.total : (estimatedTotal || 1);
          dispatch(progress({ bytesUploaded: evt?.loaded ?? 0, bytesTotal: total }));
        }),
        signal: getUploadSessionSignal(),
      }
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Lab creation failed");
    throw err;
  }
  } finally {
    endUploadSession();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  updateFullWithModules  →  PUT /owner/labs/:labId/update-full
// ═════════════════════════════════════════════════════════════════════════════
export async function updateFullWithModules({ labId, lab, modules, dispatch }) {
  beginUploadSession();
  try {
  const fd = new FormData();
  const pendingFiles = collectModulePendingFiles(modules);

  const thumbBytesPending = isRealFile(lab._thumbnailFile) ? lab._thumbnailFile.size : 0;
  const introBytesPending = isRealFile(lab._introVideoFile) ? lab._introVideoFile.size : 0;
  const totalBytes =
    pendingFiles.reduce((sum, item) => sum + (item.file?.size || 0), 0) +
    thumbBytesPending +
    introBytesPending;
  const itemsTotal = pendingFiles.length + (thumbBytesPending ? 1 : 0) + (introBytesPending ? 1 : 0);

  dispatch(start({ label: "Uploading lab media…", bytesTotal: totalBytes || 1, itemsTotal: Math.max(itemsTotal, 1) }));

  let uploadedBytes = 0;

  for (const item of pendingFiles) {
    try {
      const result = await _postMultipart({
        url: "/owner/labs/upload-instruction-media",
        fieldName: "file",
        file: item.file,
        extraFields: item.replacesUrl ? { replaceUrl: item.replacesUrl } : {},
        onProgress: ({ loaded }) => {
          dispatch(
            progress({
              bytesUploaded: uploadedBytes + (loaded || 0),
              bytesTotal: totalBytes || 1,
              itemsUploaded:
                itemsTotal > 0
                  ? item === pendingFiles[pendingFiles.length - 1]
                    ? itemsTotal
                    : pendingFiles.indexOf(item)
                  : 0,
            })
          );
        },
      });

      const url = extractUrl(result);

      applyUploadedFileUrlToModules(modules, item, url);

      uploadedBytes += item.file?.size || 0;
    } catch (err) {
      dispatchUploadFailure(dispatch, err, "Failed to upload media");
      throw err;
    }
  }

  assertNoOrphanBlobUrlsInModules(modules);

  const labPayload = { ...lab };
  const thumbFile = lab._thumbnailFile || (isRealFile(lab.thumbnail) ? lab.thumbnail : null);
  const introFile = lab._introVideoFile || null;
  delete labPayload._thumbnailFile;
  delete labPayload._introVideoFile;
  if (isRealFile(lab.thumbnail)) delete labPayload.thumbnail;

  if (!isRealFile(thumbFile) && typeof lab.thumbnail === "string" && lab.thumbnail.trim()) {
    labPayload.thumbnail = lab.thumbnail.trim();
  }
  if (!isRealFile(introFile) && typeof lab.introVideoUrl === "string" && lab.introVideoUrl.trim()) {
    labPayload.introVideoUrl = lab.introVideoUrl.trim();
  }

  fd.append("lab", JSON.stringify(labPayload));
  fd.append("modules", JSON.stringify(modules));

  if (isRealFile(thumbFile)) {
    fd.append("thumbnail", thumbFile);
  }
  if (isRealFile(introFile)) {
    fd.append("introVideo", introFile);
  }

  let estimatedTotal = uploadedBytes;
  try {
    for (const [, v] of fd.entries()) {
      if (v instanceof File || v instanceof Blob) estimatedTotal += v.size || 0;
      else if (typeof v === "string") estimatedTotal += new TextEncoder().encode(v).length;
    }
  } catch {
    /* ignore */
  }

  dispatch(start({ label: "Updating lab…", bytesTotal: estimatedTotal || 1, itemsTotal: 1 }));

  try {
    const response = await axiosInstance.put(
      `/owner/labs/${labId}/update-full`,
      fd,
      {
        ...multipartConfig((evt) => {
          const total =
            evt && typeof evt.total === "number" && evt.total > 0 ? evt.total : estimatedTotal || 1;
          dispatch(progress({ bytesUploaded: evt?.loaded ?? 0, bytesTotal: total }));
        }),
        signal: getUploadSessionSignal(),
      }
    );
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2000);
    return response.data;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Lab update failed");
    throw err;
  }
  } finally {
    endUploadSession();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  uploadCourseFiles  →  POST /owner/courses/:courseId/media
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadCourseFiles({
  courseId, thumbnailFile = null, videoFile = null,
  existingThumbnailUrl = "", existingVideoUrl = "", dispatch,
}) {
  let thumbnailUrl = existingThumbnailUrl;
  let videoUrl = existingVideoUrl;

  const uploads = [
    isRealFile(thumbnailFile) && { file: thumbnailFile, fieldName: "thumbnail", label: "Uploading thumbnail", extraFields: { type: "thumbnail" } },
    isRealFile(videoFile) && { file: videoFile, fieldName: "video", label: "Uploading intro video", extraFields: { type: "introVideo" } },
  ].filter(Boolean);

  if (uploads.length === 0) return { thumbnailUrl, videoUrl };

  const totalBytes = uploads.reduce((sum, u) => sum + u.file.size, 0);
  let uploadedSoFar = 0;

  for (let i = 0; i < uploads.length; i++) {
    const { file, fieldName, label, extraFields } = uploads[i];
    dispatch(start({ label: uploads.length > 1 ? `${label} (${i + 1}/${uploads.length})` : label, bytesTotal: totalBytes, itemsTotal: uploads.length }));
    const byteOffsetAtStart = uploadedSoFar;
    try {
      const result = await _postMultipart({
        url: `/owner/courses/${courseId}/media`, fieldName, file, extraFields,
        onProgress: ({ loaded }) => dispatch(progress({ bytesUploaded: byteOffsetAtStart + loaded, bytesTotal: totalBytes, itemsUploaded: i })),
      });
      const cdnUrl = extractUrl(result);
      if (fieldName === "thumbnail") thumbnailUrl = cdnUrl || existingThumbnailUrl;
      if (fieldName === "video") videoUrl = cdnUrl || existingVideoUrl;
      uploadedSoFar += file.size;
    } catch (err) {
      dispatchUploadFailure(dispatch, err, `Failed to upload ${fieldName}`);
      throw err;
    }
  }
  dispatch(complete());
  setTimeout(() => dispatch(hide()), 2500);
  return { thumbnailUrl, videoUrl };
}

// ═════════════════════════════════════════════════════════════════════════════
//  uploadLabFiles  →  POST /owner/labs/:labId/media
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadLabFiles({ labId, thumbnailFile = null, existingThumbnailUrl = "", dispatch }) {
  if (!isRealFile(thumbnailFile)) return { thumbnailUrl: existingThumbnailUrl };
  dispatch(start({ label: "Uploading lab thumbnail", bytesTotal: thumbnailFile.size, itemsTotal: 1 }));
  try {
    const result = await _postMultipart({
      url: `/owner/labs/${labId}/media`, fieldName: "thumbnail", file: thumbnailFile,
      extraFields: { type: "thumbnail" },
      onProgress: ({ loaded, total }) => dispatch(progress({ bytesUploaded: loaded, bytesTotal: total })),
    });
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2500);
    return { thumbnailUrl: extractUrl(result) || existingThumbnailUrl };
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Lab thumbnail upload failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  uploadSkillBuilderFiles  →  POST /owner/skill-builders/:sbId/media
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadSkillBuilderFiles({ sbId, thumbnailFile = null, existingThumbnailUrl = "", dispatch }) {
  if (!isRealFile(thumbnailFile)) return { thumbnailUrl: existingThumbnailUrl };
  dispatch(start({ label: "Uploading thumbnail", bytesTotal: thumbnailFile.size, itemsTotal: 1 }));
  try {
    const result = await _postMultipart({
      url: `/owner/skill-builders/${sbId}/media`, fieldName: "thumbnail", file: thumbnailFile,
      extraFields: { type: "thumbnail" },
      onProgress: ({ loaded, total }) => dispatch(progress({ bytesUploaded: loaded, bytesTotal: total })),
    });
    dispatch(complete());
    setTimeout(() => dispatch(hide()), 2500);
    return { thumbnailUrl: extractUrl(result) || existingThumbnailUrl };
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Thumbnail upload failed");
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  uploadWithProgress  — generic single-file upload
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadWithProgress({ file, url, fieldName = "file", extraData = {}, dispatch, label = "Uploading file", hideDelay = 2500 }) {
  if (!isRealFile(file)) throw new Error("uploadWithProgress: file must be a File or Blob");
  dispatch(start({ label, bytesTotal: file.size, itemsTotal: 1 }));
  try {
    const result = await _postMultipart({
      url, fieldName, file, extraFields: extraData,
      onProgress: ({ loaded, total }) => dispatch(progress({ bytesUploaded: loaded, bytesTotal: total })),
    });
    dispatch(complete());
    setTimeout(() => dispatch(hide()), hideDelay);
    return result;
  } catch (err) {
    dispatchUploadFailure(dispatch, err, "Upload failed");
    throw err;
  }
}
