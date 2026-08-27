const legalService = require("../services/legalService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class LegalController {
  getPublic = async (req, res) => {
    try {
      const type = String(req.params.type || "").toLowerCase();
      const data = await legalService.getPublishedByType(type);
      return response.success(res, "OK", 200, { document: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const data = await legalService.listAdmin();
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  upsertType = async (req, res) => {
    try {
      const type = String(req.params.type || "").toLowerCase();
      const data = await legalService.upsertByType(type, req.body || {}, req.user?.user_id || null);
      return response.success(res, "Saved", 200, { document: data });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new LegalController();
