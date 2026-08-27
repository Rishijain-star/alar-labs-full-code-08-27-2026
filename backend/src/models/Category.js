const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const Category = sequelize.define(
        "Category",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            slug: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            icon: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            display_order: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: "categories",
            underscored: true,
            paranoid: true,
            timestamps: true,
        }
    );

    Category.associate = (models) => {
        Category.hasMany(models.Course, {
            foreignKey: "category_id",
            as: "courses",
        });
        Category.hasMany(models.Subcategory, {
            foreignKey: "category_id",
            as: "subcategories",
        });
    };

    return Category;
};
