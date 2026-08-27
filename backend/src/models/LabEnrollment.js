const { DataTypes } = require("sequelize");

/**
 * Standalone lab enrollment (free self-enroll or purchase) — distinct from LabAssignment (admin-assigned).
 */
module.exports = (sequelize) => {
  const LabEnrollment = sequelize.define(
    "LabEnrollment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "user_id",
      },
      lab_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "lab_id",
      },
      status: {
        type: DataTypes.ENUM("active", "completed", "abandoned"),
        defaultValue: "active",
      },
      progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      /** free | purchase — how access was granted */
      source: {
        type: DataTypes.ENUM("free", "purchase"),
        defaultValue: "free",
        field: "source",
      },
      order_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "order_id",
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "started_at",
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
      last_activity_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_activity_at",
      },
      // Accumulated ACTIVE time the learner has spent in this lab (seconds).
      // Incremented by client heartbeats; pauses when the page is not open.
      time_spent_seconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "time_spent_seconds",
        validate: { min: 0 },
      },
    },
    {
      tableName: "lab_enrollments",
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["user_id", "lab_id"] },
        { fields: ["user_id"] },
        { fields: ["lab_id"] },
      ],
    }
  );

  LabEnrollment.associate = (models) => {
    LabEnrollment.belongsTo(models.User, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
    });
    LabEnrollment.belongsTo(models.Lab, { foreignKey: "lab_id", as: "lab" });
  };

  return LabEnrollment;
};
