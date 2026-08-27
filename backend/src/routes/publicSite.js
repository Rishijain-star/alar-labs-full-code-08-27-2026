const express = require("express");
const router = express.Router();
const siteContentService = require("../services/siteContentService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

router.get("/branding", async (req, res) => {
  try {
    const branding = await siteContentService.getBranding();
    return response.success(res, "OK", 200, { branding });
  } catch (err) {
    return fail(res, err);
  }
});

router.get("/platform-settings", async (req, res) => {
  try {
    const systemSettingsService = require("../services/systemSettingsService");
    const settings = await systemSettingsService.getPublicSettings();
    return response.success(res, "OK", 200, { settings });
  } catch (err) {
    return fail(res, err);
  }
});

router.get("/banners", async (req, res) => {
  try {
    const rows = await siteContentService.listBannersPublic();
    return response.success(res, "OK", 200, { banners: rows });
  } catch (err) {
    return fail(res, err);
  }
});

module.exports = router;
