const { DigitalProgramSection } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { DEFAULTS, isAllowedKey, SECTION_KEYS } = require("../constants/digitalProgramSections");

async function ensureRow(sectionKey) {
  if (!isAllowedKey(sectionKey)) {
    throw new AppError("Invalid section key", 400, "INVALID_SECTION_KEY");
  }
  const def = DEFAULTS[sectionKey] || {
    title: sectionKey,
    subtitle: "",
    body: { html: "", bullets: [], links: [] },
  };

  const [row] = await DigitalProgramSection.findOrCreate({
    where: { section_key: sectionKey },
    defaults: {
      title: def.title,
      subtitle: def.subtitle || "",
      body: def.body || {},
      is_published: false,
      sort_order: SECTION_KEYS.indexOf(sectionKey),
    },
  });

  return row;
}

class DigitalProgramSectionService {
  async listPublished() {
    const rows = await DigitalProgramSection.findAll({
      where: { is_published: true },
      order: [["sort_order", "ASC"]],
    });
    return rows.map((r) => r.toJSON());
  }

  async getPublishedByKey(sectionKey) {
    if (!isAllowedKey(sectionKey)) {
      throw new AppError("Invalid section key", 400, "INVALID_SECTION_KEY");
    }
    const row = await DigitalProgramSection.findOne({
      where: { section_key: sectionKey, is_published: true },
    });
    if (!row) {
      throw new AppError("Not found", 404, "SECTION_NOT_FOUND");
    }
    return row.toJSON();
  }

  async listAllForAdmin() {
    await Promise.all(SECTION_KEYS.map((k) => ensureRow(k)));
    const rows = await DigitalProgramSection.findAll({
      order: [["sort_order", "ASC"]],
    });
    return rows.map((r) => r.toJSON());
  }

  async getForAdmin(sectionKey) {
    const row = await ensureRow(sectionKey);
    return row.toJSON();
  }

  async upsert(sectionKey, payload, userId) {
    if (!isAllowedKey(sectionKey)) {
      throw new AppError("Invalid section key", 400, "INVALID_SECTION_KEY");
    }
    const row = await ensureRow(sectionKey);

    const { title, subtitle, body, is_published, sort_order } = payload || {};

    if (title !== undefined) row.title = String(title).slice(0, 500);
    if (subtitle !== undefined) row.subtitle = subtitle ? String(subtitle).slice(0, 1000) : null;
    if (body !== undefined) row.body = typeof body === "object" && body !== null ? body : {};
    if (typeof is_published === "boolean") row.is_published = is_published;
    if (sort_order !== undefined && Number.isFinite(Number(sort_order))) {
      row.sort_order = Number(sort_order);
    }
    if (userId) row.updated_by = userId;

    await row.save();
    return row.toJSON();
  }
}

module.exports = new DigitalProgramSectionService();
