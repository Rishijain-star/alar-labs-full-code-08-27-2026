const learningService = require("../services/learningService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");
const { AppError } = require("../middleware/errorHandler");

/** Resolve authenticated user id from JWT (middleware may set user_id, id, or sub). */
function requireUserId(req) {
  const id = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
  if (!id) {
    throw new AppError("Authentication required", 401);
  }
  return id;
}

class LearningController {
  getMyLearning = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const data = await learningService.getMyLearning(userId);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  enrollCourse = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { courseId } = req.params;
      const { confirmPurchase, orderId } = req.body || {};
      const result = await learningService.enrollCourse(userId, courseId, {
        confirmPurchase: !!confirmPurchase,
        orderId,
      });
      return response.success(res, result.created ? "Enrolled" : "Already enrolled", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  enrollLab = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const { confirmPurchase, orderId } = req.body || {};
      const result = await learningService.enrollLab(userId, labId, {
        confirmPurchase: !!confirmPurchase,
        orderId,
      });
      return response.success(res, result.created ? "Enrolled" : "Already enrolled", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  completeLab = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const result = await learningService.completeLab(userId, labId);
      return response.success(res, "Lab marked complete", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  saveLabProgress = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const { progress } = req.body || {};
      const result = await learningService.saveLabLearningProgress(userId, labId, progress);
      return response.success(res, "Progress saved", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  startLab = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const result = await learningService.startLabTimer(userId, labId);
      return response.success(res, "Lab started", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  saveCourseProgress = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { courseId } = req.params;
      const { progress } = req.body || {};
      const result = await learningService.saveCourseLearningProgress(userId, courseId, progress);
      return response.success(res, "Progress saved", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  // ── Active-time tracking (server-authoritative heartbeats) ──────────────────
  getLabTime = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const data = await learningService.getLabTimeSpent(userId, req.params.labId);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  addLabTime = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { seconds } = req.body || {};
      const data = await learningService.addLabTimeSpent(userId, req.params.labId, seconds);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getCourseTime = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const data = await learningService.getCourseTimeSpent(userId, req.params.courseId);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  addCourseTime = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { seconds } = req.body || {};
      const data = await learningService.addCourseTimeSpent(userId, req.params.courseId, seconds);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getLabEnrollment = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const enrollment = await learningService.getLabEnrollmentForUser(userId, labId);
      return response.success(res, "OK", 200, { enrollment });
    } catch (err) {
      return fail(res, err);
    }
  };

  submitSkillBuilder = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const { answers } = req.body || {};
      const result = await learningService.submitSkillBuilder(userId, labId, answers);
      return response.success(res, "Progress saved", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  checkLabBlock = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const { blockId, answer } = req.body || {};
      if (!blockId) {
        return response.fail(res, "blockId is required", 400);
      }
      const result = await learningService.checkLabBlock(userId, labId, blockId, answer);
      return response.success(res, "Answer checked", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  checkCourseBlock = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { courseId } = req.params;
      const { blockId, answer } = req.body || {};
      if (!blockId) {
        return response.fail(res, "blockId is required", 400);
      }
      const result = await learningService.checkCourseBlock(userId, courseId, blockId, answer);
      return response.success(res, "Answer checked", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  adminList = async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const data = await learningService.adminListEnrollments({ page, limit });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  creatorInsights = async (req, res) => {
    try {
      const selfId = requireUserId(req);
      const paramId = req.params.userId;
      const targetId = paramId || selfId;
      if (paramId && paramId !== selfId) {
        const raw =
          typeof req.user_role === "object" && req.user_role?.name != null
            ? req.user_role.name
            : String(req.user_role || "");
        const rn = raw.trim().toLowerCase();
        const isElevated =
          rn === "admin" ||
          rn === "owner" ||
          rn === "super admin" ||
          rn === "super_admin" ||
          rn === "superadmin";
        const canViewUsers = Array.isArray(req.user_permissions)
          && req.user_permissions.includes("view_users");
        if (!isElevated && !canViewUsers) {
          return response.fail(res, "Forbidden", 403);
        }
      }
      const data = await learningService.getCreatorInsights(targetId);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  labAudience = async (req, res) => {
    try {
      const creatorId = requireUserId(req);
      const { labId } = req.params;
      const data = await learningService.getPurchasersForCreatorContent(creatorId, labId);
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  /** GET ?format=html returns raw HTML for print; default JSON with html + metadata */
  getCourseCertificate = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { courseId } = req.params;
      const format = String(req.query.format || "json").toLowerCase();
      if (format === "pdf") {
        const buf = await learningService.getCourseCertificatePdf(userId, courseId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="certificate-${String(courseId).slice(0, 8)}.pdf"`
        );
        return res.status(200).send(buf);
      }
      const data = await learningService.getCourseCertificate(userId, courseId);
      if (format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(data.html);
      }
      return response.success(res, "Certificate issued", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  /** GET ?format=html returns raw HTML for print; default JSON with html + metadata for lab certificate */
  getLabCertificate = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const { labId } = req.params;
      const format = String(req.query.format || "json").toLowerCase();
      if (format === "pdf") {
        const buf = await learningService.getLabCertificatePdf(userId, labId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="certificate-${String(labId).slice(0, 8)}.pdf"`
        );
        return res.status(200).send(buf);
      }
      const data = await learningService.getLabCertificate(userId, labId);
      if (format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(data.html);
      }
      return response.success(res, "Certificate issued", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new LearningController();
