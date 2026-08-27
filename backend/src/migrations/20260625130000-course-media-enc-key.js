"use strict";

/** Add enc_key to course_media so course HLS keys can be served from the DB. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "course_media";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }
    if (!cols.enc_key) {
      await queryInterface.addColumn(table, "enc_key", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
