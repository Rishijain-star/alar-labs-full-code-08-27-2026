const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LabEncryptionKey = sequelize.define(
    "LabEncryptionKey",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      lab_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: "lab_id",
      },
      enc_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "enc_key",
      },
    },
    {
      tableName: "lab_encryption_keys",
      underscored: true,
      timestamps: true,
    }
  );

  LabEncryptionKey.associate = (models) => {
    LabEncryptionKey.belongsTo(models.Lab, {
      foreignKey: "lab_id",
      as: "lab",
    });
  };

  return LabEncryptionKey;
};
