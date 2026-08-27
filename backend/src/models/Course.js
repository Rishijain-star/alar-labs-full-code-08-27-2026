const { DataTypes } = require("sequelize");

/**
 * @summary Course model
 * @description Defines the Course model for the database.
 * @param {object} sequelize - The Sequelize instance.
 * @returns {object} - The Course model.
 */
module.exports = (sequelize) => {
    const Course = sequelize.define(
        "Course",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Title is required" },
                    len: { args: [2, 255], msg: "Title must be 2–255 characters" },
                },
            },
            slug: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            /** Human-friendly sequential reference, e.g. COURSE-001 (admin tracking). */
            course_code: {
                type: DataTypes.STRING(32),
                allowNull: true,
                unique: true,
                field: "course_code",
            },
            /** Auto-incremented on each save; revision date set alongside it. Admin-only. */
            version: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            last_revised_at: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "last_revised_at",
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            thumbnail: {
                type: DataTypes.STRING(1000),
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM("draft", "published", "archived"),
                defaultValue: "draft",
            },
            level: {
                type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
                defaultValue: "beginner",
            },
            duration_minutes: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "duration_minutes",
            },
            // ── Pricing ──────────────────────────────────────────────────────────
            price: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0.0,
            },
            is_free: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                field: "is_free",
            },
            // ── Certification reference ───────────────────────────────────────────
            /** Optional — course earns this certification on completion */
            certification_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "certification_id",
            },
            category_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "category_id",
            },
            // ── Header ───────────────────────────────────────────────────────────
            header_enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "header_enabled",
            },
            /** Rich text / HTML content for the course page header */
            header_content: {
                type: DataTypes.TEXT("long"),
                allowNull: true,
                field: "header_content",
            },
            header_bg_color: {
                type: DataTypes.STRING(20),
                allowNull: true,
                field: "header_bg_color",
            },
            header_text_color: {
                type: DataTypes.STRING(20),
                allowNull: true,
                field: "header_text_color",
            },
            // ── Footer ───────────────────────────────────────────────────────────
            footer_enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "footer_enabled",
            },
            /** Rich text / HTML content for the course page footer */
            footer_content: {
                type: DataTypes.TEXT("long"),
                allowNull: true,
                field: "footer_content",
            },
            footer_bg_color: {
                type: DataTypes.STRING(20),
                allowNull: true,
                field: "footer_bg_color",
            },
            footer_text_color: {
                type: DataTypes.STRING(20),
                allowNull: true,
                field: "footer_text_color",
            },
            tags: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            metadata: {
                type: DataTypes.JSON,
                defaultValue: {},
            },
            created_by: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "created_by",
            },
            updated_by: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "updated_by",
            },
        },
        {
            tableName: "courses",
            underscored: true,
            paranoid: true,
            timestamps: true,
        }
    );

    Course.associate = (models) => {
        // Certification reference (not owned — standalone entity)
        Course.belongsTo(models.Certification, {
            foreignKey: "certification_id",
            as: "certification",
            constraints: false, // nullable reference
        });
        Course.hasMany(models.Lab, {
            foreignKey: "course_id",
            as: "labs",
        });
        Course.hasMany(models.CourseMedia, {
            foreignKey: "course_id",
            as: "media",
            onDelete: "CASCADE",
        });
        Course.hasMany(models.CourseQuestion, {
            foreignKey: "course_id",
            as: "questions",
            onDelete: "CASCADE",
        });
        Course.hasMany(models.Enrollment, {
            foreignKey: "course_id",
            as: "enrollments",
        });
        Course.belongsToMany(models.TechnologySkill, {
            through: "CourseTechnologySkill",
            foreignKey: "course_id",
            otherKey: "technology_skill_id",
            as: "technology_skills",
        });
        Course.belongsTo(models.Category, {
            foreignKey: "category_id",
            as: "category",
        });
        Course.belongsTo(models.User, {
            foreignKey: "created_by",
            targetKey: "user_id",
            as: "creator",
            constraints: false,
        });
    };

    return Course;
};