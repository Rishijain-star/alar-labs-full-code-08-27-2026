const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { randomUUID } = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const labService = require("../services/labService");
const learningService = require("../services/learningService");
const { Certification } = require("../models");
const rbacService = require("../services/rbac/roleService");
const notificationService = require("../services/notificationService");
const response = require("../utils/response");
const { AppError } = require("../middleware/errorHandler");
const { fail, validate } = require("../helper/helper");
const { getAllowedOrigins } = require("../lib/allowedOrigins");
const { resolveIsFree } = require("../utils/pricing");
const mediaStorage = require("../services/mediaStorageService");

const INSTRUCTION_MEDIA_DIR = path.join(__dirname, "../../uploads/labs/instruction-media");
const INTRO_MEDIA_DIR = path.join(__dirname, "../../uploads/labs/intro");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HLS_FILE_RE = /^[a-z0-9._-]+\.(m3u8|ts)$/i;

function isEmbeddedMediaRequest(req) {
    const allowed = getAllowedOrigins();
    const origin = req.get("Origin");
    if (origin && allowed.includes(origin)) return true;
    const referer = req.get("Referer") || "";
    if (referer && allowed.some((o) => referer.startsWith(o))) return true;
    return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJSON(value, fieldName) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        throw new AppError(`Invalid JSON in field "${fieldName}"`, 400);
    }
}

function buildLabCertificateConfig(labData) {
    if (!labData?.certificateEnabled) return null;
    const labTitle = String(labData.title || "Lab").trim();
    const customTitle = String(labData.certificateTitle || "").trim();
    return {
        enabled: true,
        title: customTitle || `${labTitle} Completion Certificate`,
        type: labData.certificateType || "completion",
        minProgress: Number(labData.certificateMinProgress) || 80,
        thumbnail: labData.certificateThumbnail || "",
        description: labData.certificateDescription || "",
        verificationText: labData.certificateVerificationText || "",
        requireQuiz: !!labData.certificateRequireQuiz,
        requireTasks: !!labData.certificateRequireTasks,
    };
}

async function mergeLabCertificateWithTemplate(lab, certCfg) {
    if (!certCfg?.enabled) return null;
    let merged = { ...certCfg };
    if (lab?.certification_id) {
        const template = await Certification.findByPk(lab.certification_id, {
            attributes: ["id", "title", "description", "thumbnail", "template_url"],
        });
        if (template) {
            const t = template.toJSON ? template.toJSON() : template;
            merged = {
                ...merged,
                templateId: t.id,
                templateTitle: t.title,
                title: String(merged.title || "").trim() || t.title,
                thumbnail: merged.thumbnail || t.thumbnail || t.template_url || "",
                description: merged.description || t.description || "",
            };
        }
    }
    if (!String(merged.title || "").trim() && lab?.title) {
        merged.title = `${lab.title} Completion Certificate`;
    }
    return merged;
}

function toBool(val) {
    if (val === "true" || val === "1" || val === true) return true;
    if (val === "false" || val === "0" || val === false) return false;
    return null;
}

function normalizeQuestionType(type = "") {
    const map = {
        single: "mcq",
        multiple: "mcq",
        mcq: "mcq",
        true_false: "true_false",
        short_answer: "short_answer",
        code: "code",
        essay: "essay",
    };
    return map[type.toLowerCase()] || "mcq";
}

function resolveCorrectAnswer(q) {
    if (q.correct_answer) return q.correct_answer;
    if (!Array.isArray(q.options)) return null;
    const correct = q.options.filter(o => toBool(o.is_correct));
    if (!correct.length) return null;
    return correct.map(o => o.text).join(",");
}

function mapLevelToDifficulty(level) {
    const l = String(level || "").toLowerCase();
    if (l.includes("begin") || l === "beginner") return "easy";
    if (l.includes("intermediate") || l === "medium") return "medium";
    if (l.includes("advanced") || l.includes("expert")) return "hard";
    return "easy";
}

function parseLabFormBody(req) {
    const body = req.body || {};
    let labData = {};
    let modules = [];

    try {
        if (body.lab != null && body.lab !== "") {
            labData = typeof body.lab === "string" ? JSON.parse(body.lab) : body.lab;
        } else if (body.title) {
            labData = body;
        } else {
            throw new AppError("Lab data is missing. Please save the lab again and retry.", 400);
        }

        if (body.modules != null && body.modules !== "") {
            modules = typeof body.modules === "string" ? JSON.parse(body.modules) : body.modules;
        } else if (Array.isArray(body.modules)) {
            modules = body.modules;
        }
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(`Invalid lab form data: ${err.message}`, 400);
    }

    if (!Array.isArray(modules)) {
        throw new AppError("Lab modules must be a JSON array.", 400);
    }

    return { labData, modules, files: req.files || {} };
}

function parseLabMetadataPublic(raw) {
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

function mapLabTypeToEnum(labType) {
    const t = String(labType || "").toLowerCase();
    if (t.includes("quiz") || t.includes("assessment")) return "assessment";
    if (t.includes("project")) return "project";
    return "hands_on";
}

/** Creator, global approver, or own-content approver may preview labs before public approval */
async function canBypassPublicLabGate(req, lab) {
    const userId = req.user?.user_id;
    if (!userId || !lab) return false;
    const isCreator = lab.created_by != null && String(lab.created_by) === String(userId);
    const globalApprove = await rbacService.checkUserHasPermission(
        userId,
        ["approve_labs", "approve_courses"],
        "OR"
    );
    const ownApprove = await rbacService.checkUserHasPermission(userId, ["approve_own_labs"], "OR");
    return globalApprove || (ownApprove && isCreator) || isCreator;
}

/**
 * Owners need explicit edit/delete permission; non-owners need the matching
 * `other_user_*` permission. Create permission alone does not grant modify access.
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

function getBlockOutlineTitle(block) {
    if (block?.title && String(block.title).trim()) return String(block.title).trim();
    switch (block?.type) {
        case "quiz":
            return block.question ? String(block.question).slice(0, 80) : "Quiz";
        case "richText":
            return "Text Block";
        case "video":
            return "Video";
        case "code":
            return "Code Exercise";
        case "project":
            return "Project";
        case "download":
            return "Download";
        case "codeSnippet":
            return "Code Snippet";
        case "image":
            return "Image";
        case "fillBlank":
            return "Fill in the Blank";
        case "trueFalse":
            return "True/False";
        default:
            return block?.type || "Task";
    }
}

function buildOutlineModules(modules) {
    return (modules || []).map((mod) => ({
        id: mod.id,
        title: mod.title || "Module",
        expanded: mod.expanded !== false,
        lessons: (mod.lessons || []).map((les) => ({
            id: les.id,
            title: les.title || "Lesson",
            blocks: (les.blocks || []).map((block) => ({
                id: block.id,
                type: block.type || "richText",
                title: getBlockOutlineTitle(block),
            })),
        })),
    }));
}

function computeBlockBreakdown(modules) {
    const breakdown = {};
    (modules || []).forEach((mod) => {
        (mod.lessons || []).forEach((lesson) => {
            (lesson.blocks || []).forEach((block) => {
                const type = block.type || "richText";
                breakdown[type] = (breakdown[type] || 0) + 1;
            });
        });
    });
    return breakdown;
}

/** Strip answer keys and empty hints/explanations for enrolled learning view */
function sanitizeBlockForLearning(block) {
    const b = { ...block };
    if (b.type === "quiz") {
        delete b.correctAnswer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
    } else if (b.type === "fillBlank") {
        delete b.answer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
        if (!b.hint || !String(b.hint).trim()) delete b.hint;
    } else if (b.type === "trueFalse") {
        delete b.correctAnswer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
    } else if (b.type === "code") {
        delete b.solution;
        if (Array.isArray(b.hints)) {
            const hints = b.hints.filter((h) => h != null && String(h).trim());
            if (hints.length) b.hints = hints;
            else delete b.hints;
        }
    }
    return b;
}

function sanitizeModulesForLearning(modules) {
    return (modules || []).map((mod) => ({
        ...mod,
        lessons: (mod.lessons || []).map((lesson) => ({
            ...lesson,
            blocks: (lesson.blocks || []).map(sanitizeBlockForLearning),
        })),
    }));
}

async function resolveLabManageFlags(req, lab) {
    const userId = req.user?.user_id;
    if (!userId || !lab) {
        return { canEdit: false, canDelete: false, editPath: null, labKind: "hands_on" };
    }
    const userRole = await rbacService.getUserRole(userId);
    const rn = String(userRole?.name || "").trim().toLowerCase();
    const isSuperAdmin = rn === "super_admin" || rn === "super admin";
    const hasEditPerm = await rbacService.checkUserHasPermission(userId, "edit_labs");
    const hasDeletePerm = await rbacService.checkUserHasPermission(userId, "delete_labs");
    const metadata = parseJSON(lab.metadata, "metadata") || {};
    const labKind = metadata.lab_kind || (lab.type === "assessment" ? "skill_builder" : "hands_on");
    const editPath =
        labKind === "skill_builder"
            ? `/app/labs/skill-builder-lab-edit/${lab.slug}`
            : `/app/labs/edit/${lab.slug}`;
    return {
        canEdit: isSuperAdmin || hasEditPerm,
        canDelete: isSuperAdmin || hasDeletePerm,
        editPath: hasEditPerm || isSuperAdmin ? editPath : null,
        labKind,
    };
}

/** Best-effort parse e.g. "2 hours", "90 min" → minutes */
function parseDurationToMinutes(s) {
    if (s == null || s === "") return null;
    if (typeof s === "number" && isFinite(s)) return Math.round(s);
    const str = String(s).trim().toLowerCase();
    const n = parseFloat(str.replace(/[^\d.]/g, ""));
    if (!isFinite(n)) return null;
    if (/\b(h|hr|hour|hours)\b/.test(str)) return Math.round(n * 60);
    if (/\b(day|days)\b/.test(str)) return Math.round(n * 60 * 24);
    if (/\b(m|min|minute|minutes)\b/.test(str)) return Math.round(n);
    return Math.round(n);
}

// ─────────────────────────────────────────────────────────────────────────────

class LabController {


    // ── CRUD ─────────────────────────────────────────────────────────────────

    getAll = async (req, res) => {
        try {
            const { page = 1, limit = 20, status, difficulty, type, course_id, approval, search, is_free, platform, level, price, lab_kind } = req.query;
            const { Op } = require("sequelize");
            const sequelize = require("../models").sequelize;
            const isOwnerList = req.originalUrl.includes("/owner/labs");
            const { applyLabCatalogFilters, isCatalogBrowseScope } = require("../utils/catalogQuery");
            let where = {};
            const listScope = String(req.query.scope || "").toLowerCase();
            const catalogBrowse = isCatalogBrowseScope(listScope, isOwnerList) && approval !== "pending";

            if (status) {
                where.status = status;
            } else if (catalogBrowse) {
                where.status = "published";
            }

            if (type) where.type = type;
            if (req.params.course_id || course_id) {
                where.course_id = req.params.course_id || course_id;
            } else {
                // Standalone labs only — course-attached labs live under courses
                where.course_id = { [Op.is]: null };
            }

            where = applyLabCatalogFilters(where, { search, is_free, platform, level, difficulty, price }, sequelize);

            if (lab_kind) {
                const kindNorm = String(lab_kind).toLowerCase() === "skill_builder" ? "skill_builder" : "hands_on";
                const resolvedKindSql = `COALESCE(
                    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(\`Lab\`.\`metadata\`, '$.lab_kind')), ''),
                    CASE WHEN \`Lab\`.\`type\` = 'assessment' THEN 'skill_builder' ELSE 'hands_on' END
                )`;
                const kindClause =
                    kindNorm === "skill_builder"
                        ? sequelize.literal(`(${resolvedKindSql} = 'skill_builder')`)
                        : sequelize.literal(`(${resolvedKindSql} != 'skill_builder')`);
                if (where[Op.and]) {
                    where = { [Op.and]: [...where[Op.and], kindClause] };
                } else if (Object.keys(where).length) {
                    where = { [Op.and]: [where, kindClause] };
                } else {
                    where = kindClause;
                }
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
                } else if (listScope === "all") {
                    // No creator filter — every lab in the system
                } else {
                    const approveAll = await rbacService.checkUserHasPermission(
                        uid,
                        ["approve_labs", "approve_courses"],
                        "OR"
                    );
                    if (!approveAll) {
                        appendScope({ created_by: uid });
                    }
                }
            }

            const result = await labService.getAll({
                page: +page,
                limit: +limit,
                where,
                publicCatalog: catalogBrowse,
                approval: isOwnerList ? approval : undefined,
                _ownerList: isOwnerList,
            });
            return response.success(res, "Labs fetched", 200, result);
        } catch (err) { return fail(res, err); }
    };

    getById = async (req, res) => {
        try {
            const lab = await labService.getByIdFull(req.params.id);
            if (!req.originalUrl.includes("/owner/")) {
                const bypass = await canBypassPublicLabGate(req, lab);
                if (!bypass) {
                    if (lab.status !== "published") {
                        return response.fail(res, "Lab not found", 404);
                    }
                    const meta = parseLabMetadataPublic(lab.metadata);
                    if (meta.content_approval_status && meta.content_approval_status !== "approved") {
                        return response.fail(res, "Lab not found", 404);
                    }
                }
            }
            return response.success(res, "Lab fetched", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    getBySlug = async (req, res) => {
        try {
            const lab = await labService.getBySlug(req.params.slug);
            if (!req.originalUrl.includes("/owner/")) {
                const bypass = await canBypassPublicLabGate(req, lab);
                if (!bypass) {
                    if (lab.status !== "published") {
                        return response.fail(res, "Lab not found", 404);
                    }
                    const meta = parseLabMetadataPublic(lab.metadata);
                    if (meta.content_approval_status && meta.content_approval_status !== "approved") {
                        return response.fail(res, "Lab not found", 404);
                    }
                }
            }
            return response.success(res, "Lab fetched", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    /**
     * GET /api/labs/slug/:slug/overview
     * Public catalog overview — metadata + outline only (no lesson content, answers, hints).
     */
    getBySlugOverview = async (req, res) => {
        try {
            const lab = await labService.getBySlug(req.params.slug);
            if (!lab) {
                return response.fail(res, "Lab not found", 404);
            }
            if (!req.originalUrl.includes("/owner/")) {
                const bypass = await canBypassPublicLabGate(req, lab);
                if (!bypass) {
                    if (lab.status !== "published") {
                        return response.fail(res, "Lab not found", 404);
                    }
                    const meta = parseLabMetadataPublic(lab.metadata);
                    if (meta.content_approval_status && meta.content_approval_status !== "approved") {
                        return response.fail(res, "Lab not found", 404);
                    }
                }
            }

            const instructions = parseJSON(lab.instructions, "instructions") || {};
            const metadata = parseJSON(lab.metadata, "metadata") || {};
            const rawModules = instructions.modules || [];
            const outlineModules = buildOutlineModules(rawModules);
            const blockBreakdown = computeBlockBreakdown(rawModules);

            let isEnrolled = false;
            let enrollmentProgress = 0;
            let accessViaCourse = false;
            let includedInCourseSlug = null;
            const userId = req.user?.user_id;
            const courseSlug = req.query.fromCourse || req.query.course || null;
            if (userId) {
                const access = await learningService.resolveLabAccess(userId, lab.id, { courseSlug });
                isEnrolled = access.isEnrolled;
                enrollmentProgress = access.progress ?? 0;
                accessViaCourse = !!access.accessViaCourse;
                includedInCourseSlug = access.courseSlug || null;
            }

            const totalModules = outlineModules.length;
            const modulesCompleted = isEnrolled
                ? (() => {
                    const pct = Math.max(0, Math.min(100, Number(enrollmentProgress) || 0));
                    if (pct <= 0) return 0;
                    if (totalModules <= 0) return 1;
                    const estimated = Math.round((pct / 100) * totalModules);
                    return Math.max(1, Math.min(totalModules, estimated));
                })()
                : 0;

            const manage = await resolveLabManageFlags(req, lab);

            const payload = {
                id: lab.id,
                title: lab.title,
                slug: lab.slug,
                description: lab.description,
                shortDescription: metadata.shortDescription || lab.description,
                fullDescription: metadata.fullDescription,
                thumbnail: lab.thumbnail,
                difficulty: lab.difficulty,
                duration: lab.time_limit_minutes ? `${lab.time_limit_minutes} mins` : "N/A",
                durationMinutes: lab.time_limit_minutes,
                level: lab.difficulty === "easy" ? "Beginner" : lab.difficulty === "medium" ? "Intermediate" : "Advanced",
                rating: metadata.rating || 4.8,
                studentCount: metadata.studentCount || 0,
                isFree: resolveIsFree(lab),
                price: lab.price,
                currency: metadata.currency || lab.currency || "INR",
                technologies: instructions.technologies || [],
                requirements: instructions.requirements || [],
                learningOutcomes: instructions.learningOutcomes || [],
                objectives: instructions.objectives || [],
                modules: outlineModules,
                blockBreakdown,
                certificate: await mergeLabCertificateWithTemplate(lab, instructions.certificate),
                createdBy: metadata.createdBy,
                isEnrolled,
                isPurchased: isEnrolled,
                enrollmentProgress: isEnrolled ? enrollmentProgress : 0,
                modulesCompleted,
                totalModules,
                contentLocked: !resolveIsFree(lab) && !isEnrolled,
                accessViaCourse,
                includedInCourseSlug,
                includedViaCourseFree: accessViaCourse,
                heroHeader: metadata.heroHeader || null,
                header: metadata.header || null,
                introVideoUrl: metadata.introVideoUrl || "",
                labKind: manage.labKind,
                labType: lab.type || "hands_on",
                platform: metadata.platform || (instructions.technologies?.[0]) || null,
                canEdit: manage.canEdit,
                canDelete: manage.canDelete,
                editPath: manage.editPath,
                created_by: lab.created_by,
            };

            return response.success(res, "Lab overview fetched", 200, { lab: payload });
        } catch (err) { return fail(res, err); }
    };

    getBySlugView = async (req, res) => {
        try {
            const lab = await labService.getBySlug(req.params.slug);
            if (!lab) {
                return response.fail(res, "Lab not found", 404);
            }
            if (!req.originalUrl.includes("/owner/")) {
                const bypass = await canBypassPublicLabGate(req, lab);
                if (!bypass) {
                    if (lab.status !== "published") {
                        return response.fail(res, "Lab not found", 404);
                    }
                    const meta = parseLabMetadataPublic(lab.metadata);
                    if (meta.content_approval_status && meta.content_approval_status !== "approved") {
                        return response.fail(res, "Lab not found", 404);
                    }
                }
            }

            const instructions = parseJSON(lab.instructions, "instructions") || {};
            const metadata = parseJSON(lab.metadata, "metadata") || {};

            let isEnrolled = false;
            let enrollmentProgress = 0;
            const userId = req.user?.user_id;
            const courseSlug = req.query.fromCourse || req.query.course || null;
            if (userId) {
                const access = await learningService.resolveLabAccess(userId, lab.id, { courseSlug });
                isEnrolled = access.isEnrolled;
                enrollmentProgress = access.progress ?? 0;
            }

            const bypass = await canBypassPublicLabGate(req, lab);
            if (!isEnrolled && !bypass) {
                return response.fail(res, "Enroll to access lab content", 403, { code: "ENROLLMENT_REQUIRED" });
            }

            const processedModules = sanitizeModulesForLearning(instructions.modules || []);

            const payload = {
                id: lab.id,
                title: lab.title,
                slug: lab.slug,
                description: lab.description,
                shortDescription: metadata.shortDescription || lab.description,
                fullDescription: metadata.fullDescription,
                thumbnail: lab.thumbnail,
                difficulty: lab.difficulty,
                duration: lab.time_limit_minutes ? `${lab.time_limit_minutes} mins` : "N/A",
                durationMinutes: lab.time_limit_minutes,
                level: lab.difficulty === "easy" ? "Beginner" : lab.difficulty === "medium" ? "Intermediate" : "Advanced",
                rating: metadata.rating || 4.8,
                studentCount: metadata.studentCount || 0,
                isFree: resolveIsFree(lab),
                price: lab.price,
                currency: metadata.currency || lab.currency || "INR",
                technologies: instructions.technologies || [],
                requirements: instructions.requirements || [],
                learningOutcomes: instructions.learningOutcomes || [],
                objectives: instructions.objectives || [],
                modules: processedModules,
                certificate: instructions.certificate || null,
                createdBy: metadata.createdBy,
                isEnrolled,
                isPurchased: isEnrolled,
                enrollmentProgress: isEnrolled ? enrollmentProgress : 0,
                contentLocked: !resolveIsFree(lab) && !isEnrolled,
                heroHeader: metadata.heroHeader || null,
                header: metadata.header || null,
                introVideoUrl: metadata.introVideoUrl || "",
                labKind: metadata.lab_kind || (lab.type === "assessment" ? "skill_builder" : "hands_on"),
                labType: lab.type || "hands_on",
                platform: metadata.platform || (instructions.technologies?.[0]) || null,
            };

            return response.success(res, "Lab fetched for view", 200, { lab: payload });
        } catch (err) { return fail(res, err); }
    };

    setContentApproval = async (req, res) => {
        try {
            await validate(req.body, { status: "required|string|in:approved,rejected" });
            const userId = req.user?.user_id;
            if (!userId) return response.fail(res, "Authentication required", 401);
            const lab = await labService.getByIdFull(req.params.id);
            if (!lab) return response.fail(res, "Lab not found", 404);
            const canAll = await rbacService.checkUserHasPermission(
                userId,
                ["approve_labs", "approve_courses"],
                "OR"
            );
            const canOwnLab = await rbacService.checkUserHasPermission(userId, ["approve_own_labs"], "OR");
            if (!canAll && (!canOwnLab || String(lab.created_by) !== String(userId))) {
                return response.fail(res, "Insufficient permissions to approve this lab", 403);
            }
            const updated = await labService.setContentApprovalStatus(
                req.params.id,
                req.body.status,
                userId
            );
            if (req.body.status === "approved" && updated?.created_by) {
                try {
                    await notificationService.createNotification({
                        userId: updated.created_by,
                        audience: "user",
                        eventType: "lab_approved",
                        title: "Lab approved",
                        message: `Your lab "${updated.title}" has been approved.`,
                        metadata: { labId: updated.id },
                    });
                    await notificationService.createNotification({
                        audience: "user",
                        eventType: "new_lab_published",
                        title: "New lab available",
                        message: `A new lab is now available: ${updated.title}`,
                        metadata: { labId: updated.id, broadcast_all_users: true, priority: "normal" },
                    });
                } catch (_) { }
            }
            return response.success(res, `Lab ${req.body.status}`, 200, { lab: updated });
        } catch (err) { return fail(res, err); }
    };

    getByCourse = async (req, res) => {
        try {
            const labs = await labService.getLabsByCourse(req.params.course_id);
            return response.success(res, "Labs fetched", 200, { labs });
        } catch (err) { return fail(res, err); }
    };

    create = async (req, res) => {
        try {
            await validate(req.body, {
                title: "required|string|minLength:3|maxLength:255",
                type: "string|in:hands_on,quiz,project,assessment",
                difficulty: "string|in:easy,medium,hard",
                course_id: "string",
                certification_id: "string",
                is_assignable: "boolean",
                price: "numeric|min:0",
            });

            const lab = await labService.create({
                ...req.body,
                course_id: req.params.course_id || req.body.course_id || null,
                created_by: req.user.user_id,
            });

            return response.success(res, "Lab created", 201, { lab });
        } catch (err) { return fail(res, err); }
    };

    // ── createFull — multipart/form-data ─────────────────────────────────────
    /**
     * FORM FIELDS (plain strings):
     *   title, slug, description, course_id, certification_id,
     *   type, difficulty, status, price, is_free, is_assignable,
     *   time_limit_minutes, passing_score, max_attempts
     *
     * JSON STRING FIELDS:
     *   questions → '[{"question_text":"...","type":"single","options":[...],"order":1}]'
     *
     * FILE FIELDS (req.files):
     *   thumbnail   → lab thumbnail image (single)
     *   media_files  → supporting files (array, matched by index to any future media[] field)
     */
    /**
     * POST /api/owner/labs/upload-instruction-media
     * Multipart field: file — image or video for lab Step 3 content (persists to disk, returns URL).
     */
    uploadInstructionMedia = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            if (!userId) return response.fail(res, "Authentication required", 401);

            const file = req.file;
            if (!file?.buffer?.length) {
                throw new AppError("No file uploaded", 400);
            }

            const replaceUrl = req.body?.replaceUrl || req.query?.replaceUrl;
            if (replaceUrl && mediaStorage.isOurStoredMediaUrl(replaceUrl)) {
                await mediaStorage.deleteMediaUrl(replaceUrl);
            }

            const isVideo = file.mimetype?.startsWith("video/");
            const baseName = randomUUID();
            const mediaFolder = "labs/instruction-media";
            let url;

            if (isVideo) {
                const localApiUrl = `/api/labs/instruction-media/${baseName}/index.m3u8`;
                url = mediaStorage.scheduleInstructionMediaHls(
                    file.buffer,
                    file.originalname || "video.mp4",
                    {
                        mediaId: baseName,
                        localApiUrl,
                        localDir: path.join(INSTRUCTION_MEDIA_DIR, baseName),
                        blobPrefix: `${mediaFolder}/${baseName}`,
                    },
                );
            } else {
                url = await mediaStorage.saveByMime(
                    file.buffer,
                    file.originalname || "file",
                    file.mimetype,
                    { folder: mediaFolder },
                );
            }

            return response.success(res, "File uploaded", 200, { url });
        } catch (err) {
            return fail(res, err);
        }
    };

    /**
     * GET /api/labs/intro-media/:labId/:filename
     * Public HLS for lab/course overview hero intro video.
     */
    serveIntroMedia = async (req, res) => {
        try {
            const { labId, filename } = req.params;
            if (!UUID_RE.test(labId) || !HLS_FILE_RE.test(filename)) {
                return response.fail(res, "Invalid intro media path", 400);
            }

            const filePath = path.join(INTRO_MEDIA_DIR, labId, filename);
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(path.resolve(INTRO_MEDIA_DIR))) {
                return response.fail(res, "Invalid intro media path", 400);
            }

            try {
                await fsp.access(resolved, fs.constants.R_OK);
            } catch {
                return response.fail(res, "Intro video not found", 404);
            }

            if (filename.endsWith(".m3u8")) {
                res.set("Content-Type", "application/vnd.apple.mpegurl");
                res.set("Cache-Control", "private, no-store");
            } else if (filename.endsWith(".ts")) {
                res.set("Content-Type", "video/MP2T");
                res.set("Cache-Control", "private, max-age=3600");
            }

            return fs.createReadStream(resolved).pipe(res);
        } catch (err) {
            return fail(res, err);
        }
    };

    /**
     * GET /api/labs/instruction-media/:mediaId/:filename
     * Serves HLS playlists/segments for embedded lab video only (blocks direct tab access).
     */
    serveInstructionMedia = async (req, res) => {
        try {
            if (!isEmbeddedMediaRequest(req)) {
                return response.fail(
                    res,
                    "This video can only be played inside the learning workspace.",
                    403
                );
            }

            const { mediaId, filename } = req.params;
            if (!UUID_RE.test(mediaId) || !HLS_FILE_RE.test(filename)) {
                return response.fail(res, "Invalid media path", 400);
            }

            const filePath = path.join(INSTRUCTION_MEDIA_DIR, mediaId, filename);
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(path.resolve(INSTRUCTION_MEDIA_DIR))) {
                return response.fail(res, "Invalid media path", 400);
            }

            try {
                await fsp.access(resolved, fs.constants.R_OK);
            } catch {
                return response.fail(res, "Media not found", 404);
            }

            if (filename.endsWith(".m3u8")) {
                res.set("Content-Type", "application/vnd.apple.mpegurl");
                res.set("Cache-Control", "private, no-store");
            } else if (filename.endsWith(".ts")) {
                res.set("Content-Type", "video/MP2T");
                res.set("Cache-Control", "private, max-age=3600");
            }

            return fs.createReadStream(resolved).pipe(res);
        } catch (err) {
            return fail(res, err);
        }
    };

    createFull = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            if (!userId) return response.fail(res, "Authentication required", 401);

            const { labData, modules, files } = parseLabFormBody(req);

            const title = labData.title;
            const slug = labData.slug || undefined;
            const description = labData.shortDescription || labData.description || null;
            const course_id = labData.course_id || req.params.course_id || null;
            const certification_id = labData.certification_id || labData.certificationId || null;
            const difficulty = labData.difficulty ? mapLevelToDifficulty(labData.difficulty) : "easy";
            const status = labData.status === "draft" ? "draft" : "published";
            const price = labData.price !== undefined ? parseFloat(labData.price) : 0;
            const is_free = toBool(labData.is_free) ?? toBool(labData.isFree) ?? (price === 0);
            const is_assignable = toBool(labData.is_assignable) ?? false;
            const time_limit_minutes = labData.duration ? parseInt(labData.duration, 10) : null;
            const tags = parseJSON(labData.technologies || labData.tags, "tags") || [];

            const lab_kind_raw = String(labData.lab_kind || "hands_on").toLowerCase();
            const lab_kind = lab_kind_raw === "skill_builder" ? "skill_builder" : "hands_on";

            const instructionsPayload = {
                version: 1,
                modules: modules,
                technologies: labData.technologies || [],
                requirements: labData.requirements || [],
                learningOutcomes: labData.learningOutcomes || [],
                objectives: labData.objectives || [],
                certificate: buildLabCertificateConfig(labData),
            };

            const instructions = JSON.stringify(instructionsPayload);

            let metadata = {};
            if (labData.metadata != null && labData.metadata !== "") {
                try {
                    metadata = typeof labData.metadata === "object" && !Array.isArray(labData.metadata)
                        ? { ...labData.metadata }
                        : parseJSON(labData.metadata, "metadata");
                } catch {
                    metadata = {};
                }
            }
            metadata.lab_kind = lab_kind;
            metadata.fullDescription = labData.fullDescription || null;
            metadata.rating =
                labData.rating != null && labData.rating !== ""
                    ? Number(labData.rating)
                    : null;
            metadata.studentCount =
                labData.studentCount != null && labData.studentCount !== ""
                    ? Number(labData.studentCount)
                    : null;
            metadata.createdBy = labData.createdBy || null;
            metadata.platform = labData.platform || metadata.platform || null;
            metadata.currency = labData.currency || labData.currency_code || metadata.currency || "INR";
            if (labData.introVideoUrl && String(labData.introVideoUrl).trim()) {
                const introUrl = String(labData.introVideoUrl).trim();
                metadata.introVideoUrl = introUrl;
                metadata.intro_video_url = introUrl;
            }
            if (typeof labData.thumbnail === "string" && labData.thumbnail.trim() && !files.thumbnail?.[0]) {
                metadata.thumbnailUrl = labData.thumbnail.trim();
            }

            let type = labData.type || mapLabTypeToEnum(labData.labType);
            if (lab_kind === "skill_builder") type = "assessment";

            let passing_score = labData.passing_score ? parseInt(labData.passing_score, 10) : 70;
            let max_attempts = labData.max_attempts ? parseInt(labData.max_attempts, 10) : null;

            await validate({ title }, {
                title: "required|string|minLength:3|maxLength:255",
            });

            const questions_raw = parseJSON(labData.questions, "questions") || [];
            if (!Array.isArray(questions_raw)) throw new AppError("questions must be a JSON array", 400);

            const thumbnail_file = files.thumbnail?.[0] || null;
            const intro_video_file = files.introVideo?.[0] || null;
            const media_files = files.mediaFiles || [];

            const questions = questions_raw.map((q, idx) => ({
                question: q.question_text || q.question,
                type: normalizeQuestionType(q.type),
                options: Array.isArray(q.options) ? q.options.map(o => ({
                    text: o.text,
                    is_correct: toBool(o.is_correct) ?? false,
                })) : [],
                correct_answer: resolveCorrectAnswer(q),
                explanation: q.explanation || null,
                starter_code: q.starter_code || null,
                marks: q.marks || 1,
                sort_order: q.order ?? idx,
            }));

            const lab = await labService.createFull(
                {
                    title,
                    slug,
                    description,
                    instructions,
                    course_id,
                    certification_id,
                    type,
                    difficulty,
                    status,
                    price,
                    is_free,
                    is_assignable,
                    time_limit_minutes,
                    passing_score,
                    max_attempts,
                    tags,
                    metadata,
                    questions,
                    _thumbnail_file: thumbnail_file,
                    _intro_video_file: intro_video_file,
                    _media_files: media_files,
                },
                userId
            );

            return response.success(res, "Lab created", 201, { lab });
        } catch (err) { return fail(res, err); }
    };

    update = async (req, res) => {
        try {
            await validate(req.body, {
                title: "string|minLength:3|maxLength:255",
                status: "string|in:draft,published,archived",
                difficulty: "string|in:easy,medium,hard",
                passing_score: "integer|min:0|max:100",
                price: "numeric|min:0",
            });

            const existing = await labService.getById(req.params.id);
            await assertCanModify(req, existing, {
                ownPermission: ["edit_labs", "create_labs"],
                otherPermission: "other_user_edit_labs",
            });

            const lab = await labService.update(req.params.id, {
                ...req.body,
                updated_by: req.user.user_id,
            });

            return response.success(res, "Lab updated", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    updateFull = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            if (!userId) return response.fail(res, "Authentication required", 401);

            const existingLab = await labService.getById(req.params.id);
            await assertCanModify(req, existingLab, {
                ownPermission: ["edit_labs", "create_labs"],
                otherPermission: "other_user_edit_labs",
            });

            const { labData, modules, files } = parseLabFormBody(req);

            const title = labData.title;
            const slug = labData.slug || undefined;
            const description = labData.shortDescription || labData.description || null;
            const course_id = labData.course_id || null;
            const certification_id = labData.certification_id || labData.certificationId || null;
            const difficulty = labData.difficulty ? mapLevelToDifficulty(labData.difficulty) : undefined;
            const status = labData.status === "draft" ? "draft" : "published";
            const price = labData.price !== undefined ? parseFloat(labData.price) : undefined;
            const is_free = toBool(labData.is_free) ?? toBool(labData.isFree) ?? (price === 0);
            const is_assignable = toBool(labData.is_assignable) ?? undefined;
            const time_limit_minutes = labData.duration ? parseInt(labData.duration, 10) : null;
            const tags = parseJSON(labData.technologies || labData.tags, "tags") || undefined;

            const lab_kind_raw = String(labData.lab_kind || "hands_on").toLowerCase();
            const lab_kind = lab_kind_raw === "skill_builder" ? "skill_builder" : "hands_on";

            const instructionsPayload = {
                version: 1,
                modules: modules,
                technologies: labData.technologies || [],
                requirements: labData.requirements || [],
                learningOutcomes: labData.learningOutcomes || [],
                objectives: labData.objectives || [],
                certificate: buildLabCertificateConfig(labData),
            };

            const instructions = JSON.stringify(instructionsPayload);

            let metadata = {};
            if (labData.metadata != null && labData.metadata !== "") {
                try {
                    metadata = typeof labData.metadata === "object" && !Array.isArray(labData.metadata)
                        ? { ...labData.metadata }
                        : parseJSON(labData.metadata, "metadata");
                } catch {
                    metadata = {};
                }
            }
            metadata.lab_kind = lab_kind;
            metadata.fullDescription = labData.fullDescription || undefined;
            metadata.rating =
                labData.rating != null && labData.rating !== ""
                    ? Number(labData.rating)
                    : undefined;
            metadata.studentCount =
                labData.studentCount != null && labData.studentCount !== ""
                    ? Number(labData.studentCount)
                    : undefined;
            metadata.createdBy = labData.createdBy || undefined;
            metadata.platform = labData.platform || metadata.platform || undefined;
            metadata.currency = labData.currency || labData.currency_code || metadata.currency || "INR";
            if (labData.introVideoUrl && String(labData.introVideoUrl).trim() && !files.introVideo?.[0]) {
                const introUrl = String(labData.introVideoUrl).trim();
                metadata.introVideoUrl = introUrl;
                metadata.intro_video_url = introUrl;
            }
            if (typeof labData.thumbnail === "string" && labData.thumbnail.trim() && !files.thumbnail?.[0]) {
                metadata.thumbnailUrl = labData.thumbnail.trim();
            }

            let type = labData.type || mapLabTypeToEnum(labData.labType);
            if (lab_kind === "skill_builder") type = "assessment";

            let passing_score = labData.passing_score ? parseInt(labData.passing_score, 10) : undefined;
            let max_attempts = labData.max_attempts ? parseInt(labData.max_attempts, 10) : undefined;

            if (title) {
                await validate({ title }, {
                    title: "required|string|minLength:3|maxLength:255",
                });
            }

            const questions_raw = parseJSON(labData.questions, "questions") || [];
            if (!Array.isArray(questions_raw)) throw new AppError("questions must be a JSON array", 400);

            const questions = questions_raw.map((q, idx) => ({
                question: q.question_text || q.question,
                type: normalizeQuestionType(q.type),
                options: Array.isArray(q.options) ? q.options.map(o => ({
                    text: o.text,
                    is_correct: toBool(o.is_correct) ?? false,
                })) : [],
                correct_answer: resolveCorrectAnswer(q),
                explanation: q.explanation || null,
                starter_code: q.starter_code || null,
                marks: q.marks || 1,
                sort_order: q.order ?? idx,
            }));

            const thumbnail_file = files.thumbnail?.[0] || null;
            const intro_video_file = files.introVideo?.[0] || null;
            const media_files = files.mediaFiles || [];

            const lab = await labService.updateFull(
                req.params.id,
                {
                    title,
                    slug,
                    description,
                    instructions,
                    course_id,
                    certification_id,
                    type,
                    difficulty,
                    status,
                    price,
                    is_free,
                    is_assignable,
                    time_limit_minutes,
                    passing_score,
                    max_attempts,
                    tags,
                    metadata,
                    questions,
                    _thumbnail_file: thumbnail_file,
                    _intro_video_file: intro_video_file,
                    _media_files: media_files,
                },
                userId
            );

            return response.success(res, "Lab updated", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    deleteLab = async (req, res) => {
        try {
            const existing = await labService.getById(req.params.id);
            await assertCanModify(req, existing, {
                ownPermission: "delete_labs",
                otherPermission: "other_user_delete_labs",
            });
            await labService.delete(req.params.id);
            return response.success(res, "Lab deleted", 200);
        } catch (err) { return fail(res, err); }
    };

    reorder = async (req, res) => {
        try {
            await validate(req.body, { ordered_ids: "required|array" });
            const labs = await labService.reorderLabs(req.params.course_id, req.body.ordered_ids);
            return response.success(res, "Labs reordered", 200, { labs });
        } catch (err) { return fail(res, err); }
    };

    // ── Certification ─────────────────────────────────────────────────────────

    assignCertification = async (req, res) => {
        try {
            await validate(req.body, { certification_id: "required|string" });
            const lab = await labService.assignCertification(
                req.params.id, req.body.certification_id, req.user.user_id
            );
            return response.success(res, "Certification added", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    removeCertification = async (req, res) => {
        try {
            const lab = await labService.removeCertification(req.params.id, req.user.user_id);
            return response.success(res, "Certification removed from lab", 200, { lab });
        } catch (err) { return fail(res, err); }
    };

    // ── Questions ─────────────────────────────────────────────────────────────

    addQuestion = async (req, res) => {
        try {
            await validate(req.body, {
                question: "required|string",
                type: "required|string|in:mcq,true_false,short_answer,code,essay",
                marks: "integer|min:1",
                starter_code: "string",
            });

            const question = await labService.addQuestion(req.params.id, {
                ...req.body,
                created_by: req.user.user_id,
                lab_id: req.params.id,
            });

            return response.success(res, "Question added", 201, { question });
        } catch (err) { return fail(res, err); }
    };

    bulkCreateQuestions = async (req, res) => {
        try {
            await validate(req.body, { questions: "required|array" });

            const result = await labService.bulkCreateQuestions(
                req.params.id,
                req.body.questions.map(q => ({ ...q, created_by: req.user.user_id }))
            );

            return response.success(res, "Questions added", 201, { questions: result });
        } catch (err) { return fail(res, err); }
    };

    updateQuestion = async (req, res) => {
        try {
            const question = await labService.updateQuestion(
                req.params.id, req.params.question_id, req.body
            );
            return response.success(res, "Question updated", 200, { question });
        } catch (err) { return fail(res, err); }
    };

    deleteQuestion = async (req, res) => {
        try {
            await labService.deleteQuestion(req.params.id, req.params.question_id);
            return response.success(res, "Question deleted", 200);
        } catch (err) { return fail(res, err); }
    };

    // ── Assignments ───────────────────────────────────────────────────────────

    assignLab = async (req, res) => {
        try {
            await validate(req.body, {
                assigned_to: "required|string",
                due_date: "date",
            });

            const assignment = await labService.assignLab(
                req.params.id,
                req.body.assigned_to,
                req.user.user_id,
                { due_date: req.body.due_date || null, notes: req.body.notes || null }
            );

            return response.success(res, "Lab assigned", 201, { assignment });
        } catch (err) { return fail(res, err); }
    };

    getAssignments = async (req, res) => {
        try {
            const assignments = await labService.getAssignmentsByLab(req.params.id);
            return response.success(res, "Assignments fetched", 200, { assignments });
        } catch (err) { return fail(res, err); }
    };

    assignToMe = async (req, res) => {
        try {
            const assignment = await labService.assignLab(
                req.params.id,
                req.user.user_id,
                req.body.due_at || null
            );
            return response.success(res, "Lab assigned", 201, { assignment });
        } catch (err) { return fail(res, err); }
    };

    getMyAssignments = async (req, res) => {
        try {
            const assignments = await labService.getMyAssignments(req.user.user_id);
            return response.success(res, "Assignments fetched", 200, { assignments });
        } catch (err) { return fail(res, err); }
    };

    updateAssignment = async (req, res) => {
        try {
            const assignment = await labService.updateAssignment(req.params.assignment_id, req.body);
            return response.success(res, "Assignment updated", 200, { assignment });
        } catch (err) { return fail(res, err); }
    };

    revokeAssignment = async (req, res) => {
        try {
            await validate(req.body, { assigned_to: "required|string" });
            await labService.revokeAssignment(req.params.id, req.body.assigned_to);
            return response.success(res, "Assignment revoked", 200);
        } catch (err) { return fail(res, err); }
    };
}

module.exports = new LabController();
