const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExpertTrainingProgram = sequelize.define(
    "ExpertTrainingProgram",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      slug: { type: DataTypes.STRING(255), allowNull: true, unique: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      original_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      instructor_name: { type: DataTypes.STRING(150), allowNull: true },
      instructor_title: { type: DataTypes.STRING(150), allowNull: true },
      instructor_image_url: { type: DataTypes.STRING(1024), allowNull: true },
      instructor_rating: { type: DataTypes.FLOAT, defaultValue: 4.9 },
      schedule_start: { type: DataTypes.DATE, allowNull: true },
      schedule_end: { type: DataTypes.DATE, allowNull: true },
      tags: { type: DataTypes.JSON, defaultValue: [] },
      banner_image_url: { type: DataTypes.STRING(1024), allowNull: true },
      max_seats: { type: DataTypes.INTEGER, defaultValue: 0 },
      enrolled_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      enrollment_url: { type: DataTypes.STRING(1024), allowNull: true },
      is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
      duration: { type: DataTypes.STRING(128), allowNull: true },
      training_format: {
        type: DataTypes.ENUM("live_online", "hybrid", "in_person"),
        defaultValue: "live_online",
      },
      level: {
        type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
        defaultValue: "beginner",
      },
      certificate_available: { type: DataTypes.BOOLEAN, defaultValue: false },
      language: { type: DataTypes.STRING(64), allowNull: true, defaultValue: "English" },
      prerequisites: { type: DataTypes.TEXT, allowNull: true },
      course_content: { type: DataTypes.TEXT, allowNull: true },
      instructor_profile_url: { type: DataTypes.STRING(1024), allowNull: true },
      learning_outcomes: { type: DataTypes.JSON, defaultValue: [] },
      session_count: { type: DataTypes.INTEGER, defaultValue: 1 },
      meeting_link: { type: DataTypes.STRING(2000), allowNull: true },
      venue: { type: DataTypes.STRING(500), allowNull: true },
      currency: { type: DataTypes.STRING(8), defaultValue: "INR" },
      is_free: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: "expert_training_programs",
      underscored: true,
      timestamps: true,
    }
  );

  ExpertTrainingProgram.associate = (models) => {
    ExpertTrainingProgram.hasMany(models.ExpertTrainingProgramEnrollment, {
      foreignKey: "program_id",
      as: "enrollments",
    });
  };

  return ExpertTrainingProgram;
};
