const BaseService = require("./baseService");
const subcategoryRepository = require("../repositories/subcategoryRepository");
const categoryRepository = require("../repositories/categoryRepository");
const { AppError } = require("../middleware/errorHandler");

function slugify(str = "") {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class SubcategoryService extends BaseService {
  constructor() {
    super(subcategoryRepository, "Subcategory");
  }

  // ── Hooks ─────────────────────────────────────────────────────────────────

  async beforeCreate(data) {
    // Validate category exists
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    data.slug = data.slug || slugify(data.name || "");
    const exists = await this.repo.findBySlug(data.slug);
    if (exists) data.slug = `${data.slug}-${Date.now()}`;
    return data;
  }

  async beforeUpdate(id, data) {
    // Validate category exists if being changed
    if (data.categoryId) {
      const category = await categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new AppError("Category not found", 404);
      }
    }

    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
      const exists = await this.repo.findBySlug(data.slug);
      // Only update slug if it's new or belongs to current subcategory
      if (exists && exists.id !== id) {
        data.slug = `${data.slug}-${Date.now()}`;
      }
    }
    return data;
  }

  async afterDelete(existing) {
    await this.repo.invalidateCache(existing.id, existing.categoryId, existing.slug);
  }

  // ── Custom queries ───────────────────────────────────────────────────────────

  async getByIdWithCategory(id) {
    try {
      const subcategory = await this.repo.findByIdWithCategory(id);
      if (!subcategory) throw new AppError("Subcategory not found", 404);
      return subcategory;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to fetch subcategory", 500);
    }
  }

  async getBySlug(slug) {
    const subcategory = await this.repo.findBySlug(slug);
    if (!subcategory) throw new AppError("Subcategory not found", 404);
    return subcategory;
  }

  async getByCategory(categoryId, options = {}) {
    // Validate category exists
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    return this.repo.findByCategory(categoryId, options);
  }

  async getAllActive(options = {}) {
    return this.repo.findAllActive(options);
  }
}

module.exports = new SubcategoryService();
