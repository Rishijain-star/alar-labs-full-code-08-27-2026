const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExpertTrainingProgramEnrollment = sequelize.define(
    "ExpertTrainingProgramEnrollment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      full_name: { type: DataTypes.STRING(255), allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: true },
      company: { type: DataTypes.STRING(255), allowNull: true },
      job_title: { type: DataTypes.STRING(255), allowNull: true },
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
      order_id: { type: DataTypes.STRING(255), allowNull: true },
      enrolled_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "expert_training_program_enrollments",
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ["program_id", "user_id"] },
        { fields: ["program_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  ExpertTrainingProgramEnrollment.associate = (models) => {
    ExpertTrainingProgramEnrollment.belongsTo(models.ExpertTrainingProgram, {
      foreignKey: "program_id",
      as: "program",
    });
    ExpertTrainingProgramEnrollment.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return ExpertTrainingProgramEnrollment;
};
