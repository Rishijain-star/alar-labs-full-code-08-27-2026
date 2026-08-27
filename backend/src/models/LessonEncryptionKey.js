const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LessonEncryptionKey = sequelize.define(
    "LessonEncryptionKey",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      lesson_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: "lesson_id",
      },
      enc_key: {
        type: DataTypes.STRING(255), // Storing hex string of the key
        allowNull: false,
        field: "enc_key",
      },
    },
    {
      tableName: "lesson_encryption_keys",
      underscored: true,
      timestamps: true,
    }
  );

  LessonEncryptionKey.associate = (models) => {
    LessonEncryptionKey.belongsTo(models.Lesson, {
      foreignKey: "lesson_id",
      as: "lesson",
    });
  };

  return LessonEncryptionKey;
};
