const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CareerRequest = sequelize.define(
        "CareerRequest",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    isEmail: true,
                },
            },
            experience_type: {
                type: DataTypes.ENUM("fresher", "experienced"),
                allowNull: true,
            },
            total_experience_years: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            contact_number: {
                type: DataTypes.STRING(30),
                allowNull: true,
            },
            request_type: {
                type: DataTypes.ENUM("self", "corporate"),
                allowNull: true,
                defaultValue: "self",
            },
            organization: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            requirements: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            career_offering_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            status: {
                type: DataTypes.ENUM("pending", "in_progress", "completed", "rejected"),
                defaultValue: "pending",
            },
            user_id: {
                type: DataTypes.STRING(100), // Match User model's user_id type
                allowNull: true,
                field: "user_id",
            },
        },
        {
            tableName: "career_requests",
            underscored: true,
            timestamps: true,
        }
    );

    CareerRequest.associate = (models) => {
        CareerRequest.belongsTo(models.CareerOffering, {
            foreignKey: "career_offering_id",
            as: "offering",
        });
        CareerRequest.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
            targetKey: "user_id", // Explicitly define target key
        });
    };

    return CareerRequest;
};
