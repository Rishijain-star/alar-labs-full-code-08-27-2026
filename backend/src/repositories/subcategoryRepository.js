const BaseRepository = require("./baseRepository");
const { Subcategory } = require("../models");

class SubcategoryRepository extends BaseRepository {
  constructor() {
    super(Subcategory, "subcategory", 1800); // 30 min TTL
  }

  // Get subcategory with parent category
  async findByIdWithCategory(id) {
    const key = `subcategory:full:${id}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await Subcategory.findByPk(id, {
      include: [
        {
          model: require("../models").Category,
          as: "category",
          attributes: ["id", "name", "slug"],
          required: false,
        },
      ],
    });

    if (!record) return null;
    const data = record.toJSON();
    await this._set(key, data, this.ttl);
    return data;
  }

  // Get by slug
  async findBySlug(slug) {
    const key = `subcategory:slug:${slug}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await Subcategory.findOne({ where: { slug } });
    if (!record) return null;
    const data = record.toJSON();
    await this._set(key, data, this.ttl);
    return data;
  }

  // Get subcategories by category ID
  async findByCategory(category_id, options = {}) {
    const cacheKey = `subcategory:category:${category_id}:${JSON.stringify(options)}`;
    const cached = await this._get(cacheKey);
    if (cached) return cached;

    const where = { ...options.where, category_id };
    const order = options.order || [["display_order", "ASC"]];

    const result = await this.findAll({
      ...options,
      where,
      order,
    });

    await this._set(cacheKey, result, this.listTTL);
    return result;
  }

  // Get active subcategories only
  async findAllActive(options = {}) {
    const where = { ...options.where, is_active: true };
    const order = options.order || [["display_order", "ASC"]];
    return this.findAll({
      ...options,
      where,
      order,
    });
  }

  // Cache invalidation
  async invalidateCache(id, category_id = null, slug = null) {
    await this._del(
      `subcategory:full:${id}`,
      `subcategory:id:${id}`
    );
    if (slug) await this._del(`subcategory:slug:${slug}`);
    if (category_id) await this._del(`subcategory:category:${category_id}`);
    await this._clearPattern("subcategory:list:*");
  }
}

module.exports = new SubcategoryRepository();
