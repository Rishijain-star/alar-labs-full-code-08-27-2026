const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      // Role has many Users
      Role.hasMany(models.User, {
        foreignKey: 'role_id',
        as: 'users',
      });

      // Must pass the RolePermission model — string "role_permissions" creates a 2-column stub table only
      Role.belongsToMany(models.Permission, {
        through: models.RolePermission,
        as: 'permissions',
        foreignKey: 'role_id',
        otherKey: 'permission_id',
      });

    }
  }

  Role.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique role identifier (slug)',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Role display name',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Role description',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Role active status',
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Role priority (higher = more important)',
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User ID who created this role',
      },
      updated_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User ID who last updated this role',
      },
      deleted_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User ID who deleted this role',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
      },
    },
    {
      sequelize,
      modelName: 'Role',
      tableName: 'roles',
      timestamps: true,
      underscored: true,

      paranoid: true,
      indexes: [
        { fields: ['name'], unique: true },
        { fields: ['is_active'] },
        { fields: ['priority'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return Role;
};