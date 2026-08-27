const { randomUUID } = require("crypto");
const { ExpertTrainingProgram } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { Op } = require("sequelize");

function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(desired, excludeId = null) {
  let base = slugify(desired) || "training-program";
  if (base.length > 200) base = base.slice(0, 200);
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`;
    const trimmed = candidate.length > 255 ? candidate.slice(0, 255) : candidate;
    const existing = await ExpertTrainingProgram.findOne({
      where: excludeId ? { slug: trimmed, id: { [Op.ne]: excludeId } } : { slug: trimmed },
    });
    if (!existing) return trimmed;
  }
  throw new AppError("Could not generate a unique program slug.", 400);
}

function normalizeLearningOutcomes(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((t) => String(t)).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map((t) => String(t)).filter(Boolean) : [];
    } catch {
      return raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function sanitizePublicRow(row) {
  const j = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  j.meeting_link = null;
  return j;
}

class ExpertTrainingProgramService {
  async listPublic({ page = 1, limit = 12 } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(50, Math.max(1, Number(limit) || 12));
    const offset = (p - 1) * l;
    const { rows, count } = await ExpertTrainingProgram.findAndCountAll({
      where: { is_published: true },
      order: [["schedule_start", "ASC"]],
      offset,
      limit: l,
    });
    return {
      rows: rows.map(sanitizePublicRow),
      pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 },
    };
  }

  async listAdmin({ page = 1, limit = 20, q = "" } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    const where = q
      ? {
          [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
            { instructor_name: { [Op.like]: `%${q}%` } },
          ],
        }
      : {};
    const { rows, count } = await ExpertTrainingProgram.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    return {
      rows,
      pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 },
    };
  }

  async getBySlug(slug) {
    const row = await ExpertTrainingProgram.findOne({
      where: { slug, is_published: true },
    });
    if (!row) throw new AppError("Program not found", 404);
    return row;
  }

  async getById(id) {
    const row = await ExpertTrainingProgram.findByPk(id);
    if (!row) throw new AppError("Program not found", 404);
    return row;
  }

  normalizePayload(payload, { isCreate = false, existingId = null } = {}) {
    const p = { ...payload };
    if (p.tags != null) {
      if (typeof p.tags === "string") {
        try {
          p.tags = JSON.parse(p.tags);
        } catch {
          p.tags = p.tags.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(p.tags)) p.tags = [];
    }
    if (p.learning_outcomes !== undefined) {
      p.learning_outcomes = normalizeLearningOutcomes(p.learning_outcomes);
    }
    if (p.price !== undefined) {
      p.price = Number(p.price) || 0;
      if (p.is_free === undefined) {
        p.is_free = p.price <= 0;
      }
    }
    if (p.original_price !== undefined) {
      p.original_price =
        p.original_price == null || p.original_price === ""
          ? null
          : Number(p.original_price) || null;
    }
    if (p.instructor_rating !== undefined) {
      p.instructor_rating = Math.min(5, Math.max(1, Number(p.instructor_rating) || 4.9));
    }
    if (p.is_free !== undefined) {
      p.is_free = Boolean(p.is_free);
      if (p.is_free && p.price === undefined) p.price = 0;
    }
    if (p.session_count !== undefined) {
      p.session_count = Math.max(1, parseInt(p.session_count, 10) || 1);
    }
    if (p.training_format !== undefined) {
      const allowed = ["live_online", "hybrid", "in_person"];
      if (!allowed.includes(p.training_format)) p.training_format = "live_online";
    }
    if (p.level !== undefined) {
      const allowed = ["beginner", "intermediate", "advanced"];
      if (!allowed.includes(p.level)) p.level = "beginner";
    }
    if (isCreate || p.slug !== undefined) {
      const title = String(p.title || "").trim();
      if (isCreate && !p.slug && title) {
        p.slug = null;
      }
    }
    if (p.slug === null || (isCreate && !p.slug)) {
      /* assigned in create */
    } else if (p.slug !== undefined) {
      p.slug = String(p.slug).trim() || null;
    }
    return p;
  }

  async create(payload) {
    const p = this.normalizePayload(payload, { isCreate: true });
    const title = String(p.title || "").trim();
    if (!title) throw new AppError("Title is required", 400);
    p.slug = await ensureUniqueSlug(p.slug || title);
    return ExpertTrainingProgram.create(p);
  }

  async update(id, payload) {
    const row = await this.getById(id);
    const p = this.normalizePayload(payload);
    if (p.slug !== undefined && p.slug) {
      p.slug = await ensureUniqueSlug(p.slug, id);
    }
    Object.assign(row, p);
    await row.save();
    return row;
  }

  async remove(id) {
    const row = await this.getById(id);
    await row.destroy();
    return true;
  }
}

module.exports = new ExpertTrainingProgramService();
