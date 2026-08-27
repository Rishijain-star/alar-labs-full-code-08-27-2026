"use strict";

/** Add original_price for webinar discount display */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "webinars";
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
  },

  async down() {
    /* non-destructive */
  },
};
