const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {

    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User who performed the action',
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Action type (LOGIN, LOGOUT, CREATE_ROLE, etc.)',
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Type of resource affected',
      },
      resource_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID of resource affected',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address of action',
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User agent string',
      },
      success: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether action succeeded',
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if failed',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional action metadata',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: false,
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['resource_type', 'resource_id'] },
        { fields: ['created_at'] },
        { fields: ['success'] },
      ],
    }
  );

  return AuditLog;
};
