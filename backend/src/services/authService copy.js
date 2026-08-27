const sessionService = require('./sessionService');
const otpService = require('./otpService');
const totpService = require('./totpService');
const deviceService = require('./deviceService');
const ipWhitelistService = require('./ipWhitelistService');
const auditService = require('./auditService');
const tokenBlacklistService = require('./tokenBlacklistService');
const { createAccessToken, createRefreshToken, createSessionId } = require('../utils/token');
const { AppError } = require('../middleware/errorHandler');
const { hashPassword } = require('../utils/crypto');
const config = require('../config');
const logger = require('../lib/logger');
const crypto = require('crypto');

/**
 * Complete Authentication Service with MFA Support
 * Flow: Register → Verify Email/Phone → Login → (Optional) MFA Setup → MFA Verify → Session Created
 */
class AuthService {


  /**
   * Set user repository for authentication
   */
  static setUserRepository(repository) {
    AuthService._sharedRepository = repository;   // store on class
  }
  constructor() {
    this.userRepository = AuthService._sharedRepository || null;
  }

  /**
    * 4. VERIFY MFA CODE (After Login)
    * This is called when user enters TOTP code after login
    */
  async verifyMfaLogin(params) {
    const { mfaToken, code, ipAddress, userAgent, deviceInfo = {}, rememberMe = false } = params;

    try {
      // Verify MFA code
      const verification = await totpService.verifyCode(mfaToken, code);

      if (!verification.valid) {
        await auditService.log({
          action: 'MFA_VERIFICATION_FAILED',
          mfaToken,
          ipAddress,
          userAgent,
          success: false,
        });
        throw new AppError('Invalid MFA code', 401, 'INVALID_MFA_CODE');
      }
      console.log('hiverificationverification', verification)
      const userId = verification.userId;
      console.log('userIduserIduserId', userId)


      // Get user details
      const user = this.userRepository
        ? await this.userRepository.findByUserId(userId)
        : { userId };

      const deviceFingerprint = deviceService.generateFingerprint({
        userAgent,
        ipAddress,
        ...deviceInfo,
      });

      // Create session after successful MFA verification
      const sessionData = await this._createAuthSession({
        userId,
        ipAddress,
        userAgent,
        deviceInfo,
        deviceFingerprint,
        mfaVerified: true,
        rememberMe,
      });

      if (rememberMe) {
        await deviceService.trustDevice(userId, deviceFingerprint, {
          userAgent,
          ipAddress,
          deviceInfo,
        });
      }

      await auditService.log({
        userId,
        action: 'MFA_LOGIN_SUCCESS',
        sessionId: sessionData.sessionId,
        ipAddress,
        userAgent,
        success: true,
      });

      logger.info(`MFA login successful: ${userId}`);

      return {
        ...sessionData,
        user: {
          userId: userId,

          mfaEnabled: true,
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

      // Check if user already exists
      if (this.userRepository) {
        if (email) {
          const existingEmail = await this.userRepository.findByEmail(email);
          if (existingEmail) {
            throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
          }
        }

        if (phone) {
          const existingPhone = await this.userRepository.findByPhone(phone);
          if (existingPhone) {
            throw new AppError('Phone already registered', 400, 'PHONE_EXISTS');
          }
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate OTP for verification
      const identifier = verification_type === 'email' ? email : phone;
      const otpData = await otpService.generateOtp(identifier, 'REGISTRATION');

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
        otpToken: otpData.token,
      });

      logger.info(`Registration initiated for: ${email || phone}`);

      return {
        success: true,
        message: `OTP sent to your ${verification_type}`,
        otpToken: otpData.token,
        expiresIn: 300, // 5 minutes
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
  async verifyRegistrationOtp(otpToken, otp) {
    try {
      // Verify OTP
      const verification = await otpService.verifyOtp(otpToken, otp);

      if (!verification.valid) {
        throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
      }

      // Get pending user data
      const pendingUser = await this._getPendingUser(otpToken);

      if (!pendingUser) {
        throw new AppError('Registration session expired', 400, 'SESSION_EXPIRED');
      }

      // Generate unique userId
      const userId = crypto.randomUUID();

      // Create user in database
      if (this.userRepository) {
        await this.userRepository.create({
          userId,
          email: pendingUser.email,
          phone: pendingUser.phone,
          password: pendingUser.password, // Already hashed
          full_name: pendingUser.full_name,
          isVerified: true,
          isActive: true,
          requiresMfa: false, // MFA disabled by default
          createdAt: Date.now(),
        });
      }

      // Clear pending user data
      await this._clearPendingUser(otpToken);

      await auditService.log({
        userId,
        action: 'REGISTRATION_SUCCESS',
        email: pendingUser.email,
        phone: pendingUser.phone,
      });

      logger.info(`User registered successfully: ${userId}`);

      return {
        success: true,
        message: 'Registration successful. You can now login.',
        userId,
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
   * Login flow with conditional MFA
   */
  async login(params) {
    const {
      email,
      password,
      ipAddress,
      userAgent,
      deviceInfo = {},
      rememberMe = false,
    } = params;

    try {
      // Step 1: Check IP whitelist
      const ipAllowed = await ipWhitelistService.checkIp(email, ipAddress);
      if (!ipAllowed) {
        await auditService.log({
          email,
          action: 'LOGIN_BLOCKED',
          reason: 'IP_NOT_WHITELISTED',
          ipAddress,
          userAgent,
          success: false,
        });
        throw new AppError('Access denied from this IP address', 403, 'IP_BLOCKED');
      }

      // Step 2: Authenticate user

      const user = await this._authenticate(email, password);
      if (!user) {
        await auditService.log({
          email,
          action: 'LOGIN_FAILED',
          reason: 'INVALID_CREDENTIALS',
          ipAddress,
          userAgent,
          success: false,
        });
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Step 3: Check if account is verified
      if (this.userRepository && !user.isVerified) {
        throw new AppError('Please verify your account first', 403, 'ACCOUNT_NOT_VERIFIED');
      }

      // Step 4: Check if MFA is ENABLED for this user
      const mfaStatus = await totpService.getMfaStatus(user.userId);

      if (mfaStatus.enabled) {
        // MFA is ENABLED - require MFA verification
        const mfaToken = await totpService.generateMfaChallenge(user.userId);

        await auditService.log({
          userId: user.userId,
          action: 'LOGIN_MFA_REQUIRED',
          ipAddress,
          userAgent,
          success: true,
        });

        logger.info(`MFA verification required for user: ${user.userId}`);

        return {
          requiresMfa: true,
          mfaToken,
          message: 'Please enter your authenticator code',
          userId: user.userId,
        };
      }

      // Step 5: Check device trust (only if MFA not enabled)
      const deviceFingerprint = deviceService.generateFingerprint({
        userAgent,
        ipAddress,
        ...deviceInfo,
      });

      const isTrustedDevice = await deviceService.isTrusted(user.userId, deviceFingerprint);

      if (!isTrustedDevice && config.security.requireDeviceVerification) {
        // Send device verification OTP
        const otpData = await otpService.generateOtp(
          user.email || user.phone,
          'DEVICE_VERIFICATION'
        );

        if (user.email) {
          await this._sendEmailOtp(user.email, otpData.otp, 'device_verification');
        } else {
          await this._sendSmsOtp(user.phone, otpData.otp, 'device_verification');
        }

        await auditService.log({
          userId: user.userId,
          action: 'LOGIN_NEW_DEVICE',
          deviceFingerprint,
          ipAddress,
          userAgent,
          success: true,
        });

        return {
          requiresDeviceVerification: true,
          otpToken: otpData.token,
          deviceFingerprint,
          message: 'New device detected. Please verify with OTP.',
        };
      }

      // Step 6: Create session and tokens (MFA not required)
      const sessionData = await this._createAuthSession({
        userId: user.userId,
        ipAddress,
        userAgent,
        deviceInfo,
        deviceFingerprint,
        isTrustedDevice,
        rememberMe,
      });

      // Step 7: Trust device if remember me
      if (rememberMe) {
        await deviceService.trustDevice(user.userId, deviceFingerprint, {
          userAgent,
          ipAddress,
          deviceInfo,
        });
      }

      await auditService.log({
        userId: user.userId,
        action: 'LOGIN_SUCCESS',
        sessionId: sessionData.sessionId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        success: true,
      });

      logger.info(`User logged in: ${user.userId}, session: ${sessionData.sessionId}`);

      return {
        requiresMfa: false,
        ...sessionData,
        user: {
          userId: user.userId,
          email: user.email,
          full_name: user.full_name,
          mfaEnabled: mfaStatus.enabled,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500, 'LOGIN_FAILED');
    }
  }


  /**
   * 9. RESEND OTP
   * Resend OTP for any purpose
   */
  async resendOtp(otpToken) {
    try {
      const otpDetails = await otpService.getOtpDetails(otpToken);

      if (!otpDetails) {
        throw new AppError('Invalid OTP token', 400, 'INVALID_TOKEN');
      }

      if (otpDetails.resendCount >= 3) {
        throw new AppError('Maximum resend limit reached', 429, 'RESEND_LIMIT_EXCEEDED');
      }

      const newOtpData = await otpService.generateOtp(
        otpDetails.identifier,
        otpDetails.purpose
      );

      if (otpDetails.identifier.includes('@')) {
        await this._sendEmailOtp(otpDetails.identifier, newOtpData.otp, otpDetails.purpose.toLowerCase());
      } else {
        await this._sendSmsOtp(otpDetails.identifier, newOtpData.otp, otpDetails.purpose.toLowerCase());
      }

      await otpService.incrementResendCount(otpToken);

      logger.info(`OTP resent to: ${otpDetails.identifier}`);

      return {
        success: true,
        message: 'OTP resent successfully',
        otpToken: newOtpData.token,
        expiresIn: 300,
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
   * 10. FORGOT PASSWORD
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

      const otpData = await otpService.generateOtp(identifier, 'PASSWORD_RESET');

      if (identifier.includes('@')) {
        await this._sendEmailOtp(identifier, otpData.otp, 'password_reset');
      } else {
        await this._sendSmsOtp(identifier, otpData.otp, 'password_reset');
      }

      await auditService.log({
        userId: user?.userId || 'unknown',
        action: 'FORGOT_PASSWORD_INITIATED',
        identifier,
      });

      logger.info(`Forgot password initiated for: ${identifier}`);

      return {
        success: true,
        message: 'Password reset code sent',
        otpToken: otpData.token,
        expiresIn: 300,
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
   * 11. VERIFY RESET PASSWORD OTP
   */
  async verifyResetPasswordOtp(otpToken, otp) {
    try {
      const verification = await otpService.verifyOtp(otpToken, otp);
      console.log('hiverificationverification', verification)
      if (!verification.valid) {
        throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      await this._storeResetToken(verification.identifier, resetToken);

      logger.info(`Password reset OTP verified for: ${verification.identifier}`);

      return {
        success: true,
        message: 'OTP verified successfully',
        resetToken,
        expiresIn: 900, // 15 minutes
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
   * 12. RESET PASSWORD
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const identifier = await this._verifyResetToken(resetToken);

      if (!identifier) {
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
      }

      if (this.userRepository) {
        const user = identifier.includes('@')
          ? await this.userRepository.findByEmail(identifier)
          : await this.userRepository.findByPhone(identifier);

        if (!user) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const passwordHash = await hashPassword(newPassword);
        await this.userRepository.updatePassword(user.userId, passwordHash);

        await sessionService.deleteAllUserSessions(user.userId);
        await tokenBlacklistService.blacklistUserTokens(user.userId);

        await auditService.log({
          userId: user.userId,
          action: 'PASSWORD_RESET_SUCCESS',
          identifier,
        });

        logger.info(`Password reset successful for: ${user.userId}`);
      }

      await this._clearResetToken(resetToken);

      return {
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Reset password error:', error);
      throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_FAILED');
    }
  }

  async _authenticate(identifier, password) {
    console.log('hithis.userRepositorythis.userRepository', this.userRepository)
    if (!this.userRepository) {
      logger.warn('No user repository configured');
      return { userId: identifier, requiresMfa: false };
    }

    let user;
    console.log('hiidentifieridentifier', identifier)
    if (identifier.includes('@')) {
      user = await this.userRepository.findByEmail(identifier);
    } else {
      user = await this.userRepository.findByUserId(identifier);
    }

    if (!user) return null;

    if (!user.isActive) {
      throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }
    console.log('hiverifyPassword', user)
    const isValidPassword = await this.userRepository.verifyPassword(user, password);
    if (!isValidPassword) return null;

    return user;
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
      rememberMe = false,
    } = params;

    const sessionId = createSessionId();
    const refreshToken = createRefreshToken();
    const accessToken = createAccessToken(userId);

    const sessionTtl = rememberMe
      ? config.session.extendedTtl
      : config.session.ttl;

    const metadata = {
      userAgent,
      ipAddress,
      deviceInfo,
      deviceFingerprint,
      isTrusted: isTrustedDevice,
      mfaVerified,
      deviceVerified,
      rememberMe,
    };

    await sessionService.createSession(sessionId, userId, refreshToken, metadata, sessionTtl);

    return {
      sessionId,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 300,
      sessionTtl,
    };
  }

  async _sendEmailOtp(email, otp, purpose) {
    logger.info(`[EMAIL] OTP for ${purpose}: ${otp} sent to ${email}`);
    // TODO: Implement actual email sending
    // await emailService.send(email, `Your OTP is: ${otp}`, purpose);
  }

  async _sendSmsOtp(phone, otp, purpose) {
    logger.info(`[SMS] OTP for ${purpose}: ${otp} sent to ${phone}`);
    // TODO: Implement actual SMS sending
    // await smsService.send(phone, `Your OTP is: ${otp}`);
  }

  async _storePendingUser(userData) {
    const redisClient = require('../lib/redis').getClient();
    const key = `pending_user:${userData.otpToken}`;
    await redisClient.setEx(key, 600, JSON.stringify(userData)); // 10 minutes
  }

  async _getPendingUser(otpToken) {
    const redisClient = require('../lib/redis').getClient();
    const key = `pending_user:${otpToken}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async _clearPendingUser(otpToken) {
    const redisClient = require('../lib/redis').getClient();
    const key = `pending_user:${otpToken}`;
    await redisClient.del(key);
  }

  async _storeResetToken(identifier, resetToken) {
    const redisClient = require('../lib/redis').getClient();
    const key = `reset_token:${resetToken}`;
    await redisClient.setEx(key, 900, identifier); // 15 minutes
  }

  async _verifyResetToken(resetToken) {
    const redisClient = require('../lib/redis').getClient();
    const key = `reset_token:${resetToken}`;
    return await redisClient.get(key);
  }

  async _clearResetToken(resetToken) {
    const redisClient = require('../lib/redis').getClient();
    const key = `reset_token:${resetToken}`;
    await redisClient.del(key);
  }
}
const UserRepository = require('../repositories/userRepository');
const userRepo = new UserRepository('adfs');
AuthService.setUserRepository(userRepo);
module.exports = new AuthService();