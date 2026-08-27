const { DataTypes } = require("sequelize");

/**
 * Certification
 * Standalone entity. Course and Lab reference it by certificationId.
 * Neither owns the certification.
 */
module.exports = (sequelize) => {
    const Certification = sequelize.define(
        "Certification",
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
                    len: { args: [3, 255], msg: "Title must be 3–255 characters" },
                },
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            /** URL of the certificate template (image/PDF) */
            template_url: {
                type: DataTypes.STRING(1000),
                allowNull: true,
                field: "template_url",
            },
            /** Minimum passing score 0–100 */
            passing_score: {
                type: DataTypes.INTEGER,
                defaultValue: 70,
                field: "passing_score",
                validate: { min: 0, max: 100 },
            },
            /** Validity in days — null = never expires */
            validity_days: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "validity_days",
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                field: "is_active",
            },
            /** Public catalog / marketing (optional) */
            thumbnail: {
                type: DataTypes.STRING(1000),
                allowNull: true,
            },
            list_price: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0,
                field: "list_price",
            },
            is_free: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "is_free",
            },
            vendor_platform: {
                type: DataTypes.STRING(80),
                allowNull: true,
                field: "vendor_platform",
            },
            duration_label: {
                type: DataTypes.STRING(120),
                allowNull: true,
                field: "duration_label",
            },
            level: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            practice_question_count: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "practice_question_count",
            },
            exam_simulation_count: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "exam_simulation_count",
            },
            enrolled_display: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "enrolled_display",
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
            },
            exam_practice_url: {
                type: DataTypes.STRING(2000),
                allowNull: true,
                field: "exam_practice_url",
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
            tableName: "certifications",
            underscored: true,
            paranoid: true,
            timestamps: true,
        }
    );

    Certification.associate = (models) => {
        // A certification can be referenced by many courses
        Certification.hasMany(models.Course, {
            foreignKey: "certification_id",
            as: "courses",
        });
        // A certification can be referenced by many labs
        Certification.hasMany(models.Lab, {
            foreignKey: "certification_id",
            as: "labs",
        });
    };

    return Certification;
};