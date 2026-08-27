const technologySkillService = require("../services/technologySkillService");
const response = require("../utils/response");
const { validate, fail } = require("../helper/helper");

class TechnologySkillController {
  // ─────────────────────────────────────────────────────────────────────────

  getAll = async (req, res) => {
    try {
      const { page = 1, limit = 20, is_active, category, search } = req.query;
      const where = {};
      if (is_active !== undefined) where.is_active = is_active === "true";
      if (category) where.category = category;
      if (search) {
        const { Sequelize } = require("sequelize");
        where.name = {
          [Sequelize.Op.like]: `%${search}%`,
        };
      }

      const result = await technologySkillService.getAll({
        page: +page,
        limit: +limit,
        where,
        order: [["display_order", "ASC"]],
      });
      return response.success(res, "Technology skills fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getById = async (req, res) => {
    try {
      const skill = await technologySkillService.getById(req.params.id);
      return response.success(res, "Technology skill fetched", 200, { skill });
    } catch (err) {
      return fail(res, err);
    }
  };

  getBySlug = async (req, res) => {
    try {
      const skill = await technologySkillService.getBySlug(req.params.slug);
      return response.success(res, "Technology skill fetched", 200, { skill });
    } catch (err) {
      return fail(res, err);
    }
  };

  getByCategory = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await technologySkillService.getByCategory(req.params.category, {
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Skills for category fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getActive = async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await technologySkillService.getAllActive({
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Active technology skills fetched", 200, result);
    } catch (err) {
      return fail(res, err);
    }
  };

  getAllCategories = async (req, res) => {
    try {
      const categories = await technologySkillService.getAllCategories();
      return response.success(res, "Technology skill categories fetched", 200, { categories });
    } catch (err) {
      return fail(res, err);
    }
  };

  search = async (req, res) => {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await technologySkillService.search(q, {
        page: +page,
        limit: +limit,
      });
      return response.success(res, "Search results fetched", 200, result);
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
        category: "string",
        proficiency_levels: "array",
        display_order: "integer",
        is_active: "boolean",
      });

      const proficiency_levels = req.body.proficiency_levels
        ? Array.isArray(req.body.proficiency_levels)
          ? req.body.proficiency_levels
          : JSON.parse(req.body.proficiency_levels)
        : ["beginner", "intermediate", "advanced", "expert"];

      const skill = await technologySkillService.create({
        name: req.body.name?.trim(),
        slug: req.body.slug?.trim(),
        description: req.body.description?.trim() || null,
        icon: req.body.icon || null,
        category: req.body.category || "other",
        proficiency_levels,
        display_order: req.body.display_order ? parseInt(req.body.display_order, 10) : 0,
        is_active: req.body.is_active !== undefined ? req.body.is_active === "true" || req.body.is_active === true : true,
      });

      return response.success(res, "Technology skill created", 201, { skill });
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
        category: "string",
        proficiency_levels: "array",
        display_order: "integer",
        is_active: "boolean",
      });

      const payload = {};
      if (req.body.name !== undefined) payload.name = req.body.name.trim();
      if (req.body.slug !== undefined) payload.slug = req.body.slug.trim();
      if (req.body.description !== undefined) payload.description = req.body.description?.trim() || null;
      if (req.body.icon !== undefined) payload.icon = req.body.icon || null;
      if (req.body.category !== undefined) payload.category = req.body.category;
      if (req.body.proficiency_levels !== undefined) {
        payload.proficiency_levels = Array.isArray(req.body.proficiency_levels)
          ? req.body.proficiency_levels
          : JSON.parse(req.body.proficiency_levels);
      }
      if (req.body.display_order !== undefined) payload.display_order = parseInt(req.body.display_order, 10);
      if (req.body.is_active !== undefined) payload.is_active = req.body.is_active === "true" || req.body.is_active === true;

      const skill = await technologySkillService.update(req.params.id, payload);
      return response.success(res, "Technology skill updated", 200, { skill });
    } catch (err) {
      return fail(res, err);
    }
  };

  delete = async (req, res) => {
    try {
      await technologySkillService.delete(req.params.id);
      return response.success(res, "Technology skill deleted", 200);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new TechnologySkillController();
