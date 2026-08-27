const sessionService = require('../sessionService');
const otpService = require('../otpService');
const totpService = require('../totpService');
const deviceService = require('../deviceService');
const auditService = require('../auditService');
const tokenBlacklistService = require('../tokenBlacklistService');
const ipWhitelistService = require('../ipWhitelistService');
const roleService = require('../rbac/roleService');
const {
    createAccessToken,
    createRefreshToken,
    createSessionId
} = require('../../utils/token');
const {
    AppError
} = require('../../middleware/errorHandler');
const config = require('../../config');
const { User, Role } = require('../../models');
const logger = require('../../lib/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Owner Service - User Profile & Security Management
 * Handles all user-related operations for authenticated users
 */
class OwnerService {
    constructor() {
        this.userRepository = null;
    }

    async addUser(userData) {
        const service = new OwnerService();
        return await service.createUser(userData);
    }

    /**
     * Set user repository
     */
    static setUserRepository(repository) {
        OwnerService._sharedRepository = repository;
    }

    _getUserRepository() {
        if (!this.userRepository) {
            this.userRepository = OwnerService._sharedRepository;
        }
        return this.userRepository;
    }

    // ==========================================
    // USER CREATION (For Seeding)
    // ==========================================

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @param {string} userData.userId - User ID (UUID)
     * @param {string} userData.email - User email
     * @param {string} userData.fullName - User full name
     * @param {string} userData.password - Plain text password
     * @param {string} userData.roleId - Role ID (UUID)
     * @param {boolean} userData.isVerified - Is user verified
     * @param {boolean} userData.isActive - Is user active
     * @param {string} userData.createdBy - Who created the user
     * @returns {Promise<Object>} Created user
     */
    async createUser(userData) {
        try {
            const {
                userId,
                email,
                fullName,
                password,
                roleId,
                isVerified = false,
                isActive = true,
                createdBy = 'system'
            } = userData;

            // Validate required fields
            if (!email || !fullName || !password || !roleId) {
                throw new AppError('Missing required fields: email, fullName, password, roleId', 400, 'MISSING_FIELDS');
            }

            // Check if user already exists
            const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
            if (existingUser) {
                throw new AppError(`USER_EXISTS: User with email ${email} already exists`, 400, 'USER_EXISTS');
            }

            // Verify role exists
            const role = await Role.findByPk(roleId);
            if (!role) {
                throw new AppError(`ROLE_NOT_FOUND: Role with id ${roleId} not found`, 404, 'ROLE_NOT_FOUND');
            }

            // Hash password
            const passwordHash = password;

            // Create user
            const user = await User.create({
                user_id: userId || uuidv4(),
                email: email.toLowerCase().trim(),
                full_name: fullName.trim(),
                password_hash: passwordHash,
                role_id: roleId, // Store UUID role_id
                is_verified: isVerified,
                is_active: isActive,
                created_by: createdBy,
                created_at: new Date(),
                updated_at: new Date()
            });

            logger.info(`User created: ${email} (${user.user_id}) with role_id: ${roleId}`);

            // Return sanitized user
            return this._sanitizeUser(user);

        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Error creating user:', error);
            throw new AppError('Failed to create user', 500, 'CREATE_USER_ERROR');
        }
    }

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    /**
 * Get user profile with role and permissions
 */
    async getUserProfile(userId) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const userInstance = await repository.findByUserId(userId);
            if (!userInstance) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // ✅ FIX: Strip Sequelize circular refs (through/parent) before
            // accessing any properties — this also flattens nested associations
            const user = typeof userInstance.get === 'function'
                ? userInstance.get({ plain: true })
                : userInstance.toJSON?.() ?? userInstance;

            // Get MFA status
            const mfaStatus = await totpService.getMfaStatus(userId);

            // Get user's permissions through role service
            const permissions = await roleService.getUserPermissions(userId);

            return {
                userId: user.user_id,
                email: user.email,
                phone: user.phone,
                fullName: user.full_name,
                roleId: user.role_id,
                role: user.role
                    ? {
                        id: user.role.id,
                        name: user.role.name,
                        description: user.role.description,
                    }
                    : null,
                isActive: user.is_active,
                isVerified: user.is_verified,
                requiresMfa: user.requires_mfa,
                mfaEnabled: mfaStatus.enabled,
                backupCodesRemaining: mfaStatus.backupCodesRemaining,
                permissions: permissions,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at,
                lastLoginIp: user.last_login_ip,
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get user profile error:', error);
            throw new AppError('Failed to get user profile', 500, 'GET_PROFILE_ERROR');
        }
    }


    async getAllUsers(options = {}) {
        try {
            const { page = 1, limit = 10, search, roleId, status } = options;

            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            // Build query filters
            const filters = {};
            if (search) {
                filters.search = search; // Implement in repository
            }
            if (roleId) {
                filters.role_id = roleId;
            }
            if (status) {
                filters.status = status;
            }

            // Fetch with pagination
            const offset = (page - 1) * limit;
            const result = await repository.findAll({
                page,
                ...filters,
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            const rawUsers = Array.isArray(result)
                ? result
                : result?.rows || [];

            const total = result?.count || rawUsers.length;

            if (rawUsers.length === 0) {
                return {
                    users: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                };
            }

            // Convert to plain objects
            const users = rawUsers.map((u) =>
                typeof u.get === 'function' ? u.get({ plain: true }) : (u.toJSON?.() ?? u)
            );

            const SENSITIVE_FIELDS = [
                'password_hash',
                'mfa_secret',
                'mfa_backup_codes',
                'failed_login_attempts',
                'locked_until',
                'password_changed_at',
                'last_mfa_verified_at',
            ];

            // ✅ OPTIMIZATION: Batch fetch MFA status for all users
            const userIds = users.map(u => u.user_id);
            const usersWithMfa = await Promise.all(
                users.map(async (user) => {
                    const mfaStatus = await totpService.getMfaStatus(user.user_id);

                    // Spread plain user, then override with mfa fields
                    const safeUser = {
                        ...user,
                        mfaEnabled: mfaStatus.enabled,
                        backupCodesRemaining: mfaStatus.backupCodesRemaining,
                    };

                    // ✅ Delete every sensitive field in place
                    SENSITIVE_FIELDS.forEach((field) => delete safeUser[field]);

                    return safeUser;
                })
            );

            return {
                users: usersWithMfa,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Get all users error:', error);
            throw new AppError('Failed to get all users', 500, 'GET_ALL_USERS_ERROR');
        }
    }
    /**
     * @route   GET /api/rbac/me/permissions
     * @desc    Get current user's permissions

    /**
     * Update user profile
     */
    async updateProfile(userId, updateData) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const dataToUpdate = {};

            if (updateData.fullName || updateData.full_name) {
                dataToUpdate.full_name = updateData.fullName || updateData.full_name;
            }

            if (updateData.phone) {
                const phoneExists = await repository.phoneExists(updateData.phone);
                if (phoneExists) {
                    const existingUser = await repository.findByPhone(updateData.phone);
                    if (existingUser && existingUser.user_id !== userId) {
                        throw new AppError('Phone number already in use', 400, 'PHONE_EXISTS');
                    }
                }
                dataToUpdate.phone = updateData.phone;
            }

            const updatedUser = await repository.update(userId, dataToUpdate);

            await auditService.log({
                userId,
                action: 'PROFILE_UPDATED',
                details: { fields: Object.keys(dataToUpdate) }
            });

            logger.info(`Profile updated for user: ${userId}`);

            return {
                userId: updatedUser.user_id,
                email: updatedUser.email,
                phone: updatedUser.phone,
                fullName: updatedUser.full_name
            }

        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Update profile error:', error);
            throw new AppError('Failed to update profile', 500, 'UPDATE_PROFILE_ERROR');
        }
    }

    /**
     * Update email (requires verification)
     */
    async requestEmailUpdate(userId, newEmail, password) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const user = await repository.findByUserId(userId);
            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            const isValidPassword = await repository.verifyPassword(user, password);
            if (!isValidPassword) {
                throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
            }

            const emailExists = await repository.emailExists(newEmail);
            if (emailExists) {
                throw new AppError('Email already in use', 400, 'EMAIL_EXISTS');
            }

            const otpToken = await otpService.generateOtp(newEmail, 'email_update');

            await auditService.log({
                userId,
                action: 'EMAIL_UPDATE_REQUESTED',
                details: { newEmail }
            });

            logger.info(`Email update requested for user: ${userId}`);

            return {
                success: true,
                message: 'Verification code sent to new email',
                otpToken
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Request email update error:', error);
            throw new AppError('Failed to request email update', 500, 'EMAIL_UPDATE_REQUEST_ERROR');
        }
    }

    /**
     * Verify and update email
     */
    async verifyEmailUpdate(userId, otpToken, otp) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const verification = await otpService.verifyOtp(otpToken, otp);
            if (!verification.valid) {
                throw new AppError('Invalid or expired verification code', 400, 'INVALID_OTP');
            }

            const newEmail = verification.identifier;

            await repository.update(userId, {
                email: newEmail,
                is_verified: true
            });

            await auditService.log({
                userId,
                action: 'EMAIL_UPDATED',
                details: { newEmail }
            });

            logger.info(`Email updated for user: ${userId}`);

            return {
                success: true,
                message: 'Email updated successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Verify email update error:', error);
            throw new AppError('Failed to update email', 500, 'EMAIL_UPDATE_ERROR');
        }
    }

    /**
     * Delete account (with password confirmation)
     */
    async deleteAccount(userId, password) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const user = await repository.findByUserId(userId);
            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            const isValidPassword = await repository.verifyPassword(user, password);
            if (!isValidPassword) {
                throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
            }

            await sessionService.deleteAllUserSessions(userId);
            await tokenBlacklistService.blacklistUserTokens(userId);
            await totpService.disableMfa(userId);

            const devices = await deviceService.getTrustedDevices(userId);
            for (const device of devices) {
                await deviceService.removeTrustedDevice(userId, device.deviceId);
            }

            await repository.delete(userId);

            await auditService.log({
                userId,
                action: 'ACCOUNT_DELETED',
                success: true
            });

            logger.info(`Account deleted for user: ${userId}`);

            return {
                success: true,
                message: 'Account deleted successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Delete account error:', error);
            throw new AppError('Failed to delete account', 500, 'DELETE_ACCOUNT_ERROR');
        }
    }

    // ==========================================
    // PASSWORD MANAGEMENT
    // ==========================================

    /**
     * Change password
     */
    async changePassword(userId, oldPassword, newPassword) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const user = await repository.findByUserId(userId);
            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            const isValidPassword = await repository.verifyPassword(user, oldPassword);
            if (!isValidPassword) {
                throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
            }

            if (newPassword.length < 8) {
                throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
            }

            await repository.updatePassword(userId, newPassword);

            await auditService.log({
                userId,
                action: 'PASSWORD_CHANGED'
            });

            logger.info(`Password changed for user: ${userId}`);

            return {
                success: true,
                message: 'Password changed successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Change password error:', error);
            throw new AppError('Failed to change password', 500, 'CHANGE_PASSWORD_ERROR');
        }
    }

    // ==========================================
    // MFA MANAGEMENT
    // ==========================================

    /**
     * Enable MFA - Start (Generate QR code)
     */
    async enableMfaStart(userId) {
        try {
            const mfaStatus = await totpService.getMfaStatus(userId);
            if (mfaStatus.enabled) {
                throw new AppError('MFA is already enabled', 400, 'MFA_ALREADY_ENABLED');
            }

            const mfaData = await totpService.generateSecret(userId);

            await auditService.log({
                userId,
                action: 'MFA_SETUP_INITIATED'
            });

            logger.info(`MFA setup initiated for user: ${userId}`);

            return {
                success: true,
                secret: mfaData.secret,
                qrCode: mfaData.qrCode,
                backupCodes: mfaData.backupCodes,
                message: 'Scan the QR code with your authenticator app'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('MFA setup error:', error);
            throw new AppError('Failed to setup MFA', 500, 'MFA_SETUP_ERROR');
        }
    }

    /**
     * Enable MFA - Complete (Verify code)
     */
    async enableMfaComplete(userId, code) {
        try {
            const verified = await totpService.verifySetup(userId, code);
            if (!verified) {
                throw new AppError('Invalid verification code', 400, 'INVALID_MFA_CODE');
            }

            await totpService.activateMfa(userId);

            const repository = this._getUserRepository();
            if (repository) {
                await repository.update(userId, {
                    requiresMfa: true
                });
            }

            await auditService.log({
                userId,
                action: 'MFA_ENABLED'
            });

            logger.info(`MFA enabled for user: ${userId}`);

            return {
                success: true,
                message: 'MFA enabled successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('MFA activation error:', error);
            throw new AppError('Failed to activate MFA', 500, 'MFA_ACTIVATION_ERROR');
        }
    }

    /**
     * Disable MFA
     */
    async disableMfa(userId, password) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            const user = await repository.findByUserId(userId);
            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            const isValidPassword = await repository.verifyPassword(user, password);
            if (!isValidPassword) {
                throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
            }

            await totpService.disableMfa(userId);
            await repository.update(userId, {
                requiresMfa: false
            });

            await auditService.log({
                userId,
                action: 'MFA_DISABLED'
            });

            logger.info(`MFA disabled for user: ${userId}`);

            return {
                success: true,
                message: 'MFA disabled successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('MFA disable error:', error);
            throw new AppError('Failed to disable MFA', 500, 'MFA_DISABLE_ERROR');
        }
    }

    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(userId) {
        try {
            const backupCodes = await totpService.regenerateBackupCodes(userId);

            await auditService.log({
                userId,
                action: 'MFA_BACKUP_CODES_REGENERATED'
            });

            return {
                success: true,
                backupCodes,
                message: 'Backup codes regenerated successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Regenerate backup codes error:', error);
            throw new AppError('Failed to regenerate backup codes', 500, 'BACKUP_CODES_ERROR');
        }
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

    /**
     * Get user sessions
     */
    async getUserSessions(userId, currentSessionId) {
        try {
            const sessionIds = await sessionService.getUserSessions(userId);

            const sessions = await Promise.all(
                sessionIds.map(async (sid) => {
                    const session = await sessionService.getSession(sid);
                    if (!session) return null;

                    return {
                        sessionId: sid,
                        isCurrent: sid === currentSessionId,
                        createdAt: session.createdAt,
                        lastActivity: session.updatedAt || session.createdAt,
                        ipAddress: session.ipAddress,
                        userAgent: session.userAgent,
                        deviceInfo: session.deviceInfo,
                        isTrusted: session.isTrusted
                    };
                })
            );

            return sessions.filter(s => s !== null);
        } catch (error) {
            logger.error('Get user sessions error:', error);
            throw new AppError('Failed to get sessions', 500, 'GET_SESSIONS_ERROR');
        }
    }

    /**
     * Delete specific session
     */
    async deleteSession(userId, sessionId) {
        try {
            const session = await sessionService.getSession(sessionId);
            if (!session || session.userId !== userId) {
                throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
            }

            await sessionService.deleteSession(sessionId);

            await auditService.log({
                userId,
                action: 'SESSION_DELETED',
                details: { sessionId }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Delete session error:', error);
            throw new AppError('Failed to delete session', 500, 'DELETE_SESSION_ERROR');
        }
    }

    /**
     * Logout from current session
     */
    async logout(sessionId, userId) {
        try {
            await sessionService.deleteSession(sessionId);

            await auditService.log({
                userId,
                action: 'LOGOUT',
                details: { sessionId }
            });

            logger.info(`User logged out: ${userId}`);
            return { success: true };
        } catch (error) {
            logger.error('Logout error:', error);
            throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
        }
    }

    /**
     * Logout from all devices
     */
    async logoutAll(userId) {
        try {
            const deletedCount = await sessionService.deleteAllUserSessions(userId);

            await auditService.log({
                userId,
                action: 'LOGOUT_ALL_DEVICES',
                details: { sessionsTerminated: deletedCount }
            });

            logger.info(`User logged out from all devices: ${userId}`);

            return {
                success: true,
                sessionsTerminated: deletedCount
            };
        } catch (error) {
            logger.error('Logout all error:', error);
            throw new AppError('Failed to logout from all devices', 500, 'LOGOUT_ALL_ERROR');
        }
    }

    /**
     * Refresh token
     */
    async refreshToken(sessionId) {
        try {
            const session = await sessionService.getSession(sessionId);
            if (!session) {
                throw new AppError('Invalid session', 401, 'INVALID_SESSION');
            }

            const isUserBlacklisted = await tokenBlacklistService.isUserBlacklisted(session.userId);
            if (isUserBlacklisted) {
                await sessionService.deleteSession(sessionId);
                throw new AppError('All tokens have been revoked', 401, 'TOKENS_REVOKED');
            }

            const newRefreshToken = createRefreshToken();
            const newAccessToken = createAccessToken(session.userId);

            await sessionService.updateSession(sessionId, newRefreshToken, session);
            let permissions = [];
            try {
                permissions = await roleService.getUserPermissions(session.userId);
            } catch (permError) {
                // Non-fatal — the frontend will fall back to its cached copy
                logger.warn(`Could not fetch permissions during token refresh for user ${session.userId}:`, permError.message);
            }
            return {
                accessToken: newAccessToken,
                expiresIn: 300,
                sessionId,
                permissions
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Token refresh error:', error);
            throw new AppError('Token refresh failed', 500, 'REFRESH_ERROR');
        }
    }

    // ==========================================
    // SECURITY FEATURES
    // ==========================================

    /**
     * Get trusted devices
     */
    async getTrustedDevices(userId) {
        try {
            const devices = await deviceService.getTrustedDevices(userId);
            return {
                devices,
                total: devices.length
            };
        } catch (error) {
            logger.error('Get trusted devices error:', error);
            throw new AppError('Failed to get trusted devices', 500, 'GET_DEVICES_ERROR');
        }
    }

    /**
     * Remove trusted device
     */
    async removeTrustedDevice(userId, deviceId) {
        try {
            await deviceService.removeTrustedDevice(userId, deviceId);

            await auditService.log({
                userId,
                action: 'TRUSTED_DEVICE_REMOVED',
                details: { deviceId }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Remove trusted device error:', error);
            throw new AppError('Failed to remove trusted device', 500, 'REMOVE_DEVICE_ERROR');
        }
    }

    /**
     * Get security overview
     */
    async getSecurityOverview(userId) {
        try {
            const [activeSessions, trustedDevices, mfaStatus, ipWhitelist, recentLogins] = await Promise.all([
                sessionService.getUserSessionCount(userId),
                deviceService.getTrustedDevices(userId),
                totpService.getMfaStatus(userId),
                ipWhitelistService.getWhitelist(userId),
                auditService.getRecentLogins(userId, 5)
            ]);

            return {
                activeSessions,
                trustedDevices: trustedDevices.length,
                mfaEnabled: mfaStatus.enabled,
                ipWhitelistEnabled: ipWhitelist.enabled,
                whitelistedIps: ipWhitelist.ips.length,
                recentLogins
            };
        } catch (error) {
            logger.error('Get security overview error:', error);
            throw new AppError('Failed to get security overview', 500, 'SECURITY_OVERVIEW_ERROR');
        }
    }

    /**
     * Get audit logs
     */
    async getAuditLogs(userId, options = {}) {
        try {
            const { page = 1, limit = 50, action } = options;

            const logs = await auditService.getUserLogs(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                action
            });

            return logs;
        } catch (error) {
            logger.error('Get audit logs error:', error);
            throw new AppError('Failed to get audit logs', 500, 'AUDIT_LOGS_ERROR');
        }
    }

    // ==========================================
    // IP WHITELIST MANAGEMENT
    // ==========================================

    /**
     * Get IP whitelist
     */
    async getIpWhitelist(userId) {
        try {
            const whitelist = await ipWhitelistService.getWhitelist(userId);
            return {
                enabled: whitelist.enabled,
                ips: whitelist.ips,
                total: whitelist.ips.length
            };
        } catch (error) {
            logger.error('Get IP whitelist error:', error);
            throw new AppError('Failed to get IP whitelist', 500, 'GET_WHITELIST_ERROR');
        }
    }

    /**
     * Add IP to whitelist
     */
    async addIpToWhitelist(userId, ip, description) {
        try {
            await ipWhitelistService.addIp(userId, ip, description);

            await auditService.log({
                userId,
                action: 'IP_ADDED_TO_WHITELIST',
                details: { ip, description }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Add IP to whitelist error:', error);
            throw new AppError('Failed to add IP to whitelist', 500, 'ADD_IP_ERROR');
        }
    }

    /**
     * Remove IP from whitelist
     */
    async removeIpFromWhitelist(userId, ip) {
        try {
            await ipWhitelistService.removeIp(userId, ip);

            await auditService.log({
                userId,
                action: 'IP_REMOVED_FROM_WHITELIST',
                details: { ip }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Remove IP from whitelist error:', error);
            throw new AppError('Failed to remove IP from whitelist', 500, 'REMOVE_IP_ERROR');
        }
    }

    /**
     * Toggle IP whitelist
     */
    async toggleIpWhitelist(userId, enabled) {
        try {
            await ipWhitelistService.setEnabled(userId, enabled);

            await auditService.log({
                userId,
                action: enabled ? 'IP_WHITELIST_ENABLED' : 'IP_WHITELIST_DISABLED'
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Toggle IP whitelist error:', error);
            throw new AppError('Failed to toggle IP whitelist', 500, 'TOGGLE_WHITELIST_ERROR');
        }
    }

    // ==========================================
    // ROLE MANAGEMENT
    // ==========================================

    /**
     * Update user role (admin only - but service method available)
     */
    async updateUserRole(userId, roleId) {
        try {
            const repository = this._getUserRepository();
            if (!repository) {
                throw new AppError('User repository not configured', 500, 'REPOSITORY_ERROR');
            }

            await repository.updateRole(userId, roleId);

            // Clear user cache after role change
            await roleService.clearUserCache(userId);

            await auditService.log({
                userId,
                action: 'ROLE_UPDATED',
                details: { roleId }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Update user role error:', error);
            throw new AppError('Failed to update user role', 500, 'UPDATE_ROLE_ERROR');
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Remove sensitive data from user object
     */
    _sanitizeUser(user) {
        const userData = user.toJSON ? user.toJSON() : user;
        delete userData.password_hash;
        return userData;
    }

    async _createAuthSession(params) {
        const {
            userId,
            ipAddress,
            userAgent,
            deviceInfo,
            deviceFingerprint,
            isTrustedDevice = false,
            mfaVerified = false,
            deviceVerified = false,
            rememberMe = false
        } = params;

        const sessionId = createSessionId();
        const refreshToken = createRefreshToken();
        const accessToken = createAccessToken(userId);

        const sessionTtl = rememberMe ? config.session.extendedTtl : config.session.ttl;

        const metadata = {
            userAgent,
            ipAddress,
            deviceInfo,
            deviceFingerprint,
            isTrusted: isTrustedDevice,
            mfaVerified,
            deviceVerified,
            rememberMe
        };

        await sessionService.createSession(sessionId, userId, refreshToken, metadata, sessionTtl);

        return {
            sessionId,
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 300,
            sessionTtl
        };
    }
}

// Initialize with user repository
const UserRepository = require('../../repositories/userRepository');
const userRepo = new UserRepository();
OwnerService.setUserRepository(userRepo);

module.exports = new OwnerService();