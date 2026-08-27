const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SupportTicket = sequelize.define(
    "SupportTicket",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      /** Human-friendly sequential reference, e.g. TICKET-00001 */
      ticket_ref: {
        type: DataTypes.STRING(32),
        allowNull: true,
        unique: true,
      },
      message: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"),
        defaultValue: "open",
      },
      admin_reply: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      replied_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      replied_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
    },
    {
      tableName: "support_tickets",
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  SupportTicket.associate = (models) => {
    SupportTicket.belongsTo(models.User, {
      foreignKey: "user_id",
      targetKey: "user_id",
      as: "user",
      constraints: false,
    });
    SupportTicket.belongsTo(models.User, {
      foreignKey: "replied_by",
      targetKey: "user_id",
      as: "replier",
      constraints: false,
    });
    SupportTicket.hasMany(models.SupportChatMessage, {
      foreignKey: "ticket_id",
      as: "chatMessages",
      constraints: false,
    });
  };

  return SupportTicket;
};
