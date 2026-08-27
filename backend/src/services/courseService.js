const BaseService = require("./baseService");
const courseRepository = require("../repositories/courseRepository");
const certificationRepository = require("../repositories/certificationRepository");
const { AppError } = require("../middleware/errorHandler");
const { Op } = require("sequelize");
const { sequelize, Lab, Category, User } = require("../models");
const logger = require("../lib/logger");
const { parseMetadata, minsToText } = require("../utils/coursePublicDetail");
const { randomUUID } = require("crypto");

function enrichCourseListRow(course) {
    const meta = parseMetadata(course.metadata);
    const modules = Array.isArray(meta.modules) ? meta.modules : [];
    const labs = Array.isArray(meta.labs) ? meta.labs : [];
    const tech = Array.isArray(meta.tech_stack)
        ? meta.tech_stack
        : (Array.isArray(meta.techStack) ? meta.techStack : []);
    const author_name =
        course.creator?.full_name ||
        course.creator?.email ||
        meta.instructor_name ||
        meta.author_name ||
        null;
    const category_name = course.category?.name || meta.category || null;
    const ratingRaw = meta.rating ?? course.rating;
    const rating =
        ratingRaw != null && ratingRaw !== "" && Number.isFinite(Number(ratingRaw))
            ? Number(ratingRaw)
            : null;
    const adminStudents = meta.studentCount ?? meta.student_count;
    const enrolled_count =
        adminStudents != null && adminStudents !== "" && Number.isFinite(Number(adminStudents))
            ? Number(adminStudents)
            : (course.enrolled_count ?? course.enrolledCount ?? 0);
    return {
        ...course,
        modules_count: modules.length,
        labs_count: labs.length,
        duration: minsToText(course.duration_minutes),
        tech_stack: tech,
        platform: meta.platform || course.platform || null,
        rating,
        enrolled_count,
        content_approval_status: meta.content_approval_status ?? null,
        author_name,
        category_name,
    };
}

function slugify(str = "") {
    return str.toLowerCase().trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Avoid duplicate courses.slug (same strategy as labs). */
async function ensureUniqueCourseSlug(desired, excludeCourseId = null) {
    let base = slugify(desired || "") || "course";
    if (base.length > 200) base = base.slice(0, 200);
    for (let attempt = 0; attempt < 25; attempt++) {
        const candidate =
            attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`;
        const trimmed = candidate.length > 255 ? candidate.slice(0, 255) : candidate;
        const existing = await courseRepository.findBySlug(trimmed);
        if (!existing || (excludeCourseId && existing.id === excludeCourseId)) return trimmed;
    }
    throw new AppError("Could not generate a unique course URL slug.", 400);
}

/** Next sequential human-friendly course code, e.g. COURSE-001 → COURSE-002. */
async function nextCourseCode() {
    try {
        const [rows] = await sequelize.query(
            "SELECT course_code FROM courses WHERE course_code REGEXP '^COURSE-[0-9]+$'"
        );
        const max = rows.reduce((m, r) => {
            const n = parseInt(String(r.course_code).replace("COURSE-", ""), 10);
            return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        return `COURSE-${String(max + 1).padStart(3, "0")}`;
    } catch {
        return `COURSE-${randomUUID().slice(0, 6).toUpperCase()}`;
    }
}

class CourseService extends BaseService {
    constructor() {
        super(courseRepository, "Course");
    }

    // ── Hooks ─────────────────────────────────────────────────────────────────

    async beforeCreate(data) {
        const rawSlug = (data.slug && String(data.slug).trim()) || slugify(data.title);
        data.slug = await ensureUniqueCourseSlug(rawSlug);

        if (data.price !== undefined) {
            data.is_free = parseFloat(data.price) === 0;
        }

        if (data.metadata != null && typeof data.metadata === "string") {
            try {
                data.metadata = JSON.parse(data.metadata);
            } catch {
                data.metadata = {};
            }
        }
        if (data.tags != null && typeof data.tags === "string") {
            try {
                const t = JSON.parse(data.tags);
                data.tags = Array.isArray(t) ? t : [];
            } catch {
                data.tags = [];
            }
        }

        if (data.metadata != null && typeof data.metadata === "object") {
            try {
                data.metadata = JSON.parse(JSON.stringify(data.metadata));
            } catch {
                data.metadata = {};
            }
        }

        if (data.metadata != null && typeof data.metadata === "object") {
            const hasCode =
                data.metadata.code != null && String(data.metadata.code).trim() !== "";
            if (!hasCode) {
                data.metadata = { ...data.metadata, code: data.slug };
            }
        }

        // Validate certification_id if provided
        if (data.certification_id) {
            const cert = await certificationRepository.findById(data.certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);
        }
        if (!data.course_code) data.course_code = await nextCourseCode();
        data.version = 1;
        data.last_revised_at = new Date();
        return data;
    }

    async beforeUpdate(id, data) {
        // The original creator must never change on an edit, even if a payload
        // tries to set it. Ownership is keyed on created_by.
        delete data.created_by;
        if (data.price !== undefined) {
            data.is_free = parseFloat(data.price) === 0;
        }
        if (data.metadata != null && typeof data.metadata === "string") {
            try {
                data.metadata = JSON.parse(data.metadata);
            } catch {
                data.metadata = {};
            }
        }
        if (data.tags != null && typeof data.tags === "string") {
            try {
                const t = JSON.parse(data.tags);
                data.tags = Array.isArray(t) ? t : [];
            } catch {
                data.tags = [];
            }
        }
        if (data.metadata != null && typeof data.metadata === "object") {
            try {
                data.metadata = JSON.parse(JSON.stringify(data.metadata));
            } catch { /* keep */ }
        }
        // Validate certification_id if being changed
        if (data.certification_id) {
            const cert = await certificationRepository.findById(data.certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);
        }
        // Bump version + stamp revision date on every content save (admin-only fields).
        try {
            const current = await this.repo.findById(id);
            data.version = (Number(current?.version) || 1) + 1;
        } catch {
            /* leave version as-is if lookup fails */
        }
        data.last_revised_at = new Date();
        return data;
    }

    async afterDelete(existing) {
        await this.repo.invalidateCache(existing.id, existing.slug);
        const favoriteService = require("./favoriteService");
        await favoriteService.purgeByTarget("course", existing.id);
    }

    // ── Course queries ─────────────────────────────────────────────────────────

    async getByIdFull(id) {
        try {
            const course = await this.repo.findByIdFull(id);
            if (!course) throw new AppError("Course not found", 404);
            return course;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch course", 500);
        }
    }

    async getBySlug(slug) {
        const course = await this.repo.findBySlug(slug);
        if (!course) throw new AppError("Course not found", 404);
        return course;
    }

    /**
     * Labs attached via FK (course_id) are loaded by Sequelize.
     * Featured / bundle labs are also listed in metadata.labs (UUIDs) — resolve and merge so
     * standalone labs picked in the admin form still appear under "Labs in this bundle".
     */
    async mergeBundledLabsFromMetadata(course, is_enrolled) {
        const meta = parseMetadata(course.metadata);
        const linkedIds = new Set(
            Array.isArray(meta.labs)
                ? meta.labs.map((x) => String(x).trim()).filter(Boolean)
                : []
        );
        if (Array.isArray(meta.modules)) {
            for (const mod of meta.modules) {
                for (const item of mod.items || []) {
                    if (item.type !== "skill_builder_lab" && item.type !== "normal_lab") continue;
                    if (item.reference_id) {
                        linkedIds.add(String(item.reference_id));
                        continue;
                    }
                    if (item.title) {
                        const lab = await Lab.findOne({
                            where: { title: item.title, status: "published" },
                            attributes: ["id"],
                        });
                        if (lab) linkedIds.add(String(lab.id));
                    }
                }
            }
        }
        const existing = Array.isArray(course.labs) ? course.labs : [];
        if (!linkedIds.size) return;

        const byId = new Map(existing.map((l) => [String(l.id), l]));
        const is_free = !!course.is_free;
        const seen = new Set();
        const merged = [];

        const mapFetched = (j) => ({
            id: j.id,
            title: j.title,
            slug: j.slug,
            description: j.description,
            thumbnail: j.thumbnail,
            difficulty: j.difficulty,
            type: j.type,
            sort_order: j.sort_order,
            time_limit_minutes: j.time_limit_minutes,
            is_free: j.is_free,
            is_locked: !is_free && !is_enrolled && !j.is_free,
        });

        for (const lid of linkedIds) {
            if (seen.has(lid)) continue;
            let row = byId.get(lid);
            if (!row) {
                const lab = await Lab.findByPk(lid, {
                    attributes: [
                        "id", "title", "slug", "description", "difficulty", "type",
                        "sort_order", "is_free", "price", "time_limit_minutes", "status", "thumbnail",
                    ],
                });
                if (!lab || lab.status !== "published") continue;
                row = mapFetched(lab.toJSON());
            }
            merged.push(row);
            seen.add(lid);
        }
        for (const l of existing) {
            if (!seen.has(String(l.id))) merged.push(l);
        }
        course.labs = merged;
    }

    /**
     * Public course view — respects paid/free and enrolled status.
     * Returns header, footer, labs (with lock status), media.
     */
    async getCourseView(id, user_id = null) {
        try {
            const { Enrollment } = require("../models");
            const { Op } = require("sequelize");
            const uid =
                user_id && typeof user_id === "object"
                    ? (user_id.user_id ?? user_id.id ?? null)
                    : user_id;
            const normalizedUid =
                uid != null && uid !== "" && String(uid) !== "undefined" ? String(uid) : null;
            let is_enrolled = false;
            let enrollment_progress = 0;

            if (normalizedUid) {
                const enrollment = await Enrollment.findOne({
                    where: {
                        user_id: normalizedUid,
                        course_id: id,
                        status: { [Op.in]: ["active", "completed"] },
                    },
                    attributes: ["progress", "status"],
                });
                is_enrolled = !!enrollment;
                enrollment_progress = enrollment?.progress ?? 0;
            }

            const course = await this.repo.findByIdPublic(id, is_enrolled);
            if (!course) throw new AppError("Course not found", 404);
            const rbacService = require("./rbac/roleService");
            const is_owner =
                normalizedUid &&
                course.created_by != null &&
                String(course.created_by) === String(normalizedUid);
            const is_global_course_approver =
                normalizedUid &&
                (await rbacService.checkUserHasPermission(normalizedUid, ["approve_courses"], "OR"));

            if (course.status !== "published" && !is_owner && !is_global_course_approver) {
                throw new AppError("Course not found", 404);
            }

            const meta = parseMetadata(course.metadata);
            const approval = meta.content_approval_status;
            const approvedForPublic = !approval || approval === "approved";
            if (course.status === "published" && !approvedForPublic && !is_owner && !is_global_course_approver) {
                throw new AppError("Course not found", 404);
            }

            await this.mergeBundledLabsFromMetadata(course, is_enrolled);

            const enrolled_count = await Enrollment.count({
                where: { course_id: id, status: "active" },
            });
            course._enrollment_count = enrolled_count;
            course._enrollment_progress = enrollment_progress;

            return course;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch course", 500);
        }
    }

    /**
     * Keep course module order intact. Linked labs stay as items inside the module
     * where the creator placed them (do not splice lab modules onto the course root).
     */
    async expandCourseModulesForLearning(modules = []) {
        if (!Array.isArray(modules) || !modules.length) return modules || [];

        const expanded = [];

        for (const mod of modules) {
            const entries = Array.isArray(mod.items) && mod.items.length
                ? mod.items
                : (mod.lessons || []);
            const lessons = [];

            for (const entry of entries) {
                if (entry.type === "skill_builder_lab" || entry.type === "normal_lab") {
                    let refId = entry.reference_id;
                    if (!refId && entry.title) {
                        const byTitle = await Lab.findOne({
                            where: { title: entry.title, status: "published" },
                            attributes: ["id", "title", "slug", "status", "type", "metadata"],
                        });
                        if (byTitle) refId = byTitle.id;
                    }
                    if (refId) {
                        const lab = await Lab.findByPk(refId, {
                            attributes: ["id", "title", "slug", "status", "type", "metadata"],
                        });
                        if (lab && lab.status === "published") {
                            const row = typeof lab.toJSON === "function" ? lab.toJSON() : lab;
                            const labMeta = parseMetadata(row.metadata);
                            const labKind =
                                labMeta.lab_kind
                                || (row.type === "assessment" ? "skill_builder" : "hands_on")
                                || (entry.type === "skill_builder_lab" ? "skill_builder" : "hands_on");
                            lessons.push({
                                id: entry.id || `lab_${refId}`,
                                type: entry.type,
                                title: entry.title || row.title,
                                reference_id: refId,
                                lab_id: refId,
                                lab_slug: row.slug,
                                lab_kind: labKind,
                                duration: entry.duration,
                                difficulty: entry.difficulty,
                                blocks: [],
                                tasks: [],
                                _isLinkedLab: true,
                            });
                            continue;
                        }
                    }
                }

                lessons.push({
                    ...entry,
                    type: entry.type || "lesson",
                    blocks: entry.blocks || entry.tasks || [],
                    tasks: entry.blocks || entry.tasks || [],
                });
            }

            expanded.push({
                ...mod,
                items: lessons,
                lessons,
            });
        }

        return expanded.length ? expanded : modules;
    }

    async publish(id, user_id) {
        const course = await this.getById(id);
        if (course.status === "published") throw new AppError("Course is already published", 400);
        const meta = parseMetadata(course.metadata);
        if (meta.content_approval_status !== "approved") {
            meta.content_approval_status = "pending";
        }
        return this.update(id, { status: "published", metadata: meta, updated_by: user_id });
    }

    async setContentApprovalStatus(id, status, user_id) {
        if (!["approved", "rejected"].includes(status)) {
            throw new AppError("status must be approved or rejected", 400);
        }
        const course = await this.getByIdFull(id);
        const meta = parseMetadata(course.metadata);
        meta.content_approval_status = status;
        return this.update(id, { metadata: meta, updated_by: user_id });
    }

    async getAll(options = {}) {
        try {
            const { publicCatalog, ...findOpts } = options;
            let where = findOpts.where || {};
            if (publicCatalog) {
                where = {
                    [Op.and]: [
                        where,
                        sequelize.literal(`(
                            COALESCE(
                                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')), ''),
                                'approved'
                            ) = 'approved'
                        )`),
                    ],
                };
            }
            const listInclude = [
                {
                    model: Category,
                    as: "category",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: User,
                    as: "creator",
                    attributes: ["user_id", "full_name", "email"],
                    required: false,
                },
            ];
            const result = await this.repo.findAll({
                ...findOpts,
                where,
                include: listInclude,
                skipCache: findOpts._ownerList === true || findOpts.skipCache === true,
            });
            if (result.rows) {
                result.rows = result.rows.map(enrichCourseListRow);
            }
            return result;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error("[CourseService] getAll:", err);
            throw new AppError("Failed to fetch Course list", 500);
        }
    }

    async archive(id, user_id) {
        return this.update(id, { status: "archived", updated_by: user_id });
    }

    // ── Header / Footer ───────────────────────────────────────────────────────

    async updateHeader(id, header_data, user_id) {
        try {
            await this.getById(id);
            return await this.repo.update(id, {
                header_enabled: header_data.enabled ?? true,
                header_content: header_data.content ?? null,
                header_bg_color: header_data.bg_color ?? null,
                header_text_color: header_data.text_color ?? null,
                updated_by: user_id,
            });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update course header", 500);
        }
    }

    async updateFooter(id, footer_data, user_id) {
        try {
            await this.getById(id);
            return await this.repo.update(id, {
                footer_enabled: footer_data.enabled ?? true,
                footer_content: footer_data.content ?? null,
                footer_bg_color: footer_data.bg_color ?? null,
                footer_text_color: footer_data.text_color ?? null,
                updated_by: user_id,
            });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update course footer", 500);
        }
    }

    // ── Assign certification to course ────────────────────────────────────────

    async assignCertification(course_id, certification_id, user_id) {
        try {
            await this.getById(course_id);
            const cert = await certificationRepository.findById(certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);

            const updated = await this.repo.update(course_id, {
                certification_id: certification_id,
                updated_by: user_id,
            });

            logger.info(`[CourseService] Cert ${certification_id} assigned to course ${course_id}`);
            return updated;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to assign certification", 500);
        }
    }

    async removeCertification(course_id, user_id) {
        try {
            await this.getById(course_id);
            return await this.repo.update(course_id, {
                certification_id: null,
                updated_by: user_id,
            });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to remove certification", 500);
        }
    }

    // ── Single composite create (frontend sends everything at once) ───────────

    async createFull(data, user_id) {
        const t = await sequelize.transaction();
        try {
            const {
                questions = [],
                media = [],
                certification_id,
                header,
                footer,
                ...course_data
            } = data;

            if (header && typeof header === "object" && Object.keys(header).length) {
                const meta = course_data.metadata && typeof course_data.metadata === "object"
                    ? { ...course_data.metadata }
                    : {};
                meta.hero_header = { ...(meta.hero_header || {}), ...header };
                course_data.metadata = meta;
            }

            // 1. Create the course
            const course = await this.create(
                {
                    ...course_data,
                    certification_id: certification_id || null,
                    header_enabled: header?.enabled ?? false,
                    header_content: header?.content ?? null,
                    header_bg_color: header?.bg_color ?? header?.bgColor ?? null,
                    header_text_color: header?.text_color ?? header?.textColor ?? null,
                    footer_enabled: footer?.enabled ?? false,
                    footer_content: footer?.content ?? null,
                    footer_bg_color: footer?.bg_color ?? footer?.bgColor ?? null,
                    footer_text_color: footer?.text_color ?? footer?.textColor ?? null,
                    created_by: user_id,
                },
                { transaction: t }
            );

            // Link skill-builder labs referenced in curriculum (stored in metadata — not new Lab rows)
            const metadata = course_data.metadata && typeof course_data.metadata === "object"
                ? course_data.metadata
                : (typeof course_data.metadata === "string"
                    ? (() => { try { return JSON.parse(course_data.metadata); } catch { return {}; } })()
                    : {});

            if (metadata && Array.isArray(metadata.modules)) {
                const linkedIds = new Set(
                    Array.isArray(metadata.labs) ? metadata.labs.map(String) : []
                );
                for (const mod of metadata.modules) {
                    if (!Array.isArray(mod.items)) continue;
                    for (const item of mod.items) {
                        if (
                            (item.type === "skill_builder_lab" || item.type === "normal_lab")
                            && item.reference_id
                        ) {
                            linkedIds.add(String(item.reference_id));
                        }
                    }
                }
                if (linkedIds.size) {
                    metadata.labs = [...linkedIds];
                    await this.repo.update(
                        course.id,
                        { metadata },
                        { transaction: t }
                    );
                    course.metadata = metadata;
                }
            }

            // 2. Bulk create media
            if (media.length) {
                const normalized = media.map((m, i) => ({
                    title: m.title || `Media ${i + 1}`,
                    type: m.type || "video",
                    url: typeof m.url === "string" ? m.url : "",
                    lesson_id: m.lesson_id ?? m.lessonId ?? null,
                    thumbnail: m.thumbnail ?? null,
                    size: m.size ?? null,
                    duration: m.duration ?? null,
                    mime_type: m.mime_type ?? m.mimeType ?? null,
                    sort_order: Number.isFinite(m.sort_order) ? m.sort_order
                        : Number.isFinite(m.order) ? m.order : i,
                    is_preview: !!(m.is_preview ?? m.isPreview ?? false),
                }));
                await this.repo.bulkAddMedia(course.id, normalized, { transaction: t });
            }

            // 3. Bulk create questions
            if (questions.length) {
                await this.repo.bulkAddQuestions(
                    course.id,
                    questions.map((q, i) => ({ ...q, created_by: user_id, sort_order: i })),
                    { transaction: t }
                );
            }

            await t.commit();

            // Return full course
            return this.repo.findByIdFull(course.id);
        } catch (err) {
            await t.rollback();
            if (err instanceof AppError) throw err;
            logger.error("[CourseService] createFull:", err);
            throw new AppError("Failed to create course", 500);
        }
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    async addMedia(course_id, media_data) {
        try {
            await this.getById(course_id);
            const [record] = await this.repo.bulkAddMedia(course_id, [media_data]);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to add media", 500);
        }
    }

    async updateMedia(course_id, media_id, data) {
        try {
            await this.getById(course_id);
            const media = await this.repo.updateMedia(media_id, data);
            if (!media) throw new AppError("Media not found", 404);
            return media;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update media", 500);
        }
    }

    async deleteMedia(course_id, media_id) {
        try {
            await this.getById(course_id);
            const ok = await this.repo.deleteMedia(media_id);
            if (!ok) throw new AppError("Media not found", 404);
            return true;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to delete media", 500);
        }
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    async addQuestion(course_id, question_data) {
        try {
            await this.getById(course_id);
            const [record] = await this.repo.bulkAddQuestions(course_id, [question_data]);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to add question", 500);
        }
    }

    async addQuestionsBulk(course_id, questions) {
        try {
            await this.getById(course_id);
            if (!questions?.length) throw new AppError("Questions array is empty", 400);
            return await this.repo.bulkAddQuestions(course_id, questions);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to add questions", 500);
        }
    }

    async updateQuestion(course_id, question_id, data) {
        try {
            await this.getById(course_id);
            const q = await this.repo.updateQuestion(question_id, data);
            if (!q) throw new AppError("Question not found", 404);
            return q;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update question", 500);
        }
    }

    async deleteQuestion(course_id, question_id) {
        try {
            await this.getById(course_id);
            const ok = await this.repo.deleteQuestion(question_id);
            if (!ok) throw new AppError("Question not found", 404);
            return true;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to delete question", 500);
        }
    }
}

module.exports = new CourseService();
