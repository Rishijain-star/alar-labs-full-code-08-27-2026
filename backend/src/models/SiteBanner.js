const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SiteBanner = sequelize.define(
    "SiteBanner",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      subtitle: { type: DataTypes.TEXT, allowNull: true },
      image_url: { type: DataTypes.STRING(1024), allowNull: true },
      link_url: { type: DataTypes.STRING(1024), allowNull: true },
      button_title: { type: DataTypes.STRING(120), allowNull: true },
      button_link: { type: DataTypes.STRING(1024), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      tableName: "site_banners",
      underscored: true,
      timestamps: true,
    }
  );

  return SiteBanner;
};
