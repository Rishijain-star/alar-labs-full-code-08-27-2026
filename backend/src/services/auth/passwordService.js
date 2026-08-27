/**
 * Password Security Service
 * Handles password operations with compliance and security best practices
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
const { hashPassword, generateToken } = require('../utils/crypto');

class PasswordService {
  /**
   * Validate password strength
   * Requires: 12+ chars, uppercase, lowercase, number, special char
   */
  validateStrength(password) {
    const errors = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password was recently used (prevent reuse)
   * @param {Array} passwordHistory - Array of hashed previous passwords
   * @param {string} newPassword - Plain text new password
   * @param {number} maxRecheck - How many previous passwords to check
   */
  async checkPasswordReuse(passwordHistory, newPassword, maxRecheck = 5) {
    try {
      if (!passwordHistory || passwordHistory.length === 0) {
        return true; // No history to check
      }

      const recentHistory = passwordHistory.slice(0, maxRecheck);

      for (const hashedPassword of recentHistory) {
        const isMatch = await bcrypt.compare(newPassword, hashedPassword);
        if (isMatch) {
          return false; // Password was recently used
        }
      }

      return true; // Password is new
    } catch (error) {
      logger.error('[PasswordService] Password reuse check error:', error);
      throw new AppError('Password validation failed', 500);
    }
  }

  /**
   * Add password to history
   * @param {string} hashedPassword - Hashed password to add to history
   * @param {Array} currentHistory - Current password history
   * @param {number} maxHistory - Max passwords to remember
   */
  addToHistory(hashedPassword, currentHistory = [], maxHistory = 10) {
    try {
      const newHistory = [hashedPassword, ...(currentHistory || [])];
      return newHistory.slice(0, maxHistory);
    } catch (error) {
      logger.error('[PasswordService] Add to history error:', error);
      return [hashedPassword];
    }
  }

  /**
   * Generate password reset token
   * @returns {Object} { token, hashedToken, expiresAt }
   */
  generateResetToken() {
    try {
      const token = generateToken(32);
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      return {
        token, // Send to user via email
        hashedToken, // Store in database
        expiresAt,
      };
    } catch (error) {
      logger.error('[PasswordService] Reset token generation error:', error);
      throw new AppError('Failed to generate reset token', 500);
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Token from user (plain text)
   * @param {string} storedHash - Hash stored in database
   * @param {Date} expiresAt - Token expiration time
   */
  verifyResetToken(token, storedHash, expiresAt) {
    try {
      // Check expiration
      if (new Date() > expiresAt) {
        return {
          isValid: false,
          error: 'Reset token has expired',
        };
      }

      // Verify token hash
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const isValid = hash === storedHash;

      return {
        isValid,
        error: isValid ? null : 'Invalid reset token',
      };
    } catch (error) {
      logger.error('[PasswordService] Token verification error:', error);
      return {
        isValid: false,
        error: 'Token verification failed',
      };
    }
  }

  /**
   * Generate temporary password
   * Used when admin resets user password
   * @returns {string} Temporary password
   */
  generateTemporaryPassword() {
    try {
      // Generate password that meets strength requirements
      const chars = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        special: '!@#$%^&*()',
      };

      let password = '';
      password += chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)];
      password += chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)];
      password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
      password += chars.special[Math.floor(Math.random() * chars.special.length)];

      // Fill remaining characters randomly
      const allChars = Object.values(chars).join('');
      for (let i = password.length; i < 14; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }

      // Shuffle password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    } catch (error) {
      logger.error('[PasswordService] Temporary password generation error:', error);
      throw new AppError('Failed to generate temporary password', 500);
    }
  }

  /**
   * Calculate password age
   * @param {Date} passwordChangedAt - When password was last changed
   * @returns {number} Age in days
   */
  calculatePasswordAge(passwordChangedAt) {
    if (!passwordChangedAt) return null;
    const now = new Date();
    const ageMs = now - passwordChangedAt;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if password expiration is needed
   * @param {Date} passwordChangedAt - When password was changed
   * @param {number} expirationDays - Days until expiration (default: 90)
   * @returns {Object} { isExpired, daysRemaining }
   */
  checkPasswordExpiration(passwordChangedAt, expirationDays = 90) {
    try {
      if (!passwordChangedAt) {
        return {
          isExpired: false,
          daysRemaining: expirationDays,
        };
      }

      const age = this.calculatePasswordAge(passwordChangedAt);
      const daysRemaining = expirationDays - age;

      return {
        isExpired: daysRemaining <= 0,
        daysRemaining: Math.max(0, daysRemaining),
      };
    } catch (error) {
      logger.error('[PasswordService] Password expiration check error:', error);
      return {
        isExpired: false,
        daysRemaining: expirationDays,
      };
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      return await hashPassword(password);
    } catch (error) {
      logger.error('[PasswordService] Password hashing error:', error);
      throw new AppError('Failed to hash password', 500);
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('[PasswordService] Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate recovery codes for password less login
   * @param {number} count - Number of codes to generate
   * @returns {Array} Array of recovery codes
   */
  generateRecoveryCodes(count = 10) {
    try {
      const codes = [];
      for (let i = 0; i < count; i++) {
        codes.push(generateToken(4).toUpperCase()); // 8 chars in hex
      }
      return codes;
    } catch (error) {
      logger.error('[PasswordService] Recovery code generation error:', error);
      throw new AppError('Failed to generate recovery codes', 500);
    }
  }

  /**
   * Check password against compromised password lists (if integrated)
   * Placeholder for HaveIBeenPwned API integration or similar
   * @param {string} password - Password to check
   * @returns {Promise<boolean>} True if password is safe
   */
  async checkAgainstCommonPasswords(password) {
    try {
      // TODO: Implement HaveIBeenPwned API check
      // For now, include basic common password checks
      const commonPasswords = [
        'password', 'admin', 'letmein', 'welcome', 'monkey',
        'dragon', 'master', 'sunshine', 'princess', '123456',
      ];

      const lowerPassword = password.toLowerCase();
      return !commonPasswords.some(common => lowerPassword.includes(common));
    } catch (error) {
      logger.error('[PasswordService] Common password check error:', error);
      return true; // Fail open - don't block if check fails
    }
  }

  /**
   * Create password change audit log
   * @param {string} userId - User ID
   * @param {string} reason - Reason for change (manual, forced, reset, etc)
   * @param {string} changedBy - User ID who initiated change (for admin actions)
   * @returns {Object} Audit log entry
   */
  createAuditLogEntry(userId, reason = 'manual', changedBy = null) {
    return {
      userId,
      action: 'password_changed',
      reason,
      changedBy,
      timestamp: new Date(),
      oldPasswordHash: null, // Don't store old password, just track the change
    };
  }
}

module.exports = new PasswordService();
