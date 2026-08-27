const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CloudServiceRequest = sequelize.define(
        "CloudServiceRequest",
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
            organization: {
                type: DataTypes.STRING(255),
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
            cloud_service_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            requirements: {
                type: DataTypes.TEXT,
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
            tableName: "cloud_service_requests",
            underscored: true,
            timestamps: true,
        }
    );

    CloudServiceRequest.associate = (models) => {
        CloudServiceRequest.belongsTo(models.CloudService, {
            foreignKey: "cloud_service_id",
            as: "service",
        });
        CloudServiceRequest.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
            targetKey: "user_id", // Explicitly define target key
        });
    };

    return CloudServiceRequest;
};
