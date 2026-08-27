const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserDeviceToken = sequelize.define(
    "UserDeviceToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      device_token: {
        type: DataTypes.STRING(768),
        allowNull: false,
        unique: true,
      },
      platform: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
    },
    {
      tableName: "user_device_tokens",
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  UserDeviceToken.associate = (models) => {
    UserDeviceToken.belongsTo(models.User, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
      constraints: false,
    });
  };

  return UserDeviceToken;
};
