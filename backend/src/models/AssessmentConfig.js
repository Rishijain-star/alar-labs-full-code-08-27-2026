const { DataTypes } = require("sequelize");

/** Editable Technology Readiness assessment wizard + outcome rules (JSON) */
module.exports = (sequelize) => {
  const AssessmentConfig = sequelize.define(
    "AssessmentConfig",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      config_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        defaultValue: "technology_readiness",
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      /**
       * True once an admin has intentionally saved the config at least once.
       * Drives the create-vs-edit permission split (create_programs vs edit_programs).
       */
      is_initialized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "assessment_configs",
      underscored: true,
      timestamps: true,
    }
  );

  return AssessmentConfig;
};
