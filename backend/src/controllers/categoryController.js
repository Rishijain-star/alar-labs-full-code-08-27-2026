const categoryService = require("../services/categoryService");
const response = require("../utils/response");
const { validate, fail } = require("../helper/helper");

class CategoryController {
  // ─────────────────────────────────────────────────────────────────────────

  getAll = async (req, res) => {
    try {
      const { page = 1, limit = 20, is_active, search } = req.query;
      const where = {};
      if (is_active !== undefined) where.is_active = is_active === "true" || is_active === true;
      if (search) {
        const { Sequelize } = require("sequelize");
        where.name = {
          [Sequelize.Op.like]: `%${search}%`,
        };
      }

      const result = await categoryService.getAll({
        page: +page,
        limit: +limit,
        where,
        order: [
          ["display_order", "ASC"],
          ["name", "ASC"],
        ],
      });
      return response.success(res, "Categories fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const category = await categoryService.getByIdWithSubcategories(req.params.id);
      return response.success(res, "Category fetched", 200, { category });
    } catch (err) {
      return fail(res, err);
    }
  };

  getBySlug = async (req, res) => {
    try {
      const category = await categoryService.getBySlug(req.params.slug);
      return response.success(res, "Category fetched", 200, { category });
    } catch (err) {
      return fail(res, err);
    }
  };

  getActive = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await categoryService.getAllActive({
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Active categories fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  create = async (req, res) => {
    try {
      await validate(req.body, {
        name: "required|string|minLength:2|maxLength:255",
        slug: "string|maxLength:255",
        description: "string",
        icon: "string",
        display_order: "integer",
        is_active: "boolean",
      });

      const category = await categoryService.create({
        name: req.body.name?.trim(),
        slug: req.body.slug?.trim(),
        description: req.body.description?.trim() || null,
        icon: req.body.icon || null,
        display_order: req.body.display_order ? parseInt(req.body.display_order, 10) : 0,
        is_active: req.body.is_active !== undefined ? req.body.is_active === "true" || req.body.is_active === true : true,
      });

      return response.success(res, "Category created", 201, { category });
    } catch (err) {
      return fail(res, err);
    }
  };

  update = async (req, res) => {
    try {
      await validate(req.body, {
        name: "string|minLength:2|maxLength:255",
        slug: "string|maxLength:255",
        description: "string",
        icon: "string",
        display_order: "integer",
        is_active: "boolean",
      });

      const payload = {};
      if (req.body.name) payload.name = req.body.name.trim();
      if (req.body.slug) payload.slug = req.body.slug.trim();
      if (req.body.description !== undefined) payload.description = req.body.description?.trim() || null;
      if (req.body.icon !== undefined) payload.icon = req.body.icon || null;
      if (req.body.display_order !== undefined) payload.display_order = parseInt(req.body.display_order, 10);
      if (req.body.is_active !== undefined) payload.is_active = req.body.is_active === "true" || req.body.is_active === true;

      const category = await categoryService.update(req.params.id, payload);
      return response.success(res, "Category updated", 200, { category });
    } catch (err) {
      return fail(res, err);
    }
  };

  delete = async (req, res) => {
    try {
      await categoryService.delete(req.params.id);
      return response.success(res, "Category deleted", 200);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new CategoryController();
