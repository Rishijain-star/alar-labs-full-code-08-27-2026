const {
    Model
} = require('sequelize');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const {
    hashPassword
} = require('../utils/crypto');

/**
 * @summary User model
 * @description Defines the User model for the database.
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} DataTypes - The Sequelize data types.
 * @returns {object} - The User model.
 */
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        /* =======================
           Password & Authentication Methods
        ======================== */

        async verifyPassword(password) {
            try {
                return await bcrypt.compare(password, this.password_hash);
            } catch (error) {
                return false;
            }
        }

        /* =======================
           Account Lock Methods
        ======================== */

        isLocked() {
            if (!this.locked_until) return false;
            return new Date() < this.locked_until;
        }

        async lockAccount(durationMinutes = 30) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);

            this.locked_until = lockUntil;
            this.failed_login_attempts = 0;
            await this.save();
        }

        async unlockAccount() {
            this.locked_until = null;
            this.failed_login_attempts = 0;
            await this.save();
        }

        async incrementFailedAttempts() {
            this.failed_login_attempts += 1;

            // Lock account after 5 failed attempts
            if (this.failed_login_attempts >= 5) {
                await this.lockAccount(30);
            } else {
                await this.save();
            }

            return this.failed_login_attempts;
        }

        async resetFailedAttempts() {
            this.failed_login_attempts = 0;
            await this.save();
        }

        /* =======================
           MFA Instance Methods
        ======================== */

        /**
         * Check if MFA is enabled for this user
         */
        isMfaEnabled() {
            return this.requires_mfa && this.mfa_secret !== null;
        }

        /**
         * 🔧 FIXED: Verify MFA TOTP code
         * Added input sanitization and better error handling
         */
        async verifyMfaCode(code) {
            if (!this.mfa_secret) {
                console.log('❌ No MFA secret found for user');
                return false;
            }

            try {
                // 🔧 FIX 1: Clean and validate the input code
                const cleanCode = String(code).trim().replace(/\s/g, '');


                // 🔧 FIX 2: Validate code format before verification
                if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {

                    // Check if it might be a backup code (8 chars, hex)
                    if (/^[0-9A-F]{8}$/i.test(cleanCode)) {

                        if (this.mfa_backup_codes && this.mfa_backup_codes.length > 0) {
                            return await this.verifyBackupCode(cleanCode);
                        }
                    }

                    return false;
                }

                // 🔧 FIX 3: Verify TOTP code with cleaned input
                const verified = speakeasy.totp.verify({
                    secret: this.mfa_secret,
                    encoding: 'base32',
                    token: cleanCode,
                    window: 2, // Allow ±1 time step (30 seconds) for clock drift
                });


                if (verified) {
                    // Update last MFA verified timestamp
                    this.last_mfa_verified_at = new Date();
                    await this.save();
                    return true;
                }

                // Generate current expected token for debugging
                const currentToken = speakeasy.totp({
                    secret: this.mfa_secret,
                    encoding: 'base32',
                });


                // Try backup codes if TOTP fails
                if (this.mfa_backup_codes && this.mfa_backup_codes.length > 0) {
                    console.log('🔑 Trying backup codes...');
                    return await this.verifyBackupCode(cleanCode);
                }

                return false;
            } catch (error) {
                console.error('❌ MFA verification error:', error);
                return false;
            }
        }

        /**
         * 🔧 FIXED: Verify and consume a backup code
         * Added input sanitization
         */
        async verifyBackupCode(code) {
            if (!this.mfa_backup_codes || this.mfa_backup_codes.length === 0) {

                return false;
            }

            // 🔧 FIX: Clean the input code
            const codeUpper = String(code).trim().replace(/\s/g, '').toUpperCase();


            // Check each hashed backup code
            for (let i = 0; i < this.mfa_backup_codes.length; i++) {
                const isMatch = await bcrypt.compare(codeUpper, this.mfa_backup_codes[i]);

                if (isMatch) {

                    // Remove the used backup code
                    this.mfa_backup_codes.splice(i, 1);
                    this.last_mfa_verified_at = new Date();
                    await this.save();

                    return true;
                }
            }

            return false;
        }

        /**
         * Enable MFA with secret and backup codes
         */
        async enableMfa(secret, backupCodes) {

            // Hash backup codes before storing
            const hashedBackupCodes = await Promise.all(
                backupCodes.map(code => bcrypt.hash(code, 10))
            );

            this.mfa_secret = secret;
            this.requires_mfa = true;
            this.mfa_backup_codes = hashedBackupCodes;
            this.mfa_enabled_at = new Date();
            await this.save();

        }

        /**
         * Disable MFA
         */
        async disableMfa() {
            console.log(`🔓 Disabling MFA for user ${this.user_id}`);

            this.mfa_secret = null;
            this.requires_mfa = false;
            this.mfa_backup_codes = null;
            this.mfa_enabled_at = null;
            this.last_mfa_verified_at = null;
            await this.save();

        }

        /**
         * Regenerate backup codes
         */
        async regenerateBackupCodes() {
            const crypto = require('crypto');
            const newCodes = [];
            const hashedCodes = [];

            // Generate 10 new backup codes
            for (let i = 0; i < 10; i++) {
                const code = crypto.randomBytes(4).toString('hex').toUpperCase();
                newCodes.push(code);
                hashedCodes.push(await bcrypt.hash(code, 10));
            }

            this.mfa_backup_codes = hashedCodes;
            await this.save();

            return newCodes; // Return plain codes only once
        }

        /**
         * Get backup codes count
         */
        getBackupCodesCount() {
            return this.mfa_backup_codes ? this.mfa_backup_codes.length : 0;
        }

        /* =======================
           🆕 NEW: MFA Debug Helper
        ======================== */

        /**
         * Get current valid TOTP token for debugging
         * ⚠️ Use only for development/testing!
         */
        getCurrentValidToken() {
            if (!this.mfa_secret) {
                return null;
            }

            return speakeasy.totp({
                secret: this.mfa_secret,
                encoding: 'base32',
            });
        }

        /* =======================
           Other Instance Methods
        ======================== */

        async updateLastLogin(ipAddress) {
            this.last_login_at = new Date();
            this.last_login_ip = ipAddress;
            await this.save();
        }

        toSafeObject() {
            const values = this.get({
                plain: true
            });
            delete values.password_hash;
            delete values.mfa_secret;
            delete values.mfa_backup_codes;
            return values;
        }

        /* =======================
           Associations
        ======================== */

        static associate(models) {
            User.belongsTo(models.Role, {
                foreignKey: 'role_id',
                as: 'role',
            });

            User.hasMany(models.TrustedDevice, {
                foreignKey: 'user_id',
                as: 'trusted_devices',
            });

            User.hasMany(models.Enrollment, {
                foreignKey: 'user_id',
                as: 'enrollments',
            });

            if (models.LabEnrollment) {
                User.hasMany(models.LabEnrollment, {
                    foreignKey: 'user_id',
                    sourceKey: 'user_id',
                    as: 'lab_enrollments',
                });
            }
        }
    }

    User.init({
        user_id: {
            type: DataTypes.STRING(100),
            primaryKey: true,
            allowNull: false,
            comment: 'Unique user identifier',
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
            validate: {
                isEmail: true
            },
            comment: 'User email address',
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true,
            comment: 'User phone number',
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Hashed password',
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'User full name',
        },
        role_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'roles',
                key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
            comment: 'FK to roles table',
        },

        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Email/phone verification status',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Account active status',
        },
        requires_mfa: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'MFA requirement status',
        },
        mfa_secret: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'TOTP secret for MFA (base32 encoded)',
        },
        mfa_backup_codes: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Hashed MFA backup codes',
        },
        mfa_enabled_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when MFA was enabled',
        },
        last_mfa_verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last successful MFA verification',
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last successful login timestamp',
        },
        last_login_ip: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'Last login IP address',
        },
        failed_login_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Consecutive failed login attempts',
        },
        locked_until: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Account lock expiration time',
        },
        password_changed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last password change timestamp',
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp',
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
        country: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'User country',
        },

        timezone: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'IANA timezone e.g. America/New_York',
        },

        currency_code: {
            type: DataTypes.STRING(8),
            allowNull: true,
            comment: 'Preferred display currency ISO code',
        },

        state: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'User state',
        },

        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'User city',
        },

        fcm_token: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Firebase FCM push notification token',
        },
        pincode: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'User postal/pincode',
        },

        profile_image: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Profile image URL or file path',
            get() {
                const rawValue = this.getDataValue('profile_image');

                if (!rawValue) return null;

                // If already full URL, return as it is
                if (rawValue.startsWith('http')) {
                    return rawValue;
                }

                return `${process.env.BASE_URL}${rawValue}`;
            }
        },

        password_history: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array of hashed previous passwords for reuse prevention',
        },

        password_expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Password expiration timestamp for compliance',
        },

        max_concurrent_sessions: {
            type: DataTypes.INTEGER,
            defaultValue: 5,
            comment: 'Maximum concurrent sessions allowed for this user',
        },

        require_password_change: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Force user to change password on next login',
        },

        login_attempts_reset_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp when login attempts will be reset',
        },

        security_questions: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Account recovery security questions and hashed answers',
        },

        account_recovery_email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Alternative email for account recovery',
        },

    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        underscored: true,
        paranoid: true,
        indexes: [
        {
            fields: ['role_id']
        },
        ],
        hooks: {
            beforeCreate: async (user) => {
                if (user?.password_hash) {
                    user.password_hash = await hashPassword(user?.password_hash);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password_hash')) {
                    user.password_hash = await hashPassword(user.password_hash);
                    user.password_changed_at = new Date();
                }
            },
        },
    });

    return User;
};