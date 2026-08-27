/**
 * Shared shape for GET /api/courses/:id/view and /slug/:slug/view
 * Merges Course columns + metadata JSON + computed fields.
 */

/** Sequelize / DB may return JSON as object, string, or double-encoded string */
function parseMetadata(raw) {
    if (raw == null || raw === "") return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try {
            const once = JSON.parse(raw);
            if (typeof once === "string") {
                try {
                    const twice = JSON.parse(once);
                    return typeof twice === "object" && twice !== null && !Array.isArray(twice) ? twice : {};
                } catch {
                    return {};
                }
            }
            return typeof once === "object" && once !== null && !Array.isArray(once) ? once : {};
        } catch {
            return {};
        }
    }
    return {};
}

function minsToText(mins) {
    const m = parseInt(mins || "0", 10);
    if (!m || m <= 0) return "N/A";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h} hours`;
}

function normalizeTags(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw == null) return [];
    if (typeof raw === "string") {
        try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeLearningOutcomes(meta) {
    const raw =
        meta?.learning_outcomes ||
        meta?.learningOutcomes ||
        meta?.whatYouLearn ||
        meta?.what_you_learn ||
        [];
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => (typeof x === "string" ? x : x?.text))
        .filter(Boolean);
}

function computeModulesCompletedFromProgress(progress, totalModules) {
    const pct = Math.max(0, Math.min(100, Number(progress) || 0));
    const total = Math.max(0, Number(totalModules) || 0);
    if (pct <= 0) return 0;
    if (total <= 0) return 1;
    const estimated = Math.round((pct / 100) * total);
    return Math.max(1, Math.min(total, estimated));
}

function buildCourseCertificateDisplay(course, meta, settings) {
    const cert = settings.certificate && typeof settings.certificate === "object" ? settings.certificate : {};
    const enabled = !!(cert.enabled || meta.hasCertificate);
    if (!enabled) return null;

    const template = course.certification || null;
    const title =
        String(cert.title || cert.name || meta.certificateName || "").trim() ||
        (template && template.title) ||
        `${course.title} Completion Certificate`;

    return {
        enabled: true,
        available: true,
        title,
        name: title,
        certificationId: course.certification_id || cert.certificationId || (template && template.id) || null,
        type: cert.type || "completion",
        minProgress: Number(cert.minProgress) || 80,
        thumbnail: cert.thumbnail || (template && (template.thumbnail || template.template_url)) || "",
        description: cert.description || (template && template.description) || "",
        requireQuizPassing: !!(cert.requireQuiz || cert.requireQuizPassing),
        requireAllTasksCompletion: !!(cert.requireTasks || cert.requireAllTasksCompletion),
    };
}

/**
 * Fill empty video-block URLs from the course's media[] (matched by the video id
 * == media.lesson_id). Lets a background-transcoded video appear in the learning
 * UI automatically, without rewriting the stored course content.
 */
function backfillVideoUrlsFromMedia(modules, mediaList) {
    if (!Array.isArray(modules) || !modules.length) {
        return Array.isArray(modules) ? modules : [];
    }
    const byLesson = new Map();
    for (const m of mediaList || []) {
        if (m && m.lesson_id && m.url) byLesson.set(String(m.lesson_id), m.url);
    }
    if (!byLesson.size) return modules;

    // A stored url is a placeholder if it's empty or a temporary browser/data URL
    // (those get saved from the admin's local file preview and never resolve).
    const isPlaceholderUrl = (u) =>
        !u || u === "" || /^blob:/i.test(String(u)) || /^data:/i.test(String(u));

    const cloned = JSON.parse(JSON.stringify(modules));
    const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
            if (Array.isArray(node.videos)) {
                for (const v of node.videos) {
                    if (v && v.id && byLesson.has(String(v.id)) && isPlaceholderUrl(v.url)) {
                        v.url = byLesson.get(String(v.id));
                    }
                }
            }
            for (const val of Object.values(node)) walk(val);
        }
    };
    walk(cloned);
    return cloned;
}

/**
 * @param {object} course - from getCourseView (includes labs, media, metadata, _enrollment_count, etc.)
 * @param {Array} includedLabs - enriched lab cards for the UI
 */
function buildCoursePublicDetail(course, includedLabs) {
    const meta = parseMetadata(course.metadata);
    const settings = meta.settings && typeof meta.settings === "object" ? meta.settings : {};
    const filledModules = backfillVideoUrlsFromMedia(meta.modules ?? [], course.media || []);

    const detail = {
        id: course.id,
        title: course.title,
        code: meta.code ?? null,
        slug: course.slug,
        description: course.description || "",
        shortDescription: meta.short_description ?? meta.shortDescription ?? null,
        fullDescription: meta.full_description ?? meta.fullDescription ?? course.description ?? null,
        thumbnail: course.thumbnail || null,
        thumbnailUrl: course.thumbnail || null,
        introVideoUrl: meta.intro_video_url ?? meta.introVideoUrl ?? null,

        category: course.category?.name ?? meta.category ?? null,
        categoryId: course.category_id ?? null,
        level: course.level ?? "beginner",
        platform: meta.platform ?? null,
        duration: minsToText(course.duration_minutes),
        durationMinutes: course.duration_minutes ?? 0,
        credits: meta.credits != null ? Number(meta.credits) : null,
        rating: meta.rating != null ? Number(meta.rating) : 4.8,

        price: course.price != null ? Number(course.price) : 0,
        currency: meta.currency || "USD",
        isFree: !!course.is_free,
        is_free: !!course.is_free,
        pricingModel: meta.pricing_model ?? meta.pricingModel ?? (course.is_free ? "free" : "paid"),

        status: course.status,
        contentApprovalStatus: meta.content_approval_status ?? null,
        isPublished: course.status === "published",
        allowPreview: settings.allowPreview ?? meta.allow_preview ?? true,
        requirePrerequisites: settings.requirePrerequisites ?? meta.require_prerequisites ?? false,
        privateAccess: settings.privateAccess ?? meta.private_access ?? false,
        requireSequential: settings.requireSequential ?? meta.require_sequential ?? false,
        showProgress: settings.showProgress ?? meta.show_progress ?? true,
        completionMessage: settings.completionMessage ?? meta.completion_message ?? null,

        enrolledCount: course._enrollment_count ?? 0,
        labsCount: includedLabs.length,
        linkedLabIds: Array.isArray(meta.labs) ? meta.labs : [],

        techStack: meta.tech_stack ?? meta.techStack ?? [],
        learningOutcomes: normalizeLearningOutcomes(meta),
        whatYouWillLearn: normalizeLearningOutcomes(meta),
        whatYouLearn: normalizeLearningOutcomes(meta),
        modules: filledModules,
        labs: meta.labs ?? [],
        courseNotes: meta.course_notes ?? meta.courseNotes ?? [],
        requirements: meta.requirements ?? [],
        settings,
        certificate: buildCourseCertificateDisplay(course, meta, settings),

        tags: normalizeTags(course.tags),
        metadata: { ...meta, modules: filledModules },

        /** Rich hero config from admin (ctaLabel, showCta, headline, …) */
        heroHeader: meta.hero_header || meta.heroHeader || null,

        header: {
            ...(meta.hero_header && typeof meta.hero_header === "object" ? meta.hero_header : {}),
            enabled: !!course.header_enabled,
            content: course.header_content ?? null,
            bgColor: course.header_bg_color ?? null,
            textColor: course.header_text_color ?? null,
        },
        footer: {
            enabled: !!course.footer_enabled,
            content: course.footer_content ?? null,
            bgColor: course.footer_bg_color ?? null,
            textColor: course.footer_text_color ?? null,
        },
        certification: course.certification || null,

        media: (course.media || []).map((m) => ({
            id: m.id,
            title: m.title,
            type: m.type,
            url: m.url,
            thumbnail: m.thumbnail,
            lesson_id: m.lesson_id,
            sort_order: m.sort_order,
            is_preview: m.is_preview,
            duration: m.duration,
            mime_type: m.mime_type,
            size: m.size,
        })),

        isPurchased: !!course._is_enrolled,
        contentLocked: !!course._content_locked,
        enrollmentProgress: course._is_enrolled ? (course._enrollment_progress ?? 0) : 0,
        modulesCompleted: course._is_enrolled
            ? computeModulesCompletedFromProgress(
                course._enrollment_progress ?? 0,
                Array.isArray(meta.modules) ? meta.modules.length : 0
            )
            : 0,
        totalModules: Array.isArray(meta.modules) ? meta.modules.length : 0,
        includedLabs,
    };

    return detail;
}

module.exports = {
    minsToText,
    buildCoursePublicDetail,
    normalizeLearningOutcomes,
    parseMetadata,
    normalizeTags,
};
