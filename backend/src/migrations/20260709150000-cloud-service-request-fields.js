"use strict";

/** Add cloud_service_id, contact_number, request_type to cloud_service_requests */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "cloud_service_requests";
    let cols;
    try {
      cols = await queryInterface.describeTable(table);
    } catch {
      return;
    }

    if (!cols.cloud_service_id) {
      await queryInterface.addColumn(table, "cloud_service_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "cloud_services", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!cols.contact_number) {
      await queryInterface.addColumn(table, "contact_number", {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }

    if (!cols.request_type) {
      await queryInterface.addColumn(table, "request_type", {
        type: Sequelize.ENUM("self", "corporate"),
        allowNull: true,
        defaultValue: "self",
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
