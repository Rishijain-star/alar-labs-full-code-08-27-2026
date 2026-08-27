"use strict";

/** Add is_initialized flag to assessment_configs (drives create-vs-edit permission split) */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "assessment_configs";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }
    if (!cols.is_initialized) {
      await queryInterface.addColumn(table, "is_initialized", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      // Existing rows already hold a real admin-saved config → treat as initialized
      // so they require edit_programs (not create_programs) going forward.
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET is_initialized = true`
      );
    }
  },

  async down() {
    /* non-destructive */
  },
};
