const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const InstructorResourceOptIn = sequelize.define(
        "InstructorResourceOptIn",
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
            },
            resource_id: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "resource_id",
            },
            opted_in: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            opted_in_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "instructor_resource_opt_ins",
            underscored: true,
            timestamps: true,
            charset: "utf8mb4",
            collate: "utf8mb4_unicode_ci",
            indexes: [
                { unique: true, fields: ["user_id", "resource_id"] },
            ],
        }
    );

    InstructorResourceOptIn.associate = (models) => {
        InstructorResourceOptIn.belongsTo(models.User, { foreignKey: "user_id", as: "user", targetKey: "user_id" });
        InstructorResourceOptIn.belongsTo(models.InstructorResource, { foreignKey: "resource_id", as: "resource" });
    };

    return InstructorResourceOptIn;
};
