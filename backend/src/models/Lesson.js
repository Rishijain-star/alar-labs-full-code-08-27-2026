const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const Lesson = sequelize.define(
        "Lesson",
        {
            id: {
                type: DataTypes.STRING(255), // Supporting the ID format from your logs: 'new-lessond_1777197117108'
                primaryKey: true,
            },
            course_id: {
                type: DataTypes.UUID,
                allowNull: true,
                field: "course_id",
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            hls_ready: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "hls_ready",
            },
            hls_path: {
                type: DataTypes.STRING(1000),
                allowNull: true,
                field: "hls_path",
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
            },
            is_free: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "is_free",
            },
        },
        {
            tableName: "lessons",
            underscored: true,
            timestamps: true,
        }
    );

    Lesson.associate = (models) => {
        Lesson.belongsTo(models.Course, {
            foreignKey: "course_id",
            as: "course",
        });
        if (models.LessonEncryptionKey) {
            Lesson.hasOne(models.LessonEncryptionKey, {
                foreignKey: "lesson_id",
                as: "encryptionKey",
            });
        }
    };

    return Lesson;
};
