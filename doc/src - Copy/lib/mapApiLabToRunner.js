/**
 * Maps GET /api/labs/:id (DB lab + instructions JSON) to LabDetail runner shape.
 */

import { flattenLabOutlineToRunnerSections } from "./labOutlineUtils";

function parseInstructions(lab) {
  if (!lab?.instructions) return null;
  if (typeof lab.instructions === "object") return lab.instructions;
  try {
    return JSON.parse(lab.instructions);
  } catch {
    return null;
  }
}

function parseLabMetadata(lab) {
  const m = lab?.metadata;
  if (!m) return {};
  if (typeof m === "object" && !Array.isArray(m)) return m;
  if (typeof m === "string") {
    try {
      const o = JSON.parse(m);
      return typeof o === "object" && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

function stripHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function mapDifficultyLabel(level) {
  const x = String(level || "").toLowerCase();
  if (x === "easy" || x === "beginner") return "Beginner";
  if (x === "medium" || x === "intermediate") return "Intermediate";
  if (x === "hard" || x === "advanced" || x === "expert") return "Advanced";
  return level || "Beginner";
}

function parseTimerSeconds(ins, lab, fallback = 3600) {
  const rawIns = ins?.timerSec;
  const insTimer =
    typeof rawIns === "number"
      ? rawIns
      : typeof rawIns === "string"
        ? Number(rawIns)
        : NaN;
  if (Number.isFinite(insTimer) && insTimer > 0) return Math.round(insTimer);

  const mins = Number(lab?.time_limit_minutes);
  if (Number.isFinite(mins) && mins > 0) return Math.round(mins * 60);
  return fallback;
}

/** Admin/API step uses stepNumber + blocks; runner expects number + content */
function normalizeSection(s) {
  if (!s || typeof s !== "object") return null;
  if (s.type === "step") {
    return {
      type: "step",
      id: s.anchorId || s.id || undefined,
      number: s.stepNumber ?? s.number ?? 1,
      title: s.title || "",
      content: Array.isArray(s.blocks) ? s.blocks : Array.isArray(s.content) ? s.content : [],
      subSteps: Array.isArray(s.subSteps) ? s.subSteps : [],
    };
  }
  if (s.type === "content") {
    return {
      type: "content",
      id: s.anchorId || s.id || undefined,
      title: s.title || "",
      content: Array.isArray(s.blocks) ? s.blocks : Array.isArray(s.content) ? s.content : [],
    };
  }
  if (s.type === "heading") {
    const level =
      s.level === "task" ? "task" : s.level === "title" ? "title" : "h2";
    return {
      type: "heading",
      id: s.id,
      text: s.text || "",
      level,
    };
  }
  if (s.type === "media") {
    return {
      type: "media",
      id: s.id,
      src: s.src || s.url || s.mediaUrl || "",
      mediaType: s.mediaType || "image",
      caption: s.caption || "",
      alt: s.alt || "",
    };
  }
  if (s.type === "para") {
    return { type: "para", id: s.id, text: s.text || s.html || s.content || "" };
  }
  if (s.type === "note_box") {
    return {
      type: "note_box",
      id: s.id,
      html: s.html || "",
      backgroundColor: s.backgroundColor || "#fef9c3",
    };
  }
  return s;
}

function normalizeTocEntry(t) {
  if (!t || typeof t !== "object") return null;
  return {
    id: t.id,
    label: t.label || "",
    indent: !!t.indent,
    isTask: !!t.isTask,
  };
}

/**
 * Skill Builder labs store content in instructions.skillBuilder (tasks, overview, settings).
 */
function mapSkillBuilderToRunner(lab, ins, sb) {
  const overview = sb.overview && typeof sb.overview === "object" ? sb.overview : {};
  const metaIn = sb.meta && typeof sb.meta === "object" ? sb.meta : {};
  const settings = sb.settings && typeof sb.settings === "object" ? sb.settings : {};
  const tasks = Array.isArray(sb.tasks) ? sb.tasks : [];
  const rowMeta = parseLabMetadata(lab);

  const totalPoints =
    typeof sb._meta?.totalPoints === "number" && Number.isFinite(sb._meta.totalPoints)
      ? sb._meta.totalPoints
      : tasks.reduce((s, t) => s + (Number(t.points) || 0), 0);

  const timerSec = parseTimerSeconds({ timerSec: metaIn.timerSec }, lab, 2700);

  const durationStr =
    (Number.isFinite(Number(lab.time_limit_minutes)) && Number(lab.time_limit_minutes) > 0)
      ? `${Math.round(Number(lab.time_limit_minutes))} min`
      : metaIn.duration || `${Math.max(1, Math.round(timerSec / 60))} min`;

  const meta = {
    title: lab.title || metaIn.title || "Lab",
    code: ins?.code || lab.slug || "LAB",
    version: "v1",
    duration: durationStr,
    credits: metaIn.credits != null && metaIn.credits !== "" ? String(metaIn.credits) : ins?.credits || "—",
    level: mapDifficultyLabel(metaIn.level || lab.difficulty || "easy"),
    rating: typeof metaIn.rating === "number" ? metaIn.rating : 4.8,
    platform: metaIn.platform || ins?.platform || "—",
    isFree: lab.is_free !== undefined && lab.is_free !== null ? !!lab.is_free : metaIn.isFree !== false,
    timerSec,
    isSkillBuilder: true,
    labKind: rowMeta.lab_kind || "skill_builder",
    passingScore: Number(settings.passingScore) || 70,
    totalPoints: totalPoints || 100,
    description: lab.description || metaIn.description || "",
    thumbnail: lab.thumbnail || metaIn.thumbnail || "",
  };

  const setupNotes = [];
  const req = Array.isArray(overview.requirements) ? overview.requirements.filter(Boolean) : [];
  const learn = Array.isArray(overview.whatYouLearn) ? overview.whatYouLearn.filter(Boolean) : [];
  req.forEach((r) => setupNotes.push(`Prerequisite: ${r}`));
  learn.forEach((w) => setupNotes.push(`Outcome: ${w}`));
  if (!setupNotes.length && Array.isArray(ins?.setupNotes)) {
    setupNotes.push(...ins.setupNotes);
  }

  const toc = [{ id: "overview", label: "Overview", indent: false, isTask: false }];
  tasks.forEach((t, i) => {
    const label = stripHtml(t.question).slice(0, 48) || `Task ${i + 1}`;
    toc.push({ id: `task-${i}`, label, indent: true, isTask: true });
  });

  const sections = [
    {
      type: "skill_overview",
      id: "overview",
      descriptionHtml: meta.description,
      whatYouLearn: learn,
      requirements: req,
      skillsTested: Array.isArray(overview.skillsTested) ? overview.skillsTested.filter(Boolean) : [],
    },
  ];

  tasks.forEach((task, i) => {
    sections.push({
      type: "skill_task",
      id: `task-${i}`,
      taskIndex: i,
      task,
    });
  });

  const ids = {
    labId: lab.id,
    courseId: lab.course_id ?? null,
    slug: lab.slug,
  };
  return { ...ids, meta, toc, setupNotes, sections };
}

/**
 * @param {object} lab - raw lab from API
 * @returns {object|null} shape expected by LabDetailPage { meta, toc, setupNotes, sections }
 */
export function mapApiLabToRunner(lab) {
  if (!lab) return null;
  const ins = parseInstructions(lab);
  const sb = ins?.skillBuilder;
  if (sb && typeof sb === "object") {
    return mapSkillBuilderToRunner(lab, ins, sb);
  }
  const ids = {
    labId: lab.id,
    courseId: lab.course_id ?? null,
    slug: lab.slug,
  };

  const rawSections =
    ins?.labOutline && typeof ins.labOutline === "object" && Array.isArray(ins.labOutline.sections) && ins.labOutline.sections.length > 0
      ? flattenLabOutlineToRunnerSections(ins.labOutline)
      : Array.isArray(ins?.labSections)
        ? ins.labSections
        : [];
  const sections = rawSections.map(normalizeSection).filter(Boolean);

  const rawToc = Array.isArray(ins?.toc) ? ins.toc : [];
  const toc = rawToc.map(normalizeTocEntry).filter((x) => x && x.id);

  const timerSec = parseTimerSeconds(ins, lab, 3600);

  const meta = {
    title: lab.title || "Lab",
    code: ins?.code || lab.slug || "LAB",
    version: "v1",
    duration:
      (Number.isFinite(Number(lab.time_limit_minutes)) && Number(lab.time_limit_minutes) > 0)
        ? `${Math.round(Number(lab.time_limit_minutes))} min`
        : ins?.duration || `${Math.max(1, Math.round(timerSec / 60))} min`,
    credits: ins?.credits || "—",
    level: mapDifficultyLabel(lab.difficulty || "easy"),
    rating: typeof ins?.rating === "number" ? ins.rating : 4.8,
    platform: ins?.platform || "—",
    isFree: !!lab.is_free,
    timerSec,
    isSkillBuilder: false,
    totalPoints: 100,
    description: lab.description || "",
    thumbnail: lab.thumbnail || "",
  };

  const setupNotes = Array.isArray(ins?.setupNotes) ? ins.setupNotes : [];

  return { ...ids, meta, toc, setupNotes, sections };
}
