module.exports = (sequelize, DataTypes) => {
  const TechnologySkill = sequelize.define(
    'TechnologySkill',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        trim: true,
        comment: 'Skill name (e.g., AWS, Kubernetes, Docker)',
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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
      category: {
        type: DataTypes.ENUM('cloud', 'container', 'framework', 'language', 'database', 'devops', 'other'),
        defaultValue: 'other',
      },
      proficiency_levels: {
        type: DataTypes.JSON,
        defaultValue: ['beginner', 'intermediate', 'advanced', 'expert'],
        field: 'proficiency_levels',
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
      tableName: 'technology_skills',
      underscored: true,
      paranoid: true,
      timestamps: true,
    }
  );

  TechnologySkill.associate = (models) => {
    TechnologySkill.belongsToMany(models.Course, {
      through: 'CourseTechnologySkill',
      foreignKey: 'technology_skill_id',
      otherKey: 'course_id',
      as: 'courses',
    });
  };

  return TechnologySkill;
};
