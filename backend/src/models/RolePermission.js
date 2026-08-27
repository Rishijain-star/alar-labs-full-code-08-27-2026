const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for this role-permission association'
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to role'
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'permissions',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'FK to permissions table',
    },

    assigned_by: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'system',
      comment: 'User who assigned this permission',
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When this permission was assigned'
    }
  }, {
    tableName: 'role_permissions',
    timestamps: false,

    underscored: true,
    indexes: [
      {
        name: 'idx_role_permissions_role_id',
        fields: ['role_id']
      },
      {
        name: 'idx_role_permissions_permission_id',
        fields: ['permission_id']
      },
      {
        // Unique constraint to prevent duplicate role-permission pairs
        name: 'unique_role_permission',
        unique: true,
        fields: ['role_id', 'permission_id']
      }
    ],
    comment: 'Junction table linking roles to permissions'
  });

  return RolePermission;
};