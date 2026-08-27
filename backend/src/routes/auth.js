const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { createRateLimiter } = require('../middleware/rateLimit');


// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 * @limit   5 requests per 15 minutes per IP
 */
router.post(
  '/register',
  createRateLimiter('register'),
  authController.register
);

/**
 * @route   POST /api/auth/register/verify
 * @desc    Verify registration OTP
 * @access  Public
 * @limit   3 attempts per 5 minutes per IP
 */
router.post(
  '/register/verify',
  createRateLimiter('verifyRegistration'),
  authController.verifyRegistration
);

/**
 * @route   POST /api/auth/login
 * @desc    Login with credentials
 * @access  Public
 * @limit   5 attempts per 15 minutes per IP (only counts failed attempts)
 */
router.post(
  '/login',
  createRateLimiter('login'),
  authController.login
);

/**
 * @route   POST /api/auth/device/verify
 * @desc    Verify device OTP
 * @access  Public
 * @limit   3 attempts per 5 minutes per IP
 */
router.post(
  '/device/verify',
  createRateLimiter('verifyDevice'),
  authController.verifyDevice
);



/**
 * @route   POST /api/auth/mfa/verify
 * @desc    Verify MFA code after login
 * @access  Public
 * @limit   5 attempts per 5 minutes per IP
 */
router.post(
  '/mfa/verify',
  createRateLimiter('verifyMfa'),
  authController.verifyMfaLogin
);
/**
 * @route   POST /api/auth/otp/resend
 * @desc    Resend OTP
 * @access  Public
 * @limit   3 resends per 5 minutes per IP
 */
router.post(
  '/otp/resend',
  createRateLimiter('resendOtp'),
  authController.resendOtp
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate forgot password flow
 * @access  Public
 * @limit   3 requests per 15 minutes per IP
 */
router.post(
  '/forgot-password',
  createRateLimiter('forgotPassword'),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/forgot-password/verify-otp
 * @desc    Verify forgot password OTP
 * @access  Public
 * @limit   3 attempts per 5 minutes per IP
 */
router.post(
  '/forgot-password/verify-otp',
  createRateLimiter('verifyResetOtp'),
  authController.verifyResetPasswordOtp
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with reset token
 * @access  Public
 * @limit   3 attempts per 15 minutes per IP
 */
router.post(
  '/reset-password',
  createRateLimiter('resetPassword'),
  authController.resetPassword
);

// ============================================
// OAUTH ROUTES (Social Login)
// ============================================

/**
 * @route   POST /api/auth/oauth/google/popup
 * @desc    Google popup login (RECOMMENDED - NO REDIRECT)
 * @access  Public
 * @body    { idToken, deviceInfo, rememberMe }
 *
 * THIS IS THE RECOMMENDED APPROACH:
 * 1. Frontend opens Google popup using Google Sign-In library
 * 2. User authenticates with Google
 * 3. Google returns ID token to frontend
 * 4. Frontend sends ID token to this endpoint
 * 5. Backend verifies token and returns JWT
 * 6. No redirect needed - direct JSON response
 */
router.post(
  '/oauth/google/popup',
  createRateLimiter('googlePopupLogin'),
  authController.googlePopupLogin
);

/**
 * @route   GET /api/auth/oauth/github
 * @desc    Initiate GitHub OAuth flow
 * @access  Public
 * @redirect to GitHub OAuth provider
 */



module.exports = router;