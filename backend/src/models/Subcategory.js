module.exports = (sequelize, DataTypes) => {
  const Subcategory = sequelize.define(
    'Subcategory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'category_id',
        references: {
          model: 'categories',
          key: 'id',
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        trim: true,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Icon URL or class name',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order',
      },
      created_at: {
        type: DataTypes.DATE,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        field: 'updated_at',
      },
      deleted_at: {
        type: DataTypes.DATE,
        field: 'deleted_at',
      },
    },
    {
      tableName: 'subcategories',
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  Subcategory.associate = (models) => {
    Subcategory.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category',
      onDelete: 'RESTRICT',
    });
  };

  return Subcategory;
};
