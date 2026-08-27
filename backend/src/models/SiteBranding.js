const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SiteBranding = sequelize.define(
    "SiteBranding",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      logo_url: { type: DataTypes.STRING(1024), allowNull: true },
      favicon_url: { type: DataTypes.STRING(1024), allowNull: true },
      topbar_text: { type: DataTypes.TEXT, allowNull: true },
      topbar_image_url: { type: DataTypes.STRING(1024), allowNull: true },
      topbar_active: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "site_brandings",
      underscored: true,
      timestamps: true,
    }
  );

  return SiteBranding;
};
