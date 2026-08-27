const { DataTypes } = require("sequelize");

/** CMS-style sections for Technology Readiness, Digital Skill Program, Home highlights, etc. */
module.exports = (sequelize) => {
  const DigitalProgramSection = sequelize.define(
    "DigitalProgramSection",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      section_key: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
        defaultValue: "",
      },
      subtitle: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      body: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "created_by",
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "updated_by",
      },
    },
    {
      tableName: "digital_program_sections",
      underscored: true,
      timestamps: true,
    },
  );

  return DigitalProgramSection;
};
