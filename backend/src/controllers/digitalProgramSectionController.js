const service = require("../services/digitalProgramSectionService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class DigitalProgramSectionController {
  listPublished = async (req, res) => {
    try {
      const data = await service.listPublished();
      return response.success(res, "OK", 200, { sections: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  getPublishedByKey = async (req, res) => {
    try {
      const { sectionKey } = req.params;
      const data = await service.getPublishedByKey(sectionKey);
      return response.success(res, "OK", 200, { section: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const data = await service.listAllForAdmin();
      return response.success(res, "OK", 200, { sections: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  getAdmin = async (req, res) => {
    try {
      const { sectionKey } = req.params;
      const data = await service.getForAdmin(sectionKey);
      return response.success(res, "OK", 200, { section: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  upsert = async (req, res) => {
    try {
      const { sectionKey } = req.params;
      const userId = req.user?.user_id || null;
      const data = await service.upsert(sectionKey, req.body, userId);
      return response.success(res, "Saved", 200, { section: data });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new DigitalProgramSectionController();
