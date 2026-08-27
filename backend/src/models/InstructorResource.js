const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const InstructorResource = sequelize.define(
        "InstructorResource",
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
            course_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "course_id",
            },
            certification_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "certification_id",
            },
            file_url: {
                type: DataTypes.STRING(1000),
                allowNull: false,
            },
            version: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: "1.0",
            },
            release_date: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
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
            tableName: "instructor_resources",
            underscored: true,
            timestamps: true,
            charset: "utf8mb4",
            collate: "utf8mb4_unicode_ci",
        }
    );

    InstructorResource.associate = (models) => {
        InstructorResource.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
        InstructorResource.belongsTo(models.Certification, { foreignKey: "certification_id", as: "certification" });
    };

    return InstructorResource;
};
