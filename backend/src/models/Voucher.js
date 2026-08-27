const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Voucher = sequelize.define(
    "Voucher",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      original_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_type: {
        type: DataTypes.ENUM("percent", "flat"),
        allowNull: false,
        defaultValue: "percent",
      },
      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      applies_to: {
        type: DataTypes.ENUM("course", "lab", "all"),
        allowNull: false,
        defaultValue: "all",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "vouchers",
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  Voucher.associate = (models) => {
    Voucher.hasMany(models.VoucherPurchase, {
      foreignKey: "voucher_id",
      as: "purchases",
    });
    Voucher.belongsTo(models.User, {
      foreignKey: "created_by",
      targetKey: "user_id",
      as: "creator",
      constraints: false,
    });
  };

  return Voucher;
};
