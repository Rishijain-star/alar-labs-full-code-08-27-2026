"use strict";

/**
 * Add time_spent_seconds to enrollments + lab_enrollments so the learning timer
 * accumulates active time on the server (not just wall-clock on the client).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of ["enrollments", "lab_enrollments"]) {
      let cols;
      try {
        cols = await queryInterface.describeTable(table);
      } catch {
        continue;
      }
      if (!cols.time_spent_seconds) {
        await queryInterface.addColumn(table, "time_spent_seconds", {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        });
      }
    }
  },

  async down() {
    /* non-destructive */
  },
};
