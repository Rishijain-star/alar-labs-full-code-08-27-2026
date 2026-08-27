const BaseService = require("./baseService");
const technologySkillRepository = require("../repositories/technologySkillRepository");
const { AppError } = require("../middleware/errorHandler");

function slugify(str = "") {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class TechnologySkillService extends BaseService {
  constructor() {
    super(technologySkillRepository, "TechnologySkill");
  }

  // ── Hooks ─────────────────────────────────────────────────────────────────

  async beforeCreate(data) {
    data.slug = data.slug || slugify(data.name || "");
    const exists = await this.repo.findBySlug(data.slug);
    if (exists) data.slug = `${data.slug}-${Date.now()}`;

    // Validate category is one of the allowed values
    const allowedCategories = ["cloud", "container", "framework", "language", "database", "devops", "other"];
    if (data.category && !allowedCategories.includes(data.category)) {
      throw new AppError(`Invalid category. Must be one of: ${allowedCategories.join(", ")}`, 400);
    }

    return data;
  }

  async beforeUpdate(id, data) {
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
      const exists = await this.repo.findBySlug(data.slug);
      // Only update slug if it's new or belongs to current skill
      if (exists && exists.id !== id) {
        data.slug = `${data.slug}-${Date.now()}`;
      }
    }

    // Validate category if being changed
    if (data.category) {
      const allowedCategories = ["cloud", "container", "framework", "language", "database", "devops", "other"];
      if (!allowedCategories.includes(data.category)) {
        throw new AppError(`Invalid category. Must be one of: ${allowedCategories.join(", ")}`, 400);
      }
    }

    return data;
  }

  async afterDelete(existing) {
    await this.repo.invalidateCache(existing.id, existing.slug, existing.category);
  }

  // ── Custom queries ───────────────────────────────────────────────────────────

  async getBySlug(slug) {
    const skill = await this.repo.findBySlug(slug);
    if (!skill) throw new AppError("Technology skill not found", 404);
    return skill;
  }

  async getByCategory(category, options = {}) {
    const allowedCategories = ["cloud", "container", "framework", "language", "database", "devops", "other"];
    if (!allowedCategories.includes(category)) {
      throw new AppError(`Invalid category. Must be one of: ${allowedCategories.join(", ")}`, 400);
    }
    return this.repo.findByCategory(category, options);
  }

  async getAllActive(options = {}) {
    return this.repo.findAllActive(options);
  }

  async getAllCategories() {
    try {
      return await this.repo.findAllCategories();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to fetch categories", 500);
    }
  }

  async search(query, options = {}) {
    if (!query || query.trim().length < 2) {
      throw new AppError("Search query must be at least 2 characters", 400);
    }
    return this.repo.search(query.trim(), options);
  }
}

module.exports = new TechnologySkillService();
