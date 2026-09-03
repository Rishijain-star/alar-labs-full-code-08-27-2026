const courseService = require("../services/courseService");
const learningService = require("../services/learningService");
const rbacService = require("../services/rbac/roleService");
const { buildCoursePublicDetail, minsToText, parseMetadata } = require("../utils/coursePublicDetail");
const notificationService = require("../services/notificationService");
const response = require("../utils/response");
const { AppError } = require("../middleware/errorHandler");
const { validate, fail, resolveRequestUserId } = require("../helper/helper");
const { processVideoToHLS, courseStreamUrl } = require("../services/videoProcessor");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const fsp = fs.promises;

const path = require("path");
const TMP_DIR = path.join(__dirname, "../temp/raw");
fs.mkdirSync(TMP_DIR, { recursive: true });
const CHUNKS_DIR = path.join(__dirname, '..', 'temp', 'chunks');
const RAW_DIR = path.join(__dirname, '..', 'temp', 'raw');
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true }); // ← top of file, too early
const PROCESSED_DIR = path.join(__dirname, "../processed/courses");
// ─── Helper: safe JSON parse ──────────────────────────────────────────────────
function parseJSON(value, fieldName) {
    if (!value) return null;
    if (typeof value === "object") return value; // already parsed by express
    try {
        return JSON.parse(value);
    } catch {
        throw new AppError(`Invalid JSON in field "${fieldName}"`, 400);
    }
}

function durationMinutesFromBody(body) {
    const direct = parseInt(body.duration || body.duration_minutes || "0", 10);
    if (direct > 0) return direct;
    const val = parseFloat(body.durationValue || "0");
    const unit = String(body.durationUnit || "hours").toLowerCase();
    if (!val || Number.isNaN(val)) return 0;
    if (unit.startsWith("min")) return Math.round(val);
    if (unit.startsWith("hour") || unit === "h") return Math.round(val * 60);
    if (unit.startsWith("day")) return Math.round(val * 24 * 60);
    return Math.round(val * 60);
}

/**
 * Merges admin FormData fields into `metadata` JSON (persisted on Course.metadata).
 */
function buildCourseMetadataFromBody(body) {
    let metadata = {};
    try {
        const raw = body?.metadata;
        if (raw != null && raw !== "") {
            if (typeof raw === "object" && !Array.isArray(raw)) {
                metadata = { ...raw };
            } else if (typeof raw === "string") {
                const p = JSON.parse(raw);
                metadata = typeof p === "object" && p !== null && !Array.isArray(p) ? p : {};
            }
        }
    } catch {
        metadata = {};
    }

    let lo = parseJSON(body.learningOutcomes, "learningOutcomes");
    if (!Array.isArray(lo) || !lo.length) {
        lo = parseJSON(body.whatYouLearn, "whatYouLearn");
    }
    if (!Array.isArray(lo) || !lo.length) {
        lo = metadata.learning_outcomes;
    }
    if (Array.isArray(lo) && lo.length) {
        metadata.learning_outcomes = lo
            .map((o) => (typeof o === "string" ? o : o?.text))
            .filter(Boolean);
    }

    const hdr = parseJSON(body.header, "header");
    if (hdr && typeof hdr === "object" && Object.keys(hdr).length) {
        metadata.hero_header = hdr;
    }

    const modules = parseJSON(body.modules, "modules");
    if (Array.isArray(modules)) metadata.modules = modules;

    if (Array.isArray(metadata.modules)) {
        const linked = new Set(
            Array.isArray(metadata.labs) ? metadata.labs.map((x) => String(x).trim()).filter(Boolean) : []
        );
        for (const mod of metadata.modules) {
            for (const item of mod.items || []) {
                if (
                    (item.type === "skill_builder_lab" || item.type === "normal_lab")
                    && item.reference_id
                ) {
                    linked.add(String(item.reference_id));
                }
            }
        }
        if (linked.size) metadata.labs = [...linked];
    }

    const featuredLabs = parseJSON(body.featuredLabs, "featuredLabs");
    const labs = parseJSON(body.labs, "labs");
    if (Array.isArray(featuredLabs) && featuredLabs.length) {
        metadata.labs = featuredLabs;
    } else if (Array.isArray(labs)) {
        metadata.labs = labs;
    }

    const tech = parseJSON(body.techStack, "techStack");
    if (Array.isArray(tech)) metadata.tech_stack = tech;

    const notes = parseJSON(body.courseNotes, "courseNotes");
    if (Array.isArray(notes)) metadata.course_notes = notes;

    const reqs = parseJSON(body.requirements, "requirements");
    if (Array.isArray(reqs)) metadata.requirements = reqs;

    if (body.shortDescription != null && body.shortDescription !== "") {
        metadata.short_description = body.shortDescription;
    }
    if (body.fullDescription != null && body.fullDescription !== "") {
        metadata.full_description = body.fullDescription;
    }
    if (body.introVideoUrl != null && String(body.introVideoUrl).trim() !== "") {
        metadata.intro_video_url = String(body.introVideoUrl).trim();
    }
    if (body.code != null && body.code !== "") metadata.code = body.code;
    if (body.category != null && body.category !== "") metadata.category = body.category;
    if (body.platform != null && body.platform !== "") metadata.platform = body.platform;
    if (body.credits != null && body.credits !== "") metadata.credits = body.credits;
    if (body.rating != null && body.rating !== "") metadata.rating = body.rating;
    if (body.currency != null && body.currency !== "") metadata.currency = body.currency;
    if (body.pricingModel != null && body.pricingModel !== "") metadata.pricing_model = body.pricingModel;

    const settingsIn = parseJSON(body.settings, "settings") || {};
    metadata.settings = {
        ...settingsIn,
        pricingModel: body.pricingModel ?? settingsIn.pricingModel,
        allowPreview: body.allowPreview === "true" || body.allowPreview === true || settingsIn.allowPreview,
        requirePrerequisites: body.requirePrerequisites === "true" || body.requirePrerequisites === true,
        privateAccess: body.privateAccess === "true" || body.privateAccess === true,
        requireSequential: body.requireSequential === "true" || body.requireSequential === true,
        showProgress: body.showProgress === "true" || body.showProgress === true,
        completionMessage: body.completionMessage ?? settingsIn.completionMessage,
        certificate: parseJSON(body.certificate, "certificate") || settingsIn.certificate,
    };

    /** Published courses require content approval before appearing in the public catalog. */
    const isPublished =
        body.status === "published" ||
        body.isPublished === "true" ||
        body.isPublished === true ||
        settingsIn.isPublished === true;
    if (isPublished) {
        const cur = metadata.content_approval_status;
        if (cur !== "approved") {
            metadata.content_approval_status = "pending";
        }
    }

    return metadata;
}

/**
 * Processes a video file by moving it to a temporary directory and then converting it to HLS format.
 *
 * @param {object} file - The video file to process.
 * @param {string} course_id - The ID of the course the video belongs to.
 * @param {string} lesson_id - The ID of the lesson the video belongs to.
 * @returns {Promise<void>}
 */
async function processVideo(file, course_id, lesson_id) {
    const video_path = path.join(TMP_DIR, file.originalname);
    await fsp.writeFile(video_path, file.buffer);
    processVideoToHLS(video_path, course_id, lesson_id);
}

async function ensureDir(p) {
    await fsp.mkdir(p, { recursive: true });
}

function mapIncludedLabCard(lab, course, completionMap) {
    const row = typeof lab.toJSON === "function" ? lab.toJSON() : lab;
    const meta = parseMetadata(row.metadata);
    const labKind = meta.lab_kind || row.labKind || "";
    const isSkillBuilder = labKind === "skill_builder" || row.type === "assessment";
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        shortDescription: row.description || "",
        description: row.description || "",
        thumbnail: row.thumbnail || course.thumbnail || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500",
        isFree: !!row.is_free,
        isLocked: !!row.is_locked,
        price: row.price ? Number(row.price) : 0,
        duration: minsToText(row.time_limit_minutes),
        difficulty: row.difficulty || course.level || "Beginner",
        level: course.level || "Beginner",
        rating: 4.8,
        enrolledCount: 0,
        tasksCount: 0,
        type: isSkillBuilder ? "skill_builder" : "normal",
        lab_kind: labKind || (isSkillBuilder ? "skill_builder" : "hands_on"),
        completed: !!completionMap.get(String(row.id)),
    };
}

function slugify(str = "") {
    return String(str)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function generateVideoThumbnailFile(input_path, out_dir, file_base = "thumb.jpg") {
    return new Promise(async (resolve, reject) => {
        try {
            await ensureDir(out_dir);
            const filename = file_base.endsWith(".jpg") || file_base.endsWith(".png") ? file_base : "thumb.jpg";
            const out_path = path.join(out_dir, filename);
            ffmpeg(input_path)
                .on("end", () => resolve(out_path))
                .on("error", reject)
                .screenshots({
                    count: 1,
                    timemarks: ["00:00:01.000"],
                    filename,
                    folder: out_dir,
                    size: "640x?"
                });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Public OVERVIEW: strip lesson block bodies down to {id, type, title} so the
 * pre-enrollment outline never leaks paid content. Linked-lab entries (which
 * carry no blocks) are kept as-is.
 */
function stripBlocksToOutline(blocks) {
    return (blocks || []).map((b) => ({
        id: b.id,
        type: b.type || "richText",
        title: (b.title && String(b.title).trim()) || b.type || "Task",
    }));
}

/**
 * Owners need explicit edit/create/delete permission; non-owners need the matching
 * `other_user_*` permission. Create permission allows publish/submit on own content.
 */
async function assertCanModify(req, resource, { ownPermission, otherPermission }) {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError("Authentication required", 401);
    const isOwner = resource?.created_by != null && String(resource.created_by) === String(userId);
    const ownPerms = Array.isArray(ownPermission) ? ownPermission : [ownPermission];
    const required = isOwner ? ownPerms : [otherPermission];
    const allowed = await rbacService.checkUserHasPermission(userId, required, "OR");
    if (!allowed) {
        throw new AppError(
            isOwner
                ? "You do not have permission to modify this content."
                : "You can only modify your own content.",
            403
        );
    }
}

function stripCourseModulesToOutline(modules) {
    const stripEntry = (entry) => {
        if (
            entry?._isLinkedLab ||
            entry?.type === "normal_lab" ||
            entry?.type === "skill_builder_lab"
        ) {
            return { ...entry, blocks: [], tasks: [] };
        }
        const outline = stripBlocksToOutline(entry?.blocks || entry?.tasks);
        return { ...entry, blocks: outline, tasks: outline };
    };
    return (modules || []).map((mod) => ({
        ...mod,
        items: Array.isArray(mod.items) ? mod.items.map(stripEntry) : mod.items,
        lessons: Array.isArray(mod.lessons) ? mod.lessons.map(stripEntry) : mod.lessons,
    }));
}

class CourseController {

    // ── CRUD ─────────────────────────────────────

    getDetailPageDataBySlug = async (req, res) => {
        try {
            const slug = req.params.slug;
            const base = await courseService.getBySlug(slug);
            const user_id = resolveRequestUserId(req);
            const course = await courseService.getCourseView(base.id, user_id);

            const labIds = (course.labs || []).map((l) => l.id);
            const completionMap = user_id
                ? await learningService.getLabCompletionMap(user_id, labIds)
                : new Map();

            const includedLabs = (course.labs || []).map((lab) =>
                mapIncludedLabCard(lab, course, completionMap)
            );

            const meta = parseMetadata(course.metadata);
            if (Array.isArray(meta.modules)) {
                meta.modules = await courseService.expandCourseModulesForLearning(meta.modules);
                course.metadata = meta;
            }

            const detail = buildCoursePublicDetail(course, includedLabs);
            return response.success(res, "Course detail data", 200, detail);
        } catch (err) { return fail(res, err); }
    };

    /**
     * GET /api/courses/slug/:slug/overview
     * Public, pre-enrollment course detail with an OUTLINE-only module tree
     * (no lesson block bodies). Mirrors the lab `/overview` endpoint. The full
     * `/view` endpoint is used once the learner is enrolled.
     */
    getOverviewBySlug = async (req, res) => {
        try {
            const slug = req.params.slug;
            const base = await courseService.getBySlug(slug);
            const user_id = resolveRequestUserId(req);
            const course = await courseService.getCourseView(base.id, user_id);

            const labIds = (course.labs || []).map((l) => l.id);
            const completionMap = user_id
                ? await learningService.getLabCompletionMap(user_id, labIds)
                : new Map();

            const includedLabs = (course.labs || []).map((lab) =>
                mapIncludedLabCard(lab, course, completionMap)
            );

            const meta = parseMetadata(course.metadata);
            if (Array.isArray(meta.modules)) {
                meta.modules = await courseService.expandCourseModulesForLearning(meta.modules);
                course.metadata = meta;
            }

            const detail = buildCoursePublicDetail(course, includedLabs);
            // Replace full content with an outline so nothing paid leaks pre-enrollment.
            const outline = stripCourseModulesToOutline(detail.modules);
            detail.modules = outline;
            if (detail.metadata) detail.metadata = { ...detail.metadata, modules: outline };

            return response.success(res, "Course overview", 200, detail);
        } catch (err) { return fail(res, err); }
    };

    getAll = async (req, res) => {
        try {
            const { page = 1, limit = 20, status, level, is_free, approval, search } = req.query;
            const isOwnerList = req.originalUrl.includes("/owner/courses");
            const { Op } = require("sequelize");
            const sequelize = require("../models").sequelize;
            const { applyCourseCatalogFilters, isCatalogBrowseScope } = require("../utils/catalogQuery");
            let where = {};
            const listScope = String(req.query.scope || "").toLowerCase();
            const catalogBrowse = isCatalogBrowseScope(listScope, isOwnerList) && approval !== "pending";

            if (status) {
                where.status = status;
            } else if (catalogBrowse) {
                where.status = "published";
            }

            where = applyCourseCatalogFilters(where, { level, is_free, search });

            if (isOwnerList && approval === "pending") {
                where = {
                    [Op.and]: [
                        where,
                        sequelize.literal(
                            "(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')) = 'pending')"
                        ),
                    ],
                };
            }

            if (isOwnerList && req.user?.user_id) {
                const uid = String(req.user.user_id);

                const appendScope = (scopeClause) => {
                    if (where[Op.and]) {
                        where = { [Op.and]: [...where[Op.and], scopeClause] };
                    } else if (Object.keys(where).length) {
                        where = { [Op.and]: [where, scopeClause] };
                    } else {
                        where = scopeClause;
                    }
                };

                if (listScope === "mine") {
                    appendScope({ created_by: uid });
                } else if (listScope === "others") {
                    appendScope({
                        [Op.and]: [
                            { created_by: { [Op.ne]: uid } },
                            { created_by: { [Op.not]: null } },
                        ],
                    });
                } else {
                    const approveAll = await rbacService.checkUserHasPermission(uid, ["approve_courses"], "OR");
                    if (!approveAll) {
                        appendScope({ created_by: uid });
                    }
                }
            }

            const result = await courseService.getAll({
                page: +page,
                limit: +limit,
                where,
                publicCatalog: catalogBrowse,
                _ownerList: isOwnerList,
            });
            return response.success(res, "Courses fetched", 200, result);
        } catch (err) { return fail(res, err); }
    };

    setContentApproval = async (req, res) => {
        try {
            await validate(req.body, { status: "required|string|in:approved,rejected" });
        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);
        const course = await courseService.getByIdFull(req.params.id);
        if (!course) return response.fail(res, "Course not found", 404);
        const canAll = await rbacService.checkUserHasPermission(userId, ["approve_courses"], "OR");
        const canOwn = await rbacService.checkUserHasPermission(userId, ["approve_own_courses"], "OR");
        if (!canAll && (!canOwn || String(course.created_by) !== String(userId))) {
            return response.fail(res, "Insufficient permissions to approve this course", 403);
        }
        const updated = await courseService.setContentApprovalStatus(
            req.params.id,
            req.body.status,
            userId
        );
        if (req.body.status === "approved" && updated?.created_by) {
            try {
                await notificationService.createNotification({
                    userId: updated.created_by,
                    audience: "user",
                    eventType: "course_approved",
                    title: "Course approved",
                    message: `Your course "${updated.title}" has been approved.`,
                    metadata: { courseId: updated.id },
                });
                await notificationService.createNotification({
                    audience: "user",
                    eventType: "new_course_published",
                    title: "New course available",
                    message: `A new course is now available: ${updated.title}`,
                    metadata: { courseId: updated.id, broadcast_all_users: true, priority: "normal" },
                });
            } catch (_) { }
        }
        return response.success(res, `Course ${req.body.status}`, 200, { course: updated });
    } catch (err) { return fail(res, err); }
};

getById = async (req, res) => {
    try {
        const course = await courseService.getByIdFull(req.params.id);
        if (!req.originalUrl.includes("/owner/")) {
            const meta = parseMetadata(course.metadata);
            if (course.status === "published" && meta.content_approval_status && meta.content_approval_status !== "approved") {
                return response.fail(res, "Course not found", 404);
            }
        }
        return response.success(res, "Course fetched", 200, { course });
    } catch (err) { return fail(res, err); }
};

getBySlug = async (req, res) => {
    try {
        const course = await courseService.getBySlug(req.params.slug);
        if (!req.originalUrl.includes("/owner/")) {
            const meta = parseMetadata(course.metadata);
            if (course.status === "published" && meta.content_approval_status && meta.content_approval_status !== "approved") {
                return response.fail(res, "Course not found", 404);
            }
        }
        return response.success(res, "Course fetched", 200, { course });
    } catch (err) { return fail(res, err); }
};

getCourseView = async (req, res) => {
    try {
        const user_id = resolveRequestUserId(req);
        const course = await courseService.getCourseView(req.params.id, user_id);
        return response.success(res, "Course view fetched", 200, { course });
    } catch (err) { return fail(res, err); }
};

// Shape data for public CourseDetail page (bundle-like)
getDetailPageData = async (req, res) => {
    try {
        const user_id = resolveRequestUserId(req);
        const course = await courseService.getCourseView(req.params.id, user_id);

        const labIds = (course.labs || []).map((l) => l.id);
        const completionMap = user_id
            ? await learningService.getLabCompletionMap(user_id, labIds)
            : new Map();

        const includedLabs = (course.labs || []).map((lab) =>
            mapIncludedLabCard(lab, course, completionMap)
        );

        const meta = parseMetadata(course.metadata);
        if (Array.isArray(meta.modules)) {
            meta.modules = await courseService.expandCourseModulesForLearning(meta.modules);
            course.metadata = meta;
        }

        const detail = buildCoursePublicDetail(course, includedLabs);
        return response.success(res, "Course detail data", 200, detail);
    } catch (err) { return fail(res, err); }
};
create = async (req, res) => {
    try {
        await validate(req.body, {
            title: "required|string|minLength:2|maxLength:255",
            description: "string",
            level: "string|in:beginner,intermediate,advanced",
            price: "numeric|min:0",
            certification_id: "string",
        });

        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);

        const course = await courseService.create({
            ...req.body,
            created_by: userId,
        });
        try {
            await notificationService.createNotification({
                audience: "admin",
                eventType: "course_created",
                title: "Course created",
                message: `New course created: ${course.title}`,
                metadata: { courseId: course.id, createdBy: userId, priority: "high" },
            });
        } catch (_) { }

        return response.success(res, "Course created", 201, { course });
    } catch (err) { return fail(res, err); }
};

bulkCreate = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);

        const items = Array.isArray(req.body) ? req.body : (req.body?.items || req.body?.courses || []);
        if (!items.length) {
            return response.fail(res, "No course data provided in bulk payload", 400);
        }

        const created = [];
        const errors = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                if (!item.title) {
                    errors.push(`Row ${i + 1}: Missing course title`);
                    continue;
                }
                const generatedSlug = item.slug || item.title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-") + "-" + Date.now().toString(36).slice(-4);
                const course = await courseService.create({
                    title: item.title,
                    slug: generatedSlug,
                    description: item.description || "",
                    level: item.level || "beginner",
                    price: Number(item.price) || 0,
                    is_free: Boolean(item.is_free || item.isFree),
                    status: item.status || "published",
                    metadata: buildCourseMetadataFromBody(item),
                    created_by: userId,
                });
                created.push(course);
            } catch (err) {
                errors.push(`Row ${i + 1} (${item.title || "Untitled"}): ${err.message}`);
            }
        }

        return response.success(res, `Bulk created ${created.length} courses`, 201, {
            createdCount: created.length,
            total: items.length,
            courses: created,
            errors,
        });
    } catch (err) {
        return fail(res, err);
    }
};

createFull = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const upload_id = req.headers['x-upload-id'];
        const raw_chunk_idx = req.headers['x-chunk-index'];
        const raw_total = req.headers['x-total-chunks'];
        const header_fn = req.headers['x-filename'];
        const header_lesson = req.headers['x-lesson-id'];
        const is_last = req.headers['x-is-last'] === '1';
        const is_chunked = !!upload_id;

        const chunk_index = Number.isFinite(Number(raw_chunk_idx)) ? parseInt(raw_chunk_idx, 10) : -1;
        const total_chunks = Number.isFinite(Number(raw_total)) ? parseInt(raw_total, 10) : -1;

        const video_file = req.files?.mediaFiles?.[0];
        const thumbnail_file = req.files?.thumbnail?.[0];
        const intro_video_file = req.files?.introVideo?.[0];
        const video_thumbnail_file = req.files?.videoThumbnail?.[0] || req.files?.video_thumbnail?.[0];

        const applyCourseIntroVideo = async (courseId) => {
            if (!intro_video_file?.buffer?.length) return null;
            try {
                const { scheduleCourseIntroUpload } = require("../services/introVideoHls");
                return await scheduleCourseIntroUpload(courseId, intro_video_file, userId);
            } catch (e) {
                console.error("Course intro video schedule failed:", e?.message || e);
                return null;
            }
        };

        // ── 1. Handle Thumbnail (only on first chunk or single upload) ──────────
        let thumbnail_url = null;
        if (thumbnail_file) {
            const mediaStorage = require("../services/mediaStorageService");
            thumbnail_url = await mediaStorage.saveImage(
                thumbnail_file.buffer,
                thumbnail_file.originalname || "thumbnail.webp",
                { folder: "courses/thumbnails" },
            );
        }

        // For video-specific thumbnail, keep it in temp; later moved into processed
        let video_thumb_temp_path = null;
        if (video_thumbnail_file) {
            const ext = path.extname(video_thumbnail_file.originalname) || ".webp";
            const filename = `vthumb_${Date.now()}${ext}`;
            const v_thumb_path = path.join(RAW_DIR, filename);
            await fsp.mkdir(path.dirname(v_thumb_path), { recursive: true });
            await fsp.writeFile(v_thumb_path, video_thumbnail_file.buffer);
            video_thumb_temp_path = v_thumb_path;
        }

        if (is_chunked) {
            if (!video_file) return res.status(400).json({ success: false, message: 'Chunk missing' });

            const chunk_dir = path.join(CHUNKS_DIR, upload_id);
            await fsp.mkdir(chunk_dir, { recursive: true });

            const chunk_filename = `${String(chunk_index).padStart(6, '0')}.part`;
            await fsp.writeFile(path.join(chunk_dir, chunk_filename), video_file.buffer);

            if (chunk_index === 0) {
                const meta = {
                    title: req.body.title || "Untitled Course",
                    slug: req.body.slug,
                    description: req.body.description,
                    level: req.body.level || "beginner",
                    category_id: req.body.category_id || null,
                    media: parseJSON(req.body.media, "media") || [],
                    thumbnail_url,
                    video_thumb_path: video_thumb_temp_path || null
                };
                await fsp.writeFile(path.join(chunk_dir, "meta.json"), JSON.stringify(meta));
            }

            if (!is_last) {
                return res.json({ success: true, chunk_index });
            }

            // === Last chunk arrived: assemble ===
            await fsp.mkdir(RAW_DIR, { recursive: true });
            const filename = header_fn || video_file.originalname || `upload_${Date.now()}.mp4`;
            const ext = path.extname(filename) || '.mp4';
            const lesson_id = header_lesson || `lesson_${Date.now()}`;

            let meta_file = null;
            try {
                const mp = path.join(chunk_dir, "meta.json");
                if (fs.existsSync(mp)) {
                    const raw = await fsp.readFile(mp, "utf-8");
                    meta_file = JSON.parse(raw);
                }
            } catch { }
            const meta_title = meta_file?.title || req.body.title || "Untitled Course";
            const meta_slug = meta_file?.slug || req.body.slug;
            const meta_description = meta_file?.description || req.body.description;
            const meta_level = meta_file?.level || req.body.level || "beginner";
            const media_meta = Array.isArray(meta_file?.media) ? meta_file.media : (parseJSON(req.body.media, "media") || []);
            const effective_thumb = meta_file?.thumbnail_url || thumbnail_url || null;
            let video_thumb_from_meta = meta_file?.video_thumb_path || null;
            if (!Array.isArray(media_meta) || media_meta.length === 0) {
                media_meta.push({ title: "Video", type: "video", order: 0 });
            }
            // Create course
            const course = await courseService.createFull({
                title: meta_title,
                slug: meta_slug,
                description: meta_description,
                level: meta_level,
                category_id: meta_file?.category_id || req.body.category_id || null,
                duration_minutes: durationMinutesFromBody(req.body),
                thumbnail: effective_thumb,
                status: "published",
                metadata: buildCourseMetadataFromBody(req.body),
                media: media_meta.map(m => ({
                    ...m,
                    title: m.title || "Video",
                    lesson_id: lesson_id, // Store lesson_id in CourseMedia
                    thumbnail: video_thumb_from_meta || null
                }))
            }, userId);

            const course_id = course.id;
            try {
                const desired_title = media_meta[0]?.title || "Video";
                const video_item = (course.media || []).find(m =>
                    m.type === 'video' && (desired_title ? m.title === desired_title : true)
                );
                if (video_item) {
                    const play_url = courseStreamUrl(course_id, lesson_id);
                    await courseService.updateMedia(course_id, video_item.id, {
                        url: play_url
                    });
                }
            } catch (e) {
                console.error('Failed to set media URL:', e);
            }
            const out_filename = `${course_id}_${lesson_id}${ext}`;
            const video_path = path.join(RAW_DIR, out_filename);

            const ws = fs.createWriteStream(video_path);
            const all_files = (await fsp.readdir(chunk_dir)).filter(f => f.endsWith('.part')).sort();

            for (const cf of all_files) {
                const chunk_data = await fsp.readFile(path.join(chunk_dir, cf));
                if (!ws.write(chunk_data)) await new Promise(r => ws.once('drain', r));
            }
            ws.end();
            await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject); });

            await fsp.rm(chunk_dir, { recursive: true, force: true });

            try {
                const { ensureProcessedThumb } = require("../services/videoUploadService");
                const thumbLessonId = lesson_id;
                const thumbVideoPath = video_path;
                const thumbFromMeta = video_thumb_from_meta;
                setImmediate(() => {
                    ensureProcessedThumb({
                        courseId: course_id,
                        lessonId: thumbLessonId,
                        videoPath: thumbVideoPath,
                        uploadedThumbPath: thumbFromMeta,
                    })
                        .then(async (t_stream_url) => {
                            const desired_title = media_meta[0]?.title || "Video";
                            const video_item = (await courseService.getByIdFull(course_id)).media.find((m) =>
                                m.type === "video" && (desired_title ? m.title === desired_title : true)
                            );
                            if (video_item) {
                                await courseService.updateMedia(course_id, video_item.id, {
                                    thumbnail: t_stream_url,
                                });
                            }
                        })
                        .catch((e) => console.error("Chunked thumb generation failed:", e?.message || e));
                });
            } catch { }

            const { processVideoToHLS } = require("../services/videoProcessor");
            processVideoToHLS(video_path, "courses", course_id, lesson_id)
                .catch(err => console.error('FFmpeg failed:', err));

            await applyCourseIntroVideo(course_id);

            return res.status(201).json({
                success: true,
                course_id,
                slug: course.slug,
                lesson_id,
                thumbnail: effective_thumb,
                media: [{ lesson_id, type: 'video', status: 'processing' }],
            });
        }

        // ---- Non-chunked multiple uploads (process all videos) ----
        const media_files_arr = req.files?.mediaFiles || [];
        if (media_files_arr.length > 0) {
            const allowPreview = req.body.allowPreview === "true" || req.body.allowPreview === true;
            let media_meta = parseJSON(req.body.media, "media") || [];
            if (!media_meta.length) {
                media_meta = [{ title: "Video 1", type: "video", order: 0, is_preview: allowPreview }];
            } else {
                media_meta = media_meta.map((m, i) => ({
                    ...m,
                    is_preview: m.is_preview ?? m.isPreview ?? (allowPreview && i === 0),
                }));
            }
            const course = await courseService.createFull({
                title: req.body.title || "Untitled Course",
                slug: req.body.slug,
                description: req.body.description,
                level: req.body.level || "beginner",
                status: req.body.status || "published",
                category_id: req.body.category_id || null,
                duration_minutes: durationMinutesFromBody(req.body),
                price: parseFloat(req.body.price || "0"),
                is_free: req.body.is_free === "true" || req.body.isFree === "true",
                certification_id: req.body.certification_id || null,
                tags: parseJSON(req.body.tags, "tags") || [],
                metadata: buildCourseMetadataFromBody(req.body),
                header: parseJSON(req.body.header, "header"),
                footer: parseJSON(req.body.footer, "footer"),
                thumbnail: thumbnail_url,
                media: media_meta.map((m, i) => ({
                    ...m,
                    title: m.title || `Video ${i + 1}`,
                    thumbnail: null,
                }))
            }, userId);

            const course_id = course.id;
            // Delegate processing of all uploaded videos to a single service
            try {
                const { handleCourseMediaUploads } = require("../services/videoUploadService");
                await handleCourseMediaUploads({
                    req,
                    courseId: course_id,
                    mediaMeta: media_meta,
                    uploadedThumbUrl: video_thumb_temp_path || null
                });
            } catch (e) {
                console.error("Video upload processing skipped (ffmpeg unavailable?):", e?.message || e);
            }

            await applyCourseIntroVideo(course_id);

            // Respond with first lesson id for convenience
            const first_lesson = (media_meta[0]?.title
                ? `${slugify(media_meta[0].title)}_${Date.now()}_0`
                : `lesson_${Date.now()}_0`);
            return res.status(201).json({
                success: true,
                course_id,
                slug: course.slug,
                lesson_id: first_lesson,
                thumbnail: thumbnail_url,
                media: [{ lesson_id: first_lesson, type: 'video', status: 'processing' }],
            });
        }

        // ---- No video: lab bundle / curriculum-only (thumbnail + metadata still allowed) ----
        const title = req.body?.title != null ? String(req.body.title).trim() : "";
        if (title) {
            const course = await courseService.createFull({
                title,
                slug: req.body.slug,
                description: req.body.description,
                level: req.body.level || "beginner",
                status: req.body.status || "published",
                category_id: req.body.category_id || null,
                duration_minutes: durationMinutesFromBody(req.body),
                price: parseFloat(req.body.price || "0"),
                is_free: req.body.is_free === "true" || req.body.isFree === "true",
                certification_id: req.body.certification_id || null,
                tags: parseJSON(req.body.tags, "tags") || [],
                metadata: buildCourseMetadataFromBody(req.body),
                header: parseJSON(req.body.header, "header"),
                footer: parseJSON(req.body.footer, "footer"),
                thumbnail: thumbnail_url,
                media: [],
            }, userId);
            const introUrl = await applyCourseIntroVideo(course.id);
            return res.status(201).json({
                success: true,
                course_id: course.id,
                slug: course.slug,
                thumbnail: thumbnail_url,
                intro_video_url: introUrl || buildCourseMetadataFromBody(req.body).intro_video_url || null,
                media: [],
            });
        }

        return res.status(400).json({
            success: false,
            message: "Course title is required.",
        });

    } catch (err) {
        console.error('createFull error:', err);
        const status = Number(err.statusCode) >= 400 && Number(err.statusCode) < 600 ? err.statusCode : 500;
        return res.status(status).json({ success: false, message: err.message || 'Create failed' });
    }
};

updateFull = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const courseId = req.params.id;
        const existing = await courseService.getByIdFull(courseId);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }
        await assertCanModify(req, existing, {
            ownPermission: ["edit_courses", "create_courses"],
            otherPermission: "other_user_edit_courses",
        });

        const thumbnail_file = req.files?.thumbnail?.[0];
        const intro_video_file = req.files?.introVideo?.[0];
        const mediaStorage = require("../services/mediaStorageService");

        let thumbnail_url = existing.thumbnail;
        if (thumbnail_file?.buffer?.length) {
            thumbnail_url = await mediaStorage.saveImage(
                thumbnail_file.buffer,
                thumbnail_file.originalname || "thumbnail.webp",
                {
                    folder: "courses/thumbnails",
                    outName: `course_${courseId}_${Date.now()}.webp`,
                    replaceUrl: existing.thumbnail,
                },
            );
        }

        const existingMeta = parseMetadata(existing.metadata);
        const mergedMetadata = buildCourseMetadataFromBody(req.body);
        const metadata = { ...existingMeta, ...mergedMetadata };

        const exMeta = parseMetadata(existing.metadata);
        if (
            existing.status === "published" &&
            exMeta.content_approval_status == null &&
            metadata.content_approval_status === "pending"
        ) {
            metadata.content_approval_status = "approved";
        }

        if (intro_video_file?.buffer?.length) {
            delete metadata.intro_video_url;
            delete metadata.introVideoUrl;
        }

        const priceRaw = req.body.price;
        const isFreeRaw = req.body.is_free ?? req.body.isFree;

        await courseService.update(courseId, {
            title: req.body.title ?? existing.title,
            description: req.body.description ?? existing.description,
            level: req.body.level ?? existing.level,
            status: req.body.status ?? existing.status,
            category_id: req.body.category_id ?? existing.category_id,
            duration_minutes: durationMinutesFromBody(req.body) || existing.duration_minutes,
            price: priceRaw !== undefined ? parseFloat(priceRaw) : existing.price,
            is_free:
                isFreeRaw === "true" || isFreeRaw === true
                    ? true
                    : isFreeRaw === "false" || isFreeRaw === false
                        ? false
                        : existing.is_free,
            certification_id: req.body.certification_id ?? existing.certification_id,
            thumbnail: thumbnail_url,
            metadata,
            updated_by: userId,
        });

        if (intro_video_file?.buffer?.length) {
            const { scheduleCourseIntroUpload } = require("../services/introVideoHls");
            const oldIntro = existingMeta.intro_video_url || existingMeta.introVideoUrl || null;
            await scheduleCourseIntroUpload(courseId, intro_video_file, userId, oldIntro);
        }

        const course = await courseService.getByIdFull(courseId);
        return response.success(res, "Course updated", 200, {
            course,
            course_id: course.id,
            thumbnail: thumbnail_url,
        });
    } catch (err) {
        console.error("updateFull error:", err);
        const status = Number(err.statusCode) >= 400 && Number(err.statusCode) < 600 ? err.statusCode : 500;
        return res.status(status).json({ success: false, message: err.message || "Update failed" });
    }
};


update = async (req, res) => {
    try {
        await validate(req.body, {
            title: "string|minLength:2|maxLength:255",
            status: "string|in:draft,published,archived",
            level: "string|in:beginner,intermediate,advanced",
            price: "numeric|min:0",
        });

        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);

        const existing = await courseService.getByIdFull(req.params.id);
        await assertCanModify(req, existing, {
            ownPermission: ["edit_courses", "create_courses"],
            otherPermission: "other_user_edit_courses",
        });
        const existingMeta = parseMetadata(existing.metadata);
        const incomingMeta =
            req.body.metadata != null && typeof req.body.metadata === "object" && !Array.isArray(req.body.metadata)
                ? req.body.metadata
                : {};
        const combined = {
            ...req.body,
            metadata: { ...existingMeta, ...incomingMeta },
        };
        const mergedMetadata = buildCourseMetadataFromBody(combined);
        const exMeta = parseMetadata(existing.metadata);
        if (
            existing.status === "published" &&
            exMeta.content_approval_status == null &&
            mergedMetadata.content_approval_status === "pending"
        ) {
            mergedMetadata.content_approval_status = "approved";
        }
        const { metadata: _dropMeta, ...restBody } = req.body;

        const course = await courseService.update(req.params.id, {
            ...restBody,
            metadata: mergedMetadata,
            updated_by: userId,
        });
        try {
            await notificationService.createNotification({
                audience: "admin",
                eventType: "course_updated",
                title: "Course updated",
                message: `Course updated: ${course.title}`,
                metadata: { courseId: course.id, updatedBy: userId, priority: "high" },
            });
        } catch (_) { }

        return response.success(res, "Course updated", 200, { course });
    } catch (err) { return fail(res, err); }
};

deleteCourse = async (req, res) => {
    try {
        const existing = await courseService.getByIdFull(req.params.id);
        await assertCanModify(req, existing, {
            ownPermission: "delete_courses",
            otherPermission: "other_user_delete_courses",
        });
        await courseService.delete(req.params.id);
        try {
            await notificationService.createNotification({
                audience: "admin",
                eventType: "course_deleted",
                title: "Course deleted",
                message: `Course deleted: ${existing?.title || req.params.id}`,
                metadata: { courseId: req.params.id, priority: "high" },
            });
        } catch (_) { }
        return response.success(res, "Course deleted", 200);
    } catch (err) { return fail(res, err); }
};

publish = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);
        const course = await courseService.publish(req.params.id, userId);
        return response.success(res, "Course published", 200, { course });
    } catch (err) { return fail(res, err); }
};

archive = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);
        const course = await courseService.archive(req.params.id, userId);
        return response.success(res, "Course archived", 200, { course });
    } catch (err) { return fail(res, err); }
};

setContentApproval = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return response.fail(res, "Authentication required", 401);
        const { status, rejection_reason, rejectionReason } = req.body;
        const reason = rejection_reason || rejectionReason || null;
        const course = await courseService.setContentApprovalStatus(req.params.id, status, userId, reason);
        return response.success(res, `Course ${status}`, 200, { course });
    } catch (err) { return fail(res, err); }
};

// ── Header / Footer ─────────────────────────

updateHeader = async (req, res) => {
    try {
        await validate(req.body, {
            enabled: "boolean",
            content: "string",
            bg_color: "string|maxLength:20",
            text_color: "string|maxLength:20",
        });

        const course = await courseService.updateHeader(req.params.id, req.body, req.user.user_id);
        return response.success(res, "Header updated", 200, { course });
    } catch (err) { return fail(res, err); }
};

updateFooter = async (req, res) => {
    try {
        await validate(req.body, {
            enabled: "boolean",
            content: "string",
            bg_color: "string|maxLength:20",
            text_color: "string|maxLength:20",
        });

        const course = await courseService.updateFooter(req.params.id, req.body, req.user.user_id);
        return response.success(res, "Footer updated", 200, { course });
    } catch (err) { return fail(res, err); }
};

// ── Certification ───────────────────────────

assignCertification = async (req, res) => {
    try {
        const certId = req.body.certification_id || req.body.certificationId;
        await validate({ certification_id: certId }, { certification_id: "required|string" });
        const course = await courseService.assignCertification(
            req.params.id, certId, req.user.user_id
        );
        return response.success(res, "Certification assigned", 200, { course });
    } catch (err) { return fail(res, err); }
};

removeCertification = async (req, res) => {
    try {
        const course = await courseService.removeCertification(req.params.id, req.user.user_id);
        return response.success(res, "Certification removed", 200, { course });
    } catch (err) { return fail(res, err); }
};

// ── Media ───────────────────────────────────

addMedia = async (req, res) => {
    try {
        await validate(req.body, {
            type: "required|string|in:video,document,image,audio,link",
            title: "required|string|maxLength:255",
            url: "required|string",
        });

        const media = await courseService.addMedia(req.params.id, {
            ...req.body,
            created_by: req.user.user_id,
        });

        return response.success(res, "Media added", 201, { media });
    } catch (err) { return fail(res, err); }
};

updateMedia = async (req, res) => {
    try {
        const media = await courseService.updateMedia(
            req.params.id, req.params.media_id, req.body
        );
        return response.success(res, "Media updated", 200, { media });
    } catch (err) { return fail(res, err); }
};

deleteMedia = async (req, res) => {
    try {
        await courseService.deleteMedia(req.params.id, req.params.media_id);
        return response.success(res, "Media deleted", 200);
    } catch (err) { return fail(res, err); }
};

// ── Questions ───────────────────────────────

addQuestion = async (req, res) => {
    try {
        await validate(req.body, {
            question: "required|string",
            type: "required|string|in:mcq,true_false,short_answer,essay",
            marks: "integer|min:1",
        });

        const question = await courseService.addQuestion(req.params.id, {
            ...req.body,
            created_by: req.user.user_id,
        });

        return response.success(res, "Question added", 201, { question });
    } catch (err) { return fail(res, err); }
};

addQuestionsBulk = async (req, res) => {
    try {
        await validate(req.body, { questions: "required|array" });

        const questions = await courseService.addQuestionsBulk(
            req.params.id,
            req.body.questions.map(q => ({ ...q, created_by: req.user.user_id }))
        );

        return response.success(res, "Questions added", 201, { questions });
    } catch (err) { return fail(res, err); }
};

updateQuestion = async (req, res) => {
    try {
        const question = await courseService.updateQuestion(
            req.params.id, req.params.question_id, req.body
        );
        return response.success(res, "Question updated", 200, { question });
    } catch (err) { return fail(res, err); }
};

deleteQuestion = async (req, res) => {
    try {
        await courseService.deleteQuestion(req.params.id, req.params.question_id);
        return response.success(res, "Question deleted", 200);
    } catch (err) { return fail(res, err); }
};
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Normalize question type from frontend naming to DB enum
 * Frontend sends: "single" | "multiple" | "true_false" | "short_answer" | "essay"
 * DB stores:      "mcq"    | "mcq"      | "true_false" | "short_answer" | "essay"
 */
function normalizeQuestionType(type = "") {
    const map = {
        single: "mcq",
        multiple: "mcq",
        mcq: "mcq",
        true_false: "true_false",
        short_answer: "short_answer",
        essay: "essay",
    };
    return map[type.toLowerCase()] || "mcq";
}

/**
 * Resolve correctAnswer string from options array
 * MCQ:        first option with isCorrect = true → its text
 * True/False: "true" or "false"
 */
function resolveCorrectAnswer(q) {
    if (q.correct_answer) return q.correct_answer;
    if (!Array.isArray(q.options)) return null;

    const correct = q.options.filter(o => toBool(o.is_correct));
    if (!correct.length) return null;

    // For multiple-choice store comma-separated correct texts
    return correct.map(o => o.text).join(",");
}

function toBool(val) {
    if (val === "true" || val === "1" || val === true) return true;
    if (val === "false" || val === "0" || val === false) return false;
    return null;
}

module.exports = new CourseController();
