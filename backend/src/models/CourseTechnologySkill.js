const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CourseTechnologySkill = sequelize.define(
        "CourseTechnologySkill",
        {
            courseId: {
                type: DataTypes.UUID,
                references: {
                    model: "courses",
                    key: "id",
                },
            },
            technologySkillId: {
                type: DataTypes.UUID,
                references: {
                    model: "technology_skills",
                    key: "id",
                },
            },
        },
        {
            tableName: "course_technology_skills",
            underscored: true,
            timestamps: false,
        }
    );

    return CourseTechnologySkill;
};