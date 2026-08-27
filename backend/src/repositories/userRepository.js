const {
    User,
    Role,
    Permission
} = require('../models');
const logger = require('../lib/logger');
const {
    AppError
} = require('../middleware/errorHandler');
const crypto = require('crypto');
const {
    Op
} = require('sequelize');
const {
    verifyPassword
} = require('../utils/crypto');
const { processProfileImage } = require('../utils/imageHelper');

/**
 * User Repository
 * Handles all user database operations with proper error handling
 */
class UserRepository {
    _hasUserColumn(columnName) {
        return !!User?.rawAttributes?.[columnName];
    }

    _pickExistingUserColumns(payload = {}) {
        const out = {};
        for (const [k, v] of Object.entries(payload || {})) {
            if (this._hasUserColumn(k)) out[k] = v;
        }
        return out;
    }
    /**
     * Find user by user_id with role and permissions
     */
    async findByUserId(user_id) {
        try {
            const user = await User.findOne({
                where: {
                    user_id: user_id
                },
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: {
                            attributes: []
                        } // Exclude junction table attributes
                    }]
                }]
            });

            return user;
        } catch (error) {
            logger.error('Find user by userId error:', error);
            throw error;
        }
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            const user = await User.findOne({
                where: {
                    email: email.toLowerCase()
                },
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: {
                            attributes: []
                        }
                    }]
                }]
            });

            return user;
        } catch (error) {
            logger.error('Find user by email error:', error);
            throw error;
        }
    }

    /**
    * Find user by email
    */
    async findByEmailOnly(email) {
        try {
            const user = await User.findOne({
                attributes: ['user_id', 'email'],
                where: {
                    email: email.toLowerCase()
                },
            });

            return user;
        } catch (error) {
            logger.error('Find user by email error:', error);
            throw error;
        }
    }

    /**
     * Find user by phone
     */
    async findByPhoneOnly(phone) {
        try {
            const user = await User.findOne({
                attributes: ['user_id', 'email'],
                where: {
                    phone
                },
            });

            return user;
        } catch (error) {
            logger.error('Find user by phone error:', error);
            throw error;
        }
    }

    /**
     * Find user by phone
     */
    async findByPhone(phone) {
        try {
            const user = await User.findOne({
                where: {
                    phone
                },
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: {
                            attributes: []
                        }
                    }]
                }]
            });

            return user;
        } catch (error) {
            logger.error('Find user by phone error:', error);
            throw error;
        }
    }

    /**
     * Find by OAuth provider/id if those columns exist in current schema.
     * Returns null on schemas without oauth_* columns.
     */
    async findByOAuthProfile(provider, oauthId) {
        try {
            if (!this._hasUserColumn('oauth_provider') || !this._hasUserColumn('oauth_id')) {
                return null;
            }
            return await User.findOne({
                where: {
                    oauth_provider: provider,
                    oauth_id: oauthId,
                },
                include: [{
                    model: Role,
                    as: 'role',
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        through: { attributes: [] }
                    }]
                }]
            });
        } catch (error) {
            logger.error('Find by OAuth profile error:', error);
            throw error;
        }
    }


    /**
     * Create new user
     */
    async create(user_data) {
        try {
            console.log('Creating user with data:', user_data);
            // Generate user_id if not provided
            if (!user_data.user_id) {
                user_data.user_id = crypto.randomUUID();
            }

            // Ensure email is lowercase
            if (user_data.email) {
                user_data.email = user_data.email.toLowerCase();
            }

            // Prepare user data
            const user_to_create = this._pickExistingUserColumns({
                user_id: user_data.user_id,
                email: user_data.email,
                phone: user_data.phone,
                password_hash: user_data.password, // Will be hashed by model hook
                full_name: user_data.full_name,
                role_id: user_data.role_id != null ? user_data.role_id : null,
                is_verified: user_data.is_verified || false,
                is_active: user_data.is_active !== undefined ? user_data.is_active : true,
                requires_mfa: user_data.requires_mfa || false,
                mfa_secret: user_data.mfa_secret || null,
                oauth_provider: user_data.oauth_provider,
                oauth_id: user_data.oauth_id,
                oauth_email: user_data.oauth_email,
                oauth_avatar: user_data.oauth_avatar,
                oauth_linked_at: user_data.oauth_linked_at,
                last_login_at: user_data.last_login_at,
            });

            // Create user (password will be hashed by model hook)
            const user = await User.create(user_to_create);

            logger.info(`User created: ${user.user_id}`);
            return user;
        } catch (error) {
            logger.error('Create user error:', error);

            // Handle unique constraint violations
            if (error.name === 'SequelizeUniqueConstraintError') {
                if (error.fields.email) {
                    throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
                }
                if (error.fields.phone) {
                    throw new AppError('Phone already exists', 400, 'PHONE_EXISTS');
                }
            }

            throw error;
        }
    }

    /**
     * Update user
     */
    async update(user_id, update_data) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Prepare update data
            const data_to_update = {};

            if (update_data.email) data_to_update.email = update_data.email.toLowerCase();
            if (update_data.phone) data_to_update.phone = update_data.phone;
            if (update_data.full_name) {
                data_to_update.full_name = update_data.full_name;
            }
            if (update_data.role_id) {
                data_to_update.role_id = update_data.role_id;
            }
            if (update_data.is_verified !== undefined) data_to_update.is_verified = update_data.is_verified;
            if (update_data.is_active !== undefined) data_to_update.is_active = update_data.is_active;
            if (update_data.requires_mfa !== undefined) data_to_update.requires_mfa = update_data.requires_mfa;
            if (update_data.mfa_secret) {
                data_to_update.mfa_secret = update_data.mfa_secret;
            }
            if (update_data.city !== undefined) data_to_update.city = update_data.city;
            if (update_data.state !== undefined) data_to_update.state = update_data.state;
            if (update_data.country !== undefined) data_to_update.country = update_data.country;

            if (update_data.profile_image) {
                if (Buffer.isBuffer(update_data.profile_image)) {
                    const image_url = await processProfileImage(
                        update_data.profile_image,       // buffer from multer memoryStorage
                        user.profile_image     // old image to delete
                    );
                    data_to_update.profile_image = image_url;
                } else if (typeof update_data.profile_image === 'string') {
                    data_to_update.profile_image = update_data.profile_image;
                }
            }
            // Update fields
            await user.update(data_to_update);

            logger.info(`User updated: ${user_id}`);
            return user;
        } catch (error) {
            logger.error('Update user error:', error);

            // Handle unique constraint violations
            if (error.name === 'SequelizeUniqueConstraintError') {
                if (error.fields.email) {
                    throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
                }
                if (error.fields.phone) {
                    throw new AppError('Phone already exists', 400, 'PHONE_EXISTS');
                }
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * Update user password
     */
    async updatePassword(user_id, newPassword) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Update password (will be hashed by model hook)
            await user.update({
                password_hash: newPassword
            });

            logger.info(`Password updated for user: ${user_id}`);
            return user;
        } catch (error) {
            logger.error('Update password error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * Verify password
     */
    async verifyPassword(user, password) {
        try {
            return await verifyPassword(password, user.password_hash);
        } catch (error) {
            logger.error('Verify password error:', error);
            return false;
        }
    }

    /**
     * Update user role
     */
    async updateRole(user_id, role_id) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Verify role exists
            const role = await Role.findByPk(role_id);
            if (!role) {
                throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
            }

            await user.update({
                role_id: role_id
            });

            logger.info(`Role updated for user ${user_id} to ${role_id}`);
            return user;
        } catch (error) {
            logger.error('Update user role error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * Update last login
     */
    async updateLastLogin(user_id, ip_address) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                return;
            }

            await user.updateLastLogin(ip_address);
        } catch (error) {
            logger.error('Update last login error:', error);
        }
    }

    /**
     * Enable/Disable MFA
     */
    async updateMfaStatus(user_id, mfa_secret, requires_mfa) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            await user.update({
                mfa_secret: mfa_secret,
                requires_mfa: requires_mfa
            });

            logger.info(`MFA updated for user: ${user_id}`);
            return user;
        } catch (error) {
            logger.error('Update MFA status error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * Soft delete user
     */
    async delete(user_id) {
        try {
            const user = await this.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            await user.destroy(); // Soft delete with paranoid mode

            logger.info(`User deleted: ${user_id}`);
            return true;
        } catch (error) {
            logger.error('Delete user error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw error;
        }
    }

    // ============================================
    // USER REPOSITORY - findAll method
    // ============================================
    /**
     * Get all users with pagination and filters
     */
    async findAll(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                role_id = null,
                status = null // Changed from isActive to match your service
            } = options;

            const where = {};

            // Search filter
            if (search) {
                where[Op.or] = [
                    { full_name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { user_id: { [Op.like]: `%${search}%` } }
                ];
            }

            // Role filter
            if (role_id) {
                where.role_id = role_id;
            }

            // Status filter (assuming status means is_active)
            if (status === 'active') {
                where.is_active = true;
            } else if (status === 'inactive') {
                where.is_active = false;
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await User.findAndCountAll({
                where,
                include: [{
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'description', 'is_active', 'priority'], // Specify what you need
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        attributes: ['id', 'label', 'description', 'action'], // Specify what you need
                        through: {
                            attributes: [] // Don't include junction table data
                        },
                        required: false // LEFT JOIN
                    }],
                    required: false // LEFT JOIN for role too
                }],
                attributes: {
                    exclude: ['password_hash'] // Exclude sensitive fields at query level
                },
                limit,
                offset,
                order: [['created_at', 'DESC']],
                distinct: true // Important for correct count with joins
            });

            return {
                rows,
                count,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            logger.error('Find all users error:', error);
            throw error;
        }
    }

    /**
     * Check if user exists
     */
    async exists(user_id) {
        try {
            const count = await User.count({
                where: {
                    user_id: user_id
                }
            });
            return count > 0;
        } catch (error) {
            logger.error('User exists check error:', error);
            return false;
        }
    }

    /**
     * Check if email exists
     */
    async emailExists(email) {
        try {
            const count = await User.count({
                where: {
                    email: email.toLowerCase()
                }
            });
            return count > 0;
        } catch (error) {
            logger.error('Email exists check error:', error);
            return false;
        }
    }

    /**
     * Check if phone exists
     */
    async phoneExists(phone) {
        try {
            const count = await User.count({
                where: {
                    phone
                }
            });
            return count > 0;
        } catch (error) {
            logger.error('Phone exists check error:', error);
            return false;
        }
    }

    /**
     * Increment failed login attempts
     */
    async incrementFailedAttempts(user_id) {
        try {
            const user = await this.findByUserId(user_id);
            if (user) {
                return await user.incrementFailedAttempts();
            }
            return 0;
        } catch (error) {
            logger.error('Increment failed attempts error:', error);
            return 0;
        }
    }

    /**
     * Reset failed login attempts
     */
    async resetFailedAttempts(user_id) {
        try {
            const user = await this.findByUserId(user_id);
            if (user) {
                await user.resetFailedAttempts();
            }
        } catch (error) {
            logger.error('Reset failed attempts error:', error);
        }
    }

    /**
     * Check if account is locked
     */
    async isAccountLocked(user_id) {
        try {
            const user = await this.findByUserId(user_id);
            if (user) {
                return user.isLocked();
            }
            return false;
        } catch (error) {
            logger.error('Check account locked error:', error);
            return false;
        }
    }

    async linkOAuthProvider(user_id, provider, oauth_id, oauth_email, oauth_avatar) {
        try {
            const user = await this.findByUserId(user_id);
            if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            const updates = this._pickExistingUserColumns({
                oauth_provider: provider,
                oauth_id,
                oauth_email,
                oauth_avatar,
                oauth_linked_at: new Date(),
            });
            if (Object.keys(updates).length === 0) return user;
            await user.update(updates);
            return user;
        } catch (error) {
            logger.error('Link OAuth provider error:', error);
            throw error;
        }
    }

    async unlinkOAuthProvider(user_id) {
        try {
            const user = await this.findByUserId(user_id);
            if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            const updates = this._pickExistingUserColumns({
                oauth_provider: null,
                oauth_id: null,
                oauth_email: null,
                oauth_avatar: null,
                oauth_linked_at: null,
            });
            if (Object.keys(updates).length === 0) return user;
            await user.update(updates);
            return user;
        } catch (error) {
            logger.error('Unlink OAuth provider error:', error);
            throw error;
        }
    }
}

module.exports = UserRepository;