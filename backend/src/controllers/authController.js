const authService = require('../services/authService');
const socialAuthService = require('../services/socialAuthService');
const googleTokenVerificationService = require('../services/googleTokenVerificationService');
const notificationService = require('../services/notificationService');
const config = require('../config');
const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');
const response = require('../utils/response');
const { getClientIP, getLocationFromIP } = require('../utils/geoHelper');
const { validate } = require('../helper/helper');

/**
 * Authentication Controller
 * Handles all authentication endpoints with proper MFA flow
 */
class AuthController {
  /**
   * @summary Register a new user
   * @description Handles the registration of a new user, including validation and OTP generation.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async register(req, res) {
    try {

      await validate(req.body, {
        email: 'required|email',
        phone: 'required|integer|minLength:10,maxLength:15',
        full_name: 'required|string|minLength:2|maxLength:100',
        password: 'nullable|string|minLength:8,maxLength:36',
        verification_type: 'string|in:email,phone'
      });


      const {
        email,
        phone,
        password,
        full_name,
        verification_type = 'email',
      } = req.body;

      const result = await authService.register({
        email,
        phone,
        password,
        full_name,
        verification_type,
      });

      return response.success(
        res,
        "Registration successful. Please verifys your account.",
        200,
        {
          otp_token: result.otp_token,
          expires_in: result.expires_in,
          verification_type: result.verification_type
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Register controller error:', error);
      return response.fail(res, 'Registration failed', 500);
    }
  }

  /**
   * @summary Verify a user's registration
   * @description Verifies a user's registration using an OTP.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async verifyRegistration(req, res) {
    try {
      await validate(req.body, {
        otp_token: 'required|string',
        otp: 'required|string|length:6'
      });

      const { otp_token, otp } = req.body;
      const ip = getClientIP(req);
      const location = getLocationFromIP(ip);

      // 🔒 SECURITY FIX: Don't mutate request body, pass location separately
      const result = await authService.verifyRegistrationOtp(otp_token, otp, {
        location,
        ip,
        country: location?.country,
        state: location?.state,
        city: location?.city,
        pincode: location?.pincode,
      });

      try {
        const { User } = require("../models");
        const user = await User.findByPk(result.user_id, { attributes: ["user_id", "email", "full_name"] });
        const transactionalEmailService = require("../services/transactionalEmailService");
        await transactionalEmailService.sendRegistrationEmails({ user });
        await notificationService.createNotification({
          userId: result.user_id,
          audience: "user",
          eventType: "email_verification_success",
          title: "Email verified",
          message: "Your account has been verified successfully.",
          metadata: {},
        });
      } catch (_) { }
      return response.success(
        res,
        result.message || 'Account verified successfully',
        200,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Verify registration controller error:', error);
      return response.fail(res, 'OTP verification failed', 500);
    }
  }

  /**
   * @summary Log in a user
   * @description Handles the login process, including MFA and new device verification.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async login(req, res) {
    try {

      await validate(req.body, {
        email: 'required|email',
        password: 'required|string',
        device_info: 'object',
        remember_me: 'boolean'
      });

      // 🔒 SECURITY FIX: Sanitize email input
      const email = req.body.email?.toLowerCase().trim();
      const password = req.body.password;
      const device_info = req.body.device_info;
      const remember_me = req.body.remember_me;

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return response.fail(res, 'Invalid email format', 400);
      }

      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      const result = await authService.login({
        email,
        password,
        ip_address,
        user_agent,
        device_info,
        remember_me,
      });

      // CASE 1: MFA Required
      if (result.requires_mfa) {
        return response.success(
          res,
          result.message || 'MFA verification required',
          200,
          {
            requires_mfa: true,
            mfa_token: result.mfa_token,
          }
        );
      }

      // CASE 2: Device Verification Required
      if (result.requires_device_verification) {
        return response.success(
          res,
          result.message || 'Device verification required',
          200,
          {
            requires_device_verification: true,
            otp_token: result.otp_token,
            device_fingerprint: result.device_fingerprint,
          }
        );
      }

      // CASE 3: Direct Login Success
      // Set session cookie (for web)
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      return response.success(
        res,
        'Login successful',
        200,
        {
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          session_id: result.session_id,
          user: result.user,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Login controller error:', error);
      return response.fail(res, 'Login failed', 500);
    }
  }

  /**
   * @summary Verify a new device
   * @description Verifies a new device using an OTP.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async verifyDevice(req, res) {
    try {

      await validate(req.body, {
        otp_token: 'required|string',
        otp: 'required|string|length:6',
        device_fingerprint: 'required|string',
        device_info: 'object',
        remember_me: 'boolean',
      });

      const { otp_token, otp, device_fingerprint, device_info, remember_me } = req.body;
      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      const result = await authService.verifyDevice({
        otp_token,
        otp,
        device_fingerprint,
        ip_address,
        user_agent,
        device_info,
        remember_me,
      });

      // Set session cookie (same as normal login)
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      return response.success(
        res,
        'Device verified successfully',
        200,
        {
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          session_id: result.session_id,
          user: result.user,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Device verification controller error:', error);
      return response.fail(res, 'Device verification failed', 500);
    }
  }

  /**
   * @summary Verify an MFA login
   * @description Verifies a user's login attempt using an MFA code.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async verifyMfaLogin(req, res) {
    try {


      await validate(req.body, {
        mfa_token: 'required|string',
        code: 'required|string|length:6',
        device_info: 'object',
        remember_me: 'boolean'
      });

      const { mfa_token, code, device_info, remember_me } = req.body;
      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      const result = await authService.verifyMfaLogin({
        mfa_token,
        code,
        ip_address,
        user_agent,
        device_info,
        remember_me,
      });

      // Set session cookie
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      return response.success(
        res,
        'MFA verification successful',
        200,
        {
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          session_id: result.session_id,
          user: result.user,
          permissions: result.user.permissions, // Include permissions in response for frontend caching
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('MFA verification controller error:', error);
      return response.fail(res, 'MFA verification failed', 500);
    }
  }

  /**
   * @summary Resend an OTP
   * @description Resends an OTP to the user.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async resendOtp(req, res) {
    try {

      await validate(req.body, {
        otp_token: 'required|string'
      });
      const { otp_token } = req.body;

      const result = await authService.resendOtp(otp_token);

      return response.success(
        res,
        result.message || 'OTP resent successfully',
        200,
        {
          otp_token: result.otp_token,
          expires_in: result.expires_in,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Resend OTP controller error:', error);
      return response.fail(res, 'Failed to resend OTP', 500);
    }
  }

  /**
   * @summary Initiate the forgot password process
   * @description Sends a password reset OTP to the user.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async forgotPassword(req, res) {
    try {

      await validate(req.body, {
        identifier: 'required|string'
      });

      const { identifier } = req.body;

      const result = await authService.forgotPassword(identifier);
      try {
        if (result?.user_id) {
          await notificationService.createNotification({
            userId: result.user_id,
            audience: "user",
            eventType: "password_reset_otp_sent",
            title: "Password reset OTP sent",
            message: "We sent a password reset OTP to your registered email/phone.",
            metadata: {},
          });
        }
      } catch (_) { }

      return response.success(
        res,
        result.message || 'Password reset OTP sent successfully',
        200,
        {
          otp_token: result.otp_token,
          expires_in: result.expires_in,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Forgot password controller error:', error);
      return response.fail(res, 'Failed to initiate password reset', 500);
    }
  }

  /**
   * @summary Verify a password reset OTP
   * @description Verifies a password reset OTP and returns a reset token.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async verifyResetPasswordOtp(req, res) {
    try {

      await validate(req.body, {
        otp_token: 'required|string',
        otp: 'required|string|length:6'
      });

      const { otp_token, otp } = req.body;

      const result = await authService.verifyResetPasswordOtp(otp_token, otp);
      try {
        if (result?.user_id) {
          await notificationService.createNotification({
            userId: result.user_id,
            audience: "user",
            eventType: "password_reset_otp_verified",
            title: "OTP verified",
            message: "Your password reset OTP has been verified.",
            metadata: {},
          });
        }
      } catch (_) { }

      return response.success(
        res,
        result.message || 'OTP verified successfully',
        200,
        {
          reset_token: result.reset_token,
          expires_in: result.expires_in,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Verify reset password OTP controller error:', error);
      return response.fail(res, 'OTP verification failed', 500);
    }
  }

  /**
   * @summary Reset a user's password
   * @description Resets a user's password using a reset token.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async resetPassword(req, res) {
    try {

      await validate(req.body, {
        reset_token: 'required|string',
        new_password: 'required|string|minLength:8'
      });
      const { reset_token, new_password } = req.body;

      const result = await authService.resetPassword(reset_token, new_password);
      try {
        if (result?.user_id) {
          await notificationService.createNotification({
            userId: result.user_id,
            audience: "user",
            eventType: "password_changed",
            title: "Password changed",
            message: "Your account password was changed successfully.",
            metadata: {},
          });
        }
      } catch (_) { }

      return response.success(
        res,
        result.message || 'Password reset successfully',
        200
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Reset password controller error:', error);
      return response.fail(res, 'Password reset failed', 500);
    }
  }

  /**
   * @summary Log in a user using Google
   * @description Handles the Google popup login process.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   * @returns {Promise<void>}
   */
  async googlePopupLogin(req, res) {
    try {
      const idToken = req.body?.id_token || req.body?.idToken;
      const deviceInfo = req.body?.device_info || req.body?.deviceInfo || {};
      const rememberMe = req.body?.remember_me ?? req.body?.rememberMe ?? false;
      await validate(
        { id_token: idToken, device_info: deviceInfo, remember_me: rememberMe },
        {
          id_token: 'required|string',
          device_info: 'object',
          remember_me: 'boolean'
        }
      );

      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      // Step 1: Verify Google ID token
      const google_payload = await googleTokenVerificationService.verifyIdToken(idToken);

      // Step 2: Extract user data from Google token
      const user_data = googleTokenVerificationService.extractUserData(google_payload);

      // Step 3: Handle OAuth login (find/create user)
      const result = await socialAuthService.handleGooglePopupLogin(user_data, {
        ip_address,
        user_agent,
        device_info: deviceInfo,
        remember_me: rememberMe,
      });

      // Step 4: Set session cookie
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      // Step 5: Return tokens directly (no redirect needed)
      return response.success(
        res,
        'Google login successful',
        200,
        {
          access_token: result.access_token,
          token_type: result.token_type,
          expires_in: result.expires_in,
          session_id: result.session_id,
          user: result.user,
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Google popup login error:', error);
      return response.fail(res, 'Google login failed', 500);
    }
  }

  /**
   * 16. GITHUB OAUTH CALLBACK
   * GET /api/auth/oauth/github/callback
   * Handled by Passport.js - redirects to frontend with user data
   */
  async githubCallback(req, res) {
    try {
      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      const result = await socialAuthService.handleOAuthCallback(req.user, {
        ip_address,
        user_agent,
        device_info: {},
        remember_me: true, // OAuth logins remember device by default
      });

      // Set session cookie
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      // Redirect to frontend with token (or return JSON for mobile)
      const frontend_url = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontend_url}/oauth-success?token=${result.access_token}&session_id=${result.session_id}`);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('GitHub callback error:', error);
      return response.fail(res, 'OAuth authentication failed', 500);
    }
  }

  /**
   * 17. GOOGLE OAUTH CALLBACK
   * GET /api/auth/oauth/google/callback
   * Handled by Passport.js - redirects to frontend with user data
   */
  async googleCallback(req, res) {
    try {
      const ip_address = req.ip;
      const user_agent = req.headers['user-agent'];

      const result = await socialAuthService.handleOAuthCallback(req.user, {
        ip_address,
        user_agent,
        device_info: {},
        remember_me: true, // OAuth logins remember device by default
      });

      // Set session cookie
      res.cookie(config.session.cookieName, result.session_id, {
        ...config.session.cookieOptions,
        maxAge: result.session_ttl * 1000,
      });

      // Redirect to frontend with token (or return JSON for mobile)
      const frontend_url = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontend_url}/oauth-success?token=${result.access_token}&session_id=${result.session_id}`);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Google callback error:', error);
      return response.fail(res, 'OAuth authentication failed', 500);
    }
  }

  /**
   * 18. LINK OAUTH PROVIDER TO EXISTING ACCOUNT
   * POST /api/auth/oauth/link
   * Body: { provider, oauth_id, oauth_email, oauth_avatar }
   * Requires: Authentication (user context from JWT)
   */
  async linkOAuthProvider(req, res) {
    try {
      await validate(req.body, {
        provider: 'required|string|in:github,google',
        oauth_id: 'required|string',
        oauth_email: 'required|email',
        oauth_avatar: 'nullable|string'
      });

      const { provider, oauth_id, oauth_email, oauth_avatar } = req.body;
      const user_id = req.user?.user_id; // From JWT auth middleware

      if (!user_id) {
        return response.fail(res, 'Unauthorized', 401);
      }

      const result = await socialAuthService.linkOAuthProvider(
        user_id,
        provider,
        oauth_id,
        oauth_email,
        oauth_avatar
      );

      return response.success(res, result.message, 200, result);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Link OAuth provider error:', error);
      return response.fail(res, 'Failed to link OAuth provider', 500);
    }
  }

  /**
   * 19. UNLINK OAUTH PROVIDER FROM ACCOUNT
   * DELETE /api/auth/oauth/unlink/:provider
   * Params: provider (github or google)
   * Requires: Authentication (user context from JWT)
   */
  async unlinkOAuthProvider(req, res) {
    try {
      const { provider } = req.params;
      const user_id = req.user?.user_id; // From JWT auth middleware

      if (!user_id) {
        return response.fail(res, 'Unauthorized', 401);
      }

      if (!['github', 'google'].includes(provider)) {
        return response.fail(res, 'Invalid provider', 400);
      }

      const result = await socialAuthService.unlinkOAuthProvider(user_id, provider);

      return response.success(res, result.message, 200, result);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Unlink OAuth provider error:', error);
      return response.fail(res, 'Failed to unlink OAuth provider', 500);
    }
  }

  /**
   * 20. GET OAUTH STATUS
   * GET /api/auth/oauth/status
   * Requires: Authentication (user context from JWT)
   */
  async getOAuthStatus(req, res) {
    try {
      const user_id = req.user?.user_id; // From JWT auth middleware

      if (!user_id) {
        return response.fail(res, 'Unauthorized', 401);
      }

      const result = await socialAuthService.getOAuthStatus(user_id);

      return response.success(res, 'OAuth status retrieved successfully', 200, result);
    } catch (error) {
      if (error instanceof AppError) {
        return response.fail(res, error.message, error.statusCode);
      }
      logger.error('Get OAuth status error:', error);
      return response.fail(res, 'Failed to get OAuth status', 500);
    }
  }

}

module.exports = new AuthController();