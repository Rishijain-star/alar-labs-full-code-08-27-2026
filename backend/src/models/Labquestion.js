const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const LabQuestion = sequelize.define(
        "LabQuestion",
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
            question: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            type: {
                type: DataTypes.ENUM("mcq", "true_false", "short_answer", "code", "essay"),
                defaultValue: "mcq",
            },
            options: {
                type: DataTypes.JSON,
                defaultValue: [],
            },
            correct_answer: {
                type: DataTypes.STRING(500),
                allowNull: true,
                field: "correct_answer",
            },
            explanation: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            /** Starter code for code-type questions */
            starter_code: {
                type: DataTypes.TEXT,
                allowNull: true,
                field: "starter_code",
            },
            marks: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                validate: { min: 1 },
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
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
            tableName: "lab_questions",
            underscored: true,
            timestamps: true,
        }
    );

    LabQuestion.associate = (models) => {
        LabQuestion.belongsTo(models.Lab, { foreignKey: "lab_id", as: "lab" });
    };

    return LabQuestion;
};