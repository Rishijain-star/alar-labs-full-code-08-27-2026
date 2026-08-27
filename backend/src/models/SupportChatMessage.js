const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SupportChatMessage = sequelize.define(
    "SupportChatMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ticket_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sender_user_id: { type: DataTypes.STRING(100), allowNull: true },
      sender_role: {
        type: DataTypes.ENUM("user", "admin"),
        allowNull: false,
      },
      body: { type: DataTypes.TEXT("long"), allowNull: false },
    },
    {
      tableName: "support_chat_messages",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  SupportChatMessage.associate = (models) => {
    SupportChatMessage.belongsTo(models.SupportTicket, {
      foreignKey: "ticket_id",
      as: "ticket",
      constraints: false,
    });
    SupportChatMessage.belongsTo(models.User, {
      foreignKey: "sender_user_id",
      targetKey: "user_id",
      as: "sender",
      constraints: false,
    });
  };

  return SupportChatMessage;
};
