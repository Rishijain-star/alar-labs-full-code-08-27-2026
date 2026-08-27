const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");
const {
  Enrollment,
  Lab,
  Course,
  User,
  LabAssignment,
  LabEnrollment,
  Certification,
  SiteBranding,
  ExpertTrainingProgramEnrollment,
  ExpertTrainingProgram,
} = require("../models");
const { AppError } = require("../middleware/errorHandler");
const notificationService = require("./notificationService");
const transactionalEmailService = require("./transactionalEmailService");
const systemSettingsService = require("./systemSettingsService");
const expertTrainingProgramEnrollmentService = require("./expertTrainingProgramEnrollmentService");

function parseLabMeta(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseCourseMetadata(raw) {
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

/** Published lab IDs bundled with a course (FK + metadata.modules + metadata.labs). */
async function collectPublishedLabIdsForCourse(courseId) {
  const course = await Course.findByPk(courseId, { attributes: ["id", "metadata"] });
  if (!course) return [];
  const meta = parseCourseMetadata(course.metadata);
  const labIds = new Set();

  const fkLabs = await Lab.findAll({
    where: { course_id: courseId, status: "published" },
    attributes: ["id"],
  });
  fkLabs.forEach((l) => labIds.add(String(l.id)));

  if (Array.isArray(meta.labs)) {
    meta.labs.forEach((id) => labIds.add(String(id)));
  }
  for (const mod of meta.modules || []) {
    for (const item of mod.items || mod.lessons || []) {
      if (
        (item.type === "skill_builder_lab" || item.type === "normal_lab")
        && item.reference_id
      ) {
        labIds.add(String(item.reference_id));
      }
    }
  }

  const published = [];
  for (const lid of labIds) {
    const lab = await Lab.findOne({
      where: { id: lid, status: "published" },
      attributes: ["id"],
    });
    if (lab) published.push(lab.id);
  }
  return published;
}

function labReferencedInCourseMeta(meta, labId) {
  const lid = String(labId);
  if (Array.isArray(meta?.labs) && meta.labs.map(String).includes(lid)) return true;
  for (const mod of meta?.modules || []) {
    for (const item of mod.items || mod.lessons || []) {
      if (
        (item.type === "skill_builder_lab" || item.type === "normal_lab")
        && item.reference_id
        && String(item.reference_id) === lid
      ) {
        return true;
      }
    }
  }
  return false;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fetch remote image for PDF embedding (site logo). */
function fetchUrlBuffer(absUrl, maxBytes = 2_000_000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(absUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        resolve(null);
        return;
      }
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.get(absUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = new URL(res.headers.location, absUrl).href;
            res.resume();
            fetchUrlBuffer(next, maxBytes).then(resolve);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            resolve(null);
            return;
          }
          const chunks = [];
          let total = 0;
          res.on("data", (chunk) => {
            total += chunk.length;
            if (total > maxBytes) {
              res.destroy();
            } else {
              chunks.push(chunk);
            }
          });
          res.on("end", () => {
            if (total > maxBytes) resolve(null);
            else resolve(Buffer.concat(chunks));
          });
        }
      );
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });
      req.on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function verificationCodeForCourse(userId, courseId, salt) {
  const secret = process.env.CERT_ISSUER_SECRET || process.env.JWT_SECRET || "dev-cert-secret-change-me";
  const payload = `${userId}|${courseId}|${salt || ""}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16).toUpperCase();
}

function buildCertificatePdfBuffer(data, logoBuffer = null) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks = [];
    doc.on("data", (d) => chunks.push(d));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const pageW = doc.page.width;
    let y = 54;
    if (logoBuffer && Buffer.isBuffer(logoBuffer) && logoBuffer.length > 0) {
      try {
        const maxW = 120;
        const maxH = 44;
        const x = (pageW - maxW) / 2;
        doc.image(logoBuffer, x, y, { fit: [maxW, maxH] });
        y += maxH + 14;
      } catch (_) {
        /* optional */
      }
    }
    doc.y = y;
    doc.fillColor("#64748b").fontSize(10).text("CERTIFICATE OF COMPLETION", { align: "center" });
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text(String(data.courseTitle || "Course"), { align: "center" });
    doc.font("Helvetica");
    doc.moveDown(1);
    doc.fontSize(12).fillColor("#334155").text("This certifies that", { align: "center" });
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(String(data.learnerName || "Learner"), { align: "center" });
    doc.font("Helvetica");
    doc.moveDown(1);
    doc
      .fontSize(11)
      .fillColor("#475569")
      .text(`Completed all labs in this course bundle: ${data.completedLabs} / ${data.totalLabs}`, { align: "center" });
    doc.moveDown(0.8);
    doc.fontSize(10).text(`Organization: ${String(data.orgName || "ALAR Labs")}`, { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor("#64748b").text(`Certificate ID: ${data.certificateId}`, { align: "center" });
    doc.text(`Issued: ${new Date(data.issuedAt).toLocaleDateString()}`, { align: "center" });
    doc.text(`Verification: ${data.verificationCode}`, { align: "center" });
    doc.end();
  });
}

function labKindFromRow(lab) {
  if (!lab) return null;
  const m = parseLabMeta(lab.metadata);
  return m.lab_kind || (lab.type === "assessment" ? "skill_builder" : "hands_on") || null;
}

async function batchCountByField(Model, field, ids, extraWhere = {}) {
  const map = new Map();
  if (!ids?.length) return map;
  const { sequelize } = require("../models");
  const rows = await Model.findAll({
    attributes: [field, [sequelize.fn("COUNT", sequelize.col("id")), "cnt"]],
    where: { [field]: { [Op.in]: ids }, ...extraWhere },
    group: [field],
    raw: true,
  });
  for (const r of rows) {
    map.set(r[field], Number(r.cnt) || 0);
  }
  return map;
}

function parseLabInstructions(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Auto-graded points only (matches Skill Builder UI — code/short-answer are not auto-scored).
 */
function scoreSkillBuilderTasks(tasks, answers) {
  const ansMap = answers && typeof answers === "object" ? answers : {};
  let earned = 0;
  let total = 0;
  for (const t of tasks || []) {
    const pts = Number(t.points) || 0;
    total += pts;
    const ans = ansMap[t.id];
    if (t.type === "mcq") {
      if (ans === t.correctOptions?.[0]) earned += pts;
    } else if (t.type === "true_false") {
      if (ans === t.correctAnswer) earned += pts;
    } else if (t.type === "multi_select") {
      const s = new Set(t.correctOptions || []);
      const g = new Set(Array.isArray(ans) ? ans : []);
      if ([...s].every((x) => g.has(x)) && [...g].every((x) => s.has(x))) earned += pts;
    } else if (t.type === "fill_blank") {
      const ok = (t.blanks || []).every((b) => {
        const v = ans?.[b.id] || "";
        return b.caseSensitive
          ? v === b.answer
          : String(v).toLowerCase() === String(b.answer).toLowerCase();
      });
      if (ok) earned += pts;
    } else if (t.type === "drag_drop") {
      if ((t.pairs || []).every((p) => ans?.[p.id] === p.right)) earned += pts;
    }
  }
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { earned, total, pct };
}

function findBlockInModules(modules, blockId) {
  for (const mod of modules || []) {
    for (const les of mod.lessons || []) {
      for (const block of les.blocks || []) {
        if (block.id === blockId) return block;
      }
    }
  }
  return null;
}

function findBlockInCourseModules(modules, blockId) {
  for (const mod of modules || []) {
    const entries = Array.isArray(mod.items) && mod.items.length
      ? mod.items
      : (mod.lessons || []);
    for (const entry of entries) {
      for (const block of entry.blocks || entry.tasks || []) {
        if (String(block.id) === String(blockId)) return block;
      }
    }
  }
  return null;
}

function gradeAutoBlock(block, answer) {
  let correct = false;
  let explanation = null;

  if (block.type === "quiz") {
    correct = Number(answer) === Number(block.correctAnswer);
    explanation = block.explanation || null;
  } else if (block.type === "fillBlank") {
    correct =
      String(answer || "").trim().toLowerCase() ===
      String(block.answer || "").trim().toLowerCase();
    explanation = block.explanation || null;
  } else if (block.type === "trueFalse") {
    correct = answer === block.correctAnswer;
    explanation = block.explanation || null;
  } else {
    throw new AppError("Block type is not auto-gradable", 400);
  }

  return {
    correct,
    explanation: explanation && String(explanation).trim() ? explanation : null,
    points: correct ? Number(block.points) || 10 : 0,
  };
}

class LearningService {
  async getMyLearning(userId) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const courseRows = await Enrollment.findAll({
      where: { user_id: userId, status: { [Op.in]: ["active", "completed"] } },
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "title", "slug", "thumbnail", "is_free", "price", "level", "status"],
        },
      ],
      order: [["updated_at", "DESC"]],
    });

    const courses = (
      await Promise.all(
        courseRows.map(async (e) => {
          const c = e.course;
          if (!c) return null;
          const certificateReady = await this.canDownloadCourseCertificate(userId, c.id);
          return {
            enrollmentId: e.id,
            courseId: c.id,
            title: c.title,
            slug: c.slug,
            thumbnail: c.thumbnail,
            isFree: !!c.is_free,
            price: c.price,
            level: c.level,
            progress: e.progress ?? 0,
            status: e.status,
            source: e.order_id ? "purchase" : "free",
            enrolledAt: e.enrolled_at,
            lastAccessedAt: e.last_accessed_at,
            certificateReady,
            description: c.description,
            metadata: c.metadata,
            rating: c.rating,
            enrolledCount: c.enrolledCount || c.enrolled_count,
            platform: c.platform,
            vendorPlatform: c.vendorPlatform || c.vendor_platform,
            duration: c.duration,
            modulesCount: c.modulesCount || c.modules_count,
            labsCount: c.labsCount || c.labs_count,
            skills: c.skills,
          };
        })
      )
    ).filter(Boolean);

    const courseIds = courses.map((c) => c.courseId);

    const labsFromCourses = courseIds.length
      ? await Lab.findAll({
        where: { course_id: { [Op.in]: courseIds }, status: "published" },
        attributes: [
          "id",
          "title",
          "slug",
          "thumbnail",
          "difficulty",
          "time_limit_minutes",
          "course_id",
          "metadata",
          "description",
          "status",
          "is_free",
          "price",
        ],
      })
      : [];

    const courseById = {};
    courseRows.forEach((e) => {
      if (e.course) courseById[e.course_id] = e;
    });

    const labsInCourses = labsFromCourses.map((lab) => {
      const en = courseById[lab.course_id];
      return {
        labId: lab.id,
        title: lab.title,
        slug: lab.slug,
        thumbnail: lab.thumbnail,
        difficulty: lab.difficulty,
        durationMin: lab.time_limit_minutes,
        courseId: lab.course_id,
        courseTitle: en?.course?.title,
        source: "course",
        progress: en?.progress ?? 0,
        labKind: labKindFromRow(lab),
        description: lab.description,
        metadata: lab.metadata,
        rating: lab.rating,
        enrolledCount: lab.enrolledCount || lab.enrolled_count,
        platform: lab.platform,
        isFree: lab.is_free,
        price: lab.price,
      };
    });

    const assignments = await LabAssignment.findAll({
      where: { assigned_to: userId },
      include: [
        {
          model: Lab,
          as: "lab",
          attributes: ["id", "title", "slug", "thumbnail", "difficulty", "time_limit_minutes", "metadata", "description", "course_id", "is_free", "price"],
        },
      ],
    });

    const assignedLabsList = assignments
      .filter((a) => a.lab)
      .map((a) => ({
        labId: a.lab.id,
        title: a.lab.title,
        slug: a.lab.slug,
        thumbnail: a.lab.thumbnail,
        difficulty: a.lab.difficulty,
        durationMin: a.lab.time_limit_minutes,
        source: "assignment",
        assignmentStatus: a.status,
        progress: a.status === "completed" ? 100 : a.status === "in_progress" ? 50 : 0,
        score: a.score,
        labKind: labKindFromRow(a.lab),
        description: a.lab.description,
        metadata: a.lab.metadata,
        rating: a.lab.rating,
        enrolledCount: a.lab.enrolledCount || a.lab.enrolled_count,
        platform: a.lab.platform,
        isFree: a.lab.is_free,
        price: a.lab.price,
      }));

    const directLabEnrolls = await LabEnrollment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Lab,
          as: "lab",
          attributes: ["id", "title", "slug", "thumbnail", "difficulty", "time_limit_minutes", "metadata", "description", "course_id", "is_free", "price"],
        },
      ],
    });

    const labsDirect = directLabEnrolls
      .filter((r) => r.lab && !r.lab.course_id)
      .map((r) => ({
        labId: r.lab.id,
        title: r.lab.title,
        slug: r.lab.slug,
        thumbnail: r.lab.thumbnail,
        difficulty: r.lab.difficulty,
        durationMin: r.lab.time_limit_minutes,
        source: r.source === "purchase" ? "purchase" : "free_enroll",
        progress: r.progress ?? 0,
        status: r.status,
        labKind: labKindFromRow(r.lab),
        description: r.lab.description,
        metadata: r.lab.metadata,
        rating: r.lab.rating,
        enrolledCount: r.lab.enrolledCount || r.lab.enrolled_count,
        platform: r.lab.platform,
        isFree: r.lab.is_free,
        price: r.lab.price,
      }));

    const labKey = (x) => x.labId;
    const mergedMap = new Map();
    [...labsInCourses, ...assignedLabsList, ...labsDirect].forEach((row) => {
      const k = labKey(row);
      if (!mergedMap.has(k)) mergedMap.set(k, row);
    });
    const labs = [...mergedMap.values()];

    const labsStarted = labs.filter(
      (l) =>
        (l.progress || 0) > 0 ||
        l.assignmentStatus === "in_progress" ||
        l.source === "assignment"
    ).length;

    const labsCompleted = labs.filter(
      (l) => (l.progress || 0) >= 100 || l.assignmentStatus === "completed"
    ).length;

    const trainingPrograms = await expertTrainingProgramEnrollmentService.listForUser(userId);
    const { VoucherPurchase } = require('../models');
    const hasVouchers = await VoucherPurchase.count({ where: { user_id: userId, status: 'purchased' } }) > 0;

    return {
      stats: {
        coursesEnrolled: courses.length,
        labsInList: labs.length,
        labsStarted,
        labsCompleted: Math.min(labsCompleted, labs.length),
      },
      hasVouchers,
      courses,
      trainingPrograms,
      labs,
    };
  }

  async enrollCourse(userId, courseId, opts = {}) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const course = await Course.findByPk(courseId);
    if (!course) throw new AppError("Course not found", 404);
    if (course.status !== "published") throw new AppError("Course is not available", 400);

    const isPurchase = !!opts.orderId || (!course.is_free && Number(course.price) > 0);
    const isFree = !isPurchase;

    if (!isFree && !opts.confirmPurchase) {
      throw new AppError("Paid enrollment requires checkout (use confirmPurchase for admin testing)", 402);
    }

    const [row, created] = await Enrollment.findOrCreate({
      where: { user_id: userId, course_id: courseId },
      defaults: {
        status: "active",
        progress: 0,
        order_id: opts.orderId || (isPurchase ? `ord_${Date.now()}` : null),
      },
    });

    let reactivated = false;
    if (!created) {
      if (row.status === "cancelled" || opts.orderId) {
        row.status = "active";
        if (opts.orderId) row.order_id = opts.orderId;
        await row.save();
        reactivated = true;
      }
    }

    await this.syncLabEnrollmentsForCourse(userId, courseId, {
      orderId: row.order_id,
      isFree,
    });
    if (created || reactivated) {
      try {
        const user = await User.findByPk(userId, { attributes: ["user_id", "email", "full_name"] });
        await transactionalEmailService.sendEnrollmentEmails({
          user,
          itemTitle: course.title,
          itemType: "course",
          isFree,
          isPurchase: !isFree && !!opts.confirmPurchase,
        });
      } catch (_) { }
    }

    try {
      const courseRepository = require("../repositories/courseRepository");
      await courseRepository.invalidateCache(courseId, course.slug);
    } catch (_) { }

    return { enrollment: row, created };
  }

  /**
   * Ensure every published lab in the course has a LabEnrollment row so
   * "my learning" and access checks stay consistent after course enroll.
   */
  async syncLabEnrollmentsForCourse(userId, courseId, { orderId = null, isFree = true } = {}) {
    const course = await Course.findByPk(courseId, { attributes: ["id", "metadata"] });
    if (!course) return;

    const meta = parseCourseMetadata(course.metadata);
    const labIds = new Set();

    const fkLabs = await Lab.findAll({
      where: { course_id: courseId, status: "published" },
      attributes: ["id"],
    });
    fkLabs.forEach((l) => labIds.add(String(l.id)));

    if (Array.isArray(meta.labs)) {
      meta.labs.forEach((id) => labIds.add(String(id)));
    }
    for (const mod of meta.modules || []) {
      for (const item of mod.items || mod.lessons || []) {
        if (
          (item.type === "skill_builder_lab" || item.type === "normal_lab")
          && item.reference_id
        ) {
          labIds.add(String(item.reference_id));
        }
      }
    }

    const source = isFree ? "free" : "course_bundle";
    for (const labId of labIds) {
      const published = await Lab.findOne({
        where: { id: labId, status: "published" },
        attributes: ["id"],
      });
      if (!published) continue;
      await LabEnrollment.findOrCreate({
        where: { user_id: userId, lab_id: labId },
        defaults: {
          status: "active",
          progress: 0,
          source,
          order_id: isFree ? null : orderId || null,
          started_at: null,
          last_activity_at: new Date(),
        },
      });
    }
  }

  /**
   * @returns {Map<string, boolean>} lab UUID string -> completed
   */
  async getLabCompletionMap(userId, labIds) {
    const map = new Map();
    if (!userId || !labIds?.length) return map;
    const rows = await LabEnrollment.findAll({
      where: { user_id: userId, lab_id: { [Op.in]: labIds } },
      attributes: ["lab_id", "progress", "status"],
    });
    for (const r of rows) {
      const done = r.status === "completed" || (r.progress ?? 0) >= 100;
      map.set(String(r.lab_id), done);
    }
    return map;
  }

  async syncCourseEnrollmentProgress(userId, courseId) {
    const labIds = await collectPublishedLabIdsForCourse(courseId);
    const total = labIds.length;
    if (!total) return;

    const rows = await LabEnrollment.findAll({
      where: { user_id: userId, lab_id: { [Op.in]: labIds } },
      attributes: ["lab_id", "progress", "status"],
    });
    const done = rows.filter(
      (r) => r.status === "completed" || (r.progress ?? 0) >= 100
    ).length;
    const pct = Math.min(100, Math.round((done / total) * 100));

    const [n] = await Enrollment.update(
      { progress: pct, last_accessed_at: new Date() },
      { where: { user_id: userId, course_id: courseId, status: { [Op.in]: ["active", "completed"] } } }
    );
    if (n && done >= total) {
      await Enrollment.update(
        { status: "completed", progress: 100, last_accessed_at: new Date() },
        { where: { user_id: userId, course_id: courseId, status: "active" } }
      );
    }
  }

  /**
   * Mark a lab completed (e.g. user finished bundle step or passed skill builder).
   * Updates course enrollment progress when the lab belongs to a course.
   */
  async completeLab(userId, labId) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const lab = await Lab.findByPk(labId);
    if (!lab || lab.status !== "published") throw new AppError("Lab not found", 404);

    if (lab.course_id) {
      const en = await Enrollment.findOne({
        where: {
          user_id: userId,
          course_id: lab.course_id,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!en) throw new AppError("Enroll in the course to complete this lab", 403);

      const course = await Course.findByPk(lab.course_id);
      const isFree = course && (!!course.is_free || Number(course.price) === 0);
      await this.syncLabEnrollmentsForCourse(userId, lab.course_id, {
        orderId: en.order_id,
        isFree,
      });
    } else {
      const existing = await LabEnrollment.findOne({
        where: { user_id: userId, lab_id: labId },
      });
      if (!existing) throw new AppError("Enroll in this lab first", 403);
    }

    let row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!row) throw new AppError("Could not record lab progress", 500);

    await row.update({
      status: "completed",
      progress: 100,
      completed_at: row.completed_at || new Date(),
      last_activity_at: new Date(),
    });

    if (lab.course_id) {
      await this.syncCourseEnrollmentProgress(userId, lab.course_id);
      const refreshEnrollment = await Enrollment.findOne({
        where: { user_id: userId, course_id: lab.course_id },
      });
      if (refreshEnrollment?.status === "completed") {
        try {
          const completedCourse = await Course.findByPk(lab.course_id);
          await notificationService.createNotification({
            userId,
            audience: "user",
            eventType: "course_completion",
            title: "Course completed",
            message: `Congratulations! You completed ${completedCourse?.title || "your course"}.`,
            metadata: { courseId: lab.course_id },
          });
        } catch (_) { }
      }
    } else {
      const grant = await this.findCourseEnrollmentGrantingLabAccess(userId, labId);
      if (grant?.course_id) {
        await this.syncCourseEnrollmentProgress(userId, grant.course_id);
      }
    }

    return { labEnrollment: row };
  }

  /** Update in-progress lab enrollment (block learning); does not mark completed. */
  async saveLabLearningProgress(userId, labId, progress) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const pct = Math.min(99, Math.max(0, Math.round(Number(progress) || 0)));

    const lab = await Lab.findByPk(labId);
    if (!lab || lab.status !== "published") throw new AppError("Lab not found", 404);

    if (lab.course_id) {
      const en = await Enrollment.findOne({
        where: {
          user_id: userId,
          course_id: lab.course_id,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!en) throw new AppError("Enroll in the course to access this lab", 403);
    } else {
      const existing = await LabEnrollment.findOne({
        where: { user_id: userId, lab_id: labId },
      });
      if (!existing) throw new AppError("Enroll in this lab first", 403);
    }

    let row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!row) throw new AppError("Could not record lab progress", 500);

    await row.update({
      progress: pct,
      last_activity_at: new Date(),
      started_at: row.started_at || new Date(),
    });

    return { labEnrollment: row };
  }

  /**
   * Build the server-authoritative timer payload for a lab enrollment.
   * Deadline = started_at + time_limit_minutes. Null limit = no countdown.
   */
  _buildLabTimer(lab, row) {
    const mins = Number(lab.time_limit_minutes);
    const hasLimit = Number.isFinite(mins) && mins > 0;
    const startedAt = row.started_at ? new Date(row.started_at) : null;
    const serverNow = Date.now();

    let expiresAt = null;
    let remainingSeconds = null;
    if (hasLimit && startedAt) {
      const expMs = startedAt.getTime() + mins * 60000;
      expiresAt = new Date(expMs).toISOString();
      remainingSeconds = Math.max(0, Math.round((expMs - serverNow) / 1000));
    }

    return {
      startedAt: startedAt ? startedAt.toISOString() : null,
      timeLimitMinutes: hasLimit ? Math.round(mins) : null,
      expiresAt,
      remainingSeconds,
      serverNow: new Date(serverNow).toISOString(),
      status: row.status,
      progress: row.progress,
    };
  }

  /**
   * Start (or resume) a lab's countdown. Records started_at the first time the
   * enrolled user opens the lab; idempotent afterwards so refreshes/re-entry
   * return the same deadline. Returns the server-authoritative timer.
   */
  async startLabTimer(userId, labId) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const lab = await Lab.findByPk(labId);
    if (!lab || lab.status !== "published") throw new AppError("Lab not found", 404);

    if (lab.course_id) {
      const en = await Enrollment.findOne({
        where: {
          user_id: userId,
          course_id: lab.course_id,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!en) throw new AppError("Enroll in the course to access this lab", 403);
    } else {
      const existing = await LabEnrollment.findOne({
        where: { user_id: userId, lab_id: labId },
      });
      if (!existing) throw new AppError("Enroll in this lab first", 403);
    }

    const row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!row) throw new AppError("Could not start lab", 500);

    const now = new Date();
    // Only set started_at once — the deadline must not move on re-entry.
    await row.update({
      started_at: row.started_at || now,
      last_activity_at: now,
    });

    return { timer: this._buildLabTimer(lab, row) };
  }

  /** Update course enrollment progress from lesson/block learning (metadata path). */
  async saveCourseLearningProgress(userId, courseId, progress) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const pct = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)));

    const course = await Course.findByPk(courseId);
    if (!course || course.status !== "published") throw new AppError("Course not found", 404);

    const en = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id: courseId,
        status: { [Op.in]: ["active", "completed"] },
      },
    });
    if (!en) throw new AppError("Enroll in this course first", 403);

    const updates = {
      progress: pct,
      last_accessed_at: new Date(),
    };
    if (pct >= 100 && en.status === "active") {
      updates.status = "completed";
      updates.progress = 100;
    }

    await en.update(updates);
    return { enrollment: en };
  }

  /**
   * Add a heartbeat of ACTIVE time to a lab enrollment. `seconds` is the time the
   * learner was actually on the page since the last heartbeat — clamped so a stale
   * or tampered client can't inflate the total. Returns the new running total.
   */
  async addLabTimeSpent(userId, labId, seconds) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const delta = Math.min(120, Math.max(0, Math.round(Number(seconds) || 0)));

    const row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!row) throw new AppError("Enroll in this lab first", 403);

    if (delta > 0) {
      await row.increment("time_spent_seconds", { by: delta });
      await row.update({
        last_activity_at: new Date(),
        started_at: row.started_at || new Date(),
      });
      await row.reload();
    }
    return { timeSpentSeconds: row.time_spent_seconds };
  }

  async getLabTimeSpent(userId, labId) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
      attributes: ["time_spent_seconds"],
    });
    return { timeSpentSeconds: row ? row.time_spent_seconds : 0 };
  }

  /** Add a heartbeat of ACTIVE time to a course enrollment. See addLabTimeSpent. */
  async addCourseTimeSpent(userId, courseId, seconds) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const delta = Math.min(120, Math.max(0, Math.round(Number(seconds) || 0)));

    const en = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id: courseId,
        status: { [Op.in]: ["active", "completed"] },
      },
    });
    if (!en) throw new AppError("Enroll in this course first", 403);

    if (delta > 0) {
      await en.increment("time_spent_seconds", { by: delta });
      await en.update({ last_accessed_at: new Date() });
      await en.reload();
    }
    return { timeSpentSeconds: en.time_spent_seconds };
  }

  async getCourseTimeSpent(userId, courseId) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const en = await Enrollment.findOne({
      where: { user_id: userId, course_id: courseId },
      attributes: ["time_spent_seconds"],
    });
    return { timeSpentSeconds: en ? en.time_spent_seconds : 0 };
  }

  async enrollLab(userId, labId, opts = {}) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const lab = await Lab.findByPk(labId);
    if (!lab) throw new AppError("Lab not found", 404);
    if (lab.status !== "published") throw new AppError("Lab is not published", 400);
    if (lab.course_id) {
      throw new AppError("Enroll in the course to access this lab", 400);
    }

    const grant = await this.findCourseEnrollmentGrantingLabAccess(userId, labId);
    if (grant) {
      await this.ensureLabEnrollmentViaCourse(userId, labId, grant);
      const row = await LabEnrollment.findOne({
        where: { user_id: userId, lab_id: labId },
      });
      return { labEnrollment: row, created: false, viaCourse: true };
    }

    const isPurchase = !!opts.orderId || (!lab.is_free && Number(lab.price) > 0) || (opts.confirmPurchase && Number(lab.price) > 0);
    const isFree = !isPurchase;

    if (!isFree && !opts.confirmPurchase) {
      throw new AppError("Paid lab requires purchase", 402);
    }

    const [row, created] = await LabEnrollment.findOrCreate({
      where: { user_id: userId, lab_id: labId },
      defaults: {
        status: "active",
        progress: 0,
        source: isPurchase ? "purchase" : "free",
        order_id: opts.orderId || (isPurchase ? `ord_${Date.now()}` : null),
        started_at: new Date(),
        last_activity_at: new Date(),
      },
    });

    if (!created && (isPurchase || opts.orderId)) {
      await row.update({
        order_id: opts.orderId || row.order_id || `ord_${Date.now()}`,
        source: "purchase",
        status: "active",
      });
    }

    if (created) {
      try {
        const user = await User.findByPk(userId, { attributes: ["user_id", "email", "full_name"] });
        await transactionalEmailService.sendEnrollmentEmails({
          user,
          itemTitle: lab.title,
          itemType: "lab",
          isFree,
          isPurchase: !isFree && !!opts.confirmPurchase,
        });
      } catch (_) { }
    }

    return { labEnrollment: row, created };
  }

  async adminListEnrollments({ page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;

    const systemSettingsService = require('./systemSettingsService');
    const settings = (await systemSettingsService.getAllForClient(['general'])) || {};
    const platformDefaults = settings.general || {};
    const { convertPrice } = require('../utils/localeHelper');

    const [courseEnrollments, labEnrolls, assignments, programEnrolls] = await Promise.all([
      Enrollment.findAndCountAll({
        include: [
          { model: User, as: "user", attributes: ["user_id", "email", "full_name"] },
          { model: Course, as: "course", attributes: ["id", "title", "slug", "is_free", "metadata", "price", "created_at"] },
        ],
        order: [["enrolled_at", "DESC"]],
        limit,
        offset,
      }),
      LabEnrollment.findAndCountAll({
        include: [
          { model: User, as: "user", attributes: ["user_id", "email", "full_name"] },
          { model: Lab, as: "lab", attributes: ["id", "title", "slug", "is_free", "metadata", "price", "created_at"] },
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
      }),
      LabAssignment.findAndCountAll({
        include: [
          { model: Lab, as: "lab", attributes: ["id", "title", "slug", "created_by", "metadata", "created_at"] },
        ],
        order: [["created_at", "DESC"]],
        limit: Math.min(limit, 50),
        offset,
      }),
      ExpertTrainingProgramEnrollment ? ExpertTrainingProgramEnrollment.findAndCountAll({
        include: [
          { model: User, as: "user", attributes: ["user_id", "email", "full_name"] },
          { model: ExpertTrainingProgram, as: "program", attributes: ["id", "title", "price", "is_free", "created_at"] },
        ],
        order: [["enrolled_at", "DESC"]],
        limit,
        offset,
      }).catch(() => ({ count: 0, rows: [] })) : Promise.resolve({ count: 0, rows: [] }),
    ]);

    return {
      courseEnrollments: {
        total: courseEnrollments.count,
        rows: courseEnrollments.rows.map((e) => {
          const rawPrice = e.course?.price || 0;
          const fromCurr = e.course?.metadata?.currency || 'USD';
          const inrPrice = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;
          return {
            type: "course",
            userId: e.user_id,
            userEmail: e.user?.email,
            userName: e.user?.full_name,
            courseId: e.course_id,
            courseTitle: e.course?.title,
            progress: e.progress,
            source: e.order_id ? "purchase" : "free",
            price: inrPrice,
            enrolledAt: e.enrolled_at,
            createdAt: e.course?.created_at || e.enrolled_at || e.createdAt,
          };
        }),
      },
      labEnrollments: {
        total: labEnrolls.count,
        rows: labEnrolls.rows.map((e) => {
          const rawPrice = e.lab?.price || 0;
          const fromCurr = e.lab?.metadata?.currency || 'USD';
          const inrPrice = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;
          return {
            type: "lab_enrollment",
            userId: e.user_id,
            userEmail: e.user?.email,
            userName: e.user?.full_name,
            labId: e.lab_id,
            labTitle: e.lab?.title,
            source: e.source,
            progress: e.progress,
            price: inrPrice,
            labKind: labKindFromRow(e.lab),
            enrolledAt: e.createdAt,
            createdAt: e.lab?.created_at || e.createdAt,
          };
        }),
      },
      labAssignments: {
        total: assignments.count,
        rows: assignments.rows.map((a) => ({
          type: "lab_assignment",
          userId: a.assigned_to,
          labId: a.lab_id,
          labTitle: a.lab?.title,
          status: a.status,
          score: a.score,
          assignedBy: a.assigned_by,
          enrolledAt: a.createdAt,
          createdAt: a.lab?.created_at || a.createdAt,
        })),
      },
      programEnrollments: {
        total: programEnrolls?.count || 0,
        rows: (programEnrolls?.rows || []).map((e) => {
          const rawPrice = e.amount_paid || e.program?.price || 0;
          return {
            type: "program",
            userId: e.user_id,
            userEmail: e.email || e.user?.email,
            userName: e.full_name || e.user?.full_name,
            programId: e.program_id,
            programTitle: e.program?.title || "Training Program",
            progress: 0,
            source: e.payment_status === "paid" || Number(e.amount_paid) > 0 ? "purchase" : "free",
            price: Number(rawPrice),
            enrolledAt: e.enrolled_at || e.createdAt,
            createdAt: e.program?.created_at || e.enrolled_at || e.createdAt,
          };
        }),
      },
    };
  }

  async getCreatorInsights(userId) {
    const courses = await Course.findAll({
      where: { created_by: userId },
      attributes: ["id", "title", "slug", "status", "is_free", "created_at"],
    });

    const labs = await Lab.findAll({
      where: { created_by: userId },
      attributes: ["id", "title", "slug", "status", "type", "metadata", "created_at"],
    });

    const courseIds = courses.map((c) => c.id);
    const labIds = labs.map((l) => l.id);

    const ceMap = {};
    const leMap = {};
    const asMap = {};
    await Promise.all([
      ...courseIds.map(async (cid) => {
        ceMap[cid] = await Enrollment.count({ where: { course_id: cid } });
      }),
      ...labIds.map(async (lid) => {
        leMap[lid] = await LabEnrollment.count({ where: { lab_id: lid } });
        asMap[lid] = await LabAssignment.count({ where: { lab_id: lid } });
      }),
    ]);

    return {
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        isFree: c.is_free,
        enrollments: ceMap[c.id] || 0,
        createdAt: c.created_at,
      })),
      labs: labs.map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        status: l.status,
        labType: l.type,
        labKind: labKindFromRow(l),
        directEnrollments: leMap[l.id] || 0,
        assignments: asMap[l.id] || 0,
        createdAt: l.created_at,
      })),
    };
  }

  /**
   * Admin analytics: published labs/courses by creator with enrollment & purchase stats.
   */
  async getUserCreatorActivityDetails(userId) {
    const { Role } = require("../models");

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "email", "full_name", "created_at"],
      include: [{ model: Role, as: "role", attributes: ["id", "name"] }],
    });
    if (!user) throw new AppError("User not found", 404);

    const courses = await Course.findAll({
      where: { created_by: userId },
      attributes: [
        "id", "title", "slug", "status", "is_free", "price",
        "thumbnail", "level", "duration_minutes", "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    const labs = await Lab.findAll({
      where: { created_by: userId },
      attributes: [
        "id", "title", "slug", "status", "type", "metadata", "is_free", "price",
        "thumbnail", "difficulty", "time_limit_minutes", "created_at",
      ],
      order: [["created_at", "DESC"]],
    });

    const courseIds = courses.map((c) => c.id);
    const labIds = labs.map((l) => l.id);

    const [
      courseEnrollCounts,
      coursePurchaseCounts,
      labEnrollCounts,
      labPurchaseCounts,
      labAssignCounts,
    ] = await Promise.all([
      batchCountByField(Enrollment, "course_id", courseIds),
      batchCountByField(Enrollment, "course_id", courseIds, { order_id: { [Op.ne]: null } }),
      batchCountByField(LabEnrollment, "lab_id", labIds),
      batchCountByField(LabEnrollment, "lab_id", labIds, { source: "purchase" }),
      batchCountByField(LabAssignment, "lab_id", labIds),
    ]);

    const mapCourse = (c) => ({
      id: c.id,
      contentType: "course",
      title: c.title,
      slug: c.slug,
      status: c.status,
      isFree: c.is_free,
      price: c.price,
      thumbnail: c.thumbnail,
      level: c.level,
      durationMinutes: c.duration_minutes,
      enrollmentCount: courseEnrollCounts.get(c.id) || 0,
      purchaseCount: coursePurchaseCounts.get(c.id) || 0,
      createdAt: c.created_at,
    });

    const mapLab = (l) => {
      const meta = parseLabMeta(l.metadata);
      return {
        id: l.id,
        contentType: "lab",
        title: l.title,
        slug: l.slug,
        status: l.status,
        labType: l.type,
        labKind: labKindFromRow(l),
        difficulty: l.difficulty,
        timeLimitMinutes: l.time_limit_minutes,
        isFree: l.is_free,
        price: l.price,
        thumbnail: l.thumbnail || meta.thumbnail || null,
        enrollmentCount: labEnrollCounts.get(l.id) || 0,
        purchaseCount: labPurchaseCounts.get(l.id) || 0,
        assignmentCount: labAssignCounts.get(l.id) || 0,
        createdAt: l.created_at,
      };
    };

    const allCourses = courses.map(mapCourse);
    const allLabs = labs.map(mapLab);
    const publishedCourses = allCourses.filter((c) => c.status === "published");
    const publishedLabs = allLabs.filter((l) => l.status === "published");
    const publishedContent = [...publishedLabs, ...publishedCourses].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const sumEnrollments = (items) => items.reduce((s, i) => s + (i.enrollmentCount || 0), 0);
    const sumPurchases = (items) => items.reduce((s, i) => s + (i.purchaseCount || 0), 0);

    return {
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role?.name || null,
        joinedAt: user.created_at,
      },
      summary: {
        totalPublishedLabs: publishedLabs.length,
        totalPublishedCourses: publishedCourses.length,
        totalPublishedContent: publishedContent.length,
        totalEnrollments: sumEnrollments(publishedContent),
        totalPurchases: sumPurchases(publishedContent),
        totalLabs: allLabs.length,
        totalCourses: allCourses.length,
      },
      publishedLabs,
      publishedCourses,
      publishedContent,
      labs: allLabs,
      courses: allCourses,
    };
  }

  async getPurchasersForCreatorContent(creatorUserId, labId) {
    const lab = await Lab.findByPk(labId);
    if (!lab || lab.created_by !== creatorUserId) {
      throw new AppError("Lab not found or not yours", 404);
    }

    const enrolls = await LabEnrollment.findAll({
      where: { lab_id: labId },
      include: [{ model: User, as: "user", attributes: ["user_id", "email", "full_name"] }],
    });

    const assigns = await LabAssignment.findAll({ where: { lab_id: labId } });
    const assignUserIds = [...new Set(assigns.map((a) => a.assigned_to))];
    const assignUsers = assignUserIds.length
      ? await User.findAll({
        where: { user_id: { [Op.in]: assignUserIds } },
        attributes: ["user_id", "email", "full_name"],
      })
      : [];
    const umap = Object.fromEntries(assignUsers.map((u) => [u.user_id, u]));

    return {
      lab: { id: lab.id, title: lab.title, slug: lab.slug },
      enrollments: enrolls.map((e) => ({
        userId: e.user_id,
        email: e.user?.email,
        name: e.user?.full_name,
        source: e.source,
        progress: e.progress,
      })),
      assignments: assigns.map((a) => ({
        userId: a.assigned_to,
        email: umap[a.assigned_to]?.email,
        name: umap[a.assigned_to]?.full_name,
        status: a.status,
        score: a.score,
      })),
    };
  }

  /**
   * Skill Builder enrollment row for the current user (progress / completion).
   */
  async getLabEnrollmentForUser(userId, labId) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const row = await LabEnrollment.findOne({
      where: {
        user_id: userId,
        lab_id: labId,
        status: { [Op.in]: ["active", "completed"] },
      },
      attributes: ["progress", "status", "completed_at", "last_activity_at"],
    });
    if (!row) return null;
    return {
      progress: row.progress,
      status: row.status,
      completedAt: row.completed_at,
      lastActivityAt: row.last_activity_at,
    };
  }

  /** Server-side grade for a single module-lab block (quiz / fillBlank / trueFalse). */
  async checkLabBlock(userId, labId, blockId, answer) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const enrollment = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!enrollment) {
      const viaCourse = await this.userHasCourseAccessToLab(userId, labId);
      if (!viaCourse) throw new AppError("Enroll in this lab first", 403);
    }

    const lab = await Lab.findByPk(labId);
    if (!lab || lab.status !== "published") throw new AppError("Lab not found", 404);

    const ins = parseLabInstructions(lab.instructions);
    const block = findBlockInModules(ins.modules, blockId);
    if (!block) throw new AppError("Block not found", 404);

    return gradeAutoBlock(block, answer);
  }

  /** Server-side grade for a course curriculum block (quiz / fillBlank / trueFalse). */
  async checkCourseBlock(userId, courseId, blockId, answer) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const enrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: courseId, status: "active" },
    });
    if (!enrollment) throw new AppError("Enroll in this course first", 403);

    const course = await Course.findByPk(courseId);
    if (!course || course.status !== "published") throw new AppError("Course not found", 404);

    const meta = parseCourseMetadata(course.metadata);
    const block = findBlockInCourseModules(meta.modules, blockId);
    if (!block) throw new AppError("Block not found", 404);

    return gradeAutoBlock(block, answer);
  }

  /** Course enrollment that grants bundled access to a linked lab (metadata.modules / metadata.labs). */
  async findCourseEnrollmentGrantingLabAccess(userId, labId, { courseSlug = null } = {}) {
    if (!userId || !labId) return null;

    const enrollments = await Enrollment.findAll({
      where: { user_id: userId, status: { [Op.in]: ["active", "completed"] } },
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["id", "slug", "metadata", "status", "is_free", "price"],
          where: { status: "published" },
          required: true,
        },
      ],
    });

    const lid = String(labId);
    for (const row of enrollments) {
      const course = row.course;
      if (!course) continue;
      if (courseSlug && course.slug !== courseSlug) continue;
      const meta = parseCourseMetadata(course.metadata);
      if (labReferencedInCourseMeta(meta, lid)) {
        return {
          courseId: course.id,
          courseSlug: course.slug,
          enrollment: row,
        };
      }
    }
    return null;
  }

  async ensureLabEnrollmentViaCourse(userId, labId, grant) {
    if (!grant) return null;
    const [row] = await LabEnrollment.findOrCreate({
      where: { user_id: userId, lab_id: labId },
      defaults: {
        status: "active",
        progress: 0,
        source: "course_bundle",
        order_id: grant.enrollment?.order_id || null,
        started_at: null,
        last_activity_at: new Date(),
      },
    });
    return row;
  }

  /**
   * Direct lab enrollment, or bundled access when the user purchased a course that includes this lab.
   */
  async resolveLabAccess(userId, labId, { courseSlug = null } = {}) {
    if (!userId) {
      return { isEnrolled: false, accessViaCourse: false, progress: 0 };
    }

    const direct = await LabEnrollment.findOne({
      where: {
        user_id: userId,
        lab_id: labId,
        status: { [Op.in]: ["active", "completed"] },
      },
      attributes: ["progress", "status"],
    });
    if (direct) {
      return {
        isEnrolled: true,
        accessViaCourse: false,
        progress: direct.progress ?? 0,
      };
    }

    const grant = await this.findCourseEnrollmentGrantingLabAccess(userId, labId, { courseSlug });
    if (grant) {
      await this.ensureLabEnrollmentViaCourse(userId, labId, grant);
      const row = await LabEnrollment.findOne({
        where: {
          user_id: userId,
          lab_id: labId,
          status: { [Op.in]: ["active", "completed"] },
        },
        attributes: ["progress", "status"],
      });
      return {
        isEnrolled: true,
        accessViaCourse: true,
        courseId: grant.courseId,
        courseSlug: grant.courseSlug,
        progress: row?.progress ?? 0,
      };
    }

    return { isEnrolled: false, accessViaCourse: false, progress: 0 };
  }

  /** True when the user is enrolled in a course that bundles or references this lab. */
  async userHasCourseAccessToLab(userId, labId, courseSlug = null) {
    const grant = await this.findCourseEnrollmentGrantingLabAccess(userId, labId, { courseSlug });
    return !!grant;
  }

  /**
   * Server-scored Skill Builder submit: updates lab enrollment and course bundle progress when passed.
   */
  async submitSkillBuilder(userId, labId, answers) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const lab = await Lab.findByPk(labId);
    if (!lab || lab.status !== "published") throw new AppError("Lab not found", 404);

    const ins = parseLabInstructions(lab.instructions);
    const sb = ins?.skillBuilder;
    if (!sb || typeof sb !== "object") throw new AppError("Not a Skill Builder lab", 400);

    const tasks = Array.isArray(sb.tasks) ? sb.tasks : [];
    const settings = sb.settings && typeof sb.settings === "object" ? sb.settings : {};
    const passingScore = Number(settings.passingScore) || 70;

    const { earned, total, pct } = scoreSkillBuilderTasks(tasks, answers);
    const passed = pct >= passingScore;

    // Generate detailed report
    const report = tasks.map(task => {
      const userAnswer = answers[task.id];
      let isCorrect = false;

      if (task.type === "quiz") {
        isCorrect = userAnswer === task.correctOptions?.[0];
      } else if (task.type === "trueFalse") {
        isCorrect = userAnswer === task.correctAnswer;
      } else if (task.type === "multiSelect") {
        const correctSet = new Set(task.correctOptions || []);
        const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        isCorrect = [...correctSet].every(x => userSet.has(x)) && [...userSet].every(x => correctSet.has(x));
      } else if (task.type === "fillBlank") {
        isCorrect = (task.blanks || []).every(blank => {
          const userVal = userAnswer?.[blank.id] || "";
          return blank.caseSensitive
            ? userVal === blank.answer
            : String(userVal).toLowerCase() === String(blank.answer).toLowerCase();
        });
      } else if (task.type === "dragDrop") {
        isCorrect = (task.pairs || []).every(pair => userAnswer?.[pair.id] === pair.right);
      }

      return {
        taskId: task.id,
        type: task.type,
        question: task.question || task.statement || task.sentence,
        userAnswer,
        correctAnswer: task.correctOptions?.[0] ?? task.correctAnswer ?? task.blanks?.map(b => b.answer),
        isCorrect,
        points: task.points || 0,
        earnedPoints: isCorrect ? (task.points || 0) : 0,
        explanation: task.explanation || null,
      };
    });

    if (lab.course_id) {
      const en = await Enrollment.findOne({
        where: {
          user_id: userId,
          course_id: lab.course_id,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!en) throw new AppError("Enroll in the course to submit this lab", 403);

      const course = await Course.findByPk(lab.course_id);
      const isFree = course && (!!course.is_free || Number(course.price) === 0);
      await this.syncLabEnrollmentsForCourse(userId, lab.course_id, {
        orderId: en.order_id,
        isFree,
      });
    } else {
      const isFree = !!lab.is_free || Number(lab.price) === 0;
      if (!isFree) {
        const existingPaid = await LabEnrollment.findOne({
          where: { user_id: userId, lab_id: labId },
        });
        if (!existingPaid) throw new AppError("Purchase required — enroll in this lab first", 402);
      } else {
        await LabEnrollment.findOrCreate({
          where: { user_id: userId, lab_id: labId },
          defaults: {
            status: "active",
            progress: 0,
            source: "free",
            started_at: new Date(),
            last_activity_at: new Date(),
          },
        });
      }
    }

    let row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });
    if (!row) throw new AppError("Could not record lab progress", 500);

    if (passed) {
      await row.update({
        status: "completed",
        progress: 100,
        completed_at: row.completed_at || new Date(),
        last_activity_at: new Date(),
      });
      if (lab.course_id) await this.syncCourseEnrollmentProgress(userId, lab.course_id);
    } else {
      await row.update({
        progress: Math.min(99, pct),
        last_activity_at: new Date(),
      });
    }

    row = await LabEnrollment.findOne({
      where: { user_id: userId, lab_id: labId },
    });

    // Check if certification is available for this lab
    let certificationAvailable = false;
    let certificationId = lab.certification_id;
    if (passed && certificationId) {
      certificationAvailable = true;
    }

    return {
      earnedPoints: earned,
      totalPoints: total,
      scorePct: pct,
      passed,
      passingScore,
      report,
      certificationAvailable,
      certificationId,
      labEnrollment: {
        progress: row.progress,
        status: row.status,
        completedAt: row.completed_at,
      },
    };
  }

  /** Same eligibility rules for lab certificates. */
  async canDownloadLabCertificate(userId, labId) {
    try {
      if (!userId || !labId) return false;
      const lab = await Lab.findByPk(labId);
      if (!lab || lab.status !== "published") return false;
      const enrollment = await LabEnrollment.findOne({
        where: {
          user_id: userId,
          lab_id: labId,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!enrollment) return false;
      // Check if lab has a certification_id
      if (!lab.certification_id) {
        // Check instructions for certificate configuration
        const ins = parseLabInstructions(lab.instructions);
        const certCfg = ins?.certificate;
        if (!certCfg || certCfg.enabled === false) return false;
      }
      // Check if lab is completed
      return enrollment.status === "completed" || (enrollment.progress ?? 0) >= 100;
    } catch {
      return false;
    }
  }

  /**
   * Issue a lab certificate after completion.
   * Uses either lab.certification_id or instructions.certificate configuration.
   */
  async getLabCertificate(userId, labId) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const lab = await Lab.findByPk(labId);
    const linkedCertification = lab?.certification_id
      ? await Certification.findByPk(lab.certification_id).catch(() => null)
      : null;

    if (!lab || lab.status !== "published") {
      throw new AppError("Lab not found", 404);
    }

    const enrollment = await LabEnrollment.findOne({
      where: {
        user_id: userId,
        lab_id: labId,
        status: { [Op.in]: ["active", "completed"] },
      },
    });
    if (!enrollment) {
      throw new AppError("Enroll in this lab to receive a certificate", 403);
    }

    const ins = parseLabInstructions(lab.instructions);
    const certCfg = ins?.certificate || {};

    // Check if lab is completed
    if (!(enrollment.status === "completed" || (enrollment.progress ?? 0) >= 100)) {
      throw new AppError("Complete the lab to download your certificate", 400);
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });
    const learnerName = (user && user.full_name) || (user && user.email) || "Learner";
    const learnerEmail = user && user.email ? String(user.email) : "";

    const issuedAt = enrollment.status === "completed" && enrollment.completed_at
      ? new Date(enrollment.completed_at)
      : new Date();
    const issuedStr = issuedAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const salt = `${enrollment.id}-${issuedAt.getTime()}`;
    const verificationCode = verificationCodeForCourse(userId, labId, salt);
    const idPrefix =
      (certCfg.idPrefix != null && String(certCfg.idPrefix).trim()) ||
      (linkedCertification?.idPrefix != null && String(linkedCertification.idPrefix).trim()) ||
      "CERT";
    const certificateId = `${idPrefix}-${verificationCode}`;

    const siteName = await systemSettingsService.getSiteName();
    const orgName = certCfg.orgName || linkedCertification?.orgName || siteName;
    const signatoryName = certCfg.signatoryName || linkedCertification?.signatoryName || "";
    const signatoryTitle = certCfg.signatoryTitle || linkedCertification?.signatoryTitle || "";
    const certValidity = certCfg.validity || linkedCertification?.validity || "Lifetime";

    const title = escapeHtml(linkedCertification?.title || lab.title);
    const nameEsc = escapeHtml(learnerName);
    const orgEsc = escapeHtml(orgName);
    const sigNameEsc = escapeHtml(signatoryName);
    const sigTitleEsc = escapeHtml(signatoryTitle);

    let logoBlock = "";
    try {
      const sb = await SiteBranding.findOne({ order: [["id", "ASC"]] });
      const rel = sb?.logo_url ? String(sb.logo_url).trim() : "";
      if (rel) {
        const origin = String(process.env.API_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || "").replace(
          /\/$/,
          ""
        );
        const abs = /^https?:\/\//i.test(rel) ? rel : `${origin}${rel.startsWith("/") ? rel : `/${rel}`}`;
        logoBlock = `<div style="text-align:center;margin-bottom:12px;"><img src="${escapeHtml(abs)}" alt="" style="max-height:56px;object-fit:contain;" /></div>`;
      }
    } catch (_) {
      /* optional branding */
    }

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Certificate — ${title}</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:880px;margin:0 auto;border:10px solid #15803d;background:#fff;padding:48px 40px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12);">
    ${logoBlock}
    ${linkedCertification?.template_url
      ? `<img src="${escapeHtml(linkedCertification.template_url)}" alt="Template" style="max-height:100px;max-width:100%;object-fit:contain;margin-bottom:12px;" />`
      : ""
    }
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Certificate of completion</p>
    <h1 style="margin:0 0 20px;font-size:38px;font-weight:800;color:#14532d;line-height:1.15;">${title}</h1>
    <p style="margin:0 0 8px;font-size:17px;color:#334155;">This certifies that</p>
    <p style="margin:0 0 20px;font-size:30px;font-weight:700;color:#0f172a;">${nameEsc}</p>
    <p style="margin:0 0 24px;font-size:16px;color:#475569;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.6;">
      has successfully completed the lab.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;">Valid for: <strong>${escapeHtml(certValidity)}</strong></p>
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:8px;text-align:left;display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;">
      <div>
        <p style="margin:0;font-size:12px;color:#94a3b8;">Issued on</p>
        <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(issuedStr)}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Certificate ID</p>
        <p style="margin:4px 0 0;font-size:13px;color:#0f172a;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(certificateId)}</p>
      </div>
    </div>
    ${signatoryName
      ? `<div style="margin-top:28px;text-align:center;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${sigNameEsc}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${sigTitleEsc}</p>
      </div>`
      : ""
    }
    <p style="margin:28px 0 0;font-size:11px;color:#94a3b8;">Verification code: ${escapeHtml(verificationCode)}${learnerEmail ? ` · ${escapeHtml(learnerEmail)}` : ""}</p>
  </div>
</body></html>`;

    return {
      labId: lab.id,
      labTitle: lab.title,
      labSlug: lab.slug,
      learnerName,
      learnerEmail,
      issuedAt: issuedAt.toISOString(),
      verificationCode,
      certificateId,
      orgName,
      signatoryName,
      signatoryTitle,
      certValidity,
      certificationTemplate: linkedCertification?.template_url || null,
      html,
    };
  }

  async getLabCertificatePdf(userId, labId) {
    const data = await this.getLabCertificate(userId, labId);
    let logoBuffer = null;
    try {
      const sb = await SiteBranding.findOne({ order: [["id", "ASC"]] });
      const rel = sb?.logo_url ? String(sb.logo_url).trim() : "";
      if (rel) {
        const origin = String(process.env.API_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || "").replace(
          /\/$/,
          ""
        );
        const abs = /^https?:\/\//i.test(rel) ? rel : `${origin}${rel.startsWith("/") ? rel : `/${rel}`}`;
        logoBuffer = await fetchUrlBuffer(abs);
      }
    } catch (_) {
      /* optional */
    }
    return buildCertificatePdfBuffer(data, logoBuffer);
  }

  /** Same eligibility rules as certificate download (no HTML/PDF build). */
  async canDownloadCourseCertificate(userId, courseId) {
    try {
      if (!userId || !courseId) return false;
      const course = await Course.findByPk(courseId);
      if (!course || course.status !== "published") return false;
      const enrollment = await Enrollment.findOne({
        where: {
          user_id: userId,
          course_id: courseId,
          status: { [Op.in]: ["active", "completed"] },
        },
      });
      if (!enrollment) return false;
      const meta = parseCourseMetadata(course.metadata);
      const settings = meta.settings && typeof meta.settings === "object" ? meta.settings : {};
      const certCfg = settings.certificate && typeof settings.certificate === "object" ? settings.certificate : {};
      if (certCfg.enabled === false) return false;
      const labIds = await collectPublishedLabIdsForCourse(courseId);
      if (!labIds.length) {
        return enrollment.status === "completed" || (enrollment.progress ?? 0) >= 100;
      }
      const rows = await LabEnrollment.findAll({
        where: { user_id: userId, lab_id: { [Op.in]: labIds } },
        attributes: ["lab_id", "progress", "status"],
      });
      const done = rows.filter(
        (r) => r.status === "completed" || (r.progress ?? 0) >= 100
      ).length;
      return done >= labIds.length;
    } catch {
      return false;
    }
  }

  /**
   * Issue a course bundle certificate after all published labs are completed.
   * Uses course metadata.settings.certificate (enabled, org, signatory, etc.).
   */
  async getCourseCertificate(userId, courseId) {
    if (!userId) throw new AppError("Unauthorized", 401);

    const course = await Course.findByPk(courseId);
    const linkedCertification = course?.certification_id
      ? await Certification.findByPk(course.certification_id).catch(() => null)
      : null;

    if (!course || course.status !== "published") {
      throw new AppError("Course not found", 404);
    }

    const enrollment = await Enrollment.findOne({
      where: {
        user_id: userId,
        course_id: courseId,
        status: { [Op.in]: ["active", "completed"] },
      },
    });
    if (!enrollment) {
      throw new AppError("Enroll in this course to receive a certificate", 403);
    }

    const meta = parseCourseMetadata(course.metadata);
    const settings = meta.settings && typeof meta.settings === "object" ? meta.settings : {};
    const certCfg = settings.certificate && typeof settings.certificate === "object" ? settings.certificate : {};
    if (certCfg.enabled === false) {
      throw new AppError("Certificates are not enabled for this course", 400);
    }

    const labIds = await collectPublishedLabIdsForCourse(courseId);
    let done = 0;
    if (!labIds.length) {
      if (!(enrollment.status === "completed" || (enrollment.progress ?? 0) >= 100)) {
        throw new AppError("Complete the course to download your certificate", 400);
      }
      done = 0;
    } else {
      const rows = await LabEnrollment.findAll({
        where: { user_id: userId, lab_id: { [Op.in]: labIds } },
        attributes: ["lab_id", "progress", "status"],
      });
      done = rows.filter(
        (r) => r.status === "completed" || (r.progress ?? 0) >= 100
      ).length;
      if (done < labIds.length) {
        throw new AppError("Complete all labs in this bundle to download your certificate", 400);
      }
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });
    const learnerName = (user && user.full_name) || (user && user.email) || "Learner";
    const learnerEmail = user && user.email ? String(user.email) : "";

    const issuedAt = enrollment.status === "completed" && enrollment.updated_at
      ? new Date(enrollment.updated_at)
      : new Date();
    const issuedStr = issuedAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const salt = `${enrollment.id}-${issuedAt.getTime()}`;
    const verificationCode = verificationCodeForCourse(userId, courseId, salt);
    const idPrefix =
      (certCfg.idPrefix != null && String(certCfg.idPrefix).trim()) ||
      (certCfg.certificationId != null && String(certCfg.certificationId).trim()) ||
      "CERT";
    const certificateId = `${idPrefix}-${verificationCode}`;

    const siteName = await systemSettingsService.getSiteName();
    const orgName = certCfg.orgName || siteName;
    const signatoryName = certCfg.signatoryName || "";
    const signatoryTitle = certCfg.signatoryTitle || "";
    const certValidity = certCfg.certValidity || "Lifetime";

    const title = escapeHtml(linkedCertification?.title || course.title);
    const nameEsc = escapeHtml(learnerName);
    const orgEsc = escapeHtml(orgName);
    const sigNameEsc = escapeHtml(signatoryName);
    const sigTitleEsc = escapeHtml(signatoryTitle);

    let logoBlock = "";
    try {
      const sb = await SiteBranding.findOne({ order: [["id", "ASC"]] });
      const rel = sb?.logo_url ? String(sb.logo_url).trim() : "";
      if (rel) {
        const origin = String(process.env.API_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || "").replace(
          /\/$/,
          ""
        );
        const abs = /^https?:\/\//i.test(rel) ? rel : `${origin}${rel.startsWith("/") ? rel : `/${rel}`}`;
        logoBlock = `<div style="text-align:center;margin-bottom:12px;"><img src="${escapeHtml(abs)}" alt="" style="max-height:56px;object-fit:contain;" /></div>`;
      }
    } catch (_) {
      /* optional branding */
    }

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Certificate — ${title}</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:880px;margin:0 auto;border:10px solid #15803d;background:#fff;padding:48px 40px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12);">
    ${logoBlock}
    ${linkedCertification?.template_url
        ? `<img src="${escapeHtml(linkedCertification.template_url)}" alt="Template" style="max-height:100px;max-width:100%;object-fit:contain;margin-bottom:12px;" />`
        : ""
      }
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Certificate of completion</p>
    <h1 style="margin:0 0 20px;font-size:38px;font-weight:800;color:#14532d;line-height:1.15;">${title}</h1>
    <p style="margin:0 0 8px;font-size:17px;color:#334155;">This certifies that</p>
    <p style="margin:0 0 20px;font-size:30px;font-weight:700;color:#0f172a;">${nameEsc}</p>
    <p style="margin:0 0 24px;font-size:16px;color:#475569;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.6;">
      has successfully completed all labs in this course bundle at <strong>${orgEsc}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#64748b;">Completed labs: <strong>${done}</strong> / <strong>${labIds.length}</strong></p>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;">Valid for: <strong>${escapeHtml(certValidity)}</strong></p>
    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:8px;text-align:left;display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;">
      <div>
        <p style="margin:0;font-size:12px;color:#94a3b8;">Issued on</p>
        <p style="margin:4px 0 0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(issuedStr)}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Certificate ID</p>
        <p style="margin:4px 0 0;font-size:13px;color:#0f172a;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(certificateId)}</p>
      </div>
    </div>
    ${signatoryName
        ? `<div style="margin-top:28px;text-align:center;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${sigNameEsc}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${sigTitleEsc}</p>
      </div>`
        : ""
      }
    <p style="margin:28px 0 0;font-size:11px;color:#94a3b8;">Verification code: ${escapeHtml(verificationCode)}${learnerEmail ? ` · ${escapeHtml(learnerEmail)}` : ""}</p>
  </div>
</body></html>`;

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      learnerName,
      learnerEmail,
      issuedAt: issuedAt.toISOString(),
      completedLabs: done,
      totalLabs: labIds.length,
      verificationCode,
      certificateId,
      orgName,
      signatoryName,
      signatoryTitle,
      certValidity,
      certificationTemplate: linkedCertification?.template_url || null,
      html,
    };
  }

  async getCourseCertificatePdf(userId, courseId) {
    const data = await this.getCourseCertificate(userId, courseId);
    let logoBuffer = null;
    try {
      const sb = await SiteBranding.findOne({ order: [["id", "ASC"]] });
      const rel = sb?.logo_url ? String(sb.logo_url).trim() : "";
      if (rel) {
        const origin = String(process.env.API_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || "").replace(
          /\/$/,
          ""
        );
        const abs = /^https?:\/\//i.test(rel) ? rel : `${origin}${rel.startsWith("/") ? rel : `/${rel}`}`;
        logoBuffer = await fetchUrlBuffer(abs);
      }
    } catch (_) {
      /* optional */
    }
    return buildCertificatePdfBuffer(data, logoBuffer);
  }
}

module.exports = new LearningService();
