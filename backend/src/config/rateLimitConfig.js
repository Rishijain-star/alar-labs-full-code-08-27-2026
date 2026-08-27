/**
 * Rate Limit Configuration
 * Define rate limits for each route
 */

const rateLimitConfig = {
    // ===== REGISTRATION & VERIFICATION =====
    register: {
        max: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many registration attempts. Please try again later.',
        keyPrefix: 'register'
    },

    verifyRegistration: {
        max: 1000,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Too many verification attempts. Please request a new OTP.',
        keyPrefix: 'verify_reg'
    },

    // ===== LOGIN =====
    login: {
        max: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many login attempts. Please try again later.',
        keyPrefix: 'login',
        skipSuccessfulRequests: true // Only count failed attempts
    },

    googlePopupLogin: {
        max: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many Google login attempts.',
        keyPrefix: 'google_login'
    },

    verifyDevice: {
        max: 1000,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Too many device verification attempts.',
        keyPrefix: 'verify_device',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    },

    verifyMfa: {
        max: 1000,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Too many MFA verification attempts.',
        keyPrefix: 'mfa_verify'
    },

    // ===== OTP =====
    resendOtp: {
        max: 1000,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Maximum OTP resend limit reached. Please try again later.',
        keyPrefix: 'resend_otp'
    },

    // ===== PASSWORD MANAGEMENT =====
    forgotPassword: {
        max: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many password reset requests. Please try again later.',
        keyPrefix: 'forgot_pass'
    },

    verifyResetOtp: {
        max: 1000,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Too many verification attempts.',
        keyPrefix: 'verify_reset'
    },

    resetPassword: {
        max: 1000,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many password reset attempts.',
        keyPrefix: 'reset_pass'
    },

    // ===== GENERAL CRUD =====
    default: {
        max: 1500,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many requests. Please try again later.',
        keyPrefix: 'default'
    },

    create: {
        max: 50,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many creation attempts.',
        keyPrefix: 'create'
    },

    update: {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many update attempts.',
        keyPrefix: 'update'
    },

    delete: {
        max: 50,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many deletion attempts.',
        keyPrefix: 'delete'
    },

    /**
   * Default rate limit for authenticated users
   * Applied to most protected endpoints
   */
    authenticatedDefault: {
        max: 1500,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many requests. Please try again later.',
        keyPrefix: 'auth_default',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },

    /**
     * Token refresh
     */
    refreshToken: {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many token refresh attempts',
        keyPrefix: 'token_refresh',
        skipSuccessfulRequests: false,
        skipFailedRequests: true
    },

    /**
     * Session validation
     */
    validateSession: {
        max: 200,
        windowMs: 60 * 1000, // 1 minute
        message: 'Too many validation requests',
        keyPrefix: 'validate_session',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },

    // ============================================
    // MFA & DEVICE VERIFICATION
    // ============================================

    /**
     * Enable MFA completion (verification)
     */
    enableMfaComplete: {
        max: 10,
        windowMs: 5 * 60 * 1000, // 5 minutes
        message: 'Too many MFA verification attempts',
        keyPrefix: 'mfa_enable_verify',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    },

    /**
     * Disable MFA
     */
    disableMfa: {
        max: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many MFA disable attempts',
        keyPrefix: 'mfa_disable',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    },

    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes: {
        max: 5,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Backup codes regeneration limit exceeded',
        keyPrefix: 'backup_codes_regen',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    },

    // ============================================
    // PASSWORD MANAGEMENT
    // ============================================

    /**
     * Change password
     */
    changePassword: {
        max: 10,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many password change attempts',
        keyPrefix: 'change_password',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
    },

    // ============================================
    // RBAC - ROLE MANAGEMENT
    // ============================================

    /**
     * Create role
     */
    createRole: {
        max: 20,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many role creation attempts',
        keyPrefix: 'role_create',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },

    /**
     * Update role
     */
    updateRole: {
        max: 50,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many role update attempts',
        keyPrefix: 'role_update',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },

    /**
     * Delete role
     */
    deleteRole: {
        max: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many role deletion attempts',
        keyPrefix: 'role_delete',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },
    // ===== PUBLIC GENERAL =====
    publicDefault: {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many requests from this IP.',
        keyPrefix: 'public_default'
    }
};

module.exports = rateLimitConfig;