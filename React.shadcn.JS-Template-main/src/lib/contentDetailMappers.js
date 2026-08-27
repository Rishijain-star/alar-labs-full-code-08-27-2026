import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getRichTextBlockTitle } from "@/lib/richTextUtils";

/** Free when flagged or price is zero (matches backend enroll logic). */
export function resolveContentIsFree(payload) {
  if (!payload) return true;
  const price = Number(payload.price);
  const flagged = payload.isFree ?? payload.is_free;
  return !!flagged || price === 0 || Number.isNaN(price);
}

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
    const entries = Array.isArray(mod.items) && mod.items.length
      ? mod.items
      : (mod.lessons || []);
    for (const entry of entries) {
      if (entry.videoUrl && String(entry.videoUrl).trim()) {
        return resolveMediaUrl(entry.videoUrl);
      }
      for (const block of entry.blocks || []) {
        if (block.type === "video" && Array.isArray(block.videos)) {
          const first = block.videos.find((v) => v.url && String(v.url).trim());
          if (first?.url) return resolveMediaUrl(first.url);
        }
      }
    }
  }

  const preview = (media || []).find((m) => m.type === "video" && (m.is_preview || m.url));
  if (preview?.url) return resolveMediaUrl(preview.url);

  return "";
}

export function normalizeOutlineModules(modules, { isEnrolled } = {}) {
  function getBlockTitle(t) {
    if (t.title && t.title.trim()) return t.title.trim();

    switch (t.type) {
      case "richText":
        return getRichTextBlockTitle(t);
      case "video":
        return "Video";
      case "quiz":
        return t.question || "Quiz";
      case "code":
        return t.title || "Code Exercise";
      case "project":
        return t.title || "Project";
      case "download":
        return t.title || "Download";
      case "codeSnippet":
        return "Code Snippet";
      case "image":
        return "Image";
      case "fillBlank":
        return "Fill in the Blank";
      case "trueFalse":
        return "True/False";
      default:
        return t.type || "Task";
    }
  }

  return (modules || []).map((mod, mi) => {
    const rawEntries = Array.isArray(mod.items) && mod.items.length
      ? mod.items
      : (mod.lessons || []).map((les) => ({ ...les, type: les.type || "lesson" }));

    const lessons = rawEntries.map((entry, li) => {
      if (entry.type === "skill_builder_lab" || entry.type === "normal_lab") {
        const labType = entry.type === "skill_builder_lab" ? "Skill Builder Lab" : "Learning Lab";
        return {
          id: entry.id || `lab_${mi}_${li}`,
          title: entry.title || labType,
          type: entry.type,
          duration: entry.duration ? `${entry.duration} min` : "",
          reference_id: entry.reference_id,
          tasks: [{
            id: entry.id || entry.reference_id || `lab_task_${mi}_${li}`,
            title: entry.title || labType,
            type: entry.type,
          }],
          locked: !isEnrolled && mi > 0,
        };
      }

      const items = entry.blocks || entry.tasks || [];
      const taskList = items.map((t, ti) => ({
        id: t.id || `task_${mi}_${li}_${ti}`,
        title: getBlockTitle(t),
        type: t.type || "richText",
      }));
      const lessonFree = entry.free === true;
      return {
        id: entry.id || `lesson_${mi}_${li}`,
        title: entry.title || `Lesson ${li + 1}`,
        type: entry.type || (taskList.length ? taskList[0].type : "lesson"),
        duration: entry.duration
          ? (String(entry.duration).match(/min|hour/i) ? String(entry.duration) : `${entry.duration} min`)
          : "",
        tasks: taskList,
        locked: !isEnrolled && !lessonFree && mi > 0,
        videoUrl: entry.videoUrl || "",
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

export function countLinkedLabsInModules(modules = []) {
  let normal = 0;
  let skillBuilder = 0;
  for (const mod of modules) {
    const entries = mod.items?.length ? mod.items : (mod.lessons || []);
    for (const entry of entries) {
      if (entry.type === "normal_lab") normal += 1;
      if (entry.type === "skill_builder_lab") skillBuilder += 1;
    }
  }
  return { normal, skillBuilder, total: normal + skillBuilder };
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
    isFree: resolveContentIsFree(payload),
    price: payload.price ?? 0,
    currency: payload.currency || meta.currency || "INR",
    rating: payload.rating ?? meta.rating ?? 4.8,
    studentCount:
      payload.studentCount ??
      meta.studentCount ??
      payload.enrolledCount ??
      payload.enrolled_count ??
      0,
    platform: payload.platform || meta.platform || null,
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
    isFree: resolveContentIsFree(payload),
    price: payload.price ?? 0,
    currency: payload.currency || meta.currency || meta.settings?.currency || "INR",
    rating: payload.rating ?? meta.rating ?? 4.8,
    studentCount:
      payload.studentCount ??
      meta.studentCount ??
      payload.enrolledCount ??
      0,
    platform: payload.platform || meta.platform || payload.vendor_platform || null,
    technologies,
    requirements,
    learningOutcomes,
    objectives,
    modules,
    includedLabs,
    certificate: resolveCourseCertificate(payload, meta),
    isPurchased: !!(payload.isPurchased ?? payload._is_enrolled),
    enrollmentProgress: Number(payload.enrollmentProgress ?? payload.enrollment_progress ?? 0) || 0,
    modulesCompleted: Number(payload.modulesCompleted ?? payload.modules_completed ?? 0) || 0,
    totalModules: Number(payload.totalModules ?? payload.total_modules ?? (modules?.length || 0)) || 0,
    media,
  };
}

export function computeModulesCompletedFromProgress(progress, totalModules) {
  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  const total = Math.max(0, Number(totalModules) || 0);
  if (pct <= 0) return 0;
  if (total <= 0) return 1;
  const estimated = Math.round((pct / 100) * total);
  return Math.max(1, Math.min(total, estimated));
}

export function getEnrollCtaLabel({
  isEnrolled,
  progress = 0,
  modulesCompleted = 0,
  isFree,
  isAuthenticated,
  price,
  currency,
  formatPrice,
}) {
  if (isEnrolled) {
    const pct = Number(progress) || 0;
    const done = Number(modulesCompleted) || 0;
    if (pct > 0 || done > 0) return "Resume";
    return "Start Now";
  }
  if (!isAuthenticated) return "Enroll Now";
  if (isFree) return "Enroll Now";
  const amount = Number(price) || 0;
  if (amount <= 0) return "Buy Now";
  const label = formatPrice ? formatPrice(amount, currency) : `${currency || "USD"} ${amount}`;
  return `Enroll · ${label}`;
}

export function getEnrollProgressHint({ modulesCompleted = 0, totalModules = 0, progress = 0 }) {
  const done = Number(modulesCompleted) || 0;
  const total = Number(totalModules) || 0;
  if (total > 0 && done > 0) return `${done} of ${total} modules done`;
  const pct = Number(progress) || 0;
  if (pct > 0) return `${pct}% complete`;
  return null;
}

export function resolveCourseCertificate(payload, meta = {}) {
  const settings = meta.settings && typeof meta.settings === "object" ? meta.settings : {};
  const raw =
    payload?.certificate ||
    settings.certificate ||
    (meta.hasCertificate
      ? { enabled: true, title: meta.certificateName, name: meta.certificateName }
      : null);

  if (!raw || (raw.enabled !== true && raw.enabled !== "true" && !meta.hasCertificate && !raw.available)) {
    return null;
  }

  const linked = payload?.certification || null;
  const certificationId =
    payload?.certification_id ||
    payload?.certificationId ||
    raw.certificationId ||
    linked?.id ||
    null;

  const title =
    String(raw.title || raw.name || meta.certificateName || linked?.title || "").trim() ||
    "Completion Certificate";

  const minRaw = raw.minProgress ?? raw.min_progress ?? 80;
  const minProgress = Number(minRaw);

  return {
    available: true,
    enabled: true,
    title,
    name: title,
    certificationId,
    type: raw.type || "completion",
    minProgress: Number.isFinite(minProgress) ? Math.min(100, Math.max(0, minProgress)) : 80,
    description: raw.description || linked?.description || "",
    thumbnail: raw.thumbnail || linked?.thumbnail
      ? resolveMediaUrl(raw.thumbnail || linked?.thumbnail)
      : "",
    requireQuizPassing: !!(raw.requireQuiz ?? raw.requireQuizPassing ?? raw.require_quiz),
    requireAllTasksCompletion: !!(raw.requireTasks ?? raw.requireAllTasksCompletion ?? raw.require_tasks),
  };
}

export function resolveEnabledLabCertificate(cert) {
  if (!cert || (cert.enabled !== true && cert.enabled !== "true")) return null;
  const minRaw = cert.minProgress ?? cert.min_progress ?? 80;
  const minProgress = Number(minRaw);
  return {
    title: String(cert.title || "").trim() || "Completion Certificate",
    type: cert.type || "completion",
    minProgress: Number.isFinite(minProgress) ? Math.min(100, Math.max(0, minProgress)) : 80,
    description: cert.description || "",
    thumbnail: cert.thumbnail ? resolveMediaUrl(cert.thumbnail) : "",
    requireQuiz: !!(cert.requireQuiz ?? cert.require_quiz),
    requireTasks: !!(cert.requireTasks ?? cert.require_tasks),
    verificationText: cert.verificationText || cert.verification_text || "",
  };
}

export function mapLabOverviewPayload(payload) {
  if (!payload) return null;
  const mapped = mapLabViewPayload(payload);
  if (!mapped) return null;
  return {
    ...mapped,
    isEnrolled: !!(payload.isEnrolled ?? payload.isPurchased),
    isPurchased: !!(payload.isEnrolled ?? payload.isPurchased),
    enrollmentProgress: Number(payload.enrollmentProgress ?? payload.enrollment_progress ?? 0) || 0,
    modulesCompleted: Number(payload.modulesCompleted ?? payload.modules_completed ?? 0) || 0,
    totalModules: Number(payload.totalModules ?? payload.total_modules ?? (mapped.modules?.length || 0)) || 0,
    blockBreakdown: payload.blockBreakdown || {},
    canEdit: !!payload.canEdit,
    canDelete: !!payload.canDelete,
    editPath: payload.editPath || null,
    accessViaCourse: !!payload.accessViaCourse,
    includedInCourseSlug: payload.includedInCourseSlug || null,
    includedViaCourseFree: !!payload.includedViaCourseFree,
  };
}
