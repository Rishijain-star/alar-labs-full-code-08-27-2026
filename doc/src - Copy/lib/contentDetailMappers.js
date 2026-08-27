import { resolveMediaUrl } from "@/lib/mediaUrl";

function parseMeta(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function pickIntroVideoUrl(payload, modules, media = []) {
  const meta = parseMeta(payload.metadata);
  const direct =
    payload.introVideoUrl ||
    meta.intro_video_url ||
    meta.introVideoUrl ||
    "";
  if (direct && String(direct).trim()) return resolveMediaUrl(direct);

  for (const mod of modules || []) {
    for (const les of mod.lessons || []) {
      if (les.videoUrl && String(les.videoUrl).trim()) {
        return resolveMediaUrl(les.videoUrl);
      }
    }
  }

  const preview = (media || []).find((m) => m.type === "video" && (m.is_preview || m.url));
  if (preview?.url) return resolveMediaUrl(preview.url);

  return "";
}

export function normalizeOutlineModules(modules, { isEnrolled } = {}) {
  return (modules || []).map((mod, mi) => {
    const lessons = (mod.lessons || []).map((les, li) => {
      const items = les.tasks || les.blocks || [];
      const taskList = items.map((t, ti) => ({
        id: t.id || `task_${mi}_${li}_${ti}`,
        title: t.title || t.type || "Task",
        type: t.type || "richText",
      }));
      const lessonFree = les.free === true;
      return {
        id: les.id || `lesson_${mi}_${li}`,
        title: les.title || `Lesson ${li + 1}`,
        type: les.type || (taskList.length ? taskList[0].type : "video"),
        duration: les.duration || (taskList.length ? `${taskList.length} tasks` : ""),
        tasks: taskList,
        locked: !isEnrolled && !lessonFree && mi > 0,
        videoUrl: les.videoUrl || "",
      };
    });

    const hasFreeLesson = lessons.some((l) => !l.locked);
    return {
      id: mod.id || `mod_${mi}`,
      title: mod.title || `Module ${mi + 1}`,
      description: mod.description || mod.shortDescription || "",
      lessons,
      locked: !isEnrolled && mi > 0 && !hasFreeLesson,
    };
  });
}

export function mapLabViewPayload(payload) {
  if (!payload) return null;
  const meta = parseMeta(payload.metadata);
  const modules =
    Array.isArray(payload.modules) && payload.modules.length
      ? payload.modules
      : Array.isArray(meta.modules)
        ? meta.modules
        : [];

  const learningOutcomes =
    Array.isArray(payload.learningOutcomes) && payload.learningOutcomes.length
      ? payload.learningOutcomes
      : Array.isArray(meta.learningOutcomes)
        ? meta.learningOutcomes
        : [];

  const objectives =
    Array.isArray(payload.objectives) && payload.objectives.length
      ? payload.objectives
      : Array.isArray(meta.objectives)
        ? meta.objectives
        : learningOutcomes;

  const requirements =
    Array.isArray(payload.requirements) && payload.requirements.length
      ? payload.requirements
      : Array.isArray(meta.requirements)
        ? meta.requirements
        : [];

  const technologies =
    Array.isArray(payload.technologies) && payload.technologies.length
      ? payload.technologies
      : Array.isArray(meta.tech_stack)
        ? meta.tech_stack
        : [];

  const thumbnailRaw = payload.thumbnail || meta.thumbnail;
  const introVideoUrl = pickIntroVideoUrl(payload, modules);

  return {
    id: payload.id,
    title: payload.title,
    slug: payload.slug,
    shortDescription: payload.shortDescription || payload.description || meta.short_description || "",
    fullDescription: payload.fullDescription || meta.full_description || payload.description || "",
    thumbnail: thumbnailRaw ? resolveMediaUrl(thumbnailRaw) : "",
    introVideoUrl: introVideoUrl ? resolveMediaUrl(introVideoUrl) : "",
    difficulty: payload.difficulty || payload.level || "Beginner",
    duration: payload.duration || "N/A",
    isFree: !!(payload.isFree ?? payload.is_free),
    price: payload.price ?? 0,
    rating: payload.rating ?? 4.8,
    studentCount: payload.studentCount ?? payload.enrolledCount ?? 0,
    technologies,
    requirements,
    learningOutcomes,
    objectives,
    modules,
    certificate: payload.certificate || meta.certificate || null,
    isPurchased: !!(payload.isPurchased ?? payload.is_purchased),
    heroHeader: payload.heroHeader || meta.hero_header || meta.heroHeader || null,
  };
}

export function mapCourseViewPayload(payload) {
  if (!payload) return null;
  const meta = parseMeta(payload.metadata);
  const modules =
    Array.isArray(payload.modules) && payload.modules.length
      ? payload.modules
      : Array.isArray(meta.modules)
        ? meta.modules
        : [];

  const learningOutcomes =
    Array.isArray(payload.learningOutcomes) && payload.learningOutcomes.length
      ? payload.learningOutcomes
      : Array.isArray(payload.whatYouWillLearn) && payload.whatYouWillLearn.length
        ? payload.whatYouWillLearn
        : Array.isArray(meta.learning_outcomes)
          ? meta.learning_outcomes
          : [];

  const requirements =
    Array.isArray(payload.requirements) && payload.requirements.length
      ? payload.requirements
      : Array.isArray(meta.requirements)
        ? meta.requirements
        : [];

  const objectives =
    Array.isArray(payload.objectives) && payload.objectives.length
      ? payload.objectives
      : learningOutcomes;

  const technologies =
    Array.isArray(payload.techStack) && payload.techStack.length
      ? payload.techStack
      : Array.isArray(meta.tech_stack)
        ? meta.tech_stack
        : [];

  const thumbnailRaw = payload.thumbnail || payload.thumbnailUrl;
  const media = Array.isArray(payload.media) ? payload.media : [];
  const introVideoUrl = pickIntroVideoUrl(payload, modules, media);

  const includedLabs = (payload.includedLabs || []).map((lab) => ({
    ...lab,
    thumbnail: lab.thumbnail ? resolveMediaUrl(lab.thumbnail) : "",
    slug: lab.slug,
  }));

  return {
    id: payload.id,
    title: payload.title,
    slug: payload.slug,
    shortDescription: payload.shortDescription || payload.description || meta.short_description || "",
    fullDescription: payload.fullDescription || meta.full_description || payload.description || "",
    thumbnail: thumbnailRaw ? resolveMediaUrl(thumbnailRaw) : "",
    introVideoUrl: introVideoUrl ? resolveMediaUrl(introVideoUrl) : "",
    difficulty: payload.level || payload.difficulty || "Beginner",
    duration: payload.duration || "N/A",
    isFree: !!(payload.isFree ?? payload.is_free),
    price: payload.price ?? 0,
    rating: payload.rating ?? 4.8,
    studentCount: payload.enrolledCount ?? 0,
    technologies,
    requirements,
    learningOutcomes,
    objectives,
    modules,
    includedLabs,
    certificate: payload.certificate || meta.settings?.certificate || null,
    isPurchased: !!(payload.isPurchased ?? payload._is_enrolled),
    media,
  };
}

export function getEnrollCtaLabel({ isEnrolled, isFree }) {
  if (isEnrolled) return "Start Now";
  if (isFree) return "Start Now";
  return "Enroll Now";
}
