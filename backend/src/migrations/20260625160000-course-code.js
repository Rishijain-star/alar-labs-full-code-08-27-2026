"use strict";

/** Point 2 (courses): sequential human-friendly course_code (COURSE-001…). */
module.exports = {
  async up(queryInterface, Sequelize) {
    let cols;
    try {
      cols = await queryInterface.describeTable("courses");
    } catch {
      return;
    }
    if (!cols.course_code) {
      await queryInterface.addColumn("courses", "course_code", {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
      });
    }

    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM courses WHERE course_code IS NULL OR course_code = '' ORDER BY created_at ASC, id ASC"
      );
      const [maxRows] = await queryInterface.sequelize.query(
        "SELECT course_code FROM courses WHERE course_code REGEXP '^COURSE-[0-9]+$'"
      );
      let next = maxRows.reduce((m, r) => {
        const n = parseInt(String(r.course_code).replace("COURSE-", ""), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      for (const r of rows) {
        next += 1;
        const code = `COURSE-${String(next).padStart(3, "0")}`;
        await queryInterface.sequelize.query(
          "UPDATE courses SET course_code = :code WHERE id = :id",
          { replacements: { code, id: r.id } }
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[migration] course_code backfill failed:", e.message);
    }
  },

  async down() {
    /* non-destructive */
  },
};
