const subcategoryService = require("../services/subcategoryService");
const response = require("../utils/response");
const { validate, fail } = require("../helper/helper");

class SubcategoryController {
  // ─────────────────────────────────────────────────────────────────────────

  getAll = async (req, res) => {
    try {
      const { page = 1, limit = 20, is_active, category_id, search } = req.query;
      const where = {};
      if (is_active !== undefined) where.is_active = is_active === "true";
      if (category_id) where.category_id = category_id;
      if (search) {
        const { Sequelize } = require("sequelize");
        where.name = {
          [Sequelize.Op.like]: `%${search}%`,
        };
      }

      const result = await subcategoryService.getAll({
        page: +page,
        limit: +limit,
        where,
        order: [["display_order", "ASC"]],
      });
      return response.success(res, "Subcategories fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const subcategory = await subcategoryService.getByIdWithCategory(req.params.id);
      return response.success(res, "Subcategory fetched", 200, { subcategory });
    } catch (err) {
      return fail(res, err);
    }
  };

  getBySlug = async (req, res) => {
    try {
      const subcategory = await subcategoryService.getBySlug(req.params.slug);
      return response.success(res, "Subcategory fetched", 200, { subcategory });
    } catch (err) {
      return fail(res, err);
    }
  };

  getByCategory = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await subcategoryService.getByCategory(req.params.category_id, {
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Subcategories for category fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getActive = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await subcategoryService.getAllActive({
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Active subcategories fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  create = async (req, res) => {
    try {
      await validate(req.body, {
        category_id: "required|string",
        name: "required|string|minLength:2|maxLength:255",
        slug: "string|maxLength:255",
        description: "string",
        icon: "string",
        display_order: "integer",
        is_active: "boolean",
      });

      const subcategory = await subcategoryService.create({
        category_id: req.body.category_id,
        name: req.body.name?.trim(),
        slug: req.body.slug?.trim(),
        description: req.body.description?.trim() || null,
        icon: req.body.icon || null,
        display_order: req.body.display_order ? parseInt(req.body.display_order, 10) : 0,
        is_active: req.body.is_active !== undefined ? req.body.is_active === "true" || req.body.is_active === true : true,
      });

      return response.success(res, "Subcategory created", 201, { subcategory });
    } catch (err) {
      return fail(res, err);
    }
  };

  update = async (req, res) => {
    try {
      await validate(req.body, {
        category_id: "string",
        name: "string|minLength:2|maxLength:255",
        slug: "string|maxLength:255",
        description: "string",
        icon: "string",
        display_order: "integer",
        is_active: "boolean",
      });

      const payload = {};
      if (req.body.category_id) payload.category_id = req.body.category_id;
      if (req.body.name) payload.name = req.body.name.trim();
      if (req.body.slug) payload.slug = req.body.slug.trim();
      if (req.body.description !== undefined) payload.description = req.body.description?.trim() || null;
      if (req.body.icon !== undefined) payload.icon = req.body.icon || null;
      if (req.body.display_order !== undefined) payload.display_order = parseInt(req.body.display_order, 10);
      if (req.body.is_active !== undefined) payload.is_active = req.body.is_active === "true" || req.body.is_active === true;

      const subcategory = await subcategoryService.update(req.params.id, payload);
      return response.success(res, "Subcategory updated", 200, { subcategory });
    } catch (err) {
      return fail(res, err);
    }
  };

  delete = async (req, res) => {
    try {
      await subcategoryService.delete(req.params.id);
      return response.success(res, "Subcategory deleted", 200);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new SubcategoryController();
