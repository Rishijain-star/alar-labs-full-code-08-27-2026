const BaseService = require("./baseService");
const categoryRepository = require("../repositories/categoryRepository");
const { AppError } = require("../middleware/errorHandler");

function slugify(str = "") {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class CategoryService extends BaseService {
  constructor() {
    super(categoryRepository, "Category");
  }

  // ── Hooks ─────────────────────────────────────────────────────────────────

  async beforeCreate(data) {
    data.slug = data.slug || slugify(data.title || data.name || "");
    const exists = await this.repo.findBySlug(data.slug);
    if (exists) data.slug = `${data.slug}-${Date.now()}`;
    return data;
  }

  async beforeUpdate(id, data) {
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
      const exists = await this.repo.findBySlug(data.slug);
      // Only update slug if it's new or belongs to current category
      if (exists && exists.id !== id) {
        data.slug = `${data.slug}-${Date.now()}`;
      }
    }
    return data;
  }

  async afterDelete(existing) {
    await this.repo.invalidateCache(existing.id, existing.slug);
  }

  // ── Custom queries ───────────────────────────────────────────────────────────

  async getByIdWithSubcategories(id) {
    try {
      const category = await this.repo.findByIdWithSubcategories(id);
      if (!category) throw new AppError("Category not found", 404);
      return category;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to fetch category", 500);
    }
  }

  async getBySlug(slug) {
    const category = await this.repo.findBySlug(slug);
    if (!category) throw new AppError("Category not found", 404);
    return category;
  }

  async getAllActive(options = {}) {
    return this.repo.findAllActive(options);
  }
}

module.exports = new CategoryService();
