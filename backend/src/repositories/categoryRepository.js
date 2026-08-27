const BaseRepository = require("./baseRepository");
const { Category } = require("../models");

class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category, "category", 1800); // 30 min TTL
  }

  // Get category with subcategories
  async findByIdWithSubcategories(id) {
    const key = `category:full:${id}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await Category.findByPk(id, {
      include: [
        {
          model: require("../models").Subcategory,
          as: "subcategories",
          where: { is_active: true },
          order: [["display_order", "ASC"]],
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
    const key = `category:slug:${slug}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await Category.findOne({ where: { slug } });
    if (!record) return null;
    const data = record.toJSON();
    await this._set(key, data, this.ttl);
    return data;
  }

  // Get active categories only
  async findAllActive(options = {}) {
    const where = { ...options.where, is_active: true };
    const order = options.order || [
      ["display_order", "ASC"],
      ["name", "ASC"],
    ];
    return this.findAll({
      ...options,
      where,
      order,
    });
  }

  // Cache invalidation
  async invalidateCache(id, slug = null) {
    await this._del(
      `category:full:${id}`,
      `category:id:${id}`
    );
    if (slug) await this._del(`category:slug:${slug}`);
    await this._clearPattern("category:list:*");
  }
}

module.exports = new CategoryRepository();
