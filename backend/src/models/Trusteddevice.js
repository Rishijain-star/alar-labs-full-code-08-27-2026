const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustedDevice extends Model {
    // Instance methods
    isValid() {
      return this.expires_at > new Date() && !this.is_revoked;
    }

    async revoke() {
      this.is_revoked = true;
      this.revoked_at = new Date();
      await this.save();
    }

    async updateLastUsed() {
      this.last_used_at = new Date();
      await this.save();
    }

    static associate(models) {
      TrustedDevice.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  TrustedDevice.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique device identifier',
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'User who owns this trusted device',
      },
      device_fingerprint: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Unique device identifier hash',
      },
      device_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'User-friendly device name',
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Browser/device user agent',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address when trusted',
      },
      device_info: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional device information (browser, OS, etc.)',
      },
      is_revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Trust revoked status',
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When trust was revoked',
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Last time device was used',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Trust expiration time',
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
      modelName: 'TrustedDevice',
      tableName: 'trusted_devices',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['device_fingerprint'] },
        { fields: ['user_id', 'device_fingerprint'] },
        { fields: ['is_revoked'] },
        { fields: ['expires_at'] },
        { fields: ['last_used_at'] },
      ],
    }
  );

  return TrustedDevice;
};
