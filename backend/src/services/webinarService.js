const { randomUUID } = require("crypto");
const { Webinar } = require("../models");
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
  let base = slugify(desired) || "webinar";
  if (base.length > 200) base = base.slice(0, 200);
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`;
    const trimmed = candidate.length > 255 ? candidate.slice(0, 255) : candidate;
    const existing = await Webinar.findOne({
      where: excludeId ? { slug: trimmed, id: { [Op.ne]: excludeId } } : { slug: trimmed },
    });
    if (!existing) return trimmed;
  }
  throw new AppError("Could not generate a unique webinar slug.", 400);
}

function normalizeTopics(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((t) => String(t)).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map((t) => String(t)).filter(Boolean) : [];
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

class WebinarService {
  async listPublic({ page = 1, limit = 20 } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * l;

    const { count, rows } = await Webinar.findAndCountAll({
      where: { status: "published" },
      order: [
        ["sort_order", "ASC"],
        ["starts_at", "ASC"],
        ["created_at", "DESC"],
      ],
      limit: l,
      offset,
    });

    return {
      rows: rows.map((r) => {
        const j = r.toJSON();
        j.meeting_link = null;
        return j;
      }),
      pagination: {
        total: count,
        page: p,
        limit: l,
        total_pages: Math.ceil(count / l) || 1,
        has_next: p * l < count,
      },
    };
  }

  async listAdmin({ page = 1, limit = 20, status } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (p - 1) * l;
    const where = {};
    if (status && ["draft", "published", "cancelled"].includes(status)) {
      where.status = status;
    }

    const { count, rows } = await Webinar.findAndCountAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["starts_at", "ASC"],
        ["created_at", "DESC"],
      ],
      limit: l,
      offset,
    });

    return {
      rows: rows.map((r) => r.toJSON()),
      pagination: {
        total: count,
        page: p,
        limit: l,
        total_pages: Math.ceil(count / l) || 1,
        has_next: p * l < count,
      },
    };
  }

  async getBySlug(slug) {
    const row = await Webinar.findOne({
      where: { slug, status: "published" },
    });
    if (!row) throw new AppError("Webinar not found", 404);
    return row;
  }

  async getById(id) {
    const row = await Webinar.findByPk(id);
    if (!row) throw new AppError("Webinar not found", 404);
    return row.toJSON();
  }

  async create(payload) {
    const title = String(payload.title || "").trim();
    if (!title) throw new AppError("Title is required", 400);

    const slug = await ensureUniqueSlug(payload.slug || title);
    const topics = normalizeTopics(payload.topics);

    const row = await Webinar.create({
      title,
      slug,
      description: payload.description != null ? String(payload.description) : null,
      about_content: payload.about_content != null ? String(payload.about_content) : null,
      instructor_name: String(payload.instructor_name || "Instructor").trim(),
      instructor_title: payload.instructor_title != null ? String(payload.instructor_title) : null,
      instructor_image: payload.instructor_image != null ? String(payload.instructor_image) : null,
      rating: payload.rating != null ? Number(payload.rating) : 4.8,
      price: payload.price != null ? Number(payload.price) : 0,
      original_price:
        payload.original_price != null && payload.original_price !== ""
          ? Number(payload.original_price)
          : null,
      is_free: Boolean(payload.is_free),
      schedule_summary: payload.schedule_summary != null ? String(payload.schedule_summary) : null,
      time_summary: payload.time_summary != null ? String(payload.time_summary) : null,
      duration_summary: payload.duration_summary != null ? String(payload.duration_summary) : null,
      enrolled_count:
        payload.enrolled_count != null ? parseInt(payload.enrolled_count, 10) || 0 : 0,
      max_capacity:
        payload.max_capacity != null ? parseInt(payload.max_capacity, 10) : null,
      topics,
      status: ["draft", "published", "cancelled"].includes(payload.status)
        ? payload.status
        : "draft",
      sort_order: payload.sort_order != null ? Number(payload.sort_order) : 0,
      starts_at: payload.starts_at ? new Date(payload.starts_at) : null,
      enrollment_url: payload.enrollment_url != null ? String(payload.enrollment_url) : null,
      delivery_mode: ["online", "offline", "hybrid"].includes(payload.delivery_mode)
        ? payload.delivery_mode
        : "online",
      meeting_link: payload.meeting_link != null ? String(payload.meeting_link) : null,
      venue: payload.venue != null ? String(payload.venue) : null,
      timezone: payload.timezone != null ? String(payload.timezone) : "IST",
      is_recorded: Boolean(payload.is_recorded),
      currency: payload.currency != null ? String(payload.currency) : "INR",
    });

    return row.toJSON();
  }

  async update(id, payload) {
    const row = await Webinar.findByPk(id);
    if (!row) throw new AppError("Webinar not found", 404);

    if (payload.title !== undefined) row.title = String(payload.title).trim();
    if (payload.slug !== undefined) {
      row.slug = await ensureUniqueSlug(payload.slug, id);
    }
    if (payload.description !== undefined) row.description = payload.description;
    if (payload.about_content !== undefined) row.about_content = payload.about_content;
    if (payload.instructor_name !== undefined) {
      row.instructor_name = String(payload.instructor_name).trim();
    }
    if (payload.instructor_title !== undefined) row.instructor_title = payload.instructor_title;
    if (payload.instructor_image !== undefined) row.instructor_image = payload.instructor_image;
    if (payload.rating !== undefined) row.rating = Number(payload.rating);
    if (payload.price !== undefined) row.price = Number(payload.price);
    if (payload.original_price !== undefined) {
      row.original_price =
        payload.original_price == null || payload.original_price === ""
          ? null
          : Number(payload.original_price);
    }
    if (payload.is_free !== undefined) row.is_free = Boolean(payload.is_free);
    if (payload.schedule_summary !== undefined) row.schedule_summary = payload.schedule_summary;
    if (payload.time_summary !== undefined) row.time_summary = payload.time_summary;
    if (payload.duration_summary !== undefined) row.duration_summary = payload.duration_summary;
    if (payload.enrolled_count !== undefined) {
      row.enrolled_count = parseInt(payload.enrolled_count, 10) || 0;
    }
    if (payload.max_capacity !== undefined) {
      row.max_capacity =
        payload.max_capacity == null ? null : parseInt(payload.max_capacity, 10);
    }
    if (payload.topics !== undefined) row.topics = normalizeTopics(payload.topics);
    if (payload.status !== undefined && ["draft", "published", "cancelled"].includes(payload.status)) {
      row.status = payload.status;
    }
    if (payload.sort_order !== undefined) row.sort_order = Number(payload.sort_order);
    if (payload.starts_at !== undefined) {
      row.starts_at = payload.starts_at ? new Date(payload.starts_at) : null;
    }
    if (payload.enrollment_url !== undefined) row.enrollment_url = payload.enrollment_url;
    if (payload.delivery_mode !== undefined && ["online", "offline", "hybrid"].includes(payload.delivery_mode)) {
      row.delivery_mode = payload.delivery_mode;
    }
    if (payload.meeting_link !== undefined) row.meeting_link = payload.meeting_link;
    if (payload.venue !== undefined) row.venue = payload.venue;
    if (payload.timezone !== undefined) row.timezone = payload.timezone;
    if (payload.is_recorded !== undefined) row.is_recorded = Boolean(payload.is_recorded);
    if (payload.currency !== undefined) row.currency = payload.currency;

    await row.save();
    return row.toJSON();
  }

  async remove(id) {
    const row = await Webinar.findByPk(id);
    if (!row) throw new AppError("Webinar not found", 404);
    await row.destroy();
    return { id };
  }
}

module.exports = new WebinarService();
