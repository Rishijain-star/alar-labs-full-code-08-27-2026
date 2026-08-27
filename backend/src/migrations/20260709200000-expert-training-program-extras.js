"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "expert_training_programs";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }

    if (!cols.original_price) {
      await queryInterface.addColumn(table, "original_price", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }
    if (!cols.course_content) {
      await queryInterface.addColumn(table, "course_content", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
    if (!cols.instructor_profile_url) {
      await queryInterface.addColumn(table, "instructor_profile_url", {
        type: Sequelize.STRING(1024),
        allowNull: true,
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
