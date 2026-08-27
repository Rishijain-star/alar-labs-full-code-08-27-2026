const response = require("../utils/response");
const { fail } = require("../helper/helper");
const siteContentService = require("../services/siteContentService");

class SiteContentController {
  getBranding = async (req, res) => {
    try {
      const data = await siteContentService.getBranding();
      return response.success(res, "OK", 200, { branding: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  putBranding = async (req, res) => {
    try {
      const data = await siteContentService.updateBranding(req.body || {});
      return response.success(res, "Updated", 200, { branding: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  uploadAsset = async (req, res) => {
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

  listBanners = async (req, res) => {
    try {
      const data = await siteContentService.listBannersAdmin(req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  createBanner = async (req, res) => {
    try {
      const row = await siteContentService.createBanner(req.body || {});
      return response.success(res, "Created", 201, { banner: row });
    } catch (err) {
      return fail(res, err);
    }
  };

  updateBanner = async (req, res) => {
    try {
      const row = await siteContentService.updateBanner(req.params.id, req.body || {});
      return response.success(res, "Updated", 200, { banner: row });
    } catch (err) {
      return fail(res, err);
    }
  };

  deleteBanner = async (req, res) => {
    try {
      await siteContentService.deleteBanner(req.params.id);
      return response.success(res, "Deleted", 200, {});
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new SiteContentController();
