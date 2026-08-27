const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {


      Permission.belongsToMany(models.Role, {
        through: models.RolePermission,
        as: 'roles',
        foreignKey: 'permission_id',
        otherKey: 'role_id',
        timestamps: false,
      });


    }
  }

  Permission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique permission identifier (e.g., view_users)',
      },
      label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Human-readable permission name',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Permission description',
      },

      action: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Action type (e.g., create, read, update, delete)',
      },
      resource_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Resource type this permission applies to (e.g., course, lab, user). NULL for global permissions',
      },
      resource_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Specific resource ID. NULL for all resources of this type',
      },
      scope: {
        type: DataTypes.STRING(50),
        defaultValue: 'global',
        allowNull: false,
        comment: 'Permission scope: global, resource, tenant',
      },
      conditions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Dynamic conditions for attribute-based access control (ABAC)',
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User ID who created this permission',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',

      timestamps: true,
      underscored: true,
      indexes: [

        { fields: ['action'] },
        { fields: ['resource_type'] },
        { fields: ['resource_id'] },
        { fields: ['scope'] },
        { fields: ['resource_type', 'resource_id'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return Permission;
};
