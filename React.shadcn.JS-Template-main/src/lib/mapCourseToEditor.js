function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseMeta(raw) {
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

function levelLabel(level) {
  const v = String(level || "beginner").toLowerCase();
  if (v === "intermediate") return "Intermediate";
  if (v === "advanced" || v === "expert") return "Advanced";
  return "Beginner";
}

function normalizeModules(rawModules) {
  if (!Array.isArray(rawModules) || !rawModules.length) return null;
  return rawModules.map((mod) => ({
    id: mod.id || genId(),
    title: mod.title || "Module",
    expanded: mod.expanded !== false,
    items: (mod.items || []).map((item) => {
      if (item.type === "skill_builder_lab" || item.type === "normal_lab") {
        return {
          id: item.id || genId(),
          type: item.type,
          title: item.title || "Lab",
          reference_id: item.reference_id || item.lab_id || item.id,
          duration: item.duration || 30,
          difficulty: item.difficulty || "Beginner",
        };
      }
      return {
        id: item.id || genId(),
        type: item.type || "lesson",
        title: item.title || "Lesson",
        blocks: Array.isArray(item.blocks) ? item.blocks : [],
      };
    }),
  }));
}

/** Map owner course API row → CourseCreate editor state. */
export function mapApiCourseToEditor(rawCourse) {
  if (!rawCourse) return null;
  const meta = parseMeta(rawCourse.metadata);
  const modules = normalizeModules(meta.modules);
  const learningOutcomes =
    meta.learning_outcomes ||
    meta.learningOutcomes ||
    rawCourse.learningOutcomes ||
    [];
  const requirements = meta.requirements || rawCourse.requirements || [];
  const technologies = meta.tech_stack || meta.technologies || rawCourse.technologies || [];

  const introVideo =
    meta.intro_video_url ||
    meta.introVideoUrl ||
    (Array.isArray(rawCourse.media)
      ? rawCourse.media.find((m) => m.type === "video" && m.is_preview)?.url
      : "") ||
    "";

  return {
    courseId: rawCourse.id,
    course: {
      title: rawCourse.title || "",
      shortDescription:
        meta.short_description ||
        meta.shortDescription ||
        rawCourse.description ||
        "",
      fullDescription:
        meta.full_description ||
        meta.fullDescription ||
        rawCourse.description ||
        "",
      thumbnail: rawCourse.thumbnail || rawCourse.thumbnail_url || "",
      introVideoUrl: introVideo,
      _thumbnailFile: null,
      _introVideoFile: null,
      platform: meta.platform || "AWS",
      difficulty: levelLabel(rawCourse.level),
      duration: String(rawCourse.duration_minutes || rawCourse.duration || ""),
      isFree: !!(rawCourse.is_free ?? rawCourse.isFree),
      price: Number(rawCourse.price) || 0,
      currency: rawCourse.currency || meta.currency || "INR",
      rating: Number(meta.rating ?? rawCourse.rating ?? 4.8),
      studentCount: Number(rawCourse.enrolled_count ?? 0),
      technologies: Array.isArray(technologies) ? technologies : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      recommendedKnowledge: [],
      learningOutcomes: Array.isArray(learningOutcomes) ? learningOutcomes : [],
      objectives: [],
      createdBy: rawCourse.creator?.full_name || "ALAR Labs",
      hasCertificate: !!(meta.hasCertificate ?? meta.certificate),
      certificateName:
        meta.certificateName ||
        meta.certificate?.title ||
        meta.certificate?.name ||
        "Completion Certificate",
      certificationId: rawCourse.certification_id || meta.certificationId || null,
      hasDiscount: !!meta.hasDiscount,
      discountPercentage: Number(meta.discountPercentage) || 0,
      discountStartDate: meta.discountStartDate || "",
      discountEndDate: meta.discountEndDate || "",
      categoryId: rawCourse.category_id || rawCourse.category?.id || null,
    },
    modules,
  };
}
