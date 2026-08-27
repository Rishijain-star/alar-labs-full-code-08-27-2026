const sessionService = require('../services/sessionService');
const auditService = require('../services/auditService');
const totpService = require('../services/totpService');
const oauth2Service = require('../services/oauth2Service');
const deviceService = require('../services/deviceService');
const ipWhitelistService = require('../services/ipWhitelistService');
const tokenBlacklistService = require('../services/tokenBlacklistService');
const { createAccessToken, createRefreshToken, createSessionId } = require('../utils/token');
const config = require('../config');
const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');
const authService = require('../services/authService');

/**
 * AuthController - SECURE VERSION
 * Refresh tokens are NEVER sent in response body
 * Only session cookie + access token are returned
 */
class AuthController {
  /**
  * 1. REGISTER NEW USER
  * POST /api/auth/register
  * Body: { userId, email, phone, password, fullName, verificationType }
  */
  async register(req, res) {
    try {
      const {
        email,
        phone,
        password,
        fullName,
        verificationType = 'email',
      } = req.body;

      // Validation
      if (!password) {
        throw new AppError('and password are required', 400, 'MISSING_FIELDS');
      }

      if (!email && !phone) {
        throw new AppError('Email or phone is required', 400, 'MISSING_CONTACT');
      }

      const result = await authService.register({
        email,
        phone,
        password,
        fullName,
        verificationType,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Register controller error:', error);
      throw new AppError('Registration failed', 500, 'REGISTRATION_FAILED');
    }
  }

  /**
   * 2. VERIFY REGISTRATION OTP
   * POST /api/auth/register/verify
   * Body: { otpToken, otp }
   */
  async verifyRegistration(req, res) {
    try {
      const { otpToken, otp } = req.body;

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyRegistrationOtp(otpToken, otp);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify registration controller error:', error);
      throw new AppError('Registration verification failed', 500, 'VERIFICATION_FAILED');
    }
  }


  /**
   * Standard login with username/password
   * @route POST /api/auth/login
   */
  async login(req, res) {
    const startTime = Date.now();

    try {
      const { email, password, deviceInfo, rememberMe } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      // Check IP whitelist if enabled for user
      const ipAllowed = await ipWhitelistService.checkIp(email, ipAddress);
      if (!ipAllowed) {
        await auditService.log({
          email,
          action: 'LOGIN_BLOCKED',
          reason: 'IP_NOT_WHITELISTED',
          ipAddress,
          userAgent,
        });
        throw new AppError('Access denied from this IP address', 403, 'IP_BLOCKED');
      }

      // In production, verify credentials against database
      // const user = await userService.authenticate(userId, password);
      // if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

      // Simulate user authentication (replace with real auth)
      const user = { email, requiresMfa: true };

      // Check if MFA is required
      console.log('hiuser.requiresMfa',)
      if (user.requiresMfa) {
        console.log('hi')
        const mfaToken = await totpService.generateMfaChallenge(email);
        const generateSecret = await totpService.generateSecret(email);
        await auditService.log({
          email,
          action: 'LOGIN_MFA_REQUIRED',
          ipAddress,
          userAgent,
        });

        return res.status(200).json({
          success: true,
          requiresMfa: true,
          mfaToken,
          generateSecret,
          message: 'MFA verification required',
        });
      }

      // Generate device fingerprint
      const deviceFingerprint = await deviceService.generateFingerprint({
        userAgent,
        ipAddress,
        ...deviceInfo,
      });

      // Check if device is trusted
      const isTrustedDevice = await deviceService.isTrusted(email, deviceFingerprint);

      if (!isTrustedDevice && config.security.requireDeviceVerification) {
        await auditService.log({
          email,
          action: 'LOGIN_NEW_DEVICE',
          deviceFingerprint,
          ipAddress,
          userAgent,
        });

        return res.status(200).json({
          success: true,
          requiresDeviceVerification: true,
          message: 'Device verification required',
        });
      }

      // Create session
      const sessionId = createSessionId();
      const refreshToken = createRefreshToken();
      const accessToken = createAccessToken(email);

      // Calculate session TTL
      const sessionTtl = rememberMe
        ? config.session.extendedTtl
        : config.session.ttl;

      // Store session metadata
      const metadata = {
        userAgent,
        ipAddress,
        deviceInfo: deviceInfo || {},
        deviceFingerprint,
        isTrusted: isTrustedDevice,
        rememberMe: rememberMe || false,
      };

      await sessionService.createSession(sessionId, email, refreshToken, metadata, sessionTtl);

      // Trust this device if rememberMe is true
      if (rememberMe) {
        await deviceService.trustDevice(email, deviceFingerprint, {
          userAgent,
          ipAddress,
          deviceInfo,
        });
      }

      // Set session cookie (contains session ID)
      res.cookie(config.session.cookieName, sessionId, {
        ...config.session.cookieOptions,
        maxAge: sessionTtl * 1000,
      });

      // Audit log
      await auditService.log({
        email,
        action: 'LOGIN_SUCCESS',
        sessionId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        duration: Date.now() - startTime,
      });

      logger.info(`User logged in: ${email}, session: ${sessionId}`);

      // 🔒 SECURE: Only return access token, NOT refresh token
      res.status(200).json({
        success: true,
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 300, // 5 minutes
          // refresh_token: NOT INCLUDED - stored server-side only
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Login error:', error);
      throw new AppError('Login failed', 500, 'LOGIN_FAILED');
    }
  }

  /**
 * Verify and activate MFA
 * @route POST /api/owner/mfa/verify
 */
  // async verifyMfaSetup(req, res) {
  //   try {
  //     const { mfaToken, code } = req.body;

  //     const verified = await totpService.verifySetup(mfaToken, code);

  //     if (!verified) {
  //       throw new AppError('Invalid verification code', 400, 'INVALID_MFA_CODE');
  //     }

  //     // Activate MFA for user
  //     await totpService.activateMfa(email);

  //     await auditService.log({
  //       email,
  //       action: 'MFA_ENABLED',
  //       ipAddress: req.ip,
  //     });

  //     logger.info(`MFA enabled for user: ${email}`);

  //     res.status(200).json({
  //       success: true,
  //       message: 'MFA enabled successfully',
  //     });
  //   } catch (error) {
  //     if (error instanceof AppError) {
  //       throw error;
  //     }

  //     logger.error('Verify MFA setup error:', error);
  //     throw new AppError('Failed to verify MFA', 500, 'VERIFY_MFA_FAILED');
  //   }
  // }

  async verifyMfaSetup(req, res) {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and code are required',
      });
    }

    const result = await totpService.verifyCode(mfaToken, code);
    console.log('resultresultresult', result)
    if (!result.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA code',
      });
    }

    // ✅ MFA verified — now create session / tokens
    const sessionData = await sessionService.createSession(result.userId);

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      data: sessionData,
    });
  }

  /**
  * 4. VERIFY LOGIN OTP
  * POST /api/auth/login/verify-otp
  * Body: { otpToken, otp, deviceInfo, rememberMe }
  */
  async verifyLoginOtp(req, res) {
    try {
      const { otpToken, otp, deviceInfo, rememberMe } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyLoginOtp({
        otpToken,
        otp,
        ipAddress,
        userAgent,
        deviceInfo,
        rememberMe,
      });

      // Set session cookie (for web)
      res.cookie(config.session.cookieName, result.sessionId, {
        ...config.session.cookieOptions,
        maxAge: result.sessionTtl * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn,
          sessionId: result.sessionId, // For mobile apps
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify login OTP controller error:', error);
      throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
    }
  }

  /**
   * 5. RESEND OTP
   * POST /api/auth/otp/resend
   * Body: { otpToken }
   */
  async resendOtp(req, res) {
    try {
      const { otpToken } = req.body;

      if (!otpToken) {
        throw new AppError('OTP token is required', 400, 'MISSING_TOKEN');
      }

      const result = await authService.resendOtp(otpToken);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Resend OTP controller error:', error);
      throw new AppError('Failed to resend OTP', 500, 'RESEND_OTP_FAILED');
    }
  }

  /**
   * 6. FORGOT PASSWORD - Initiate
   * POST /api/auth/forgot-password
   * Body: { identifier } // email or phone
   */
  async forgotPassword(req, res) {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        throw new AppError('Email or phone is required', 400, 'MISSING_IDENTIFIER');
      }

      const result = await authService.forgotPassword(identifier);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Forgot password controller error:', error);
      throw new AppError('Failed to initiate password reset', 500, 'FORGOT_PASSWORD_FAILED');
    }
  }

  /**
   * 7. VERIFY RESET PASSWORD OTP
   * POST /api/auth/forgot-password/verify-otp
   * Body: { otpToken, otp }
   */
  async verifyResetPasswordOtp(req, res) {
    try {
      const { otpToken, otp } = req.body;

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyResetPasswordOtp(otpToken, otp);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          resetToken: result.resetToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify reset password OTP controller error:', error);
      throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
    }
  }

  /**
   * 8. RESET PASSWORD
   * POST /api/auth/reset-password
   * Body: { resetToken, newPassword }
   */
  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        throw new AppError('Reset token and new password are required', 400, 'MISSING_FIELDS');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
      }

      const result = await authService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Reset password controller error:', error);
      throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_FAILED');
    }
  }

  /**
   * 9. CHANGE PASSWORD (for logged-in users)
   * POST /api/auth/change-password
   * Body: { oldPassword, newPassword }
   * Requires: Authentication
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.user_id; // From auth middleware
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        throw new AppError('Old password and new password are required', 400, 'MISSING_FIELDS');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
      }

      if (oldPassword === newPassword) {
        throw new AppError('New password must be different from old password', 400, 'SAME_PASSWORD');
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Change password controller error:', error);
      throw new AppError('Failed to change password', 500, 'CHANGE_PASSWORD_FAILED');
    }
  }

  /**
   * 10. REFRESH TOKEN
   * POST /api/auth/refresh
   * Uses session cookie (web) or sessionId in body (mobile)
   */
  async refreshToken(req, res) {
    try {
      // For web: get from cookie
      // For mobile: get from body
      const sessionId = req.cookies[config.session.cookieName] || req.body.sessionId;

      if (!sessionId) {
        throw new AppError('Session not found', 401, 'NO_SESSION');
      }

      const result = await authService.refreshToken(sessionId);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          expiresIn: 300,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Refresh token controller error:', error);
      throw new AppError('Token refresh failed', 500, 'REFRESH_FAILED');
    }
  }

  /**
   * 11. LOGOUT
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName] || req.body.sessionId;
      const userId = req.user?.userId;

      if (sessionId && userId) {
        await authService.logout(sessionId, userId);
      }

      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      res.clearCookie(config.session.cookieName);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  }


  /**
   * 13. GET USER SESSIONS
   * GET /api/auth/sessions
   * Requires: Authentication
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.user_id;
      const currentSessionId = req.cookies[config.session.cookieName] || req.body.sessionId;

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
            isTrusted: session.isTrusted,
          };
        })
      );

      const validSessions = sessions.filter(s => s !== null);

      res.status(200).json({
        success: true,
        data: {
          sessions: validSessions,
          total: validSessions.length,
        },
      });
    } catch (error) {
      logger.error('Get sessions controller error:', error);
      throw new AppError('Failed to retrieve sessions', 500, 'GET_SESSIONS_FAILED');
    }
  }

  /**
   * 14. DELETE SPECIFIC SESSION
   * DELETE /api/auth/sessions/:sessionId
   * Requires: Authentication
   */
  async deleteSession(req, res) {
    try {
      const userId = req.user.user_id;
      const { sessionId } = req.params;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
      }

      // Verify session belongs to user
      const session = await sessionService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
      }

      await sessionService.deleteSession(sessionId);

      await auditService.log({
        userId,
        action: 'SESSION_DELETED',
        sessionId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Delete session controller error:', error);
      throw new AppError('Failed to delete session', 500, 'DELETE_SESSION_FAILED');
    }
  }

  /**
   * 15. GET CURRENT USER
   * GET /api/auth/me
   * Requires: Authentication
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.user_id;

      // In production, fetch full user details from database
      // const user = await userRepository.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      logger.error('Get current user controller error:', error);
      throw new AppError('Failed to get user details', 500, 'GET_USER_FAILED');
    }
  }

  /**
   * 16. VALIDATE SESSION
   * GET /api/auth/validate
   * Check if session is valid
   */
  async validateSession(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName] || req.query.sessionId;

      if (!sessionId) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'No session found',
        });
      }

      const session = await sessionService.getSession(sessionId);

      if (!session) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'Session expired',
        });
      }

      res.status(200).json({
        success: true,
        valid: true,
        data: {
          userId: session.userId,
          sessionId,
        },
      });
    } catch (error) {
      logger.error('Validate session controller error:', error);
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Validation failed',
      });
    }
  }
  /**
   * 12. LOGOUT FROM ALL DEVICES
   * POST /api/auth/logout-all
   * Requires: Authentication
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user.user_id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const result = await authService.logoutAll(userId);

      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
        sessionsTerminated: result.sessionsTerminated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Logout all controller error:', error);
      throw new AppError('Failed to logout from all devices', 500, 'LOGOUT_ALL_FAILED');
    }
  }





  /**
   * Refresh access token
   * 🔒 SECURE VERSION: Uses ONLY session cookie
   * @route POST /api/auth/refresh
   */
  async refresh(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName];

      if (!sessionId) {
        throw new AppError('Session cookie missing', 401, 'MISSING_SESSION', {
          action: 'logout',
        });
      }

      // Get session from Redis
      const session = await sessionService.getSession(sessionId);

      if (!session) {
        res.clearCookie(config.session.cookieName);
        throw new AppError('Invalid session', 401, 'INVALID_SESSION', {
          action: 'logout',
        });
      }

      // Check if user's tokens are blacklisted
      const isUserBlacklisted = await tokenBlacklistService.isUserBlacklisted(session.userId);
      if (isUserBlacklisted) {
        await sessionService.deleteSession(sessionId);
        res.clearCookie(config.session.cookieName);
        throw new AppError('All tokens have been revoked', 401, 'TOKENS_REVOKED', {
          action: 'logout',
        });
      }

      // Generate new tokens (token rotation)
      const newRefreshToken = createRefreshToken();
      const newAccessToken = createAccessToken(session.userId);

      // Update session with new refresh token
      await sessionService.updateSession(sessionId, newRefreshToken, session);

      await auditService.log({
        userId: session.userId,
        action: 'TOKEN_REFRESHED',
        sessionId,
        ipAddress: req.ip,
      });

      logger.info(`Token refreshed for session: ${sessionId}`);

      // 🔒 SECURE: Only return NEW access token
      // Refresh token stays server-side, rotated automatically
      res.status(200).json({
        success: true,
        data: {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: 300,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Refresh token error:', error);
      throw new AppError('Token refresh failed', 500, 'REFRESH_FAILED');
    }
  }

  /**
   * Logout from current device
   * @route POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName];

      if (sessionId) {
        const session = await sessionService.getSession(sessionId);

        await sessionService.deleteSession(sessionId);

        if (session) {
          await auditService.log({
            userId: session.userId,
            action: 'LOGOUT',
            sessionId,
            ipAddress: req.ip,
          });
        }

        logger.info(`Session logged out: ${sessionId}`);
      }

      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  }

  /**
   * Logout from all devices
   * @route POST /api/auth/logout-all
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user.user_id;

      if (!userId) {
        throw new AppError('User ID not found', 401, 'UNAUTHORIZED');
      }

      // Delete all sessions
      const deletedCount = await sessionService.deleteAllUserSessions(userId);

      res.clearCookie(config.session.cookieName);

      await auditService.log({
        userId,
        action: 'LOGOUT_ALL_DEVICES',
        sessionsTerminated: deletedCount,
        ipAddress: req.ip,
      });

      logger.info(`User ${userId} logged out from all devices (${deletedCount} sessions)`);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
        sessionsTerminated: deletedCount,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Logout all error:', error);
      throw new AppError('Failed to logout from all devices', 500, 'LOGOUT_ALL_FAILED');
    }
  }

  /**
   * OAuth2 login initiation
   * @route GET /api/auth/oauth/:provider
   */
  async oauthLogin(req, res) {
    try {
      const { provider } = req.params;
      const { redirect_uri } = req.query;

      const authUrl = await oauth2Service.getAuthorizationUrl(provider, redirect_uri);

      res.status(200).json({
        success: true,
        data: {
          authUrl,
          provider,
        },
      });
    } catch (error) {
      logger.error('OAuth login error:', error);
      throw new AppError('OAuth initialization failed', 500, 'OAUTH_INIT_FAILED');
    }
  }

  /**
   * OAuth2 callback handler
   * @route GET /api/auth/oauth/:provider/callback
   */
  async oauthCallback(req, res) {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      const oauthUser = await oauth2Service.handleCallback(provider, code, state);
      const userId = oauthUser.email;

      const sessionId = createSessionId();
      const refreshToken = createRefreshToken();
      const accessToken = createAccessToken(userId);

      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        oauthProvider: provider,
        oauthId: oauthUser.id,
      };

      await sessionService.createSession(sessionId, userId, refreshToken, metadata);

      res.cookie(config.session.cookieName, sessionId, config.session.cookieOptions);

      await auditService.log({
        userId,
        action: 'OAUTH_LOGIN_SUCCESS',
        provider,
        sessionId,
        ipAddress: req.ip,
      });

      logger.info(`OAuth login successful: ${userId}, provider: ${provider}`);

      // Redirect to frontend with ONLY access token
      const redirectUrl = `${config.oauth.frontendRedirect}?access_token=${accessToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect(`${config.oauth.frontendRedirect}?error=oauth_fconst authService = require('../services/authService');
const sessionService = require('../services/sessionService');
const auditService = require('../services/auditService');
const config = require('../config');
const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Authentication Controller
 * Handles all authentication endpoints for Web and Mobile
 */
class AuthController {
  /**
   * 1. REGISTER NEW USER
   * POST /api/auth/register
   * Body: { userId, email, phone, password, fullName, verificationType }
   */
  async register(req, res) {
    try {
      const {
        userId,
        email,
        phone,
        password,
        fullName,
        verificationType = 'email',
      } = req.body;

      // Validation
      if (!userId || !password) {
        throw new AppError('UserId and password are required', 400, 'MISSING_FIELDS');
      }

      if (!email && !phone) {
        throw new AppError('Email or phone is required', 400, 'MISSING_CONTACT');
      }

      const result = await authService.register({
        userId,
        email,
        phone,
        password,
        fullName,
        verificationType,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Register controller error:', error);
      throw new AppError('Registration failed', 500, 'REGISTRATION_FAILED');
    }
  }

  /**
   * 2. VERIFY REGISTRATION OTP
   * POST /api/auth/register/verify
   * Body: { otpToken, otp }
   */
  async verifyRegistration(req, res) {
    try {
      const { otpToken, otp } = req.body;

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyRegistrationOtp(otpToken, otp);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify registration controller error:', error);
      throw new AppError('Registration verification failed', 500, 'VERIFICATION_FAILED');
    }
  }

  /**
   * 3. LOGIN
   * POST /api/auth/login
   * Body: { userId, password, deviceInfo, rememberMe }
   */
  async login(req, res) {
    try {
      const { userId, password, deviceInfo, rememberMe } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      if (!userId || !password) {
        throw new AppError('UserId and password are required', 400, 'MISSING_CREDENTIALS');
      }

      const result = await authService.login({
        userId,
        password,
        ipAddress,
        userAgent,
        deviceInfo,
        rememberMe,
      });

      // If OTP or device verification required
      if (result.requiresOtp || result.requiresDeviceVerification) {
        return res.status(200).json({
          success: true,
          requiresOtp: result.requiresOtp,
          requiresDeviceVerification: result.requiresDeviceVerification,
          message: result.message,
          data: {
            otpToken: result.otpToken,
            deviceFingerprint: result.deviceFingerprint,
          },
        });
      }

      // Set session cookie (for web)
      res.cookie(config.session.cookieName, result.sessionId, {
        ...config.session.cookieOptions,
        maxAge: result.sessionTtl * 1000,
      });

      // Return tokens
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn,
          sessionId: result.sessionId, // For mobile apps
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Login controller error:', error);
      throw new AppError('Login failed', 500, 'LOGIN_FAILED');
    }
  }

  /**
   * 4. VERIFY LOGIN OTP
   * POST /api/auth/login/verify-otp
   * Body: { otpToken, otp, deviceInfo, rememberMe }
   */
  async verifyLoginOtp(req, res) {
    try {
      const { otpToken, otp, deviceInfo, rememberMe } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyLoginOtp({
        otpToken,
        otp,
        ipAddress,
        userAgent,
        deviceInfo,
        rememberMe,
      });

      // Set session cookie (for web)
      res.cookie(config.session.cookieName, result.sessionId, {
        ...config.session.cookieOptions,
        maxAge: result.sessionTtl * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn,
          sessionId: result.sessionId, // For mobile apps
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify login OTP controller error:', error);
      throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
    }
  }

  /**
   * 5. RESEND OTP
   * POST /api/auth/otp/resend
   * Body: { otpToken }
   */
  async resendOtp(req, res) {
    try {
      const { otpToken } = req.body;

      if (!otpToken) {
        throw new AppError('OTP token is required', 400, 'MISSING_TOKEN');
      }

      const result = await authService.resendOtp(otpToken);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Resend OTP controller error:', error);
      throw new AppError('Failed to resend OTP', 500, 'RESEND_OTP_FAILED');
    }
  }

  /**
   * 6. FORGOT PASSWORD - Initiate
   * POST /api/auth/forgot-password
   * Body: { identifier } // email or phone
   */
  async forgotPassword(req, res) {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        throw new AppError('Email or phone is required', 400, 'MISSING_IDENTIFIER');
      }

      const result = await authService.forgotPassword(identifier);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          otpToken: result.otpToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Forgot password controller error:', error);
      throw new AppError('Failed to initiate password reset', 500, 'FORGOT_PASSWORD_FAILED');
    }
  }

  /**
   * 7. VERIFY RESET PASSWORD OTP
   * POST /api/auth/forgot-password/verify-otp
   * Body: { otpToken, otp }
   */
  async verifyResetPasswordOtp(req, res) {
    try {
      const { otpToken, otp } = req.body;

      if (!otpToken || !otp) {
        throw new AppError('OTP token and OTP are required', 400, 'MISSING_FIELDS');
      }

      const result = await authService.verifyResetPasswordOtp(otpToken, otp);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          resetToken: result.resetToken,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Verify reset password OTP controller error:', error);
      throw new AppError('OTP verification failed', 500, 'OTP_VERIFICATION_FAILED');
    }
  }

  /**
   * 8. RESET PASSWORD
   * POST /api/auth/reset-password
   * Body: { resetToken, newPassword }
   */
  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        throw new AppError('Reset token and new password are required', 400, 'MISSING_FIELDS');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
      }

      const result = await authService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Reset password controller error:', error);
      throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_FAILED');
    }
  }

  /**
   * 9. CHANGE PASSWORD (for logged-in users)
   * POST /api/auth/change-password
   * Body: { oldPassword, newPassword }
   * Requires: Authentication
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.user_id; // From auth middleware
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        throw new AppError('Old password and new password are required', 400, 'MISSING_FIELDS');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
      }

      if (oldPassword === newPassword) {
        throw new AppError('New password must be different from old password', 400, 'SAME_PASSWORD');
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Change password controller error:', error);
      throw new AppError('Failed to change password', 500, 'CHANGE_PASSWORD_FAILED');
    }
  }

  /**
   * 10. REFRESH TOKEN
   * POST /api/auth/refresh
   * Uses session cookie (web) or sessionId in body (mobile)
   */
  async refreshToken(req, res) {
    try {
      // For web: get from cookie
      // For mobile: get from body
      const sessionId = req.cookies[config.session.cookieName] || req.body.sessionId;

      if (!sessionId) {
        throw new AppError('Session not found', 401, 'NO_SESSION');
      }

      const result = await authService.refreshToken(sessionId);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          expiresIn: 300,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Refresh token controller error:', error);
      throw new AppError('Token refresh failed', 500, 'REFRESH_FAILED');
    }
  }

  /**
   * 11. LOGOUT
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName] || req.body.sessionId;
      const userId = req.user?.userId;

      if (sessionId && userId) {
        await authService.logout(sessionId, userId);
      }

      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      res.clearCookie(config.session.cookieName);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  }

  /**
   * 12. LOGOUT FROM ALL DEVICES
   * POST /api/auth/logout-all
   * Requires: Authentication
   */
  async logoutAll(req, res) {
    try {
      const userId = req.user.user_id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const result = await authService.logoutAll(userId);

      res.clearCookie(config.session.cookieName);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
        sessionsTerminated: result.sessionsTerminated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Logout all controller error:', error);
      throw new AppError('Failed to logout from all devices', 500, 'LOGOUT_ALL_FAILED');
    }
  }

  /**
   * 13. GET USER SESSIONS
   * GET /api/auth/sessions
   * Requires: Authentication
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.user_id;
      const currentSessionId = req.cookies[config.session.cookieName] || req.body.sessionId;

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
            isTrusted: session.isTrusted,
          };
        })
      );

      const validSessions = sessions.filter(s => s !== null);

      res.status(200).json({
        success: true,
        data: {
          sessions: validSessions,
          total: validSessions.length,
        },
      });
    } catch (error) {
      logger.error('Get sessions controller error:', error);
      throw new AppError('Failed to retrieve sessions', 500, 'GET_SESSIONS_FAILED');
    }
  }

  /**
   * 14. DELETE SPECIFIC SESSION
   * DELETE /api/auth/sessions/:sessionId
   * Requires: Authentication
   */
  async deleteSession(req, res) {
    try {
      const userId = req.user.user_id;
      const { sessionId } = req.params;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
      }

      // Verify session belongs to user
      const session = await sessionService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
      }

      await sessionService.deleteSession(sessionId);

      await auditService.log({
        userId,
        action: 'SESSION_DELETED',
        sessionId,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Delete session controller error:', error);
      throw new AppError('Failed to delete session', 500, 'DELETE_SESSION_FAILED');
    }
  }

  /**
   * 15. GET CURRENT USER
   * GET /api/auth/me
   * Requires: Authentication
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.user_id;

      // In production, fetch full user details from database
      // const user = await userRepository.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      logger.error('Get current user controller error:', error);
      throw new AppError('Failed to get user details', 500, 'GET_USER_FAILED');
    }
  }

  /**
   * 16. VALIDATE SESSION
   * GET /api/auth/validate
   * Check if session is valid
   */
  async validateSession(req, res) {
    try {
      const sessionId = req.cookies[config.session.cookieName] || req.query.sessionId;

      if (!sessionId) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'No session found',
        });
      }

      const session = await sessionService.getSession(sessionId);

      if (!session) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'Session expired',
        });
      }

      res.status(200).json({
        success: true,
        valid: true,
        data: {
          userId: session.userId,
          sessionId,
        },
      });
    } catch (error) {
      logger.error('Validate session controller error:', error);
      res.status(200).json({
        success: true,
        valid: false,
        message: 'Validation failed',
      });
    }
  }
}

module.exports = new AuthController();ailed`);
    }
  }

  /**
   * WebAuthn registration initiation
   * @route POST /api/auth/webauthn/register/start
   */
  async webauthnRegisterStart(req, res) {
    try {
      const userId = req.user.user_id;
      const { displayName } = req.body;

      const options = await require('../services/webauthnService').generateRegistrationOptions(
        userId,
        displayName || userId
      );

      await sessionService.storeChallenge(userId, options.challenge);

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('WebAuthn registration start error:', error);
      throw new AppError('WebAuthn registration failed', 500, 'WEBAUTHN_REG_FAILED');
    }
  }

  /**
   * WebAuthn registration completion
   * @route POST /api/auth/webauthn/register/finish
   */
  async webauthnRegisterFinish(req, res) {
    try {
      const userId = req.user.user_id;
      const { credential, credentialName } = req.body;

      const challenge = await sessionService.getChallenge(userId);

      const verification = await require('../services/webauthnService').verifyRegistration(
        credential,
        challenge
      );

      if (!verification.verified) {
        throw new AppError('WebAuthn verification failed', 400, 'WEBAUTHN_VERIFICATION_FAILED');
      }

      await require('../services/webauthnService').storeCredential(
        userId,
        verification.registrationInfo,
        credentialName
      );

      await auditService.log({
        userId,
        action: 'WEBAUTHN_REGISTERED',
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'WebAuthn credential registered successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('WebAuthn registration finish error:', error);
      throw new AppError('WebAuthn registration failed', 500, 'WEBAUTHN_REG_FAILED');
    }
  }

  /**
   * WebAuthn authentication initiation
   * @route POST /api/auth/webauthn/login/start
   */
  async webauthnLoginStart(req, res) {
    try {
      const { userId } = req.body;

      const options = await require('../services/webauthnService').generateAuthenticationOptions(
        userId
      );

      await sessionService.storeChallenge(userId, options.challenge);

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('WebAuthn login start error:', error);
      throw new AppError('WebAuthn login failed', 500, 'WEBAUTHN_LOGIN_FAILED');
    }
  }

  /**
   * WebAuthn authentication completion
   * @route POST /api/auth/webauthn/login/finish
   */
  async webauthnLoginFinish(req, res) {
    try {
      const { userId, credential } = req.body;

      const challenge = await sessionService.getChallenge(userId);

      const verification = await require('../services/webauthnService').verifyAuthentication(
        userId,
        credential,
        challenge
      );

      if (!verification.verified) {
        throw new AppError('WebAuthn authentication failed', 401, 'WEBAUTHN_AUTH_FAILED');
      }

      const sessionId = createSessionId();
      const refreshToken = createRefreshToken();
      const accessToken = createAccessToken(userId);

      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        authMethod: 'webauthn',
        credentialId: verification.credentialId,
      };

      await sessionService.createSession(sessionId, userId, refreshToken, metadata);

      res.cookie(config.session.cookieName, sessionId, config.session.cookieOptions);

      await auditService.log({
        userId,
        action: 'WEBAUTHN_LOGIN_SUCCESS',
        sessionId,
        ipAddress: req.ip,
      });

      logger.info(`WebAuthn login successful: ${userId}`);

      // 🔒 SECURE: Only return access token
      res.status(200).json({
        success: true,
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 300,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('WebAuthn login finish error:', error);
      throw new AppError('WebAuthn login failed', 500, 'WEBAUTHN_LOGIN_FAILED');
    }
  }
}

module.exports = new AuthController();
