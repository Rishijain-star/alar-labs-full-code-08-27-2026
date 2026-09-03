const examTopicsConfigService = require("../services/examTopicsConfigService");
const rbacService = require("../services/rbac/roleService");
const notificationService = require("../services/notificationService");
const response = require("../utils/response");
const { fail, validate } = require("../helper/helper");

const EXAM_TOPICS_VIEW_PERMISSIONS = [
  "view_exam_topics",
  "create_exam_topics",
  "edit_exam_topics",
  "delete_exam_topics",
  "publish_exam_topics",
];

async function assertCanUpsertConfig(req, newConfig) {
  const userId = req.user?.user_id;
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const adminRow = await examTopicsConfigService.getAdminConfig();
  const oldConfig = adminRow.config || { learningSets: [], exams: [] };
  const { added, updated, removed } = examTopicsConfigService.diffConfigChanges(
    oldConfig,
    newConfig || { learningSets: [], exams: [] }
  );

  const checks = [];
  if (added > 0) checks.push(["create_exam_topics"]);
  if (updated > 0) checks.push(["edit_exam_topics"]);
  if (removed > 0) checks.push(["delete_exam_topics"]);

  if (!checks.length) {
    const ok = await rbacService.checkUserHasPermission(userId, EXAM_TOPICS_VIEW_PERMISSIONS, "OR");
    if (!ok) {
      const err = new Error("Insufficient permissions");
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  for (const required of checks) {
    const ok = await rbacService.checkUserHasPermission(userId, required, "OR");
    if (!ok) {
      const err = new Error("Insufficient permissions");
      err.statusCode = 403;
      err.requiredPermissions = required;
      throw err;
    }
  }
}

class ExamTopicsConfigController {
  getConfig = async (req, res) => {
    try {
      const row = await examTopicsConfigService.getPublishedConfig();
      return response.success(res, "OK", 200, {
        configKey: row.config_key,
        config: row.config,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  getAdminConfig = async (req, res) => {
    try {
      const row = await examTopicsConfigService.getAdminConfig();
      return response.success(res, "OK", 200, {
        configKey: row.config_key,
        config: row.config,
        isPublished: row.is_published,
        isInitialized: row.is_initialized,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  upsertConfig = async (req, res) => {
    try {
      const { config } = req.body || {};
      if (config !== undefined) {
        await assertCanUpsertConfig(req, config);
      }
      const row = await examTopicsConfigService.upsertConfig(req.body, req.user?.user_id || null);
      return response.success(res, "Saved", 200, {
        configKey: row.config_key,
        config: row.config,
        isPublished: row.is_published,
        isInitialized: row.is_initialized,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  publishSet = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Authentication required", 401);

      const canPublish = await rbacService.checkUserHasPermission(
        userId,
        ["publish_exam_topics"],
        "OR"
      );
      if (!canPublish) {
        return response.fail(res, "Insufficient permissions to publish exam topics", 403);
      }

      const type = req.params.type === "exam" ? "exam" : "learning";
      const result = await examTopicsConfigService.publishSet(type, req.params.setId, userId);
      return response.success(res, "Submitted for approval", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getPendingSets = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Authentication required", 401);

      const canAll = await rbacService.checkUserHasPermission(
        userId,
        ["approve_exam_topics", "approve_courses", "approve_labs"],
        "OR"
      );
      const canOwn = await rbacService.checkUserHasPermission(
        userId,
        ["approve_own_exam_topics"],
        "OR"
      );
      if (!canAll && !canOwn) {
        return response.fail(res, "Insufficient permissions", 403);
      }

      const rows = await examTopicsConfigService.getPendingSets({
        createdBy: canAll ? null : userId,
      });
      return response.success(res, "OK", 200, { rows });
    } catch (err) {
      return fail(res, err);
    }
  };

  setContentApproval = async (req, res) => {
    try {
      await validate(req.body, { status: "required|string|in:approved,rejected" });
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Authentication required", 401);

      const type = req.params.type === "exam" ? "exam" : "learning";
      const { set } = await examTopicsConfigService.getSetForReview(type, req.params.setId);

      const canAll = await rbacService.checkUserHasPermission(
        userId,
        ["approve_exam_topics", "approve_courses", "approve_labs"],
        "OR"
      );
      const canOwn = await rbacService.checkUserHasPermission(
        userId,
        ["approve_own_exam_topics"],
        "OR"
      );
      if (!canAll && (!canOwn || String(set.created_by) !== String(userId))) {
        return response.fail(res, "Insufficient permissions to approve this exam topic set", 403);
      }

      const updated = await examTopicsConfigService.setContentApproval(
        type,
        req.params.setId,
        req.body.status,
        userId,
        req.body.rejection_reason || req.body.rejectionReason || null
      );

      if (req.body.status === "approved" && updated?.set?.created_by) {
        try {
          await notificationService.createNotification({
            userId: updated.set.created_by,
            audience: "user",
            eventType: "exam_topics_approved",
            title: "Exam topic approved",
            message: `Your ${type === "exam" ? "exam" : "learning set"} "${updated.set.title}" has been approved.`,
            metadata: { setId: updated.set.id, type },
          });
        } catch {
          /* non-blocking */
        }
      }

      return response.success(res, "Content approval updated", 200, updated);
    } catch (err) {
      return fail(res, err);
    }
  };

  getSetForReview = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Authentication required", 401);

      const canAll = await rbacService.checkUserHasPermission(
        userId,
        ["approve_exam_topics", "approve_courses", "approve_labs"],
        "OR"
      );
      const canOwn = await rbacService.checkUserHasPermission(
        userId,
        ["approve_own_exam_topics"],
        "OR"
      );
      if (!canAll && !canOwn) {
        return response.fail(res, "Insufficient permissions", 403);
      }

      const type = req.params.type === "exam" ? "exam" : "learning";
      const result = await examTopicsConfigService.getSetForReview(type, req.params.setId);

      if (
        !canAll &&
        canOwn &&
        String(result.set.created_by) !== String(userId)
      ) {
        return response.fail(res, "Insufficient permissions", 403);
      }

      return response.success(res, "OK", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  verifyAnswer = async (req, res) => {
    try {
      const { section, setId, questionId, optionId, optionIds, answerText } = req.body || {};
      if (!setId || !questionId) {
        return response.fail(res, "setId and questionId are required", 400);
      }
      const result = await examTopicsConfigService.verifyAnswer({
        section: section === "exam" ? "exam" : "learning",
        setId,
        questionId,
        optionId,
        optionIds,
        answerText,
      });
      return response.success(res, "OK", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  bulkUploadQuestions = async (req, res) => {
    try {
      const { csvContent, rows } = req.body || {};
      const result = examTopicsConfigService.bulkUploadQuestions(csvContent || rows || req.body);
      return response.success(res, "Bulk question validation complete", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  saveAttempt = async (req, res) => {
    try {
      const userId = req.user?.user_id || "guest";
      const { setId, examTitle, score, total, percentage, passed, timeTakenSeconds } = req.body || {};
      if (!setId) {
        return response.fail(res, "setId is required", 400);
      }
      const attemptRecord = {
        attemptId: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId,
        setId,
        examTitle: examTitle || "Exam Assessment",
        score: Number(score) || 0,
        total: Number(total) || 0,
        percentage: Number(percentage) || 0,
        passed: Boolean(passed),
        timeTakenSeconds: Number(timeTakenSeconds) || 0,
        completedAt: new Date().toISOString(),
      };

      const key = `exam_attempts:${userId}:${setId}`;
      const globalKey = `exam_attempts:${userId}:all`;
      const redisManager = require("../lib/redisManager");
      const redis = await redisManager.getClientSafe();

      if (redis) {
        await redis.lPush(key, JSON.stringify(attemptRecord));
        await redis.lTrim(key, 0, 49);
        await redis.lPush(globalKey, JSON.stringify(attemptRecord));
        await redis.lTrim(globalKey, 0, 99);
      }

      if (!global.memoryAttemptStore) global.memoryAttemptStore = new Map();
      if (!global.memoryAttemptStore.has(key)) global.memoryAttemptStore.set(key, []);
      global.memoryAttemptStore.get(key).unshift(attemptRecord);
      if (global.memoryAttemptStore.get(key).length > 50) global.memoryAttemptStore.get(key).pop();

      return response.success(res, "Attempt history saved", 200, { attempt: attemptRecord });
    } catch (err) {
      return fail(res, err);
    }
  };

  getAttempts = async (req, res) => {
    try {
      const userId = req.user?.user_id || "guest";
      const setId = req.params.setId || req.query.setId;
      const key = setId ? `exam_attempts:${userId}:${setId}` : `exam_attempts:${userId}:all`;

      let attempts = [];
      const redisManager = require("../lib/redisManager");
      const redis = await redisManager.getClientSafe();
      if (redis) {
        const raw = await redis.lRange(key, 0, 50);
        if (Array.isArray(raw) && raw.length > 0) {
          attempts = raw
            .map((item) => {
              try {
                return JSON.parse(item);
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
      }

      if (!attempts.length && global.memoryAttemptStore && global.memoryAttemptStore.has(key)) {
        attempts = global.memoryAttemptStore.get(key) || [];
      }

      return response.success(res, "Attempts retrieved", 200, { attempts });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new ExamTopicsConfigController();
