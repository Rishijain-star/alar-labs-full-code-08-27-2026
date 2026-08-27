"use strict";

/**
 * Point 2: sequential human-friendly lab_code (LAB-001…) on labs.
 * Point 1: version + last_revised_at on labs and courses (admin-only versioning).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, spec) => {
      let cols;
      try {
        cols = await queryInterface.describeTable(table);
      } catch {
        return;
      }
      if (!cols[column]) {
        await queryInterface.addColumn(table, column, spec);
      }
    };

    // ── labs ────────────────────────────────────────────────────────────────
    await addIfMissing("labs", "lab_code", {
      type: Sequelize.STRING(32),
      allowNull: true,
      unique: true,
    });
    await addIfMissing("labs", "version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
    await addIfMissing("labs", "last_revised_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // ── courses ─────────────────────────────────────────────────────────────
    await addIfMissing("courses", "version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
    await addIfMissing("courses", "last_revised_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // ── Backfill sequential lab_code for existing labs (oldest first) ─────────
    try {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM labs WHERE lab_code IS NULL OR lab_code = '' ORDER BY created_at ASC, id ASC"
      );
      // Find the current highest numeric suffix so we never collide.
      const [maxRows] = await queryInterface.sequelize.query(
        "SELECT lab_code FROM labs WHERE lab_code REGEXP '^LAB-[0-9]+$'"
      );
      let next = maxRows.reduce((m, r) => {
        const n = parseInt(String(r.lab_code).replace("LAB-", ""), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
      for (const r of rows) {
        next += 1;
        const code = `LAB-${String(next).padStart(3, "0")}`;
        await queryInterface.sequelize.query(
          "UPDATE labs SET lab_code = :code WHERE id = :id",
          { replacements: { code, id: r.id } }
        );
      }
    } catch (e) {
      // Backfill is best-effort; the column still exists for new rows.
      // eslint-disable-next-line no-console
      console.error("[migration] lab_code backfill failed:", e.message);
    }
  },

  async down() {
    /* non-destructive */
  },
};
