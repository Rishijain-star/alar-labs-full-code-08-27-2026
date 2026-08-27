const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CareerOffering = sequelize.define(
        "CareerOffering",
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
            icon: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: "Briefcase",
            },
            items: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            rating: {
                type: DataTypes.DECIMAL(2, 1),
                defaultValue: 4.8,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                field: "is_active",
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
            },
            created_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: "created_by",
            },
            updated_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: "updated_by",
            },
            metadata: {
                type: DataTypes.JSON,
                defaultValue: {},
            },
            draft_data: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            tableName: "career_offerings",
            underscored: true,
            paranoid: true,
            timestamps: true,
        }
    );

    CareerOffering.associate = (models) => {
        CareerOffering.hasMany(models.CareerRequest, {
            foreignKey: "career_offering_id",
            as: "requests",
        });
    };

    return CareerOffering;
};
