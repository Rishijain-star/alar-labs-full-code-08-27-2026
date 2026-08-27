const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WebinarRegistration = sequelize.define(
    "WebinarRegistration",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      webinar_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      company: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      job_title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
        defaultValue: "confirmed",
      },
      payment_status: {
        type: DataTypes.ENUM("free", "paid", "pending", "failed"),
        defaultValue: "free",
      },
      amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      order_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      registered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "webinar_registrations",
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["webinar_id", "user_id"] },
        { fields: ["webinar_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  WebinarRegistration.associate = (models) => {
    WebinarRegistration.belongsTo(models.Webinar, {
      foreignKey: "webinar_id",
      as: "webinar",
    });
    WebinarRegistration.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return WebinarRegistration;
};
