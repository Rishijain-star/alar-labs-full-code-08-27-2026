const { Op } = require("sequelize");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const relativeTime = require("dayjs/plugin/relativeTime");
const { Validator } = require("node-input-validator");
const { AppError } = require("../middleware/errorHandler");
const response = require("../utils/response");
const logger = require("../lib/logger");
const { Currency } = require("../models");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// ─────────────────────────────────────────────────────────────────────────────
//  DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a date to a readable string
 * @param {Date|string} date
 * @param {string} fmt - dayjs format string (default: "DD MMM YYYY, HH:mm")
 * @param {string} tz  - IANA timezone (default: "UTC")
 */
function formatDate(date, fmt = "DD MMM YYYY, HH:mm", tz = "UTC") {
  if (!date) return null;
  return dayjs(date).tz(tz).format(fmt);
}

/**
 * Format date only (no time)
 */
function formatDateOnly(date, tz = "UTC") {
  return formatDate(date, "DD MMM YYYY", tz);
}

/**
 * Human-readable relative time ("3 hours ago", "in 2 days")
 */
function timeAgo(date) {
  if (!date) return null;
  return dayjs(date).fromNow();
}

async function validate(data, rules) {
  const v = new Validator(data, rules);
  const ok = await v.check();
  if (!ok) {
    const key = Object.keys(v.errors)[0];
    throw new AppError(v.errors[key].message, 400);
  }
}

/** Normalize JWT / Sequelize user payloads to a string user id, or null when absent. */
function resolveRequestUserId(reqOrUser) {
  const u =
    reqOrUser && typeof reqOrUser === "object" && "user" in reqOrUser
      ? reqOrUser.user
      : reqOrUser;
  if (!u) return null;
  if (typeof u === "string" || typeof u === "number") {
    const s = String(u).trim();
    return s && s !== "undefined" ? s : null;
  }
  const id = u.user_id ?? u.id ?? u.sub ?? u.userId ?? null;
  if (id == null || id === "") return null;
  const s = String(id).trim();
  return s && s !== "undefined" ? s : null;
}

function fail(res, err) {
  if (err instanceof AppError) {
    return response.fail(res, err.message, err.statusCode);
  }
  logger.error("[API]", err);
  return response.fail(res, "Internal server error", 500);
}

/**
 * Return UTC ISO string from any date input
 */
function toUTC(date) {
  if (!date) return null;
  return dayjs(date).utc().toISOString();
}

/**
 * Parse a date string safely — returns null if invalid
 */
function parseDate(value) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.toDate() : null;
}

/**
 * Check if a date is in the past
 */
function isPast(date) {
  return dayjs(date).isBefore(dayjs());
}

/**
 * Check if a date is in the future
 */
function isFuture(date) {
  return dayjs(date).isAfter(dayjs());
}

/**
 * Add time to a date
 * @param {Date|string} date
 * @param {number} amount
 * @param {string} unit - "day", "hour", "minute", "month" etc.
 */
function addTime(date, amount, unit = "day") {
  return dayjs(date).add(amount, unit).toDate();
}

/**
 * Get duration between two dates in a given unit
 */
function diffDates(from, to, unit = "day") {
  return dayjs(to).diff(dayjs(from), unit);
}

/**
 * Format duration in minutes to "Xh Ym" or "Zm"
 * @param {number} minutes
 */
function formatDuration(minutes) {
  if (!minutes || minutes < 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAGINATION & QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SORT_ORDERS = ["asc", "desc", "ASC", "DESC"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Sanitize and extract pagination params from req.query
 * @param {Object} query - req.query
 * @returns {{ page, limit, sort_by, sort_order, search, ...rest }}
 */
function sanitizePagination(query = {}) {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    sort_by = "created_at",
    sort_order = "DESC",
    search,
    ...rest
  } = query;

  return {
    page: Math.max(1, parseInt(page) || DEFAULT_PAGE),
    limit: Math.min(MAX_LIMIT, Math.max(1, parseInt(limit) || DEFAULT_LIMIT)),
    sort_by: sanitizeIdentifier(sort_by) || "created_at",
    sort_order: ALLOWED_SORT_ORDERS.includes(sort_order)
      ? sort_order.toUpperCase()
      : "DESC",
    search: search?.trim() || null,
    ...rest,
  };
}

/**
 * Build a Sequelize where clause from search + filters
 *
 * @param {Object}   opts
 * @param {string}   opts.search        - Free-text search string
 * @param {string[]} opts.search_fields  - DB columns to search on (Op.iLike)
 * @param {Object}   opts.filters       - Key-value exact-match filters
 * @param {Object}   opts.extra         - Pre-built conditions merged into where
 * @returns {Object} Sequelize where clause
 */
function buildWhereClause({
  search,
  search_fields = [],
  filters = {},
  extra = {},
} = {}) {
  const where = { ...extra };

  // Exact-match filters (skip undefined/null/empty)
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== "") {
      where[key] = val;
    }
  }

  // Full-text search across multiple columns
  if (search && search_fields.length > 0) {
    where[Op.or] = search_fields.map((field) => ({
      [field]: { [Op.like]: `%${search}%` },
    }));
  }

  return where;
}

/**
 * Build a standard pagination response envelope
 * @param {Object[]} rows
 * @param {number}   total
 * @param {number}   page
 * @param {number}   limit
 */
function paginationMeta(rows, total, page, limit) {
  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STRING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slugify a string: "Hello World!" → "hello-world"
 */
function slugify(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Whitelist an identifier (column name) to prevent injection
 */
function sanitizeIdentifier(value, allowed = null) {
  if (!value || typeof value !== "string") return null;
  const clean = value.replace(/[^a-zA-Z0-9_]/g, "");
  if (allowed && !allowed.includes(clean)) return null;
  return clean || null;
}

/**
 * Truncate a string to maxLength with ellipsis
 */
function truncate(str = "", maxLength = 100) {
  if (!str) return "";
  return str.length <= maxLength ? str : str.slice(0, maxLength - 3) + "...";
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(str = "") {
  return str.replace(/<[^>]*>/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBER / DATA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe integer parse — returns fallback if NaN
 */
function safeInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Safe float parse
 */
function safeFloat(value, fallback = 0.0) {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

/**
 * Round a number to N decimal places
 */
function round(value, decimals = 2) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

/**
 * Pick only allowed keys from an object (safe spread)
 * @param {Object}   obj
 * @param {string[]} keys
 */
function pick(obj = {}, keys = []) {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}

/**
 * Remove undefined/null keys from an object
 */
function compact(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  );
}

/**
 * Deep-clone a plain object (no functions/dates/Sets)
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─────────────────────────────────────────────────────────────────────────────
//  CURRENCY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the exchange rate for a currency.
 * @param {string} currency_code - The currency code (e.g., "USD").
 * @returns {Promise<number>}
 */
async function getExchangeRate(currency_code) {
  const currency = await Currency.findOne({ where: { code: currency_code } });
  if (!currency) {
    throw new Error(`Currency not found: ${currency_code}`);
  }
  return currency.exchange_rate;
}

/**
 * Convert an amount from one currency to another.
 * @param {number} amount - The amount to convert.
 * @param {string} from_currency - The currency to convert from (e.g., "USD").
 * @param {string} to_currency - The currency to convert to (e.g., "INR").
 * @returns {Promise<number>}
 */
async function convertCurrency(amount, from_currency, to_currency) {
  const fromRate = await getExchangeRate(from_currency);
  const toRate = await getExchangeRate(to_currency);
  return (amount / fromRate) * toRate;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CASE CONVERSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a string to snake_case
 */
function toSnakeCase(str) {
  if (!str) return str;
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

/**
 * Convert a string to camelCase
 */
function toCamelCase(str) {
  if (!str) return str;
  return str.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
}

/**
 * Deep convert object keys to snake_case
 */
function keysToSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnakeCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toSnakeCase(key)]: keysToSnakeCase(obj[key]),
      }),
      {},
    );
  }
  return obj;
}

/**
 * Deep convert object keys to camelCase
 */
function keysToCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamelCase(key)]: keysToCamelCase(obj[key]),
      }),
      {},
    );
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  resolveRequestUserId,
  // Case Conversion
  toSnakeCase,
  toCamelCase,
  keysToSnakeCase,
  keysToCamelCase,

  // Date
  formatDate,
  formatDateOnly,
  timeAgo,
  toUTC,
  parseDate,
  isPast,
  isFuture,
  addTime,
  diffDates,
  formatDuration,

  // Pagination / Query
  sanitizePagination,
  buildWhereClause,
  paginationMeta,

  // String
  slugify,
  sanitizeIdentifier,
  truncate,
  stripHtml,

  // Number / Data
  safeInt,
  safeFloat,
  round,
  pick,
  compact,
  deepClone,
  validate,
  fail,

  // Currency
  getExchangeRate,
  convertCurrency,
};
