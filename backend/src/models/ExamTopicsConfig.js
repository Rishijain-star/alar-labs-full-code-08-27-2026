const { DataTypes } = require("sequelize");

/** Editable Exam Topics learning + exam question sets (JSON) */
module.exports = (sequelize) => {
  const ExamTopicsConfig = sequelize.define(
    "ExamTopicsConfig",
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
        defaultValue: "exam_topics",
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_initialized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "exam_topics_configs",
      underscored: true,
      timestamps: true,
    }
  );

  return ExamTopicsConfig;
};
