const { DataTypes } = require("sequelize");

/**
 * Lab
 * - courseId null  = standalone lab
 * - courseId set   = lab belongs to that course
 * - certificationId: optional reference to standalone Certification
 * - isAssignable: standalone labs can be directly assigned to users
 */
module.exports = (sequelize) => {
    const Lab = sequelize.define(
        "Lab",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            /** null = standalone lab */
            course_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "course_id",
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "Lab title is required" },
                    len: { args: [3, 255], msg: "Title must be 3–255 characters" },
                },
            },
            slug: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            /** Human-friendly sequential reference, e.g. LAB-001 (admin tracking). */
            lab_code: {
                type: DataTypes.STRING(32),
                allowNull: true,
                unique: true,
                field: "lab_code",
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
            instructions: {
                type: DataTypes.TEXT("long"),
                allowNull: true,
            },
            type: {
                type: DataTypes.ENUM("hands_on", "quiz", "project", "assessment"),
                defaultValue: "hands_on",
            },
            status: {
                type: DataTypes.ENUM("draft", "published", "archived"),
                defaultValue: "draft",
            },
            difficulty: {
                type: DataTypes.ENUM("easy", "medium", "hard"),
                defaultValue: "easy",
            },
            /** Time limit in minutes */
            time_limit_minutes: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "time_limit_minutes",
            },
            passing_score: {
                type: DataTypes.INTEGER,
                defaultValue: 70,
                field: "passing_score",
                validate: { min: 0, max: 100 },
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
            },
            /** null = unlimited */
            max_attempts: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "max_attempts",
            },
            /** Paid/free for standalone labs */
            is_free: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                field: "is_free",
            },
            price: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0.0,
            },
            /** Standalone labs can be directly assigned to users */
            is_assignable: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "is_assignable",
            },
            hls_ready: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "hls_ready",
            },
            hls_path: {
                type: DataTypes.STRING(1000),
                allowNull: true,
                field: "hls_path",
            },
            // ── Certification reference ─────────────────────────────────────────
            /** Optional — lab completion earns this certification */
            certification_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "certification_id",
            },
            tags: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            /** Admin workflow: content_approval_status pending | approved | rejected (like courses) */
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
            tableName: "labs",
            underscored: true,
            paranoid: true,
            timestamps: true,
        }
    );

    Lab.associate = (models) => {
        Lab.belongsTo(models.Course, {
            foreignKey: "course_id",
            as: "course",
        });
        Lab.belongsTo(models.Certification, {
            foreignKey: "certification_id",
            as: "certification",
            constraints: false,
        });
        Lab.hasMany(models.LabQuestion, {
            foreignKey: "lab_id",
            as: "questions",
            onDelete: "CASCADE",
        });
        Lab.hasMany(models.LabAssignment, {
            foreignKey: "lab_id",
            as: "assignments",
        });
        if (models.LabEnrollment) {
            Lab.hasMany(models.LabEnrollment, {
                foreignKey: "lab_id",
                as: "lab_enrollments",
            });
        }
        Lab.belongsTo(models.User, {
            foreignKey: "created_by",
            targetKey: "user_id",
            as: "creator",
            constraints: false,
        });
    };

    return Lab;
};