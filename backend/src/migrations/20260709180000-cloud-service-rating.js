"use strict";

/** Star rating for cloud service offering cards */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "cloud_services";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }
    if (!cols.rating) {
      await queryInterface.addColumn(table, "rating", {
        type: Sequelize.DECIMAL(2, 1),
        allowNull: true,
        defaultValue: 4.8,
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
