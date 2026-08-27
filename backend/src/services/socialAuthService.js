const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');
const UserRepository = require('../repositories/userRepository');
const auditService = require('./auditService');
const roleService = require('./rbac/roleService');
const crypto = require('crypto');

/**
 * Social Authentication Service
 * Handles OAuth login flows, provider linking, and session management
 */
class SocialAuthService {
    constructor() {
        this.authService = require('./authService');
        this.userRepository = new UserRepository();
    }

    /**
     * Handle Google Popup Login (NEW APPROACH)
     * Called when frontend sends validated Google ID token
     *
     * Flow:
     * 1. Frontend sends Google ID token
     * 2. Backend verifies token with Google
     * 3. Backend creates/finds user
     * 4. Backend returns JWT token (no redirect)
     */
    async handleGooglePopupLogin(userData, params) {
        const {
            ip_address,
            user_agent,
            device_info = {},
            remember_me = false,
        } = params;

        try {
            const { provider, oauth_id, email, full_name, oauth_avatar, is_verified } = userData;

            // Step 1: Find user by OAuth profile
            let user = await this.userRepository.findByOAuthProfile(provider, oauth_id);

            if (user) {
                // Step 2a: User already linked with this OAuth
                await user.update({
                    oauth_linked_at: new Date(),
                    last_login_at: new Date(),
                });
                logger.info(`OAuth popup login: ${provider}/${oauth_id} -> user: ${user.user_id}`);
            } else {
                // Step 2b: Check if email exists (link to existing account)
                if (email) {
                    const existingUser = await this.userRepository.findByEmail(email);

                    if (existingUser) {
                        // Link OAuth to existing account
                        await existingUser.update({
                            oauth_provider: provider,
                            oauth_id: oauth_id,
                            oauth_email: email,
                            oauth_avatar,
                            oauth_linked_at: new Date(),
                        });
                        logger.info(`OAuth linked to existing: ${provider}/${oauth_id} -> user: ${existingUser.user_id}`);
                        user = existingUser;
                    }
                }

                // Step 2c: Create new user from OAuth profile
                if (!user) {
                    const user_id = crypto.randomUUID();
                    const randomPassword = crypto.randomBytes(32).toString('hex');
                    const role_id = await roleService.getDefaultRegistrationRoleId();

                    const newUser = await this.userRepository.create({
                        user_id: user_id,
                        email,
                        full_name,
                        password: randomPassword,
                        role_id,
                        is_verified: is_verified !== undefined ? is_verified : true,
                        is_active: true,
                        oauth_provider: provider,
                        oauth_id: oauth_id,
                        oauth_email: email,
                        oauth_avatar,
                        oauth_linked_at: new Date(),
                        requires_mfa: false,
                    });

                    logger.info(`New user created via ${provider} popup: ${user_id}`);
                    user = await this.userRepository.findByUserId(user_id);
                }
            }

            // Step 3: Check if account is active
            if (!user || !user.is_active) {
                throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
            }

            // Step 4: Create session
            const session_data = await this.authService._createAuthSession({
                user_id: user.user_id,
                ip_address,
                user_agent,
                device_info,
                remember_me,
                role_id: user.role_id
            });

            // Step 5: Update last login
            await this.userRepository.updateLastLogin(user.user_id, ip_address);

            // Step 6: Log OAuth login
            await auditService.log({
                user_id: user.user_id,
                action: 'OAUTH_POPUP_LOGIN_SUCCESS',
                provider,
                session_id: session_data.session_id,
                ip_address,
                user_agent,
                success: true,
            });

            logger.info(`OAuth popup login successful: ${user.user_id} via ${provider}`);

            return {
                ...session_data,
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    full_name: user.full_name,
                    role_id: user.role_id,
                    oauth_provider: user.oauth_provider,
                    profile_image: user.profile_image || user.oauth_avatar,
                    mfa_enabled: user.requires_mfa,
                },
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Google popup login error:', error);
            throw new AppError('Google popup login failed', 500, 'POPUP_LOGIN_FAILED');
        }
    }

    /**
     * Handle OAuth Callback - Create session after OAuth provider approves
     * Called after user is authenticated by Passport.js
     */
    async handleOAuthCallback(user, params) {
        const {
            ip_address,
            user_agent,
            device_info = {},
            remember_me = false,
        } = params;

        try {
            if (!user) {
                throw new AppError('User authentication failed', 401, 'AUTH_FAILED');
            }

            // Check if account is active
            if (!user.is_active) {
                throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
            }

            // Create session (OAuth users are always verified)
            const session_data = await this.authService._createAuthSession({
                user_id: user.user_id,
                ip_address,
                user_agent,
                device_info,
                remember_me,
                role_id: user.role_id
            });

            // Update last login
            await this.userRepository.updateLastLogin(user.user_id, ip_address);

            // Log OAuth login
            await auditService.log({
                user_id: user.user_id,
                action: 'OAUTH_LOGIN_SUCCESS',
                provider: user.oauth_provider,
                session_id: session_data.session_id,
                ip_address,
                user_agent,
                success: true,
            });

            logger.info(`OAuth login successful: ${user.user_id} via ${user.oauth_provider}`);

            return {
                ...session_data,
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    full_name: user.full_name,
                    role_id: user.role_id,
                    oauth_provider: user.oauth_provider,
                    profile_image: user.profile_image || user.oauth_avatar,
                    mfa_enabled: user.requires_mfa,
                },
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('OAuth callback error:', error);
            throw new AppError('OAuth authentication failed', 500, 'OAUTH_FAILED');
        }
    }

    /**
     * Link OAuth provider to existing account
     * User provides email/password to verify ownership before linking
     */
    async linkOAuthProvider(user_id, provider, oauth_id, oauth_email, oauth_avatar) {
        try {
            const user = await this.userRepository.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Check if this OAuth provider is already linked to another account
            const existingLink = await this.userRepository.findByOAuthProfile(provider, oauth_id);
            if (existingLink && existingLink.user_id !== user_id) {
                throw new AppError(
                    'This OAuth account is already linked to another user',
                    400,
                    'OAUTH_ALREADY_LINKED'
                );
            }

            // Link the OAuth provider
            await this.userRepository.linkOAuthProvider(
                user_id,
                provider,
                oauth_id,
                oauth_email,
                oauth_avatar
            );

            await auditService.log({
                user_id,
                action: 'OAUTH_PROVIDER_LINKED',
                provider,
            });

            logger.info(`OAuth provider linked: ${provider} to user: ${user_id}`);

            return {
                success: true,
                message: `${provider.toUpperCase()} linked successfully`,
                provider,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Link OAuth provider error:', error);
            throw new AppError('Failed to link OAuth provider', 500, 'PROVIDER_LINK_FAILED');
        }
    }

    /**
     * Unlink OAuth provider from account
     */
    async unlinkOAuthProvider(user_id, provider) {
        try {
            const user = await this.userRepository.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            if (user.oauth_provider !== provider) {
                throw new AppError('This provider is not linked to your account', 400, 'PROVIDER_NOT_LINKED');
            }

            // Unlink the provider
            await this.userRepository.unlinkOAuthProvider(user_id);

            await auditService.log({
                user_id,
                action: 'OAUTH_PROVIDER_UNLINKED',
                provider,
            });

            logger.info(`OAuth provider unlinked: ${provider} from user: ${user_id}`);

            return {
                success: true,
                message: `${provider.toUpperCase()} unlinked successfully`,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Unlink OAuth provider error:', error);
            throw new AppError('Failed to unlink OAuth provider', 500, 'PROVIDER_UNLINK_FAILED');
        }
    }

    /**
     * Get user's OAuth provider status
     */
    async getOAuthStatus(user_id) {
        try {
            const user = await this.userRepository.findByUserId(user_id);

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            return {
                provider: user.oauth_provider,
                email: user.oauth_email,
                linked_at: user.oauth_linked_at,
                can_unlink: !!user.password_hash, // Can unlink if user has password
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Get OAuth status error:', error);
            throw new AppError('Failed to get OAuth status', 500, 'STATUS_FETCH_FAILED');
        }
    }
}

module.exports = new SocialAuthService();
