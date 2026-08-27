const { DataTypes } = require("sequelize");

/**
 * LabAssignment — tracks direct assignment of a standalone lab to a user.
 * Used only when lab.isAssignable = true and courseId = null.
 */
module.exports = (sequelize) => {
    const LabAssignment = sequelize.define(
        "LabAssignment",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            lab_id: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "lab_id",
            },
            assigned_to: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "assigned_to",
            },
            assigned_by: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "assigned_by",
            },
            status: {
                type: DataTypes.ENUM("pending", "in_progress", "completed", "expired"),
                defaultValue: "pending",
            },
            due_date: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "due_date",
            },
            started_at: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "started_at",
            },
            completed_at: {
                type: DataTypes.DATE,
                allowNull: true,
                field: "completed_at",
            },
            score: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: { min: 0, max: 100 },
            },
            attempts_used: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "attempts_used",
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: "lab_assignments",
            underscored: true,
            timestamps: true,
            indexes: [
                { unique: true, fields: ["lab_id", "assigned_to"] },
            ],
        }
    );

    LabAssignment.associate = (models) => {
        LabAssignment.belongsTo(models.Lab, { foreignKey: "lab_id", as: "lab" });
    };

    return LabAssignment;
};