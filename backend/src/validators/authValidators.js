/**
 * Authentication Request Validators
 * Centralized validation schemas for all auth endpoints
 */

const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/errorHandler');

/**
 * Password strength validator
 * Requires: minimum 12 characters, uppercase, lowercase, number, special character
 */
function validatePasswordStrength(password) {
  const minLength = 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUppercase) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!hasLowercase) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!hasNumber) {
    throw new Error('Password must contain at least one number');
  }
  if (!hasSpecial) {
    throw new Error('Password must contain at least one special character');
  }

  return true;
}

/**
 * Email format and DNS validation
 */
async function validateEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return true;
}

/**
 * Phone number validation (basic international format)
 */
function validatePhoneFormat(phone) {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
  return true;
}

/**
 * Extract validation errors from express-validator
 */
function extractErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map(err => ({
      field: err.param || err.path,
      message: err.msg || err.message,
    }));
  }
  return null;
}

/**
 * Validation middleware that throws AppError on failure
 */
function validateRequest(req, res, next) {
  const errors = extractErrors(req);
  if (errors) {
    throw new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      { fields: errors }
    );
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Validation Chains for Each Endpoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registration validation chain
 * POST /api/auth/register
 */
const validateRegister = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email format')
    .customSanitizer((value) => value.toLowerCase()),

  body('phone')
    .trim()
    .optional()
    .custom(validatePhoneFormat)
    .withMessage('Invalid phone number format'),

  body('password')
    .trim()
    .custom(validatePasswordStrength)
    .withMessage('Password does not meet security requirements'),

  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('verification_type')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Verification type must be either email or phone'),
];

/**
 * Login validation chain
 * POST /api/auth/login
 */
const validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),

  body('phone')
    .trim()
    .optional()
    .custom(validatePhoneFormat)
    .withMessage('Invalid phone number format'),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),

  body('mfaCode')
    .optional()
    .trim()
    .matches(/^[0-9]{6,}$/)
    .withMessage('MFA code must be numeric'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('rememberMe must be a boolean'),

  (req, res, next) => {
    if (!req.body.email && !req.body.phone) {
      throw new AppError('Email or phone is required', 400, 'MISSING_CREDENTIALS');
    }
    next();
  },
];

/**
 * Password change validation chain
 * POST /api/auth/change-password
 */
const validateChangePassword = [
  body('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .trim()
    .custom(validatePasswordStrength)
    .withMessage('New password does not meet security requirements'),

  body('confirmPassword')
    .trim()
    .notEmpty()
    .withMessage('Password confirmation is required'),

  (req, res, next) => {
    if (req.body.newPassword !== req.body.confirmPassword) {
      throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH');
    }
    if (req.body.currentPassword === req.body.newPassword) {
      throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
    }
    next();
  },
];

/**
 * Password reset request validation
 * POST /api/auth/forgotten-password
 */
const validateForgottenPassword = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email format'),
];

/**
 * Password reset validation
 * POST /api/auth/reset-password
 */
const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .trim()
    .custom(validatePasswordStrength)
    .withMessage('New password does not meet security requirements'),

  body('confirmPassword')
    .trim()
    .notEmpty()
    .withMessage('Password confirmation is required'),

  (req, res, next) => {
    if (req.body.newPassword !== req.body.confirmPassword) {
      throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH');
    }
    next();
  },
];

/**
 * MFA setup validation
 * POST /api/auth/mfa/setup
 */
const validateMfaSetup = [
  body('verificationMethod')
    .isIn(['totp', 'sms', 'email'])
    .withMessage('Invalid verification method'),
];

/**
 * MFA verify validation
 * POST /api/auth/mfa/verify
 */
const validateMfaVerify = [
  body('code')
    .trim()
    .matches(/^[0-9A-F]{6,}$/i)
    .withMessage('Invalid MFA code format'),
];

/**
 * MFA backup codes validation
 * POST /api/auth/mfa/backup-codes
 */
const validateMfaBackupCodes = [
  body('codes')
    .isArray()
    .withMessage('Codes must be an array'),

  body('codes.*')
    .trim()
    .matches(/^[0-9A-F]{8,}$/i)
    .withMessage('Invalid backup code format'),
];

/**
 * Refresh token validation
 * POST /api/auth/refresh
 */
const validateRefresh = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

/**
 * Logout validation
 * POST /api/auth/logout
 */
const validateLogout = [
  body('logoutAllDevices')
    .optional()
    .isBoolean()
    .withMessage('logoutAllDevices must be a boolean'),
];

/**
 * Device update validation
 * PUT /api/auth/devices/:deviceId
 */
const validateDeviceUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Device name must not exceed 100 characters'),

  body('isTrusted')
    .optional()
    .isBoolean()
    .withMessage('isTrusted must be a boolean'),
];

module.exports = {
  // Helpers
  validatePasswordStrength,
  validateEmailFormat,
  validatePhoneFormat,
  extractErrors,
  validateRequest,

  // Validation chains
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgottenPassword,
  validateResetPassword,
  validateMfaSetup,
  validateMfaVerify,
  validateMfaBackupCodes,
  validateRefresh,
  validateLogout,
  validateDeviceUpdate,
};
