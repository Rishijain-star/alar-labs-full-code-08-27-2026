const { Model, DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    class BlacklistedToken extends Model {
        /* =======================
           Associations (optional)
        ======================== */
        static associate(models) {
            // Optional: link back to the user who owned the token
            BlacklistedToken.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user',
                onDelete: 'CASCADE'
            });
        }


        /* =======================
           Instance Methods
        ======================== */
        isExpired() {
            return new Date() > this.expires_at;
        }

        toJSON() {
            const values = { ...this.get() };
            delete values.token; // never expose actual token
            return values;
        }

        /* =======================
           Static / Class Methods
        ======================== */
        static async isBlacklisted(token_hash) {
            const entry = await this.findOne({
                where: {
                    token_hash,
                    expires_at: {
                        [Op.gt]: new Date(),
                    },
                },
            });

            return !!entry;
        }

        static async blacklistToken(data) {
            const {
                token,
                token_hash,
                user_id,
                token_type = 'access',
                reason,
                ip_address,
                user_agent,
                expires_at,
                blacklisted_by
            } = data;

            return this.create({
                token,
                token_hash,
                user_id,
                token_type,
                reason,
                ip_address,
                user_agent,
                blacklisted_by: blacklisted_by || user_id,
                expires_at,
            });
        }

        static async blacklistAllUserTokens(
            user_id,
            reason = 'User revoked all tokens'
        ) {
            const expires_at = new Date();
            expires_at.setDate(expires_at.getDate() + 7); // expire in 7 days

            return this.create({
                token: `ALL_TOKENS_${user_id}`,
                token_hash: `user_all_${user_id}`,
                user_id,
                token_type: 'all',
                reason,
                blacklisted_by: user_id,
                expires_at,
            });
        }

        static async isUserBlacklisted(user_id) {
            const entry = await this.findOne({
                where: {
                    user_id,
                    token_type: 'all',
                    expires_at: {
                        [Op.gt]: new Date(),
                    },
                },
            });

            return !!entry;
        }

        static async removeUserBlacklist(userId) {
            return this.destroy({
                where: {
                    userId,
                    tokenType: 'all',
                },
            });
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

        static async getUserBlacklistedTokens(userId, limit = 50) {
            return this.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit,
            });
        }
    }

    /* =======================
       Model Initialization
    ======================== */
    BlacklistedToken.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },

            token: {
                type: DataTypes.TEXT('long'),
                allowNull: false,

                comment: 'The blacklisted token (or token hash)',
            },

            token_hash: {
                type: DataTypes.STRING(64), // SHA-256 hash
                allowNull: false,
                unique: true,
                comment: 'SHA-256 hash of the token',
            },

            user_id: {
                type: DataTypes.STRING(100),
                allowNull: false,
                comment: 'User ID who owned this token',
            },

            token_type: {
                type: DataTypes.ENUM('access', 'refresh', 'all'),
                defaultValue: 'access',
            },

            reason: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true,
            },

            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            blacklisted_by: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            expires_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'BlacklistedToken',
            tableName: 'blacklisted_tokens',
            timestamps: true,
            indexes: [
                { name: 'idx_token_hash', unique: true, fields: ['token_hash'] },
                { name: 'idx_user_id', fields: ['user_id'] },
                { name: 'idx_token_type', fields: ['token_type'] },
                { name: 'idx_expires_at', fields: ['expires_at'] },
                { name: 'idx_user_type', fields: ['user_id', 'token_type'] },
            ],
            underscored: true,


        }
    );

    return BlacklistedToken;
};
