import { getRichTextBlockTitle } from "@/lib/richTextUtils";

/** Block types that require learner action (count toward progress). */
export const INTERACTIVE_BLOCK_TYPES = ["quiz", "trueFalse", "code", "fillBlank", "project"];

export const BLOCK_TYPE_LABELS = {
  video: "Video",
  audio: "Audio",
  richText: "Reading",
  image: "Image",
  quiz: "Quiz",
  trueFalse: "True / False",
  code: "Code Exercise",
  codeSnippet: "Code Snippet",
  fillBlank: "Fill in the Blank",
  project: "Project",
  pdf: "PDF",
  alert: "Notice",
  externalLink: "Link",
  divider: "Section",
  download: "Download",
};

export function isInteractiveBlock(type) {
  return INTERACTIVE_BLOCK_TYPES.includes(type);
}

/** Admin placeholders like "asdf" — show readable type label instead. */
export function isPlaceholderTitle(title) {
  const s = String(title || "").trim();
  if (!s || s.length > 48) return false;
  if (/^(asdf|sadf|test|demo|lesson|task|new\s*lesson|untitled)/i.test(s)) return true;
  if (/^[a-z0-9_-]{2,14}$/i.test(s) && !/\s/.test(s)) return true;
  return false;
}

export function getBlockDisplayTitle(block) {
  const typeLabel = BLOCK_TYPE_LABELS[block?.type] || "Activity";
  const raw = (block?.title || block?.name || "").trim();
  if (raw && !isPlaceholderTitle(raw)) return raw;
  if (block?.type === "richText") {
    const fromRich = getRichTextBlockTitle(block);
    if (fromRich && fromRich !== "Reading") return fromRich;
  }
  const q = block?.question || block?.prompt;
  if (typeof q === "string" && q.trim() && !isPlaceholderTitle(q)) {
    return q.trim().length > 60 ? `${q.trim().slice(0, 57)}…` : q.trim();
  }
  return typeLabel;
}

/** Course, hands-on lab, or skill builder lab — for sidebar branding. */
export const CONTENT_KIND_META = {
  course: {
    label: "Course",
    shortLabel: "Course",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
  lab: {
    label: "Learning Lab",
    shortLabel: "Lab",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    dotClass: "bg-blue-500",
  },
  skill_builder: {
    label: "Skill Builder Lab",
    shortLabel: "Skill Builder",
    className: "bg-amber-100 text-amber-900 border-amber-200",
    dotClass: "bg-amber-500",
  },
};

export function resolveContentKind({ isCourse, labKind, labType } = {}) {
  if (isCourse) return "course";
  const kind = String(labKind || "").toLowerCase();
  if (kind === "skill_builder") return "skill_builder";
  if (labType === "assessment") return "skill_builder";
  return "lab";
}

export function progressStorageKey(kind, entityId) {
  return `learning_progress_${kind}_${entityId}`;
}

export function loadBlockProgress(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {
        completedBlockIds: [],
        completedLessonIds: [],
        taskResults: {},
        startedAt: null,
        lastLessonId: null,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      completedBlockIds: Array.isArray(parsed.completedBlockIds) ? parsed.completedBlockIds : [],
      completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
      taskResults:
        parsed.taskResults && typeof parsed.taskResults === "object" ? parsed.taskResults : {},
      startedAt: parsed.startedAt || null,
      lastLessonId: parsed.lastLessonId || null,
    };
  } catch {
    return {
      completedBlockIds: [],
      completedLessonIds: [],
      taskResults: {},
      startedAt: null,
      lastLessonId: null,
    };
  }
}

export function saveBlockProgress(storageKey, payload) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore quota errors */
  }
}

function moduleCurriculumEntries(mod) {
  if (Array.isArray(mod.items) && mod.items.length) return mod.items;
  return (mod.lessons || []).map((les) => ({ ...les, type: les.type || "lesson" }));
}

export function normalizeModules(modules = [], { labSlugByRef = {} } = {}) {
  const slugForRef = (entry) =>
    entry.lab_slug
    || entry.labSlug
    || (entry.reference_id ? labSlugByRef[String(entry.reference_id)] : null)
    || null;

  return modules.map((mod, mi) => {
    const lessons = moduleCurriculumEntries(mod).map((entry, li) => {
      if (entry.type === "skill_builder_lab" || entry.type === "normal_lab") {
        const refId = entry.reference_id || entry.id;
        const labSlug = slugForRef(entry);
        const placeholder = {
          id: refId || `lab_${mi}_${li}`,
          type: entry.type,
          title: entry.title || (entry.type === "skill_builder_lab" ? "Skill Builder Lab" : "Learning Lab"),
          reference_id: entry.reference_id,
          lab_slug: labSlug,
          labSlug,
          lab_id: entry.lab_id || entry.reference_id,
          _isLinkedLab: entry._isLinkedLab ?? true,
        };
        return {
          ...entry,
          id: entry.id || `lab_${mi}_${li}`,
          type: entry.type,
          lab_slug: labSlug,
          labSlug,
          blocks: [placeholder],
          tasks: [placeholder],
          _isLinkedLab: true,
        };
      }

      const blocks = (entry.blocks || entry.tasks || []).map((b, bi) => ({
        ...b,
        id: b.id || `block_${mi}_${li}_${bi}`,
      }));
      return {
        ...entry,
        id: entry.id || `lesson_${mi}_${li}`,
        type: entry.type || "lesson",
        blocks,
        tasks: blocks,
      };
    });

    return {
      ...mod,
      id: mod.id || `mod_${mi}`,
      lessons,
    };
  });
}

export function flattenLessonBlocks(modules = []) {
  return modules.flatMap((m) =>
    (m.lessons || []).flatMap((l) =>
      (l.blocks || l.tasks || []).map((b) => ({
        ...b,
        lessonId: l.id,
        moduleId: m.id,
        moduleTitle: m.title,
      }))
    )
  );
}

export function computeInteractiveProgress(allBlocks, completedIdSet) {
  const interactive = allBlocks.filter((b) => isInteractiveBlock(b.type));
  const total = interactive.length;
  const done = interactive.filter((b) => completedIdSet.has(b.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;
  return {
    total,
    done,
    pct,
    allComplete: total === 0 || done >= total,
  };
}

/** Summarize auto-graded task attempts for the completion report. */
export function computeGradingSummary(allBlocks, taskResults = {}) {
  const gradableTypes = ["quiz", "trueFalse", "fillBlank", "code"];
  const gradable = allBlocks.filter((b) => gradableTypes.includes(b.type));
  let correct = 0;
  let wrong = 0;
  let attempted = 0;
  gradable.forEach((b) => {
    const r = taskResults[b.id];
    if (r == null) return;
    attempted += 1;
    if (r.correct) correct += 1;
    else wrong += 1;
  });
  const scorable = gradable.length;
  const scorePct = scorable > 0 ? Math.round((correct / scorable) * 100) : 100;
  return { correct, wrong, attempted, scorable, scorePct };
}

export function isCertificateEligible(certificate, scorePct) {
  if (!isCertificateEnabled(certificate)) return false;
  const min = Number(certificate?.minProgress ?? certificate?.min_progress ?? 80);
  return Number.isFinite(scorePct) && scorePct >= min;
}

export function isLinkedLabLesson(lesson) {
  return (
    lesson?.type === "normal_lab"
    || lesson?.type === "skill_builder_lab"
    || !!lesson?._isLinkedLab
  );
}

export function buildLabCompletionMap(includedLabs = []) {
  return Object.fromEntries(
    (includedLabs || []).map((l) => [String(l.id), !!l.completed])
  );
}

export function isLessonComplete(lesson, { completedTasks, completedLessonIds, labCompletionByRef } = {}) {
  if (!lesson) return false;
  if (isLinkedLabLesson(lesson)) {
    const refId = String(lesson.reference_id || lesson.lab_id || "");
    if (refId && labCompletionByRef?.[refId]) return true;
    return completedLessonIds?.has?.(lesson.id) ?? false;
  }
  const interactive = (lesson.blocks || lesson.tasks || []).filter((t) => isInteractiveBlock(t.type));
  if (!interactive.length) return completedLessonIds?.has?.(lesson.id) ?? false;
  return interactive.every((t) => completedTasks?.has?.(t.id));
}

export function computeCourseLessonProgress(allLessons = [], opts = {}) {
  const total = allLessons.length;
  if (!total) {
    return { total: 0, done: 0, pct: 100, allComplete: true };
  }
  const done = allLessons.filter((l) => isLessonComplete(l, opts)).length;
  const pct = Math.round((done / total) * 100);
  return { total, done, pct, allComplete: done >= total };
}

const PLATFORM_SHORT = {
  AWS: "AWS",
  "Google Cloud": "GCP",
  GCP: "GCP",
  Azure: "Azure",
  Docker: "Docker",
  Kubernetes: "Kubernetes",
  Linux: "Linux",
};

export function shortenPlatform(platform) {
  const p = String(platform || "").trim();
  if (!p) return "AWS";
  return PLATFORM_SHORT[p] || p;
}

function inferDominantLessonType(blocks = [], lesson = {}) {
  if (lesson.type) return lesson.type;
  if (lesson.videoUrl) return "video";
  const order = ["code", "project", "quiz", "trueFalse", "fillBlank", "video", "audio", "richText", "pdf"];
  for (const t of order) {
    if (blocks.some((b) => b.type === t)) return t;
  }
  return blocks[0]?.type || "article";
}

/**
 * Subtitle under lesson title in the left nav (e.g. "Official AWS Hands-on Environments").
 */
export function getLessonContentLabel(lesson, blocks = [], { platform, contentKind } = {}) {
  const custom =
    lesson.contentLabel ||
    lesson.subtitle ||
    lesson.environment ||
    lesson.contentTypeLabel;
  if (custom && String(custom).trim() && !isPlaceholderTitle(custom)) {
    return String(custom).trim();
  }

  if (lesson.type === "normal_lab") return "Included Learning Lab";
  if (lesson.type === "skill_builder_lab") return "Included Skill Builder Lab";

  const plat = shortenPlatform(platform || lesson.platform);
  const types = new Set((blocks || []).map((b) => b.type));
  const hasCode = types.has("code") || types.has("project");
  const hasVideo = types.has("video") || !!lesson.videoUrl;
  const hasQuiz = types.has("quiz") || types.has("trueFalse") || types.has("fillBlank");

  if (contentKind === "skill_builder") {
    if (hasCode) return `Official ${plat} Skill Builder Exercise`;
    if (hasQuiz) return `${plat} Skills Assessment`;
    return `${plat} Skill Builder Lesson`;
  }

  if (hasCode) return `Official ${plat} Hands-on Environments`;
  if (hasQuiz && hasVideo) return `${plat} Video & Assessment`;
  if (hasQuiz) return `${plat} Quiz & Practice`;
  if (hasVideo) return `${plat} Video Lesson`;
  if (types.has("richText") || types.has("pdf")) return `${plat} Reading & Resources`;
  if ((blocks || []).length === 0) return `${plat} Overview`;
  return `${plat} Learning Content`;
}

export function getLessonNavIconType(lesson, blocks = []) {
  if (lesson.type === "normal_lab") return "lab";
  if (lesson.type === "skill_builder_lab") return "skill_builder";
  const t = inferDominantLessonType(blocks, lesson);
  if (t === "video" || t === "audio") return "video";
  if (t === "code" || t === "project") return "code";
  if (t === "quiz" || t === "trueFalse" || t === "fillBlank") return "quiz";
  if (t === "pdf" || t === "article" || t === "richText") return "article";
  return "lesson";
}

export function isCertificateEnabled(cert) {
  if (!cert || typeof cert !== "object") return false;
  if (cert.enabled === false || cert.available === false) return false;
  return !!(cert.enabled || cert.available || cert.title);
}
