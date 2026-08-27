const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    class Device extends Model {
        /* =======================
           Associations (optional)
        ======================== */
        static associate(models) {
            // Example:
            // Device.belongsTo(models.User, { foreignKey: 'userId' });
        }

        /* =======================
           Instance Methods
        ======================== */
        isTrustExpired() {
            return this.trust_expires_at && new Date() > this.trust_expires_at;
        }

        async updateLastUsed() {
            this.last_used = new Date();
            return this.save();
        }

        async deactivate() {
            this.is_active = false;
            this.is_trusted = false;
            return this.save();
        }

        async revokeTrust() {
            this.is_trusted = false;
            this.verified_at = null;
            this.trust_expires_at = null;
            return this.save();
        }

        async extendTrust(days = 30) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);
            this.trust_expires_at = expiresAt;
            return this.save();
        }

        /* =======================
           Static / Class Methods
        ======================== */
        static async findByFingerprint(fingerprint) {
            return this.findOne({
                where: {
                    device_fingerprint: fingerprint,
                    is_active: true,
                },
            });
        }

        static async isTrustedDevice(user_id, fingerprint) {
            const device = await this.findOne({
                where: {
                    user_id,
                    device_fingerprint: fingerprint,
                    is_trusted: true,
                    is_active: true,
                    [Op.or]: [
                        { trust_expires_at: null },
                        { trust_expires_at: { [Op.gt]: new Date() } },
                    ],
                },
            });

            if (device) {
                await device.updateLastUsed();
                return true;
            }

            return false;
        }

        static async registerDevice(data) {
            const {
                user_id,
                device_fingerprint,
                device_name,
                device_type = 'unknown',
                browser,
                browser_version,
                os,
                os_version,
                user_agent,
                ip_address,
                is_trusted = false,
            } = data;

            const existing = await this.findOne({
                where: { device_fingerprint },
            });

            if (existing) {
                existing.last_used = new Date();
                existing.is_active = true;

                if (is_trusted) {
                    existing.is_trusted = true;
                    existing.verified_at = new Date();
                }

                return existing.save();
            }

            return this.create({
                user_id,
                device_fingerprint,
                device_name: device_name || `${device_type} - ${browser || 'Unknown'}`,
                device_type,
                browser,
                browser_version,
                os,
                os_version,
                user_agent,
                ip_address,
                is_trusted,
                verified_at: is_trusted ? new Date() : null,
                last_used: new Date(),
            });
        }

        static async trustDevice(user_id, fingerprint, trustDays = 30) {
            const device = await this.findOne({
                where: { user_id, device_fingerprint: fingerprint },
            });

            if (!device) {
                throw new Error('Device not found');
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + trustDays);

            device.is_trusted = true;
            device.verified_at = new Date();
            device.trust_expires_at = expiresAt;

            return device.save();
        }

        static async getUserDevices(user_id, includeInactive = false) {
            const where = { user_id };
            if (!includeInactive) {
                where.is_active = true;
            }

            return this.findAll({
                where,
                order: [['last_used', 'DESC']],
                attributes: { exclude: ['user_agent'] },
            });
        }

        static async getTrustedDevices(user_id) {
            return this.findAll({
                where: {
                    user_id,
                    is_trusted: true,
                    is_active: true,
                    [Op.or]: [
                        { trust_expires_at: null },
                        { trust_expires_at: { [Op.gt]: new Date() } },
                    ],
                },
                order: [['last_used', 'DESC']],
            });
        }

        static async removeDevice(user_id, fingerprint) {
            return this.destroy({
                where: { user_id, device_fingerprint: fingerprint },
            });
        }

        static async revokeAllTrust(user_id) {
            return this.update(
                {
                    is_trusted: false,
                    verified_at: null,
                    trust_expires_at: null,
                },
                {
                    where: { user_id, is_trusted: true },
                }
            );
        }

        static async cleanupExpiredTrust() {
            return this.update(
                {
                    is_trusted: false,
                    verified_at: null,
                },
                {
                    where: {
                        trust_expires_at: {
                            [Op.lt]: new Date(),
                        },
                    },
                }
            );
        }

        static async cleanupInactiveDevices(daysInactive = 90) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

            return this.destroy({
                where: {
                    last_used: {
                        [Op.lt]: cutoffDate,
                    },
                    is_trusted: false,
                },
            });
        }
    }

    /* =======================
       Model Initialization
    ======================== */
    Device.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            user_id: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            device_fingerprint: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
            },

            device_name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            device_type: {
                type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
                defaultValue: 'unknown',
            },

            browser: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            browser_version: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            os: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            os_version: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },

            is_trusted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            verified_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            last_used: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            trust_expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'Device',
            tableName: 'devices',
            timestamps: true,
            underscored: true,

            indexes: [
                { name: 'idx_device_fingerprint', unique: true, fields: ['device_fingerprint'] },
                { name: 'idx_user_id', fields: ['user_id'] },
                { name: 'idx_user_trusted', fields: ['user_id', 'is_trusted'] },
                { name: 'idx_user_active', fields: ['user_id', 'is_active'] },
                { name: 'idx_last_used', fields: ['last_used'] },
            ],
            hooks: {
                beforeCreate: (device) => {
                    if (device.isTrusted && !device.verifiedAt) {
                        device.verifiedAt = new Date();
                    }
                },
            },
        }
    );

    return Device;
};
