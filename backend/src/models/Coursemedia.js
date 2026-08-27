const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const CourseMedia = sequelize.define(
        "CourseMedia",
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
            type: {
                type: DataTypes.ENUM("video", "document", "image", "audio", "link"),
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            lesson_id: {
                type: DataTypes.STRING(255),
                allowNull: true,
                field: "lesson_id",
                comment: "Internal identifier for streaming routes",
            },
            url: {
                type: DataTypes.STRING(1000),
                allowNull: true,
            },
            thumbnail: {
                type: DataTypes.STRING(1000),
                allowNull: true,
            },
            /** bytes */
            size: {
                type: DataTypes.BIGINT,
                allowNull: true,
            },
            /** seconds */
            duration: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            mime_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: "mime_type",
            },
            /** Hex-encoded AES-128 key for the lesson's encrypted HLS video. */
            enc_key: {
                type: DataTypes.STRING(255),
                allowNull: true,
                field: "enc_key",
            },
            sort_order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                field: "sort_order",
            },
            /** Free preview available even for paid course */
            is_preview: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                field: "is_preview",
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
            tableName: "course_media",
            underscored: true,
            timestamps: true,
        }
    );

    CourseMedia.associate = (models) => {
        CourseMedia.belongsTo(models.Course, { foreignKey: "course_id", as: "course" });
    };

    return CourseMedia;
};
