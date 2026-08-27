const webinarService = require("../services/webinarService");
const webinarRegistrationService = require("../services/webinarRegistrationService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

function requireUserId(req) {
  const id = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
  if (!id) {
    const { AppError } = require("../middleware/errorHandler");
    throw new AppError("Authentication required", 401);
  }
  return id;
}

class WebinarController {
  listPublic = async (req, res) => {
    try {
      const { page, limit } = req.query;
      const data = await webinarService.listPublic({ page, limit });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getBySlug = async (req, res) => {
    try {
      const data = await webinarService.getBySlug(req.params.slug);
      const json = data.toJSON();
      let isRegistered = false;
      const userId = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
      if (userId) {
        isRegistered = await webinarRegistrationService.isUserRegistered(userId, json.id);
      }
      if (!isRegistered) {
        json.meeting_link = null;
      }
      return response.success(res, "OK", 200, { webinar: json, isRegistered });
    } catch (err) {
      return fail(res, err);
    }
  };

  registerFree = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const result = await webinarRegistrationService.registerFree(
        userId,
        req.params.id,
        req.body || {}
      );
      return response.success(res, result.alreadyRegistered ? "Already registered" : "Registered", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getMyWebinars = async (req, res) => {
    try {
      const userId = requireUserId(req);
      const data = await webinarRegistrationService.listUserRegistrations(userId);
      return response.success(res, "OK", 200, { rows: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  listRegistrations = async (req, res) => {
    try {
      const { search } = req.query;
      const data = await webinarRegistrationService.listForWebinar(req.params.id, { search });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const { page, limit, status } = req.query;
      const data = await webinarService.listAdmin({ page, limit, status });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const data = await webinarService.getById(req.params.id);
      return response.success(res, "OK", 200, { webinar: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  create = async (req, res) => {
    try {
      const data = await webinarService.create(req.body || {});
      return response.success(res, "Created", 201, { webinar: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  update = async (req, res) => {
    try {
      const data = await webinarService.update(req.params.id, req.body || {});
      return response.success(res, "Updated", 200, { webinar: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  uploadImage = async (req, res) => {
    try {
      if (!req.file?.buffer) {
        return response.fail(res, "File required", 400);
      }
      const siteContentService = require("../services/siteContentService");
      const url = await siteContentService.saveUploadedImage(
        req.file.buffer,
        req.file.originalname
      );
      return response.success(res, "Uploaded", 200, { url });
    } catch (err) {
      return fail(res, err);
    }
  };

  remove = async (req, res) => {
    try {
      const data = await webinarService.remove(req.params.id);
      return response.success(res, "Deleted", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new WebinarController();
