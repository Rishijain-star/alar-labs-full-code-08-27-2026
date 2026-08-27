const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const VoucherPurchase = sequelize.define(
    "VoucherPurchase",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      voucher_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      price_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("purchased", "redeemed", "cancelled"),
        defaultValue: "purchased",
      },
      redeemed_for: {
        type: DataTypes.ENUM("course", "lab", "none"),
        defaultValue: "none",
      },
      redeemed_resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      redeemed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
    },
    {
      tableName: "voucher_purchases",
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  VoucherPurchase.associate = (models) => {
    VoucherPurchase.belongsTo(models.Voucher, {
      foreignKey: "voucher_id",
      as: "voucher",
    });
    VoucherPurchase.belongsTo(models.User, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
      constraints: false,
    });
  };

  return VoucherPurchase;
};
