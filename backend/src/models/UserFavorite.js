const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserFavorite extends Model {
    static associate(models) {
      UserFavorite.belongsTo(models.User, {
        foreignKey: "user_id",
        targetKey: "user_id",
        as: "user",
      });
      UserFavorite.belongsTo(models.Course, {
        foreignKey: "target_id",
        constraints: false,
        as: "course",
      });
      UserFavorite.belongsTo(models.Lab, {
        foreignKey: "target_id",
        constraints: false,
        as: "lab",
      });
    }
  }

  UserFavorite.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      item_type: {
        type: DataTypes.ENUM("course", "lab"),
        allowNull: false,
      },
      target_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "UserFavorite",
      tableName: "user_favorites",
      underscored: true,
      timestamps: true,
    },
  );

  return UserFavorite;
};
