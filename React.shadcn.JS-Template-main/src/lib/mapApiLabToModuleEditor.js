function parseJsonField(val, fallback = {}) {
  if (val == null || val === "") return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

const DIFFICULTY_LABELS = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
  expert: "Expert",
};

function defaultModule() {
  const moduleId = crypto.randomUUID();
  const lessonId = crypto.randomUUID();
  return [
    {
      id: moduleId,
      title: "New Module",
      expanded: true,
      lessons: [{ id: lessonId, title: "New Lesson", blocks: [] }],
    },
  ];
}

/** Maps GET /labs/slug/:slug (or /labs/:id) response into SkillBuilderPro / NormalLearningLabCreate state. */
export function mapApiLabToModuleEditor(rawLab) {
  const instructions = parseJsonField(rawLab.instructions);
  const metadata = parseJsonField(rawLab.metadata);
  const labKind = metadata.lab_kind || rawLab.lab_kind || "hands_on";
  const diffKey = String(rawLab.difficulty || "easy").toLowerCase();
  const difficulty =
    DIFFICULTY_LABELS[diffKey] ||
    (diffKey ? diffKey.charAt(0).toUpperCase() + diffKey.slice(1) : "Beginner");
  const cert = instructions.certificate || {};

  const lab = {
    id: rawLab.id,
    slug: rawLab.slug,
    title: rawLab.title || "",
    shortDescription: rawLab.description || "",
    fullDescription: metadata.fullDescription || "",
    thumbnail: rawLab.thumbnail || metadata.thumbnailUrl || "",
    introVideoUrl: metadata.introVideoUrl || metadata.intro_video_url || "",
    _thumbnailFile: null,
    _introVideoFile: null,
    platform: metadata.platform || "AWS",
    lab_kind: labKind,
    difficulty,
    duration: rawLab.time_limit_minutes ? String(rawLab.time_limit_minutes) : "",
    isFree: !!(rawLab.is_free ?? rawLab.isFree),
    price: rawLab.price ?? 0,
    currency: rawLab.currency || metadata.currency || "INR",
    rating: metadata.rating ?? 4.8,
    studentCount: metadata.studentCount ?? 0,
    technologies: instructions.technologies || [],
    requirements: instructions.requirements || [],
    recommendedKnowledge: instructions.recommendedKnowledge || [],
    learningOutcomes: instructions.learningOutcomes || [],
    objectives: instructions.objectives || [],
    certificateEnabled: !!cert?.enabled,
    certificateTitle: cert?.title || "",
    certificateType: cert?.type || "completion",
    certificateMinProgress: cert?.minProgress ?? 80,
    certificateThumbnail: cert?.thumbnail || "",
    certificateDescription: cert?.description || "",
    certificateVerificationText: cert?.verificationText || "",
    certificateRequireQuiz: !!cert?.requireQuiz,
    certificateRequireTasks: !!cert?.requireTasks,
    certificationId: rawLab.certification_id || null,
    createdBy: metadata.createdBy || "ALAR Labs",
  };

  const modules =
    Array.isArray(instructions.modules) && instructions.modules.length > 0
      ? instructions.modules
      : defaultModule();

  return { lab, modules, labKind };
}
