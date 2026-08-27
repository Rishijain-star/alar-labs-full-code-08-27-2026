const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');
const UserRepository = require('../repositories/userRepository');

class TotpService {
    constructor() {
        this.mfaPrefix = 'mfa:';
        this.mfaChallengePrefix = 'mfa_challenge:';
        this.mfaSetupPrefix = 'mfa_setup:';
        this.challengeTTL = 5 * 60; // 5 minutes
        this.setupTTL = 10 * 60; // 10 minutes
        this.userRepository = new UserRepository();
    }

    /**
 * 🧪 BONUS: Add this test method to your TotpService class
 * This helps you test the secret directly
 */
    async testSecret(secret, userCode) {
        logger.info(`\n🧪 TESTING SECRET: ${secret.substring(0, 10)}...`);
        logger.info(`📱 User entered code: ${userCode}`);

        const currentToken = speakeasy.totp({
            secret,
            encoding: 'base32',
        });

        logger.info(`🔑 Expected current token: ${currentToken}`);

        const matches = currentToken === String(userCode).trim();
        logger.info(`Result: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);

        // Show valid tokens
        const currentTime = Math.floor(Date.now() / 1000);
        logger.info(`\n📋 Currently valid tokens:`);

        for (let offset = -1; offset <= 1; offset++) {
            const testTime = currentTime + (offset * 30);
            const token = speakeasy.totp({
                secret,
                encoding: 'base32',
                time: testTime
            });

            logger.info(`   ${token} ${offset === 0 ? '← NOW' : offset < 0 ? '(past)' : '(future)'}`);
        }

        return matches;
    }

    /**
     * Get user from database
     */
    async _getUser(user_id) {
        if (!this.userRepository) {
            throw new Error('User repository not configured');
        }
        return await this.userRepository.findByUserId(user_id);
    }

    /* ====================================
       MFA SETUP & ACTIVATION
    ==================================== */

    /* ====================================
        MFA SETUP & ACTIVATION
     ==================================== */

    async generateSecret(user_id) {
        try {
            const user = await this._getUser(user_id);
            if (!user) throw new Error('User not found');

            if (user.isMfaEnabled()) {
                throw new Error('MFA is already enabled for this user');
            }

            // ─── FIX: very clean, safe label ─────────────────────────────────
            const label = user.email ? `App:${user.email.split('@')[0]}` : `App:${user_id.split('-')[0]}`;
            const secretObj = speakeasy.generateSecret({
                name: label,
                issuer: 'App',           // short & plain
                length: 32,
            });

            const backup_codes = this.generateBackupCodes();

            const redis = await redisManager.getClientSafe();
            const setupKey = `${this.mfaSetupPrefix}${user_id}`;

            await redis.setEx(
                setupKey,
                this.setupTTL,
                JSON.stringify({
                    secret: secretObj.base32,
                    backup_codes,
                    createdAt: Date.now(),
                })
            );

            const qr_code = await QRCode.toDataURL(secretObj.otpauth_url);

            logger.info(`MFA secret generated for user: ${user_id}`);
            logger.debug(`Secret base32: ${secretObj.base32.substring(0, 12)}...`);

            return {
                secret: secretObj.base32,
                qr_code,
                backup_codes,
            };
        } catch (error) {
            logger.error('Failed to generate TOTP secret:', error);
            throw error;
        }
    }

    generateBackupCodes(count = 10) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    async verifySetup(user_id, code) {
        try {
            const redis = await redisManager.getClientSafe();
            const setupKey = `${this.mfaSetupPrefix}${user_id}`;

            logger.info(`Verifying MFA setup for user: ${user_id}, code: ${code}`);

            const setupData = await redis.get(setupKey);
            if (!setupData) {
                logger.warn(`MFA setup data not found for user: ${user_id}`);
                return false;
            }

            const { secret } = JSON.parse(setupData);

            logger.info(`Retrieved secret from Redis: ${secret.substring(0, 12)}...`);
            logger.info(`Full secret for debugging: ${secret}`);

            const cleanCode = String(code).trim().replace(/\s/g, '');

            logger.info(`Original code: ${code}, Cleaned code: ${cleanCode}`);

            if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
                logger.warn(`Invalid code format: ${cleanCode}`);
                return false;
            }

            const expectedToken = speakeasy.totp({
                secret,
                encoding: 'base32',
            });

            logger.info(`🔑 Expected token: ${expectedToken}, Received: ${cleanCode}`);

            const verified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token: cleanCode,
                window: 2,          // ← ±60 seconds - generous but still secure
            });

            if (verified) {
                logger.info(`✅ MFA setup verified for user: ${user_id}`);
                return true;
            }

            logger.warn(`❌ MFA setup verification failed for user: ${user_id}`);
            logger.info(`Expected token: ${expectedToken}, Received: ${cleanCode}`);
            logger.info(`Current Unix time: ${Math.floor(Date.now() / 1000)}`);
            logger.info(`Current ISO time: ${new Date().toISOString()}`);

            // Show ±2 windows (most useful range)
            const currentTime = Math.floor(Date.now() / 1000);
            logger.info(`📋 Valid tokens in time windows (±60s):`);

            for (let offset = -2; offset <= 2; offset++) {
                const testTime = currentTime + (offset * 30);
                const token = speakeasy.totp({
                    secret,
                    encoding: 'base32',
                    time: testTime
                });
                const label = offset === 0 ? '← NOW' :
                    offset < 0 ? `(${Math.abs(offset) * 30}s ago)` :
                        `(${offset * 30}s ahead)`;
                logger.info(`   ${token} ${label}${token === cleanCode ? '  MATCH!' : ''}`);
            }

            return false;
        } catch (error) {
            logger.error('Failed to verify TOTP setup:', error);
            return false;
        }
    }

    /**
     * Activate MFA for user (save to database and Redis)
     * @param {string} user_id - User identifier
     */
    async activateMfa(user_id) {
        try {
            const redis = await redisManager.getClientSafe();
            const setupKey = `${this.mfaSetupPrefix}${user_id}`;
            const mfaKey = `${this.mfaPrefix}${user_id}`;

            // Get setup data from Redis
            const setupData = await redis.get(setupKey);
            if (!setupData) {
                throw new Error('Setup data not found');
            }

            const { secret, backup_codes } = JSON.parse(setupData);

            // Get user from database
            const user = await this._getUser(user_id);
            if (!user) {
                throw new Error('User not found');
            }

            // Save to database (will hash backup codes)
            await user.enableMfa(secret, backup_codes);

            // Also store in Redis for faster access
            await redis.set(
                mfaKey,
                JSON.stringify({
                    secret,
                    enabled: true,
                    activatedAt: Date.now(),
                    backup_codes_count: backup_codes.length,
                })
            );

            // Clean up setup data
            await redis.del(setupKey);

            logger.info(`MFA activated for user: ${user_id}`);
            return true;
        } catch (error) {
            logger.error('Failed to activate MFA:', error);
            throw error;
        }
    }

    /* ====================================
       MFA VERIFICATION
    ==================================== */

    /**
     * 🔧 FIXED: Verify TOTP code for authenticated user
     * @param {string} user_id - User identifier
     * @param {string} code - TOTP code
     */
    async verifyUserCode(user_id, code) {
        try {
            logger.debug(`Verifying user MFA code for: ${user_id}, code: ${code}`);

            // Get user from database
            const user = await this._getUser(user_id);
            if (!user) {
                logger.warn(`User not found: ${user_id}`);
                return false;
            }

            if (!user.isMfaEnabled()) {
                logger.warn(`MFA not enabled for user: ${user_id}`);
                return false;
            }

            logger.debug(`User MFA secret exists: ${!!user.mfa_secret}`);

            // 🔧 FIX: Clean and validate the input code
            const cleanCode = String(code).trim().replace(/\s/g, '');

            if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
                logger.warn(`Invalid code format: ${cleanCode}`);
                return false;
            }

            // 🔧 FIX: Use the user model's verifyMfaCode method with cleaned code
            const verified = await user.verifyMfaCode(cleanCode);

            if (verified) {
                logger.info(`✅ MFA verified for user: ${user_id}`);
            } else {
                logger.warn(`❌ MFA verification failed for user: ${user_id}`);

                // Debug current expected token
                if (user.mfa_secret) {
                    const currentToken = speakeasy.totp({
                        secret: user.mfa_secret,
                        encoding: 'base32',
                    });

                }
            }

            return verified;
        } catch (error) {
            logger.error('Failed to verify user code:', error);
            return false;
        }
    }

    /**
     * Generate MFA challenge token for login
     * @param {string} user_id - User identifier
     */
    async generateMfaChallenge(user_id) {
        try {
            const redis = await redisManager.getClientSafe();
            const challengeToken = crypto.randomBytes(32).toString('hex');
            const challengeKey = `${this.mfaChallengePrefix}${challengeToken}`;

            await redis.setEx(
                challengeKey,
                this.challengeTTL,
                JSON.stringify({
                    user_id,
                    createdAt: Date.now(),
                })
            );

            return challengeToken;
        } catch (error) {
            logger.error('Failed to generate MFA challenge:', error);
            throw new Error('Failed to generate MFA challenge');
        }
    }

    /**
     * 🔧 FIXED: Verify MFA code during login using challenge token
     * @param {string} mfaToken - Challenge token
     * @param {string} code - TOTP code
     */
    async verifyCode(mfaToken, code) {
        try {
            const redis = await redisManager.getClientSafe();
            const challengeKey = `${this.mfaChallengePrefix}${mfaToken}`;


            const challengeData = await redis.get(challengeKey);
            if (!challengeData) {
                logger.warn(`❌ MFA challenge not found: ${mfaToken.substring(0, 10)}...`);
                return { valid: false };
            }

            const { user_id } = JSON.parse(challengeData);
            logger.debug(`Found user_id in challenge: ${user_id}`);

            // 🔧 FIX: Verify the code with cleaned input
            const verified = await this.verifyUserCode(user_id, code);

            if (verified) {
                // Delete challenge after successful verification (one-time use)
                await redis.del(challengeKey);
                logger.info(`✅ MFA code verified for user: ${user_id}`);
                return { valid: true, user_id };
            }

            logger.warn(`❌ Invalid MFA code for user: ${user_id}`);
            return { valid: false };
        } catch (error) {
            logger.error('Failed to verify MFA code:', error);
            return { valid: false };
        }
    }

    /* ====================================
       MFA MANAGEMENT
    ==================================== */

    /**
     * Disable MFA for user
     * @param {string} user_id - User identifier
     */
    async disableMfa(user_id) {
        try {
            // Remove from database
            const user = await this._getUser(user_id);
            if (user) {
                await user.disableMfa();
            }

            // Remove from Redis
            const redis = await redisManager.getClientSafe();
            const mfaKey = `${this.mfaPrefix}${user_id}`;
            await redis.del(mfaKey);

            logger.info(`MFA disabled for user: ${user_id}`);
            return true;
        } catch (error) {
            logger.error('Failed to disable MFA:', error);
            throw new Error('Failed to disable MFA');
        }
    }

    /**
     * Get MFA status for user
     * @param {string} user_id - User identifier
     */
    async getMfaStatus(user_id) {
        try {
            const uid =
                user_id && typeof user_id === 'object'
                    ? (user_id.user_id ?? user_id.id ?? user_id.userId ?? null)
                    : user_id;
            if (!uid) {
                return { enabled: false };
            }
            const user = await this._getUser(uid);
            if (!user) {
                return { enabled: false };
            }

            return {
                enabled: user.isMfaEnabled(),
                activatedAt: user.mfa_enabled_at,
                lastVerifiedAt: user.last_mfa_verified_at,
                backup_codes_remaining: user.getBackupCodesCount(),
            };
        } catch (error) {
            logger.error('Failed to get MFA status:', error);
            return { enabled: false };
        }
    }

    /**
     * Regenerate backup codes
     * @param {string} user_id - User identifier
     */
    async regenerateBackupCodes(user_id) {
        try {
            const user = await this._getUser(user_id);
            if (!user) {
                throw new Error('User not found');
            }

            if (!user.isMfaEnabled()) {
                throw new Error('MFA not enabled');
            }

            // Use model method to regenerate
            const newBackupCodes = await user.regenerateBackupCodes();

            // Update Redis cache
            const redis = await redisManager.getClientSafe();
            const mfaKey = `${this.mfaPrefix}${user_id}`;
            const mfaData = await redis.get(mfaKey);

            if (mfaData) {
                const data = JSON.parse(mfaData);
                data.backup_codes_count = newBackupCodes.length;
                await redis.set(mfaKey, JSON.stringify(data));
            }

            logger.info(`Backup codes regenerated for user: ${user_id}`);
            return newBackupCodes;
        } catch (error) {
            logger.error('Failed to regenerate backup codes:', error);
            throw error;
        }
    }

    /**
     * Get remaining backup codes count
     * @param {string} user_id - User identifier
     */
    async getBackupCodesCount(user_id) {
        try {
            const user = await this._getUser(user_id);
            if (!user) {
                return 0;
            }
            return user.getBackupCodesCount();
        } catch (error) {
            logger.error('Failed to get backup codes count:', error);
            return 0;
        }
    }

    /* ====================================
       TESTING / DEBUG METHODS
    ==================================== */

    /**
     * Generate current valid token for a secret (for debugging)
     * @param {string} secret - Base32 encoded secret
     */
    generateCurrentToken(secret) {
        return speakeasy.totp({
            secret,
            encoding: 'base32',
        });
    }

    /**
     * 🆕 NEW: Generate multiple valid tokens for testing (current + next windows)
     * Useful for debugging timing issues
     */
    generateValidTokens(secret) {
        const tokens = [];
        const currentTime = Math.floor(Date.now() / 1000);

        // Generate tokens for previous, current, and next 30-second windows
        for (let offset = -1; offset <= 1; offset++) {
            const time = currentTime + (offset * 30);
            const token = speakeasy.totp({
                secret,
                encoding: 'base32',
                time,
            });
            tokens.push({
                token,
                offset,
                timeWindow: new Date(time * 1000).toISOString()
            });
        }

        return tokens;
    }

    /* ====================================
       CACHE SYNCHRONIZATION
    ==================================== */

    /**
     * Sync user MFA data from database to Redis cache
     * @param {string} user_id - User identifier
     */
    async syncMfaCache(user_id) {
        try {
            const user = await this._getUser(user_id);
            if (!user || !user.isMfaEnabled()) {
                return;
            }

            const redis = await redisManager.getClientSafe();
            const mfaKey = `${this.mfaPrefix}${user_id}`;

            await redis.set(
                mfaKey,
                JSON.stringify({
                    secret: user.mfa_secret,
                    enabled: user.requires_mfa,
                    activatedAt: user.mfa_enabled_at?.getTime(),
                    backup_codes_count: user.getBackupCodesCount(),
                })
            );

            logger.info(`MFA cache synced for user: ${user_id}`);
        } catch (error) {
            logger.error('Failed to sync MFA cache:', error);
        }
    }

    /**
     * Clear MFA cache for user
     * @param {string} user_id - User identifier
     */
    async clearMfaCache(user_id) {
        try {
            const redis = await redisManager.getClientSafe();
            const mfaKey = `${this.mfaPrefix}${user_id}`;
            await redis.del(mfaKey);
            logger.info(`MFA cache cleared for user: ${user_id}`);
        } catch (error) {
            logger.error('Failed to clear MFA cache:', error);
        }
    }
}

module.exports = new TotpService();