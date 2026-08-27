const BaseService = require("./baseService");
const labRepository = require("../repositories/labRepository");
const courseRepository = require("../repositories/courseRepository");
const certificationRepository = require("../repositories/certificationRepository");
const { AppError } = require("../middleware/errorHandler");
const { sequelize, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../lib/logger");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { randomUUID } = require("crypto");
const mediaStorage = require("./mediaStorageService");

async function saveLabThumbnailUrl(labId, file, oldThumbnailUrl = null) {
    return mediaStorage.saveImage(file.buffer, file.originalname || "thumbnail.webp", {
        folder: "labs/thumbnails",
        outName: `lab_${labId}_${Date.now()}.webp`,
        replaceUrl: oldThumbnailUrl,
    });
}

function slugify(str = "") {
    return str.toLowerCase().trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Avoid duplicate `labs.slug` — DB unique index rejects reused codes like "aws". */
async function ensureUniqueLabSlug(desired, excludeLabId = null) {
    let base = slugify(desired || "") || "lab";
    if (base.length > 200) base = base.slice(0, 200);
    for (let attempt = 0; attempt < 25; attempt++) {
        const candidate = attempt === 0
            ? base
            : `${base}-${randomUUID().slice(0, 8)}`;
        const trimmed = candidate.length > 255 ? candidate.slice(0, 255) : candidate;
        const existing = await labRepository.findBySlug(trimmed);
        if (!existing || (excludeLabId && existing.id === excludeLabId)) return trimmed;
    }
    throw new AppError("Could not generate a unique lab URL slug. Try a different lab code.", 400);
}

/** Next sequential human-friendly lab code, e.g. LAB-001 → LAB-002. */
async function nextLabCode() {
    try {
        const [rows] = await sequelize.query(
            "SELECT lab_code FROM labs WHERE lab_code REGEXP '^LAB-[0-9]+$'"
        );
        const max = rows.reduce((m, r) => {
            const n = parseInt(String(r.lab_code).replace("LAB-", ""), 10);
            return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        return `LAB-${String(max + 1).padStart(3, "0")}`;
    } catch {
        // Fallback: random-ish short code so creation never fails on this.
        return `LAB-${randomUUID().slice(0, 6).toUpperCase()}`;
    }
}

function parseLabMetadata(raw) {
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

/** Keep instructions JSON `code` aligned with canonical URL slug (auto-generated on create). */
function syncInstructionsCodeWithSlug(instructionsRaw, slug) {
    if (!slug) return instructionsRaw;
    if (instructionsRaw == null || instructionsRaw === "") {
        return JSON.stringify({ version: 1, code: slug });
    }
    try {
        const o =
            typeof instructionsRaw === "string"
                ? JSON.parse(instructionsRaw)
                : { ...instructionsRaw };
        if (typeof o !== "object" || o === null || Array.isArray(o)) return instructionsRaw;
        o.code = slug;
        return JSON.stringify(o);
    } catch {
        return instructionsRaw;
    }
}

function enrichLabListRow(lab) {
    const meta = parseLabMetadata(lab.metadata);
    const instructions = typeof lab.instructions === "string"
        ? (() => { try { return JSON.parse(lab.instructions); } catch { return {}; } })()
        : (lab.instructions || {});
    const author_name =
        lab.creator?.full_name ||
        lab.creator?.email ||
        meta.instructor_name ||
        null;
    const platform = meta.platform || (Array.isArray(instructions.technologies) ? instructions.technologies[0] : null) || null;
    const ratingRaw = meta.rating ?? lab.rating;
    const rating = ratingRaw != null && ratingRaw !== "" && Number.isFinite(Number(ratingRaw))
        ? Number(ratingRaw)
        : null;
    const adminStudents = meta.studentCount ?? meta.student_count;
    const enrolledDisplay =
        adminStudents != null && adminStudents !== "" && Number.isFinite(Number(adminStudents))
            ? Number(adminStudents)
            : (lab.enrolled_count != null && Number.isFinite(Number(lab.enrolled_count))
                ? Number(lab.enrolled_count)
                : null);
    return {
        ...lab,
        content_approval_status: meta.content_approval_status ?? null,
        lab_kind: meta.lab_kind ?? null,
        platform,
        author_name,
        currency: meta.currency || lab.currency || "INR",
        rating,
        studentCount: adminStudents != null && Number.isFinite(Number(adminStudents))
            ? Number(adminStudents)
            : null,
        enrolled_count: enrolledDisplay,
    };
}

async function attachEnrollmentCounts(rows) {
    const { LabEnrollment } = require("../models");
    const ids = rows.map((r) => r.id).filter(Boolean);
    if (!ids.length) return rows;
    const counts = await LabEnrollment.findAll({
        attributes: [
            "lab_id",
            [sequelize.fn("COUNT", sequelize.col("LabEnrollment.id")), "cnt"],
        ],
        where: { lab_id: { [Op.in]: ids } },
        group: ["lab_id"],
        raw: true,
    });
    const map = new Map(counts.map((c) => [c.lab_id, Number(c.cnt) || 0]));
    return rows.map((r) => {
        const meta = parseLabMetadata(r.metadata);
        const adminRaw = meta.studentCount ?? meta.student_count;
        const adminCount =
            adminRaw != null && adminRaw !== "" && Number.isFinite(Number(adminRaw))
                ? Number(adminRaw)
                : null;
        const dbCount = map.has(r.id) ? map.get(r.id) : 0;
        return {
            ...r,
            enrolled_count: adminCount != null ? adminCount : dbCount,
        };
    });
}

class LabService extends BaseService {
    constructor() {
        super(labRepository, "Lab");
    }

    // ── Hooks ─────────────────────────────────────────────────────────────────

    async beforeCreate(data) {
        // Validate course_id if provided
        if (data.course_id) {
            const course = await courseRepository.findById(data.course_id);
            if (!course) throw new AppError("Course not found", 404);
        }
        // Validate certification_id if provided
        if (data.certification_id) {
            const cert = await certificationRepository.findById(data.certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);
        }
        const rawSlug = data.slug || slugify(data.title);
        data.slug = await ensureUniqueLabSlug(rawSlug);
        if (data.price > 0) data.is_free = false;
        if (data.price === 0 || !data.price) data.is_free = true;
        // Assign a sequential reference code + initialise versioning.
        if (!data.lab_code) data.lab_code = await nextLabCode();
        data.version = 1;
        data.last_revised_at = new Date();
        return data;
    }

    async afterCreate(record) {
        await this.repo.invalidateCache(record.id, record.course_id, record.slug);
        return record;
    }

    async beforeUpdate(id, data) {
        // The original creator must never change on an edit, even if a payload
        // tries to set it. Ownership is keyed on created_by.
        delete data.created_by;
        if (data.certification_id) {
            const cert = await certificationRepository.findById(data.certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);
        }
        if (data.slug !== undefined && data.slug !== null && String(data.slug).trim() !== "") {
            data.slug = await ensureUniqueLabSlug(data.slug, id);
        }
        if (data.price !== undefined) {
            data.is_free = parseFloat(data.price) === 0;
        } else if (data.is_free !== undefined && data.is_free) {
            data.price = 0;
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
        await this.repo.invalidateCache(existing.id, existing.course_id, existing.slug);
        const favoriteService = require("./favoriteService");
        await favoriteService.purgeByTarget("lab", existing.id);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    async getByIdFull(id) {
        try {
            const lab = await this.repo.findByIdFull(id);
            if (!lab) throw new AppError("Lab not found", 404);
            return lab;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch lab", 400);
        }
    }

    async getLabsByCourse(course_id) {
        try {
            const course = await courseRepository.findById(course_id);
            if (!course) throw new AppError("Course not found", 404);
            return await this.repo.findByCourseId(course_id);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch labs", 500);
        }
    }

    async getBySlug(slug) {
        try {
            const lab = await this.repo.findBySlug(slug);
            if (!lab) throw new AppError("Lab not found", 404);
            return lab;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to fetch lab", 500);
        }
    }

    async getAll(options = {}) {
        try {
            const { publicCatalog, approval, ...findOpts } = options;
            let where = findOpts.where || {};
            // MariaDB/MySQL: avoid COALESCE(x, CAST('{}' AS JSON)) — breaks on some MariaDB versions.
            // Same idea as courseService.getAll: NULL / missing path → treat as public-approved.
            if (publicCatalog) {
                where = {
                    [Op.and]: [
                        where,
                        sequelize.literal(`(
                            COALESCE(
                                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(\`Lab\`.\`metadata\`, '$.content_approval_status')), ''),
                                'approved'
                            ) = 'approved'
                        )`),
                    ],
                };
            }
            const isOwnerPending =
                approval === "pending" &&
                findOpts._ownerList === true;
            if (isOwnerPending) {
                where = {
                    [Op.and]: [
                        where,
                        sequelize.literal(
                            "(JSON_UNQUOTE(JSON_EXTRACT(`Lab`.`metadata`, '$.content_approval_status')) = 'pending')"
                        ),
                        { status: "published" },
                    ],
                };
            }
            const listInclude = [
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
                result.rows = result.rows.map(enrichLabListRow);
                if (findOpts._ownerList) {
                    result.rows = await attachEnrollmentCounts(result.rows);
                }
            }
            return result;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error("[LabService] getAll:", err);
            throw new AppError("Failed to fetch Lab list", 500);
        }
    }

    async setContentApprovalStatus(id, status, user_id) {
        if (!["approved", "rejected"].includes(status)) {
            throw new AppError("status must be approved or rejected", 400);
        }
        const lab = await this.getByIdFull(id);
        const meta = parseLabMetadata(lab.metadata);
        meta.content_approval_status = status;
        const now = new Date().toISOString();
        if (status === "approved") {
            meta.content_approved_at = now;
        } else {
            meta.content_rejected_at = now;
        }
        return this.update(id, { metadata: meta, updated_by: user_id });
    }

    // ── Assign certification to lab ───────────────────────────────────────────

    async assignCertification(lab_id, certification_id, user_id) {
        try {
            await this.getById(lab_id);
            const cert = await certificationRepository.findById(certification_id);
            if (!cert) throw new AppError("Certification not found", 404);
            if (!cert.is_active) throw new AppError("Certification is not active", 400);

            return await this.repo.update(lab_id, { certification_id, updated_by: user_id });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to assign certification to lab", 500);
        }
    }

    async removeCertification(lab_id, user_id) {
        try {
            await this.getById(lab_id);
            return await this.repo.update(lab_id, { certification_id: null, updated_by: user_id });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to remove certification from lab", 500);
        }
    }

    // ── Reorder labs inside a course ──────────────────────────────────────────

    async reorderLabs(course_id, ordered_ids = []) {
        try {
            if (!ordered_ids.length) throw new AppError("ordered_ids cannot be empty", 400);
            await Promise.all(
                ordered_ids.map((id, idx) => this.repo.update(id, { sort_order: idx }))
            );
            await this.repo.invalidateCache(null, course_id);
            return this.repo.findByCourseId(course_id);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to reorder labs", 500);
        }
    }

    // ── Composite create (all at once) ────────────────────────────────────────

    async createFull(data, user_id) {
        const t = await sequelize.transaction();
        try {
            const {
                questions = [],
                certification_id,
                _thumbnail_file,
                _intro_video_file,
                _media_files,
                ...lab_data
            } = data;

            const meta = lab_data.metadata && typeof lab_data.metadata === "object"
                ? { ...lab_data.metadata }
                : {};
            if (lab_data.status === "published" && !meta.content_approval_status) {
                meta.content_approval_status = "pending";
            }
            const lab = await this.create(
                {
                    ...lab_data,
                    metadata: Object.keys(meta).length ? meta : {},
                    certification_id: certification_id || null,
                    created_by: user_id,
                },
                { transaction: t }
            );

            if (questions.length) {
                await this.repo.bulkAddQuestions(
                    lab.id,
                    questions.map((q, i) => ({ ...q, created_by: user_id, sort_order: q.sort_order ?? i })),
                    { transaction: t }
                );
            }

            await t.commit();

            let full = await this.repo.findByIdFull(lab.id);
            const syncedInstructions = syncInstructionsCodeWithSlug(full.instructions, full.slug);
            if (syncedInstructions !== full.instructions) {
                await this.update(lab.id, { instructions: syncedInstructions, updated_by: user_id });
                full = await this.repo.findByIdFull(lab.id);
            }

            if (_thumbnail_file?.buffer) {
                const url = await saveLabThumbnailUrl(lab.id, _thumbnail_file);
                await this.update(lab.id, { thumbnail: url, updated_by: user_id });
                full = await this.repo.findByIdFull(lab.id);
            } else if (
                meta.thumbnailUrl &&
                String(meta.thumbnailUrl).trim() &&
                !full.thumbnail
            ) {
                await this.update(
                    lab.id,
                    { thumbnail: String(meta.thumbnailUrl).trim(), updated_by: user_id }
                );
                full = await this.repo.findByIdFull(lab.id);
            }

            if (_intro_video_file?.buffer) {
                const { scheduleLabIntroUpload } = require("./introVideoHls");
                await scheduleLabIntroUpload(
                    lab.id,
                    _intro_video_file,
                    user_id,
                    this
                );
                full = await this.repo.findByIdFull(lab.id);
            }

            return full;
        } catch (err) {
            await t.rollback();
            if (err instanceof AppError) throw err;
            logger.error("[LabService] createFull:", err);
            throw new AppError(err?.message || "Failed to create lab", 400);
        }
    }

    async updateFull(lab_id, data, user_id) {
        const t = await sequelize.transaction();
        try {
            const {
                questions = [],
                certification_id,
                _thumbnail_file,
                _intro_video_file,
                _media_files,
                ...lab_data
            } = data;

            const existingLab = await this.getByIdFull(lab_id);
            if (!existingLab) {
                throw new AppError("Lab not found", 404);
            }

            const existingMeta = parseLabMetadata(existingLab.metadata);
            const meta = lab_data.metadata && typeof lab_data.metadata === "object"
                ? { ...existingMeta, ...lab_data.metadata }
                : { ...existingMeta };
            if (lab_data.status === "published") {
                const approval = meta.content_approval_status ?? existingMeta.content_approval_status;
                if (approval !== "approved") {
                    meta.content_approval_status = "pending";
                }
            }

            const lab = await this.update(
                lab_id,
                {
                    ...lab_data,
                    metadata: Object.keys(meta).length ? meta : existingLab.metadata,
                    certification_id: certification_id !== undefined ? certification_id : existingLab.certification_id,
                    updated_by: user_id,
                },
                { transaction: t }
            );

            if (questions.length) {
                // First, delete existing questions and add new ones
                await this.repo.deleteQuestionsByLabId(lab_id, { transaction: t });
                await this.repo.bulkAddQuestions(
                    lab_id,
                    questions.map((q, i) => ({ ...q, created_by: user_id, sort_order: q.sort_order ?? i })),
                    { transaction: t }
                );
            }

            await t.commit();

            let full = await this.repo.findByIdFull(lab_id);
            const syncedInstructions = syncInstructionsCodeWithSlug(full.instructions, full.slug);
            if (syncedInstructions !== full.instructions) {
                await this.update(lab_id, { instructions: syncedInstructions, updated_by: user_id });
                full = await this.repo.findByIdFull(lab_id);
            }

            if (_thumbnail_file?.buffer) {
                const url = await saveLabThumbnailUrl(lab_id, _thumbnail_file, existingLab.thumbnail);
                const metaAfterThumb = parseLabMetadata(full?.metadata);
                delete metaAfterThumb.thumbnailUrl;
                await this.update(lab_id, {
                    thumbnail: url,
                    metadata: metaAfterThumb,
                    updated_by: user_id,
                });
                full = await this.repo.findByIdFull(lab_id);
            } else if (
                meta.thumbnailUrl &&
                String(meta.thumbnailUrl).trim() &&
                String(meta.thumbnailUrl).trim() !== String(full.thumbnail || "").trim()
            ) {
                await this.update(
                    lab_id,
                    { thumbnail: String(meta.thumbnailUrl).trim(), updated_by: user_id }
                );
                full = await this.repo.findByIdFull(lab_id);
            }

            if (_intro_video_file?.buffer) {
                const { scheduleLabIntroUpload } = require("./introVideoHls");
                const oldIntro =
                    parseLabMetadata(existingLab.metadata).intro_video_url
                    || parseLabMetadata(existingLab.metadata).introVideoUrl
                    || null;
                await scheduleLabIntroUpload(
                    lab_id,
                    _intro_video_file,
                    user_id,
                    this,
                    oldIntro
                );
                full = await this.repo.findByIdFull(lab_id);
            }

            return full;
        } catch (err) {
            await t.rollback();
            if (err instanceof AppError) throw err;
            logger.error("[LabService] updateFull:", err);
            throw new AppError(err?.message || "Failed to update lab", 400);
        }
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    async addQuestion(lab_id, question_data) {
        try {
            await this.getById(lab_id);
            const [record] = await this.repo.bulkAddQuestions(lab_id, [question_data]);
            return record;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to add question", 500);
        }
    }

    async addQuestionsBulk(lab_id, questions) {
        try {
            await this.getById(lab_id);
            if (!questions?.length) throw new AppError("Questions array is empty", 400);
            return await this.repo.bulkAddQuestions(lab_id, questions);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to add questions", 500);
        }
    }

    async updateQuestion(lab_id, question_id, data) {
        try {
            await this.getById(lab_id);
            const q = await this.repo.updateQuestion(question_id, data);
            if (!q) throw new AppError("Question not found", 404);
            return q;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update question", 500);
        }
    }

    async deleteQuestion(lab_id, question_id) {
        try {
            await this.getById(lab_id);
            const ok = await this.repo.deleteQuestion(question_id);
            if (!ok) throw new AppError("Question not found", 404);
            return true;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to delete question", 500);
        }
    }

    // ── Assignments (standalone lab → user) ──────────────────────────────────

    async assignLab(lab_id, assigned_to, assigned_by, extras = {}) {
        try {
            const lab = await this.getById(lab_id);
            if (!lab.isAssignable) {
                throw new AppError("This lab is not marked as assignable", 400);
            }
            const { assignment, created } = await this.repo.createAssignment(
                lab_id, assigned_to, assigned_by, extras
            );
            if (!created) throw new AppError("Lab already assigned to this user", 409);
            return assignment;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to assign lab", 500);
        }
    }

    async updateAssignment(assignment_id, data) {
        try {
            const updated = await this.repo.updateAssignment(assignment_id, data);
            if (!updated) throw new AppError("Assignment not found", 404);
            return updated;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to update assignment", 500);
        }
    }

    async getAssignmentsByLab(lab_id) {
        await this.getById(lab_id);
        return this.repo.getAssignmentsByLab(lab_id);
    }

    async getMyAssignments(user_id) {
        return this.repo.getAssignmentsByUser(user_id);
    }

    async revokeAssignment(lab_id, assigned_to) {
        try {
            await this.getById(lab_id);
            const ok = await this.repo.revokeAssignment(lab_id, assigned_to);
            if (!ok) throw new AppError("Assignment not found", 404);
            return true;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError("Failed to revoke assignment", 500);
        }
    }
}

module.exports = new LabService();
