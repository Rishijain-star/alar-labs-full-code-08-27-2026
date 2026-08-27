"use strict";

/** Careers parity with cloud services: offering rating + richer request fields */
module.exports = {
  async up(queryInterface, Sequelize) {
    const offerings = "career_offerings";
    let offeringCols;
    try {
      offeringCols = await queryInterface.describeTable(offerings);
    } catch {
      offeringCols = null;
    }
    if (offeringCols && !offeringCols.rating) {
      await queryInterface.addColumn(offerings, "rating", {
        type: Sequelize.DECIMAL(2, 1),
        allowNull: true,
        defaultValue: 4.8,
      });
    }

    const requests = "career_requests";
    let requestCols;
    try {
      requestCols = await queryInterface.describeTable(requests);
    } catch {
      return;
    }

    if (!requestCols.career_offering_id) {
      await queryInterface.addColumn(requests, "career_offering_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "career_offerings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
    if (!requestCols.contact_number) {
      await queryInterface.addColumn(requests, "contact_number", {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
    if (!requestCols.request_type) {
      await queryInterface.addColumn(requests, "request_type", {
        type: Sequelize.ENUM("self", "corporate"),
        allowNull: true,
        defaultValue: "self",
      });
    }
    if (!requestCols.organization) {
      await queryInterface.addColumn(requests, "organization", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
    if (!requestCols.requirements) {
      await queryInterface.addColumn(requests, "requirements", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (requestCols.experience_type) {
      await queryInterface.changeColumn(requests, "experience_type", {
        type: Sequelize.ENUM("fresher", "experienced"),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down() {
    /* non-destructive */
  },
};
