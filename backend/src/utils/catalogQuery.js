const { Op } = require("sequelize");

const LEVEL_TO_DIFFICULTY = {
  beginner: "easy",
  easy: "easy",
  intermediate: "medium",
  medium: "medium",
  advanced: "hard",
  hard: "hard",
  expert: "hard",
};

function parseBoolQuery(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return undefined;
}

function parsePriceFilter(query = {}) {
  const direct = parseBoolQuery(query.is_free);
  if (direct !== undefined) return direct;
  const price = String(query.price || "").toLowerCase();
  if (price === "free") return true;
  if (price === "paid") return false;
  return undefined;
}

function resolveLabDifficulty({ difficulty, level }) {
  if (difficulty) {
    const key = String(difficulty).toLowerCase();
    return LEVEL_TO_DIFFICULTY[key] || difficulty;
  }
  if (level && level !== "all") {
    return LEVEL_TO_DIFFICULTY[String(level).toLowerCase()] || null;
  }
  return null;
}

function hasClauseContent(clause) {
  if (!clause || typeof clause !== "object") return false;
  return Object.keys(clause).length > 0 || Object.getOwnPropertySymbols(clause).length > 0;
}

function appendAnd(where, clause) {
  if (!hasClauseContent(clause)) return where;
  if (where[Op.and]) return { [Op.and]: [...where[Op.and], clause] };
  if (Object.keys(where).length || Object.getOwnPropertySymbols(where).length) {
    return { [Op.and]: [where, clause] };
  }
  return clause;
}

function applySearchFilter(where, search, fields = []) {
  const q = String(search || "").trim();
  if (!q || !fields.length) return where;
  return appendAnd(where, {
    [Op.or]: fields.map((field) => ({ [field]: { [Op.like]: `%${q}%` } })),
  });
}

function applyLabCatalogFilters(where, query = {}, sequelize) {
  let next = { ...where };
  const isFree = parsePriceFilter(query);
  if (isFree !== undefined) next.is_free = isFree;

  const diff = resolveLabDifficulty(query);
  if (diff) next.difficulty = diff;

  next = applySearchFilter(next, query.search, ["title"]);

  const platform = String(query.platform || "").trim();
  if (platform && platform !== "all" && sequelize) {
    const escaped = sequelize.escape(platform);
    next = appendAnd(
      next,
      sequelize.literal(`(
        JSON_UNQUOTE(JSON_EXTRACT(\`Lab\`.\`metadata\`, '$.platform')) = ${escaped}
        OR JSON_CONTAINS(
          JSON_EXTRACT(\`Lab\`.\`instructions\`, '$.technologies'),
          JSON_QUOTE(${escaped})
        )
      )`)
    );
  }

  return next;
}

function applyCourseCatalogFilters(where, query = {}) {
  let next = { ...where };
  if (query.level && query.level !== "all") next.level = query.level;

  const isFree = parseBoolQuery(query.is_free);
  if (isFree !== undefined) next.is_free = isFree;

  return applySearchFilter(next, query.search, ["title"]);
}

/** Only content approved for the public catalog (pending/rejected hidden). */
function applyContentApprovalFilter(where, metadataExpr = "metadata") {
  const sequelize = require("../models").sequelize;
  return appendAnd(
    where,
    sequelize.literal(`(
      COALESCE(
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${metadataExpr}, '$.content_approval_status')), ''),
        'approved'
      ) = 'approved'
    )`)
  );
}

/** Owner list scopes that behave like a learner catalog (not "my drafts"). */
function isCatalogBrowseScope(scope, isOwnerList) {
  if (!isOwnerList) return true;
  const s = String(scope || "").toLowerCase();
  return s === "others" || s === "all";
}

module.exports = {
  LEVEL_TO_DIFFICULTY,
  parseBoolQuery,
  resolveLabDifficulty,
  applySearchFilter,
  applyLabCatalogFilters,
  applyCourseCatalogFilters,
  applyContentApprovalFilter,
  isCatalogBrowseScope,
};
