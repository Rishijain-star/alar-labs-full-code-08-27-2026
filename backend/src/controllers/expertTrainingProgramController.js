const response = require("../utils/response");
const { fail } = require("../helper/helper");
const expertTrainingProgramService = require("../services/expertTrainingProgramService");
const expertTrainingProgramEnrollmentService = require("../services/expertTrainingProgramEnrollmentService");
const siteContentService = require("../services/siteContentService");

function requireUserId(req) {
  const id = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
  if (!id) {
    const { AppError } = require("../middleware/errorHandler");
    throw new AppError("Authentication required", 401);
  }
  return id;
}

class ExpertTrainingProgramController {
  listPublic = async (req, res) => {
    try {
      const data = await expertTrainingProgramService.listPublic(req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getBySlug = async (req, res) => {
    try {
      const data = await expertTrainingProgramService.getBySlug(req.params.slug);
      const json = data.toJSON();
      let isEnrolled = false;
      const userId = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
      if (userId) {
        isEnrolled = await expertTrainingProgramEnrollmentService.isUserEnrolled(userId, json.id);
      }
      if (!isEnrolled) {
        json.meeting_link = null;
      }
      return response.success(res, "OK", 200, { program: json, isEnrolled });
    } catch (err) {
      return fail(res, err);
    }
  };

  enrollFree = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const result = await expertTrainingProgramEnrollmentService.enrollFree(
        userId,
        req.params.id,
        req.body || {}
      );
      return response.success(
        res,
        result.alreadyEnrolled ? "Already enrolled" : "Enrolled",
        200,
        result
      );
    } catch (err) {
      return fail(res, err);
    }
  };

  listMine = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const rows = await expertTrainingProgramEnrollmentService.listForUser(userId);
      return response.success(res, "OK", 200, { rows });
    } catch (err) {
      return fail(res, err);
    }
  };

  listEnrollments = async (req, res) => {
    try {
      const { search } = req.query;
      const data = await expertTrainingProgramEnrollmentService.listForProgram(req.params.id, {
        search,
      });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const data = await expertTrainingProgramService.listAdmin(req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const row = await expertTrainingProgramService.getById(req.params.id);
      return response.success(res, "OK", 200, { program: row });
    } catch (err) {
      return fail(res, err);
    }
  };

  create = async (req, res) => {
    try {
      const row = await expertTrainingProgramService.create(req.body || {});
      return response.success(res, "Created", 201, { program: row });
    } catch (err) {
      return fail(res, err);
    }
  };

  update = async (req, res) => {
    try {
      const row = await expertTrainingProgramService.update(req.params.id, req.body || {});
      return response.success(res, "Updated", 200, { program: row });
    } catch (err) {
      return fail(res, err);
    }
  };

  remove = async (req, res) => {
    try {
      await expertTrainingProgramService.remove(req.params.id);
      return response.success(res, "Deleted", 200, {});
    } catch (err) {
      return fail(res, err);
    }
  };

  uploadBanner = async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return response.fail(res, "File required", 400);
      }
      const url = await siteContentService.saveUploadedImage(
        req.file.buffer,
        req.file.originalname
      );
      return response.success(res, "Uploaded", 200, { url });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new ExpertTrainingProgramController();
