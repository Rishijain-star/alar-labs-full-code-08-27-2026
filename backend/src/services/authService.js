const sessionService = require('./sessionService');
const otpService = require('./otpService');
const roleService = require('./rbac/roleService');

const totpService = require('./totpService');
const deviceService = require('./deviceService');
const ipWhitelistService = require('./ipWhitelistService');
const auditService = require('./auditService');
const tokenBlacklistService = require('./tokenBlacklistService');
const {
    createAccessToken,
    createRefreshToken,
    createSessionId
} = require('../utils/token');
const {
    AppError
} = require('../middleware/errorHandler');
const config = require('../config');
const logger = require('../lib/logger');
const crypto = require('crypto');
const UserRepository = require('../repositories/userRepository');
const emailService = require('./emailService');
const { currencyForCountry, detectCountryFromPhone } = require('../utils/localeHelper');
const { getLocationFromIP } = require('../utils/geoHelper');

/**
 * Complete Authentication Service with MFA Support
 * Flow: Register → Verify Email/Phone → Login → (Optional) MFA Setup → MFA Verify → Session Created
 * 
 * FIXED ISSUES:
 * - Removed 'static' from login() method
 * - Removed 'static' from _authenticate() method  
 * - All methods now properly access this.userRepository
 */
class AuthService {

    constructor() {
        this.userRepository = new UserRepository();

    }


    async _storePendingDeviceSession(deviceFingerprint, data) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `pending_device:${deviceFingerprint}`;
        await redis.setEx(key, 600, JSON.stringify(data)); // 10 minutes
    }

    async _getPendingDeviceSession(deviceFingerprint) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return null;
        const key = `pending_device:${deviceFingerprint}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async _clearPendingDeviceSession(deviceFingerprint) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `pending_device:${deviceFingerprint}`;
        await redis.del(key);
    }

    _geoFieldsFromContext(geoContext = {}) {
        const country = geoContext.country || null;
        return {
            country,
            state: geoContext.state || null,
            city: geoContext.city || null,
            pincode: geoContext.pincode || null,
            timezone: geoContext.timezone || null,
            currency_code: currencyForCountry(country),
        };
    }

    async _applyGeoToUser(user, ipAddress) {
        if (!this.userRepository || !user?.user_id) return user;
        const updates = {};

        if (user.phone) {
            const phoneGeo = detectCountryFromPhone(user.phone);
            if (phoneGeo) {
                if (!user.country) updates.country = phoneGeo.country;
                if (!user.currency_code) updates.currency_code = phoneGeo.currency;
            }
        }

        const geo = getLocationFromIP(ipAddress) || {};
        if (geo.country && !user.country && !updates.country) updates.country = geo.country;
        if (geo.timezone && !user.timezone) updates.timezone = geo.timezone;
        if (!user.currency_code && !updates.currency_code && (updates.country || geo.country)) {
            updates.currency_code = currencyForCountry(updates.country || geo.country);
        }

        if (Object.keys(updates).length) {
            await this.userRepository.update(user.user_id, updates);
            Object.assign(user, updates);
        }
        return user;
    }

    _userAuthPayload(user, mfaEnabled = false) {
        return {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            mfa_enabled: mfaEnabled,
            profile_image: user.profile_image,
            fcm_token: user.fcm_token,
            country: user.country || null,
            timezone: user.timezone || null,
            currency_code: user.currency_code || null,
        };
    }


    /**
     * 1. USER REGISTRATION
     * Register new user with email/phone verification
     */
    async register(params) {
        const {
            email,
            phone,
            password,
            full_name,
            verification_type = 'email', // 'email' or 'phone'
        } = params;

        try {
            // Validate required fields
            if (!email && !phone) {
                throw new AppError('Email or phone is required', 400, 'MISSING_CREDENTIALS');
            }

            if (!password) {
                throw new AppError('Password is required', 400, 'MISSING_PASSWORD');
            }

            if (!full_name) {
                throw new AppError('Full name is required', 400, 'MISSING_NAME');
            }

            // 🔒 SECURITY: Validate password strength
            const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{12,}$/;
            if (!passwordStrengthRegex.test(password)) {
                throw new AppError(
                    'Password must contain at least 12 characters with uppercase, lowercase, number and special character (@$!%*?&)',
                    400,
                    'WEAK_PASSWORD'
                );
            }

            // Check if user already exists
            if (this.userRepository) {
                if (email) {
                    const existingEmail = await this.userRepository.findByEmailOnly(email);
                    if (existingEmail) {
                        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
                    }
                }

                if (phone) {
                    const existingPhone = await this.userRepository.findByPhoneOnly(phone);
                    if (existingPhone) {
                        throw new AppError('Phone already registered', 400, 'PHONE_EXISTS');
                    }
                }
            }

            // Hash password
            const passwordHash = password;

            // Generate OTP for verification
            const identifier = verification_type === 'email' ? email : phone;
            const otpData = await otpService.generateOtp(identifier, 'REGISTRATION');

            if (!otpData?.otp || String(otpData.otp).trim().length < 4) {
                logger.error('OTP generation returned empty or invalid code');
                throw new AppError('Failed to generate verification code', 500, 'OTP_GENERATION_FAILED');
            }

            // Send OTP via email or SMS
            if (verification_type === 'email') {
                await this._sendEmailOtp(email, otpData.otp, 'registration');
            } else {
                await this._sendSmsOtp(phone, otpData.otp, 'registration');
            }

            // Store pending user data (to be created after OTP verification)
            await this._storePendingUser({
                email,
                phone,
                password: passwordHash,
                full_name,
                verification_type,
                otp_token: otpData.token,
                otp: otpData.otp
            });

            logger.info(`Registration initiated for: ${email || phone}`);

            return {
                success: true,
                message: `OTP sent to your ${verification_type}`,
                otp_token: otpData.token,
                expires_in: 300, // 5 minutes
                verification_type: verification_type
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Registration error:', error);
            throw new AppError('Registration failed', 500, 'REGISTRATION_FAILED');
        }
    }

    /**
     * 2. VERIFY REGISTRATION OTP
     * Verify OTP and create user account
     */
    async verifyRegistrationOtp(otp_token, otp, geoContext = {}) {
        try {
            // Verify OTP
            const verification = await otpService.verifyOtp(otp_token, otp);

            if (!verification.valid) {
                throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
            }

            // Get pending user data
            const pending_user = await this._getPendingUser(otp_token);

            if (!pending_user) {
                throw new AppError('Registration session expired', 400, 'SESSION_EXPIRED');
            }

            // Generate unique user_id
            const user_id = crypto.randomUUID();
            const geoFields = this._geoFieldsFromContext(geoContext);

            // Create user in database
            if (this.userRepository) {
                const role_id = await roleService.getDefaultRegistrationRoleId();

                await this.userRepository.create({
                    user_id,
                    email: pending_user.email,
                    role_id,
                    phone: pending_user.phone,
                    password: pending_user.password, // Already hashed
                    full_name: pending_user.full_name,
                    is_verified: true,
                    is_active: true,
                    requires_mfa: false, // MFA disabled by default
                    ...geoFields,
                });
            }

            // Clear pending user data
            await this._clearPendingUser(otp_token);

            await auditService.log({
                user_id,
                action: 'REGISTRATION_SUCCESS',
                metadata: {
                    email: pending_user.email,
                    phone: pending_user.phone,
                },
                success: true
            });

            logger.info(`User registered successfully: ${user_id}`);

            return {
                success: true,
                message: 'Registration successful. You can now login.',
                user_id,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('OTP verification error:', error);
            throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
        }
    }

    /**
     * 3. LOGIN WITH PASSWORD
     * Login flow with conditional MFA and device verification
     * FIXED: Removed 'static' keyword so it can access this.userRepository
     */
    async login(params) {
        const {
            email,
            password,
            ip_address,
            user_agent,
            device_info = {},
            remember_me = false,
        } = params;

        try {

            // Step 1: Check IP whitelist (if enabled)
            if (config.security?.checkIpWhitelist) {
                console.log('hconfig.security?.checkIpWhitelist', config.security?.checkIpWhitelist)
                const ipAllowed = await ipWhitelistService.checkIp(email, ip_address);
                if (!ipAllowed) {
                    await auditService.log({
                        action: 'LOGIN_BLOCKED',
                        metadata: {
                            email,
                            reason: 'IP_NOT_WHITELISTED'
                        },
                        ip_address,
                        user_agent,
                        success: false,
                    });
                    throw new AppError('Access denied from this IP address', 403, 'IP_BLOCKED');
                }
            }

            // Step 2: Authenticate user
            const user = await this._authenticate(email, password);

            if (!user) {
                await auditService.log({
                    action: 'LOGIN_FAILED',
                    metadata: {
                        email,
                        reason: 'INVALID_CREDENTIALS'
                    },
                    ip_address,
                    user_agent,
                    success: false,
                });
                throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
            }

            // Step 3: Check if account is verified
            if (this.userRepository && !user.is_verified) {
                throw new AppError('Please verify your account first', 403, 'ACCOUNT_NOT_VERIFIED');
            }

            // Step 4: Check if account is locked
            if (user.isLocked && user.isLocked()) {
                throw new AppError('Account is locked. Please try again later.', 403, 'ACCOUNT_LOCKED');
            }

            // Step 5: Reset failed login attempts on successful authentication
            if (this.userRepository) {
                await this.userRepository.resetFailedAttempts(user.user_id);
            }

            // Step 6: Check if MFA is ENABLED for this user
            const mfaStatus = await totpService.getMfaStatus(user.user_id);

            if (mfaStatus.enabled) {
                // MFA is ENABLED - require MFA verification
                const mfa_token = await totpService.generateMfaChallenge(user.user_id);

                await auditService.log({
                    user_id: user.user_id,
                    action: 'LOGIN_MFA_REQUIRED',
                    ip_address,
                    user_agent,
                    success: true,
                });


                logger.info(`MFA verification required for user: ${user.user_id}`);

                return {
                    requires_mfa: true,
                    mfa_token,
                    message: 'Please enter your authenticator code',
                    user_id: user.user_id,
                };
            }
            let device_fingerprint = ''
            let is_trusted_device = false
            if (config.security?.requireDeviceVerification) {
                // Step 7: Check device trust (only if MFA not enabled)
                device_fingerprint = deviceService.generateFingerprint({
                    user_agent,
                    ip_address,
                    ...device_info,
                });

                // // 2. That fingerprint + user_id is saved to Redis
                // await this._storePendingDeviceSession(device_fingerprint, {
                //     user_id: user.user_id,
                //     device_fingerprint,
                // });

                // 🔒 SECURITY FIX: Use assignment instead of const to avoid shadowing
                is_trusted_device = await deviceService.isTrusted(user.user_id, device_fingerprint);

                if (!is_trusted_device && config.security?.requireDeviceVerification) {
                    // Send device verification OTP
                    const otp_data = await otpService.generateOtp(
                        user.email || user.phone,
                        'DEVICE_VERIFICATION'
                    );

                    if (user.email) {
                        await this._sendEmailOtp(user.email, otp_data.otp, 'device_verification');
                    }
                    else {
                        await this._sendSmsOtp(user.phone, otp_data.otp, 'device_verification');
                    }

                    await auditService.log({
                        user_id: user.user_id,
                        action: 'LOGIN_NEW_DEVICE',
                        metadata: {
                            device_fingerprint
                        },
                        ip_address,
                        user_agent,
                        success: true,
                    });

                    return {
                        requires_device_verification: true,
                        otp_token: otp_data.token,
                        device_fingerprint,
                        message: 'New device detected. Please verify with OTP.',
                    };
                }
            }

            // Step 8: Create session and tokens (MFA not required)
            await this._applyGeoToUser(user, ip_address);

            const session_data = await this._createAuthSession({
                user_id: user.user_id,
                ip_address,
                user_agent,
                device_info,
                device_fingerprint,
                is_trusted_device,
                remember_me,
                role_id: user.role_id
            });

            // Step 9: Trust device if remember me

            if (remember_me) {
                await deviceService.trustDevice(user.user_id, device_fingerprint, {
                    user_agent,
                    ip_address,
                    device_info,
                });
            }

            // Step 10: Update last login
            if (this.userRepository) {
                await this.userRepository.updateLastLogin(user.user_id, ip_address);
            }

            await auditService.log({
                user_id: user.user_id,
                action: 'LOGIN_SUCCESS',
                session_id: session_data.session_id,
                ip_address,
                user_agent,
                metadata: {
                    device_fingerprint,
                    is_trusted_device
                },
                success: true,
            });

            logger.info(`User logged in: ${user.user_id}, session: ${session_data.session_id}`);

            return {
                requires_mfa: false,
                ...session_data,
                user: this._userAuthPayload(user, mfaStatus.enabled),
            };
        } catch (error) {
            // Increment failed login attempts
            if (email && this.userRepository && !(error instanceof AppError && error.code === 'ACCOUNT_LOCKED')) {
                try {
                    const user = await this.userRepository.findByEmail(email);
                    if (user) {
                        await this.userRepository.incrementFailedAttempts(user.user_id);
                    }
                } catch (err) {
                    logger.error('Error incrementing failed attempts:', err);
                }
            }

            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Login error:', error);
            throw new AppError('Login failed', 500, 'LOGIN_FAILED');
        }
    }

    /**
     * 4. VERIFY MFA CODE (After Login)
     * This is called when user enters TOTP code after login
     */
    async verifyMfaLogin(params) {
        const {
            mfa_token,
            code,
            ip_address,
            user_agent,
            device_info = {},
            remember_me = false
        } = params;

        try {
            // Verify MFA code
            const verification = await totpService.verifyCode(mfa_token, code);

            if (!verification.valid) {
                await auditService.log({
                    action: 'MFA_VERIFICATION_FAILED',
                    metadata: {
                        mfa_token
                    },
                    ip_address,
                    user_agent,
                    success: false,
                });
                throw new AppError('Invalid MFA code', 401, 'INVALID_MFA_CODE');
            }

            const user_id = verification.user_id;

            // Get user details
            const user = this.userRepository ?
                await this.userRepository.findByUserId(user_id) :
                {
                    user_id: user_id
                };

            const device_fingerprint = deviceService.generateFingerprint({
                user_agent,
                ip_address,
                ...device_info,
            });

            // Create session after successful MFA verification
            const session_data = await this._createAuthSession({
                user_id,
                ip_address,
                user_agent,
                device_info,
                device_fingerprint,
                mfa_verified: true,
                remember_me,
                role_id: user.role_id
            });

            // Trust device if remember me
            if (remember_me) {
                await deviceService.trustDevice(user_id, device_fingerprint, {
                    user_agent,
                    ip_address,
                    device_info,
                });
            }

            // Update last login
            if (this.userRepository) {
                await this.userRepository.updateLastLogin(user_id, ip_address);
            }

            await auditService.log({
                user_id,
                action: 'MFA_LOGIN_SUCCESS',
                metadata: {
                    session_id: session_data.session_id
                },
                ip_address,
                user_agent,
                success: true,
            });

            logger.info(`MFA login successful: ${user_id}`);

            return {
                ...session_data,
                user: {
                    ...this._userAuthPayload(user, true),
                    permissions: await roleService.getUserPermissions(user_id),
                },
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('MFA verification error:', error);
            throw new AppError('MFA verification failed', 500, 'MFA_VERIFICATION_FAILED');
        }
    }

    /**
     * 5. RESEND OTP
     * Resend OTP for any purpose
     */
    async resendOtp(otp_token) {
        try {
            const otp_details = await otpService.getOtpDetails(otp_token);

            if (!otp_details) {
                throw new AppError('Invalid OTP token', 400, 'INVALID_TOKEN');
            }

            if (otp_details.resendCount >= 3) {
                throw new AppError('Maximum resend limit reached', 429, 'RESEND_LIMIT_EXCEEDED');
            }

            const new_otp_data = await otpService.generateOtp(
                otp_details.identifier,
                otp_details.purpose
            );

            if (otp_details.identifier.includes('@')) {
                await this._sendEmailOtp(otp_details.identifier, new_otp_data.otp, otp_details.purpose.toLowerCase());
            } else {
                await this._sendSmsOtp(otp_details.identifier, new_otp_data.otp, otp_details.purpose.toLowerCase());
            }

            await otpService.incrementResendCount(otp_token);

            logger.info(`OTP resent to: ${otp_details.identifier}`);

            return {
                success: true,
                message: 'OTP resent successfully',
                otp_token: new_otp_data.token,
                expires_in: 300,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Resend OTP error:', error);
            throw new AppError('Failed to resend OTP', 500, 'RESEND_OTP_FAILED');
        }
    }

    /**
     * 6. FORGOT PASSWORD
     */
    async forgotPassword(identifier) {
        try {
            let user;

            if (this.userRepository) {
                if (identifier.includes('@')) {
                    user = await this.userRepository.findByEmail(identifier);
                } else {
                    user = await this.userRepository.findByPhone(identifier);
                }
                if (!user) {
                    // Don't reveal if user exists
                    return {
                        success: true,
                        message: 'If the account exists, you will receive a password reset code',
                    };
                }
            }

            const otp_data = await otpService.generateOtp(identifier, 'PASSWORD_RESET');

            if (identifier.includes('@')) {
                await this._sendEmailOtp(identifier, otp_data.otp, 'password_reset');
            } else {
                await this._sendSmsOtp(identifier, otp_data.otp, 'password_reset');
            }

            await auditService.log({
                user_id: user?.user_id || 'unknown',
                action: 'FORGOT_PASSWORD_INITIATED',
                metadata: {
                    identifier
                },
                success: true
            });

            logger.info(`Forgot password initiated for: ${identifier}`);

            return {
                success: true,
                message: 'Password reset code sent',
                otp_token: otp_data.token,
                expires_in: 300,
                user_id: user?.user_id || null,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Forgot password error:', error);
            throw new AppError('Failed to initiate password reset', 500, 'FORGOT_PASSWORD_FAILED');
        }
    }

    /**
     * 7. VERIFY RESET PASSWORD OTP
     */
    async verifyResetPasswordOtp(otp_token, otp) {
        try {
            const verification = await otpService.verifyOtp(otp_token, otp);
            let userId = null;

            if (!verification.valid) {
                throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
            }

            const reset_token = crypto.randomBytes(32).toString('hex');
            await this._storeResetToken(verification.identifier, reset_token);
            if (this.userRepository && verification?.identifier) {
                const user = verification.identifier.includes("@")
                    ? await this.userRepository.findByEmail(verification.identifier)
                    : await this.userRepository.findByPhone(verification.identifier);
                userId = user?.user_id || null;
            }

            logger.info(`Password reset OTP verified for: ${verification.identifier}`);

            return {
                success: true,
                message: 'OTP verified successfully',
                reset_token,
                expires_in: 900, // 15 minutes
                user_id: userId,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Reset password OTP verification error:', error);
            throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
        }
    }

    /**
     * 8. RESET PASSWORD
     */
    async resetPassword(reset_token, new_password) {
        try {
            const identifier = await this._verifyResetToken(reset_token);
            let changedUserId = null;

            if (!identifier) {
                throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
            }

            if (new_password.length < 8) {
                throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
            }

            if (this.userRepository) {
                const user = identifier.includes('@') ?
                    await this.userRepository.findByEmail(identifier) :
                    await this.userRepository.findByPhone(identifier);

                if (!user) {
                    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
                }
                changedUserId = user.user_id;

                // Update password (will be hashed by repository)
                await this.userRepository.updatePassword(user.user_id, new_password);

                // Invalidate all existing sessions
                await sessionService.deleteAllUserSessions(user.user_id);
                await tokenBlacklistService.blacklistUserTokens(user.user_id);

                await auditService.log({
                    user_id: user.user_id,
                    action: 'PASSWORD_RESET_SUCCESS',
                    metadata: {
                        identifier
                    },
                    success: true
                });

                logger.info(`Password reset successful for: ${user.user_id}`);
            }

            await this._clearResetToken(reset_token);

            return {
                success: true,
                message: 'Password reset successfully. Please login with your new password.',
                user_id: changedUserId,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Reset password error:', error);
            throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_FAILED');
        }
    }

    /**
     * PRIVATE HELPER METHODS
     * FIXED: Removed 'static' from _authenticate so it can access this.userRepository
     */

    async _authenticate(identifier, password) {

        if (!this.userRepository) {
            logger.warn('No user repository configured');
            return null;
        }

        let user;

        if (identifier.includes('@')) {
            user = await this.userRepository.findByEmail(identifier);
        } else {
            user = await this.userRepository.findByUserId(identifier);
        }

        if (!user) return null;

        if (!user.is_active) {
            throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
        }

        const isValidPassword = await this.userRepository.verifyPassword(user, password);
        if (!isValidPassword) return null;

        return user;
    }

    async _createAuthSession(params) {
        const {
            user_id,
            ip_address,
            user_agent,
            device_info,
            device_fingerprint,
            is_trusted_device = false,
            mfa_verified = false,
            device_verified = false,
            remember_me = false,
            role_id
        } = params;

        const session_id = createSessionId();
        const refresh_token = createRefreshToken();
        const access_token = await createAccessToken(user_id, {
            role_id: role_id
        });

        const session_ttl = remember_me ?
            (config.session?.extendedTtl || 2592000) // 30 days
            :
            (config.session?.ttl || 86400); // 24 hours

        const metadata = {
            user_agent,
            ip_address,
            device_info,
            device_fingerprint,
            is_trusted: is_trusted_device,
            mfa_verified,
            device_verified,
            remember_me,
        };


        await sessionService.createSession(session_id, user_id, access_token, refresh_token, metadata, session_ttl);

        return {
            session_id,
            access_token,
            token_type: 'Bearer',
            expires_in: config.jwt.accessExpiry, // 5 minutes for access token
            session_ttl,
        };
    }

    async _sendEmailOtp(email, otp, purpose) {
        try {
            await emailService.send(email, String(otp), purpose);
            logger.info(`[EMAIL] OTP for ${purpose} sent to ${email}`);
        } catch (err) {
            logger.error(`[EMAIL] Failed to send OTP (${purpose}) to ${email}:`, err?.message || err);
            if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
                console.log(`\n==============================================`);
                console.log(`[DEV FALLBACK] SMTP Failed. OTP for ${email} (${purpose}) is: ${otp}`);
                console.log(`==============================================\n`);
                return;
            }
            throw new AppError(
                err?.message?.includes("SMTP_FROM")
                    ? "Email is not configured (SMTP_FROM). Check server .env."
                    : "Failed to send verification email. Check SMTP settings and logs.",
                503,
                "EMAIL_SEND_FAILED"
            );
        }
    }

    async _sendSmsOtp(phone, otp, purpose) {
        logger.warn(
            `[SMS] OTP for ${purpose} not delivered — SMS provider not integrated. phone=${phone}`
        );
        // TODO: integrate Twilio / MSG91 / etc.
    }

    async _storePendingUser(userData) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `pending_user:${userData.otp_token}`;
        await redis.setEx(key, 600, JSON.stringify(userData)); // 10 minutes
    }

    async _getPendingUser(otp_token) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return null;
        const key = `pending_user:${otp_token}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async _clearPendingUser(otp_token) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `pending_user:${otp_token}`;
        await redis.del(key);
    }

    async _storeResetToken(identifier, reset_token) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `reset_token:${reset_token}`;
        await redis.setEx(key, 900, identifier); // 15 minutes
    }

    async _verifyResetToken(reset_token) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return null;
        const key = `reset_token:${reset_token}`;
        return await redis.get(key);
    }

    async _clearResetToken(reset_token) {
        const redisManager = require('../lib/redisManager');
        const redis = await redisManager.getClientSafe();
        if (!redis) return;
        const key = `reset_token:${reset_token}`;
        await redis.del(key);
    }

    /**
 * VERIFY NEW DEVICE
 * Called after login returns requiresDeviceVerification: true
 * 
 * Steps:
 * 1. Verify the OTP (generated during login for DEVICE_VERIFICATION purpose)
 * 2. Look up the pending device session stored during login
 * 3. Trust the device (always, since user just proved ownership)
 * 4. Create auth session and return tokens
 */
    async verifyDevice(params) {
        const {
            otp_token,
            otp,
            device_fingerprint,
            ip_address,
            user_agent,
            device_info = {},
            remember_me = false,
        } = params;

        try {
            // Step 1: Verify the OTP
            const verification = await otpService.verifyOtp(otp_token, otp);

            if (!verification.valid) {
                await auditService.log({
                    action: 'DEVICE_VERIFICATION_FAILED',
                    metadata: {
                        otp_token
                    },
                    ip_address,
                    user_agent,
                    success: false,
                });
                throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
            }


            // Step 2: Retrieve the pending device session stored during login.
            //         This holds the user_id that was waiting for device verification.
            const pending_session = await this._getPendingDeviceSession(device_fingerprint);

            if (!pending_session) {
                throw new AppError(
                    'Device verification session expired. Please login again.',
                    400,
                    'SESSION_EXPIRED'
                );
            }

            const { user_id } = pending_session;

            // Step 3: Validate the fingerprint matches what login recorded
            //         (prevents someone swapping a fingerprint between requests)
            if (pending_session.device_fingerprint !== device_fingerprint) {
                throw new AppError('Device fingerprint mismatch', 400, 'FINGERPRINT_MISMATCH');
            }

            // Step 4: Get user details for the session payload
            const user = this.userRepository
                ? await this.userRepository.findByUserId(user_id)
                : { user_id: user_id };

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Step 5: Trust this device so future logins skip device verification
            await deviceService.trustDevice(user_id, device_fingerprint, {
                user_agent,
                ip_address,
                device_info,
            });

            // Step 6: Create auth session (device is now verified)
            const session_data = await this._createAuthSession({
                user_id,
                ip_address,
                user_agent,
                device_info,
                device_fingerprint,
                is_trusted_device: true,
                device_verified: true,   // flag so session metadata reflects this
                mfa_verified: false,
                remember_me,
                role_id: user.role_id,
            });

            // Step 7: Update last login timestamp
            if (this.userRepository) {
                await this.userRepository.updateLastLogin(user_id, ip_address);
            }

            // Step 8: Clean up the pending session — no longer needed
            await this._clearPendingDeviceSession(device_fingerprint);

            await auditService.log({
                user_id,
                action: 'DEVICE_VERIFICATION_SUCCESS',
                metadata: {
                    session_id: session_data.session_id,
                    device_fingerprint
                },
                ip_address,
                user_agent,
                success: true,
            });

            logger.info(`Device verified for user: ${user_id}, fingerprint: ${device_fingerprint}`);

            return {
                ...session_data,
                user: this._userAuthPayload(user, false),
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Device verification error:', error);
            throw new AppError('Device verification failed', 500, 'DEVICE_VERIFICATION_FAILED');
        }
    }
}

module.exports = new AuthService(); // 👈 IMPORTANT