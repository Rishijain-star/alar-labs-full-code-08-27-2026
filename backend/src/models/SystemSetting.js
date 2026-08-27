const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define(
    "SystemSetting",
    {
      id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      updated_by: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
    },
    {
      tableName: "system_settings",
      underscored: true,
      timestamps: true,
    }
  );

  return SystemSetting;
};
