const assessmentConfigService = require("../services/assessmentConfigService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class AssessmentConfigController {
  getConfig = async (req, res) => {
    try {
      const row = await assessmentConfigService.getPublishedConfig();
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
      const row = await assessmentConfigService.getAdminConfig();
      return response.success(res, "OK", 200, {
        configKey: row.config_key,
        config: row.config,
        isPublished: row.is_published,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  upsertConfig = async (req, res) => {
    try {
      const userId = req.user?.user_id || null;
      const row = await assessmentConfigService.upsertConfig(req.body, userId);
      return response.success(res, "Saved", 200, {
        configKey: row.config_key,
        config: row.config,
        isPublished: row.is_published,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  recommend = async (req, res) => {
    try {
      const recommendation = await assessmentConfigService.recommendFromDb(req.body || {});
      return response.success(res, "OK", 200, { recommendation });
    } catch (err) {
      return fail(res, err);
    }
  };

  previewRecommend = async (req, res) => {
    try {
      const result = await assessmentConfigService.previewAutoRecommend(req.body || {});
      return response.success(res, "OK", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new AssessmentConfigController();
