const logger = require("../lib/logger");
const { Op } = require("sequelize");

/** JSON.stringify drops Symbol keys (Op.and / Op.or) — stable key for list cache. */
function stableCachePart(value) {
  if (value == null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(stableCachePart).join(",")}]`;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const own = Object.getOwnPropertySymbols(value);
    if (own.length > 0 || Object.keys(value).some((k) => typeof value[k] === "object" && value[k] !== null)) {
      const stringKeys = Object.keys(value).sort();
      const symKeys = own.map((s) => (s === Op.and ? "$and" : s === Op.or ? "$or" : String(s.description || s)));
      const parts = [
        ...stringKeys.map((k) => `${k}:${stableCachePart(value[k])}`),
        ...symKeys.map((k, i) => `${k}:${stableCachePart(value[own[i]])}`),
      ];
      return `{${parts.join("|")}}`;
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function buildListCacheKey(prefix, { page, limit, where, order }) {
  return `${prefix}:list:${stableCachePart({ page, limit, where, order })}`;
}

class BaseRepository {
  /**
   * @param {Object} model      - Sequelize model
   * @param {string} prefix     - Redis key namespace e.g. "course"
   * @param {number} ttl        - Single record cache TTL in seconds
   */
  constructor(model, prefix, ttl = 1800) {
    this.model = model;
    this.prefix = prefix;
    this.ttl = ttl;
    this.listTTL = 300; // 5 min for paginated lists
  }

  // ─── Redis ────────────────────────────────────────────────────────────────

  async _getRedis() {
    try {
      const redis = require("../lib/redis");
      if (!redis.isReady()) {
        await redis.connect();
      }
      return redis.client; // Actual v4 client
    } catch { return null; }
  }

  async _get(key) {
    try {
      const redis = await this._getRedis();
      if (!redis) return null;
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  async _set(key, data, ttl) {
    try {
      const redis = await this._getRedis();
      if (!redis) return;
      // In v4, setEx is setEx(key, ttl, value)
      await redis.setEx(key, ttl, JSON.stringify(data));
    } catch (err) {
      logger.warn(`[${this.prefix}:cache] set failed: ${err.message}`);
    }
  }

  async _del(...keys) {
    try {
      const redis = await this._getRedis();
      const valid = keys.filter(Boolean);
      if (!redis || !valid.length) return;
      await redis.del(valid);
    } catch { }
  }

  async _clearPattern(pattern) {
    try {
      const redis = await this._getRedis();
      if (!redis) return;
      
      let cursor = 0;
      do {
        // v4 scan: .scan(cursor, { MATCH: pattern, COUNT: 100 })
        const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = Number(reply.cursor);
        if (reply.keys?.length) {
          await redis.del(reply.keys);
        }
      } while (cursor !== 0);
    } catch (err) {
      logger.warn(`[${this.prefix}:cache] clearPattern failed: ${err.message}`);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findById(id, options = {}) {
    const key = `${this.prefix}:id:${id}`;
    const cached = await this._get(key);
    if (cached) return cached;

    const record = await this.model.findByPk(id, options);
    if (!record) return null;

    const data = record.toJSON();
    await this._set(key, data, this.ttl);
    return data;
  }

  async findAll({
    page = 1,
    limit = 20,
    where = {},
    order = [["created_at", "DESC"]],
    include = [],
    attributes,
    skipCache = false,
  } = {}) {
    const cache_key = buildListCacheKey(this.prefix, { page, limit, where, order });
    if (!skipCache) {
      const cached = await this._get(cache_key);
      if (cached) return cached;
    }

    const offset = (page - 1) * limit;
    const opts = { where, order, include, limit, offset, distinct: true };
    if (attributes) opts.attributes = attributes;

    const { count, rows } = await this.model.findAndCountAll(opts);

    const result = {
      rows: rows.map((r) => r.toJSON()),
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
        has_next: page * limit < count,
        has_prev: page > 1,
      },
    };

    await this._set(cache_key, result, this.listTTL);
    return result;
  }

  async findOne(where = {}, options = {}) {
    const record = await this.model.findOne({ where, ...options });
    return record ? record.toJSON() : null;
  }

  async create(data, options = {}) {
    const record = await this.model.create(data, options);
    await this._clearPattern(`${this.prefix}:list:*`);
    return record.toJSON();
  }

  async update(id, data, options = {}) {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    await record.update(data, options);
    await this._del(`${this.prefix}:id:${id}`);
    await this._clearPattern(`${this.prefix}:list:*`);
    return this.findById(id);
  }

  async delete(id, options = {}) {
    const record = await this.model.findByPk(id);
    if (!record) return false;
    await record.destroy(options);
    await this._del(`${this.prefix}:id:${id}`);
    await this._clearPattern(`${this.prefix}:list:*`);
    return true;
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async bulkCreate(data = [], options = {}) {
    const records = await this.model.bulkCreate(data, {
      returning: true,
      ...options,
    });
    await this._clearPattern(`${this.prefix}:list:*`);
    return records.map((r) => r.toJSON());
  }
}

module.exports = BaseRepository;
module.exports.buildListCacheKey = buildListCacheKey;
module.exports.stableCachePart = stableCachePart;