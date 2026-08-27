/**
 * courseSubmitHelpers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for building the FormData payload when submitting a course.
 *
 * KEY FIX: mediaMeta now correctly includes `filename` when the intro video
 * is an uploaded File, so the backend can match the metadata to the file.
 */

// ─── buildMediaMeta ───────────────────────────────────────────────────────────

/**
 * Build the `media` JSON array that describes all dynamic media attachments.
 *
 * @param {{ introVideoType: "upload"|"url", introVideoUrl: string, introVideoFile: File|null }} p
 * @returns {Array}
 */
export function buildMediaMeta({ introVideoType, introVideoUrl, introVideoFile }) {
  const meta = [];

  if (introVideoType === "url" && introVideoUrl?.trim()) {
    meta.push({
      title: "Introduction Video",
      type: "video",
      url: introVideoUrl.trim(),
      isPreview: true,
      order: 1,
    });
  } else if (introVideoType === "upload" && introVideoFile instanceof File) {
    meta.push({
      title: "Introduction Video",
      type: "video",
      isPreview: true,
      order: 1,
      // ✅ FIX: filename lets the backend correlate this entry
      // to the corresponding binary in the `mediaFiles` FormData field
      filename: introVideoFile.name,
      url: "",
    });
  }

  return meta;
}

// ─── serialiseModules ─────────────────────────────────────────────────────────

/**
 * Strip non-serialisable File objects from modules before JSON encoding.
 * Preserves filenames so the backend knows which file belongs to which lesson.
 *
 * @param {Array} modules
 * @returns {Array}
 */
export function serialiseModules(modules) {
  return modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      // Destructure out all File fields
      const { videoFile, audioFile, pdfFile, ...rest } = l;
      return {
        ...rest,
        videoFilename: videoFile instanceof File ? videoFile.name : null,
        audioFilename: audioFile instanceof File ? audioFile.name : null,
        pdfFilename: pdfFile instanceof File ? pdfFile.name : null,
      };
    }),
  }));
}

// ─── appendLessonMediaFiles ───────────────────────────────────────────────────

/**
 * Appends all lesson File objects (video / audio / pdf) to FormData
 * under the `mediaFiles` field. Returns a flat list for progress tracking.
 *
 * @param {FormData} form
 * @param {Array}    modules
 * @returns {File[]}
 */
export function appendLessonMediaFiles(form, modules) {
  const files = [];
  modules.forEach((m) => {
    m.lessons.forEach((l) => {
      ["videoFile", "audioFile", "pdfFile"].forEach((field) => {
        if (l[field] instanceof File) {
          form.append("mediaFiles", l[field], l[field].name);
          files.push(l[field]);
        }
      });
    });
  });
  return files;
}

// ─── buildCourseFormData ──────────────────────────────────────────────────────

/**
 * Assembles the complete FormData payload for course creation/update.
 *
 * @returns {{ form: FormData, filesToMeasure: File[] }}
 */
export async function buildCourseFormData({
  // Step 1
  title, shortDescription, fullDescription, category, level,
  durationValue, durationUnit, techStack,
  courseHeader, courseFooter,
  // Step 2
  thumbnail, introVideoType, introVideoUrl, introVideoFile,
  learningOutcomes, modules,
  // Step 3
  selectedLabs,
  // Step 4
  pricingModel, price, currency,
  allowPreview, requirePrerequisites, privateAccess,
}) {
  const form = new FormData();
  const slug = title?.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "course";

  // ── Scalars ────────────────────────────────────────────────────────────
  form.append("title", title);
  form.append("slug", slug);
  form.append("shortDescription", shortDescription);
  form.append("description", fullDescription);
  form.append("category", category);
  form.append("level", level);
  form.append("durationValue", durationValue);
  form.append("durationUnit", durationUnit);
  form.append("techStack", JSON.stringify(techStack));
  form.append("price", String(pricingModel === "paid" ? price : "0"));
  form.append("currency", currency);
  form.append("isFree", String(pricingModel !== "paid"));
  form.append("status", "draft");
  form.append("allowPreview", String(allowPreview));
  form.append("requirePrerequisites", String(requirePrerequisites));
  form.append("privateAccess", String(privateAccess));

  // ── JSON blobs ─────────────────────────────────────────────────────────
  form.append("header", JSON.stringify(courseHeader));
  form.append("footer", JSON.stringify(courseFooter));
  form.append("learningOutcomes", JSON.stringify(learningOutcomes.filter((o) => o.text?.trim())));
  form.append("modules", JSON.stringify(serialiseModules(modules)));
  form.append("labs", JSON.stringify(selectedLabs.map((l) => l.id)));

  // ── Media metadata (✅ fixed) ───────────────────────────────────────────
  form.append("media", JSON.stringify(
    buildMediaMeta({ introVideoType, introVideoUrl, introVideoFile })
  ));

  // ── Binary files ───────────────────────────────────────────────────────

  // Thumbnail
  if (thumbnail instanceof File) {
    form.append("thumbnail", thumbnail, thumbnail.name);
  }

  // Intro video (appended to `mediaFiles`, NOT a separate field)
  if (introVideoType === "upload" && introVideoFile instanceof File) {
    form.append("mediaFiles", introVideoFile, introVideoFile.name);
  }

  // All lesson media (video / audio / pdf)
  const lessonFiles = appendLessonMediaFiles(form, modules);

  // ── Files for progress tracking ────────────────────────────────────────
  const filesToMeasure = [
    thumbnail instanceof File ? thumbnail : null,
    introVideoFile instanceof File ? introVideoFile : null,
    ...lessonFiles,
  ].filter(Boolean);

  return { form, filesToMeasure };
}