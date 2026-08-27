const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CourseQuestion = sequelize.define(
        "CourseQuestion",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            course_id: {
                type: DataTypes.UUID,
                allowNull: false,
                field: "course_id",
            },
            question: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            type: {
                type: DataTypes.ENUM("mcq", "true_false", "short_answer", "essay"),
                defaultValue: "mcq",
            },
            /**
             * options JSON array:
             * [{ "id": "a", "text": "Paris" }, { "id": "b", "text": "London" }]
             */
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
            tableName: "course_questions",
            underscored: true,
            timestamps: true,
        }
    );

    CourseQuestion.associate = (models) => {
        CourseQuestion.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
    };

    return CourseQuestion;
};