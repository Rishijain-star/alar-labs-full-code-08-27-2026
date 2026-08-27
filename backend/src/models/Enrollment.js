const { DataTypes } = require("sequelize");

/**
 * @summary Enrollment model
 * @description Tracks user enrollments in courses.
 * @param {object} sequelize - The Sequelize instance.
 * @returns {object} - The Enrollment model.
 */
module.exports = (sequelize) => {
    const Enrollment = sequelize.define(
        "Enrollment",
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
                references: {
                    model: "users",
                    key: "user_id",
                },
            },
            course_id: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "course_id",
                references: {
                    model: "courses",
                    key: "id",
                },
            },
            enrolled_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                field: "enrolled_at",
            },
            status: {
                type: DataTypes.ENUM("active", "completed", "cancelled", "expired"),
                defaultValue: "active",
            },
            progress: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: { min: 0, max: 100 },
            },
            last_accessed_at: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "last_accessed_at",
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "expires_at",
            },
            // Metadata for payment or order reference
            order_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: "order_id",
            },
            // Accumulated ACTIVE time the learner has spent in this course (seconds).
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
            tableName: "enrollments",
            underscored: true,
            timestamps: true,
            indexes: [
                { unique: true, fields: ["user_id", "course_id"] },
                { fields: ["user_id"] },
                { fields: ["course_id"] },
            ],
        }
    );

    Enrollment.associate = (models) => {
        Enrollment.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
        Enrollment.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
    };

    return Enrollment;
};
