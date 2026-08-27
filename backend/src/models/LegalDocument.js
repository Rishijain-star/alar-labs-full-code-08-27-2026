const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LegalDocument = sequelize.define(
    "LegalDocument",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      doc_type: {
        type: DataTypes.ENUM("terms", "privacy"),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      version: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "legal_documents",
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  LegalDocument.associate = (models) => {
    LegalDocument.belongsTo(models.User, {
      foreignKey: "created_by",
      targetKey: "user_id",
      as: "creator",
      constraints: false,
    });
  };

  return LegalDocument;
};
