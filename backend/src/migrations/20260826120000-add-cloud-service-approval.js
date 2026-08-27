"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = "cloud_services";
    const cols = await queryInterface.describeTable(table);

    if (!cols.metadata) {
      await queryInterface.addColumn(table, "metadata", {
        type: Sequelize.JSON,
        defaultValue: {},
      });
    }

    if (!cols.draft_data) {
      await queryInterface.addColumn(table, "draft_data", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE cloud_services 
      SET 
        metadata = JSON_SET(COALESCE(metadata, '{}'), '$.content_approval_status', 'approved')
      WHERE is_active = true OR is_active = 1
    `);
  },

  down: async (queryInterface, Sequelize) => {
    const table = "cloud_services";
    const cols = await queryInterface.describeTable(table);

    if (cols.metadata) {
      await queryInterface.removeColumn(table, "metadata");
    }
    if (cols.draft_data) {
      await queryInterface.removeColumn(table, "draft_data");
    }
  },
};
