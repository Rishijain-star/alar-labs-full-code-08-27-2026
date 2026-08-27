const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    class Session extends Model {
        /* =======================
           Associations (optional)
        ======================== */
        static associate(models) {
            // Example:
            // Session.belongsTo(models.User, { foreignKey: 'userId' });
        }

        /* =======================
           Instance Methods
        ======================== */
        isExpired() {
            return new Date() > this.expires_at;
        }

        toJSON() {
            const values = { ...this.get() };
            delete values.refresh_token_hash; // never expose refresh token hash
            return values;
        }

        /* =======================
           Static / Class Methods
        ======================== */
        static async findBySessionId(session_id) {
            return this.findOne({
                where: { session_id, is_active: true },
            });
        }

        static async findByUserId(user_id, includeInactive = false) {
            const where = { user_id };
            if (!includeInactive) {
                where.is_active = true;
            }

            return this.findAll({
                where,
                order: [['last_activity', 'DESC']],
            });
        }

        static async deleteExpiredSessions() {
            return this.destroy({
                where: {
                    expires_at: {
                        [Op.lt]: new Date(),
                    },
                },
            });
        }

        static async terminateAllUserSessions(user_id) {
            return this.update(
                { is_active: false },
                {
                    where: {
                        user_id,
                        is_active: true,
                    },
                }
            );
        }
    }

    /* =======================
       Model Initialization
    ======================== */
    Session.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            session_id: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
                comment: 'Unique session identifier',
            },

            user_id: {
                type: DataTypes.STRING(100),
                allowNull: false,
                comment: 'User ID this session belongs to',
            },

            refresh_token_hash: {
                type: DataTypes.STRING(255),
                allowNull: false,
                comment: 'Hashed refresh token',
            },

            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: false,
                comment: 'IP address of the session',
            },

            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Browser user agent',
            },

            device_info: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
                comment: 'Additional device information',
            },

            device_fingerprint: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Unique device fingerprint',
            },

            is_trusted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            mfa_verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            device_verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            remember_me: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            last_activity: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },

            expires_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            session_token: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Access token stored in cache (not persisted in DB for security)',
            },

            anomaly_score: {
                type: DataTypes.FLOAT,
                defaultValue: 0,
                comment: 'Anomaly detection score (0-1)',
            },

            terminated_at: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'When session was explicitly terminated',
            },

            terminated_reason: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Reason for session termination (logout, security concern, etc)',
            },

            location: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Geolocation of session',
            },
        },
        {
            sequelize,
            modelName: 'Session',
            tableName: 'sessions',
            timestamps: true,
            underscored: true,
            indexes: [
                { name: 'idx_session_id', unique: true, fields: ['session_id'] },
                { name: 'idx_user_id', fields: ['user_id'] },
                { name: 'idx_user_active', fields: ['user_id', 'is_active'] },
                { name: 'idx_device_fingerprint', fields: ['device_fingerprint'] },
                { name: 'idx_expires_at', fields: ['expires_at'] },
                { name: 'idx_ip_address', fields: ['ip_address'] },
                { name: 'idx_terminated_at', fields: ['terminated_at'] },
                { name: 'idx_anomaly_score', fields: ['anomaly_score'] },
            ],

            hooks: {
                beforeCreate: (session) => {
                    if (!session.last_activity) {
                        session.last_activity = new Date();
                    }
                },
                beforeUpdate: (session) => {
                    session.last_activity = new Date();
                },
            },
        }
    );

    return Session;
};
