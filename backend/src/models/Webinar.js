const { DataTypes } = require("sequelize");

/** Live / scheduled online sessions (bootcamps, workshops) shown on /training */
module.exports = (sequelize) => {
  const Webinar = sequelize.define(
    "Webinar",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      /** Full rich-text body for the "About this webinar" section (separate from hero description) */
      about_content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      instructor_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      instructor_title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      instructor_image: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      rating: {
        type: DataTypes.DECIMAL(2, 1),
        defaultValue: 4.8,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      /** List price shown with strikethrough when higher than `price` */
      original_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      is_free: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      /** Display strings for schedule, e.g. "Jan 15–17, 2025" */
      schedule_summary: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      time_summary: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      duration_summary: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      enrolled_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      max_capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      topics: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "cancelled"),
        defaultValue: "draft",
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      starts_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      enrollment_url: {
        type: DataTypes.STRING(2000),
        allowNull: true,
      },
      /** online | offline | hybrid */
      delivery_mode: {
        type: DataTypes.ENUM("online", "offline", "hybrid"),
        defaultValue: "online",
      },
      meeting_link: {
        type: DataTypes.STRING(2000),
        allowNull: true,
      },
      venue: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: "IST",
      },
      is_recorded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      currency: {
        type: DataTypes.STRING(8),
        defaultValue: "INR",
      },
    },
    {
      tableName: "webinars",
      underscored: true,
      timestamps: true,
    }
  );

  Webinar.associate = (models) => {
    Webinar.hasMany(models.WebinarRegistration, {
      foreignKey: "webinar_id",
      as: "registrations",
    });
  };

  return Webinar;
};
