"use strict";

/**
 * Creates every table defined under `src/models` (and join tables from associations).
 *
 * - Default: `sync({ alter: false })` — creates missing tables only; does not change existing tables.
 * - Optional: set `SEQUELIZE_SYNC_ALTER=true` to align existing tables with models (use carefully in dev).
 *
 * If you previously ran older migration files that were removed, clear stale rows:
 *   DELETE FROM SequelizeMeta WHERE name LIKE '202603281%';
 * then run `npm run migrate` again.
 */

const path = require("path");

module.exports = {
  async up() {
    const db = require(path.join(__dirname, "../models"));
    const alter = process.env.SEQUELIZE_SYNC_ALTER === "true";
    await db.sequelize.sync({ alter });
  },

  async down() {
    // Intentionally empty: dropping the whole schema is unsafe for `db:migrate:undo`.
    // Restore from backup if you need to roll back.
  },
};
