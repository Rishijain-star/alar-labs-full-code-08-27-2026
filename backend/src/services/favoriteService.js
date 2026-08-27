const db = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { resolveLabKind } = require("../lib/labKind");

const { UserFavorite, Course, Lab } = db;

function normalizeTab(tab) {
  const t = String(tab || "courses").toLowerCase();
  if (t === "skill_builder" || t === "skill-builder") return "skill_builder";
  if (t === "labs" || t === "lab") return "labs";
  return "courses";
}

async function assertTargetExists(itemType, targetId) {
  if (itemType === "course") {
    const course = await Course.findByPk(targetId);
    if (!course) throw new AppError("Course not found", 404);
    return;
  }
  const lab = await Lab.findByPk(targetId);
  if (!lab) throw new AppError("Lab not found", 404);
}

async function addFavorite(userId, itemType, targetId) {
  if (!["course", "lab"].includes(itemType)) {
    throw new AppError("Invalid item type", 400);
  }
  await assertTargetExists(itemType, targetId);

  const [row, created] = await UserFavorite.findOrCreate({
    where: { user_id: userId, item_type: itemType, target_id: targetId },
    defaults: { user_id: userId, item_type: itemType, target_id: targetId },
  });

  return { favorite: row, created };
}

async function removeFavorite(userId, itemType, targetId) {
  const deleted = await UserFavorite.destroy({
    where: { user_id: userId, item_type: itemType, target_id: targetId },
  });
  if (!deleted) throw new AppError("Favorite not found", 404);
  return { removed: true };
}

async function purgeByTarget(itemType, targetId) {
  await UserFavorite.destroy({
    where: { item_type: itemType, target_id: targetId },
  });
}

async function getStatus(userId) {
  const rows = await UserFavorite.findAll({
    where: { user_id: userId },
    attributes: ["item_type", "target_id"],
  });
  const courseIds = [];
  const labIds = [];
  for (const row of rows) {
    if (row.item_type === "course") courseIds.push(row.target_id);
    else labIds.push(row.target_id);
  }
  return { courseIds, labIds };
}

async function listFavorites(userId, { tab = "courses", page = 1, limit = 12 } = {}) {
  const normalizedTab = normalizeTab(tab);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(48, Math.max(4, Number(limit) || 12));
  const offset = (safePage - 1) * safeLimit;

  if (normalizedTab === "courses") {
    const { count, rows } = await UserFavorite.findAndCountAll({
      where: { user_id: userId, item_type: "course" },
      include: [
        {
          model: Course,
          as: "course",
          required: true,
          where: { deleted_at: null },
        },
      ],
      order: [["created_at", "DESC"]],
      limit: safeLimit,
      offset,
    });

    return {
      rows: rows.map((r) => r.course),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        total_pages: Math.max(1, Math.ceil(count / safeLimit)),
      },
      tab: normalizedTab,
    };
  }

  const labFavorites = await UserFavorite.findAll({
    where: { user_id: userId, item_type: "lab" },
    include: [
      {
        model: Lab,
        as: "lab",
        required: true,
        where: { deleted_at: null },
      },
    ],
    order: [["created_at", "DESC"]],
  });

  const wantSkillBuilder = normalizedTab === "skill_builder";
  const filtered = labFavorites.filter((row) => {
    const kind = resolveLabKind(row.lab);
    return wantSkillBuilder ? kind === "skill_builder" : kind !== "skill_builder";
  });

  const total = filtered.length;
  const slice = filtered.slice(offset, offset + safeLimit);

  return {
    rows: slice.map((r) => {
      const plain = r.lab.toJSON();
      plain.lab_kind = resolveLabKind(r.lab);
      return plain;
    }),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    tab: normalizedTab,
  };
}

module.exports = {
  addFavorite,
  removeFavorite,
  purgeByTarget,
  getStatus,
  listFavorites,
};
