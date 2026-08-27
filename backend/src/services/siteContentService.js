const { SiteBranding, SiteBanner } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { Op } = require("sequelize");
const mediaStorage = require("./mediaStorageService");

async function ensureBrandingRow() {
  let row = await SiteBranding.findOne({ order: [["id", "ASC"]] });
  if (!row) {
    row = await SiteBranding.create({});
  }
  return row;
}

class SiteContentService {
  async getBranding() {
    const row = await ensureBrandingRow();
    return row.toJSON();
  }

  async updateBranding(payload = {}) {
    const row = await ensureBrandingRow();
    const allowed = [
      "logo_url",
      "favicon_url",
      "topbar_text",
      "topbar_image_url",
      "topbar_active",
    ];
    for (const k of allowed) {
      if (payload[k] !== undefined) row[k] = payload[k];
    }
    await row.save();
    return row.toJSON();
  }

  async saveUploadedImage(buffer, originalName) {
    return mediaStorage.saveImage(buffer, originalName, { folder: "site" });
  }

  async listBannersAdmin({ page = 1, limit = 20, q = "" } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    const where = q
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { subtitle: { [Op.like]: `%${q}%` } },
          ],
        }
      : {};
    const { rows, count } = await SiteBanner.findAndCountAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["created_at", "DESC"],
      ],
      offset,
      limit: l,
    });
    return {
      rows,
      pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 },
    };
  }

  async listBannersPublic() {
    return SiteBanner.findAll({
      where: { is_active: true },
      order: [
        ["sort_order", "ASC"],
        ["created_at", "DESC"],
      ],
    });
  }

  async createBanner(data) {
    return SiteBanner.create(data);
  }

  async updateBanner(id, data) {
    const row = await SiteBanner.findByPk(id);
    if (!row) throw new AppError("Banner not found", 404);
    Object.assign(row, data);
    await row.save();
    return row;
  }

  async deleteBanner(id) {
    const row = await SiteBanner.findByPk(id);
    if (!row) throw new AppError("Banner not found", 404);
    await row.destroy();
    return true;
  }
}

module.exports = new SiteContentService();
