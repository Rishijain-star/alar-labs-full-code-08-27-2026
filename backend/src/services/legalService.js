const { LegalDocument } = require("../models");
const { AppError } = require("../middleware/errorHandler");

class LegalService {
  async getPublishedByType(type) {
    const row = await LegalDocument.findOne({
      where: { doc_type: type, is_published: true },
      order: [["published_at", "DESC"], ["updated_at", "DESC"]],
    });
    if (!row) throw new AppError("Document not found", 404);
    return row;
  }

  async listAdmin() {
    const rows = await LegalDocument.findAll({ order: [["updated_at", "DESC"]] });
    return { rows };
  }

  async upsertByType(type, payload, userId) {
    let row = await LegalDocument.findOne({ where: { doc_type: type }, order: [["updated_at", "DESC"]] });
    if (!row) {
      row = await LegalDocument.create({
        doc_type: type,
        title: payload.title || (type === "terms" ? "Terms & Conditions" : "Privacy Policy"),
        content: payload.content || "",
        is_published: payload.is_published !== false,
        version: payload.version || null,
        published_at: payload.is_published === false ? null : new Date(),
        created_by: userId || null,
        updated_by: userId || null,
      });
      return row;
    }
    row.title = payload.title ?? row.title;
    row.content = payload.content ?? row.content;
    row.is_published = payload.is_published != null ? !!payload.is_published : row.is_published;
    row.version = payload.version ?? row.version;
    row.published_at = row.is_published ? (payload.published_at ? new Date(payload.published_at) : new Date()) : null;
    row.updated_by = userId || row.updated_by;
    await row.save();
    return row;
  }
}

module.exports = new LegalService();
