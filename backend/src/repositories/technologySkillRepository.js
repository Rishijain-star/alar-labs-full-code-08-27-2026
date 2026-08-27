const BaseRepository = require("./baseRepository");
const { TechnologySkill } = require("../models");

class TechnologySkillRepository extends BaseRepository {
  constructor() {
    super(TechnologySkill, "tech_skill", 1800); // 30 min TTL
  }

  // Get by slug
  async findBySlug(slug) {
    const key = `tech_skill:slug:${slug}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await TechnologySkill.findOne({ where: { slug } });
    if (!record) return null;
    const data = record.toJSON();
    await this._set(key, data, this.ttl);
    return data;
  }

  // Get skills by category
  async findByCategory(category, options = {}) {
    const cacheKey = `tech_skill:category:${category}:${JSON.stringify(options)}`;
    const cached = await this._get(cacheKey);
    if (cached) return cached;

    const where = { ...options.where, category };
    const order = options.order || [["display_order", "ASC"]];

    const result = await this.findAll({
      ...options,
      where,
      order,
    });

    await this._set(cacheKey, result, this.listTTL);
    return result;
  }

  // Get active skills only
  async findAllActive(options = {}) {
    const where = { ...options.where, is_active: true };
    const order = options.order || [["display_order", "ASC"]];
    return this.findAll({
      ...options,
      where,
      order,
    });
  }

  // Get all distinct categories
  async findAllCategories() {
    const key = "tech_skill:categories";
    const cached = await this._get(key);
    if (cached) return cached;

    const records = await TechnologySkill.findAll({
      attributes: ["category"],
      where: { is_active: true },
      raw: true,
    });

    const categories = [...new Set(records.map((r) => r.category).filter(Boolean))].sort();
    await this._set(key, categories, this.ttl);
    return categories;
  }

  // Search skills by name
  async search(query, options = {}) {
    const { Sequelize } = require("sequelize");
    const where = {
      ...options.where,
      name: {
        [Sequelize.Op.like]: `%${query}%`,
      },
    };
    const order = options.order || [["display_order", "ASC"]];
    return this.findAll({
      ...options,
      where,
      order,
    });
  }

  // Cache invalidation
  async invalidateCache(id, slug = null, category = null) {
    await this._del(
      `tech_skill:full:${id}`,
      `tech_skill:id:${id}`,
      "tech_skill:categories"
    );
    if (slug) await this._del(`tech_skill:slug:${slug}`);
    if (category) await this._del(`tech_skill:category:${category}`);
    await this._clearPattern("tech_skill:list:*");
  }
}

module.exports = new TechnologySkillRepository();
