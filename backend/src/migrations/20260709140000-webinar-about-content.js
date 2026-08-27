"use strict";

/** Separate rich-text body for the "About this webinar" section on the public page */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "webinars";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }
    if (!cols.about_content) {
      await queryInterface.addColumn(table, "about_content", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
