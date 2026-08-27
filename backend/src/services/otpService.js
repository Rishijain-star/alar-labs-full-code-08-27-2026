const crypto = require('crypto');
const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');

/**
 * OTP Service
 * Handles OTP generation, verification, and management
 */
class OtpService {
    constructor() {
        this.otpPrefix = 'otp:';
        this.otpLength = 6;
        this.otp_ttl = 300; // 5 minutes 
        this.max_attempts = 3;
    }

    /**
     * Generate OTP
     * @param {string} identifier - Email or phone number
     * @param {string} purpose - Purpose of OTP (REGISTRATION, LOGIN, PASSWORD_RESET, etc.)
     * @returns {Object} OTP data with token
     */
    async generateOtp(identifier, purpose = 'GENERAL') {
        try {
            const redis = await redisManager.getClientSafe();

            // Generate random 6-digit OTP
            const otp = this._generateNumericOtp();

            // Create unique token for this OTP request
            const token = crypto.randomBytes(32).toString('hex');

            const otp_data = {
                otp,
                identifier,
                purpose,
                attempts: 0,
                resend_count: 0,
                created_at: Date.now(),
            };

            const key = `${this.otpPrefix}${token}`;

            // Store OTP in Redis with TTL
            await redis.setEx(key, this.otp_ttl, JSON.stringify(otp_data));

            logger.info(`OTP generated for ${identifier} (${purpose}): ${otp}`);

            return {
                token,
                otp, // Remove this in production - only for testing
                expires_in: this.otp_ttl,
            };
        } catch (error) {
            logger.error('OTP generation error:', error);
            throw new Error('Failed to generate OTP');
        }
    }

    /**
     * Verify OTP
     * @param {string} token - OTP token
     * @param {string} otp - OTP to verify
     * @returns {Object} Verification result
     */
    async verifyOtp(token, otp) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;
            const data = await redis.get(key);

            if (!data) {
                logger.warn(`OTP verification failed: Token not found - ${token}`);
                return {
                    valid: false,
                    reason: 'OTP_EXPIRED',
                };
            }

            const otp_data = JSON.parse(data);

            // Check max attempts
            if (otp_data.attempts >= this.max_attempts) {
                await redis.del(key);
                logger.warn(`OTP verification failed: Max attempts exceeded - ${token}`);
                return {
                    valid: false,
                    reason: 'MAX_ATTEMPTS_EXCEEDED',
                };
            }

            // Increment attempts
            otp_data.attempts += 1;

            // Verify OTP
            if (otp_data.otp !== otp) {
                // Update attempts count
                const ttl = await redis.ttl(key);
                await redis.setEx(key, ttl > 0 ? ttl : this.otp_ttl, JSON.stringify(otp_data));

                logger.warn(`OTP verification failed: Invalid OTP - ${token}`);
                return {
                    valid: false,
                    reason: 'INVALID_OTP',
                    attempts_remaining: this.max_attempts - otp_data.attempts,
                };
            }

            // OTP is valid - delete it (single use)
            await redis.del(key);

            logger.info(`OTP verified successfully for: ${otp_data.identifier}`);

            return {
                valid: true,
                identifier: otp_data.identifier,
                purpose: otp_data.purpose,
            };
        } catch (error) {
            logger.error('OTP verification error:', error);
            return {
                valid: false,
                reason: 'VERIFICATION_ERROR',
            };
        }
    }

    /**
     * Get OTP details (for resend)
     * @param {string} token - OTP token
     * @returns {Object|null} OTP details
     */
    async getOtpDetails(token) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;

            const data = await redis.get(key);

            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            logger.error('Get OTP details error:', error);
            return null;
        }
    }

    /**
     * Increment resend count
     * @param {string} token - OTP token
     */
    async incrementResendCount(token) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;

            const data = await redis.get(key);

            if (!data) {
                return false;
            }

            const otp_data = JSON.parse(data);
            otp_data.resend_count += 1;

            const ttl = await redis.ttl(key);
            await redis.setEx(key, ttl > 0 ? ttl : this.otp_ttl, JSON.stringify(otp_data));

            return true;
        } catch (error) {
            logger.error('Increment resend count error:', error);
            return false;
        }
    }

    /**
     * Invalidate OTP
     * @param {string} token - OTP token
     */
    async invalidateOtp(token) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;
            await redis.del(key);
            logger.info(`OTP invalidated: ${token}`);
            return true;
        } catch (error) {
            logger.error('Invalidate OTP error:', error);
            return false;
        }
    }

    /**
     * Check if OTP exists and is valid
     * @param {string} token - OTP token
     * @returns {boolean}
     */
    async exists(token) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;
            const exists = await redis.exists(key);
            return exists === 1;
        } catch (error) {
            logger.error('Check OTP exists error:', error);
            return false;
        }
    }

    /**
     * Get remaining time for OTP
     * @param {string} token - OTP token
     * @returns {number} Seconds remaining
     */
    async getRemainingTime(token) {
        try {
            const redis = await redisManager.getClientSafe();
            const key = `${this.otpPrefix}${token}`;
            const ttl = await redis.ttl(key);
            return ttl > 0 ? ttl : 0;
        } catch (error) {
            logger.error('Get OTP remaining time error:', error);
            return 0;
        }
    }

    /**
     * Private: Generate numeric OTP
     */
    _generateNumericOtp() {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < this.otpLength; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }

        return otp;
    }

    /**
     * Private: Generate alphanumeric OTP (alternative)
     */
    _generateAlphanumericOtp() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let otp = '';

        for (let i = 0; i < this.otpLength; i++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            otp += chars[randomIndex];
        }

        return otp;
    }
}

module.exports = new OtpService();