const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    class IPWhitelist extends Model {
        /* =======================
           Associations (optional)
        ======================== */
        static associate(models) {
            // Example:
            // IPWhitelist.belongsTo(models.User, { foreignKey: 'userId' });
        }

        /* =======================
           Instance Methods
        ======================== */
        isExpired() {
            return this.expires_at && new Date() > this.expires_at;
        }

        async updateLastUsed() {
            this.last_used = new Date();
            return this.save();
        }

        /* =======================
           Static / Class Methods
        ======================== */
        static async isWhitelisted(user_id, ip_address) {
            const entry = await this.findOne({
                where: {
                    user_id,
                    ip_address,
                    is_active: true,
                    [Op.or]: [
                        { expires_at: null },
                        { expires_at: { [Op.gt]: new Date() } },
                    ],
                },
            });

            if (entry) {
                await entry.updateLastUsed();
                return true;
            }

            return false;
        }

        static async addIP(user_id, ip_address, description = '', expires_at = null) {
            const existing = await this.findOne({
                where: { user_id, ip_address },
            });

            if (existing) {
                existing.is_active = true;
                existing.description = description || existing.description;
                existing.expires_at = expires_at;
                existing.last_used = null;
                return existing.save();
            }

            return this.create({
                user_id,
                ip_address,
                description,
                is_active: true,
                added_by: user_id,
                expires_at,
            });
        }

        static async removeIP(user_id, ip_address) {
            return this.destroy({
                where: { user_id, ip_address },
            });
        }

        static async getUserWhitelist(user_id, includeInactive = false) {
            const where = { user_id };

            if (!includeInactive) {
                where.is_active = true;
                where[Op.or] = [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } },
                ];
            }

            return this.findAll({
                where,
                order: [['created_at', 'DESC']],
            });
        }

        static async toggleWhitelist(user_id, enabled) {
            return this.update(
                { is_active: enabled },
                { where: { user_id } }
            );
        }

        static async cleanupExpired() {
            return this.destroy({
                where: {
                    expiresAt: {
                        [Op.lt]: new Date(),
                    },
                },
            });
        }

        static async getActiveCount(userId) {
            return this.count({
                where: {
                    userId,
                    isActive: true,
                    [Op.or]: [
                        { expiresAt: null },
                        { expiresAt: { [Op.gt]: new Date() } },
                    ],
                },
            });
        }
    }

    /* =======================
       Model Initialization
    ======================== */
    IPWhitelist.init(
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

            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: false,
            },

            ip_range: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            description: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            added_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            last_used: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'IPWhitelist',
            tableName: 'ip_whitelists',
            timestamps: true,
            underscored: true,
            indexes: [
                { name: 'idx_user_id', fields: ['user_id'] },
                { name: 'idx_ip_address', fields: ['ip_address'] },
                { name: 'idx_user_ip', unique: true, fields: ['user_id', 'ip_address'] },
                { name: 'idx_user_active', fields: ['user_id', 'is_active'] },
                { name: 'idx_expires_at', fields: ['expires_at'] },
            ],

            hooks: {
                beforeCreate: (entry) => {
                    if (!entry.added_by) {
                        entry.added_by = entry.user_id;
                    }
                },
            },
        }
    );

    return IPWhitelist;
};
