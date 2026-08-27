const { OAuth2Client } = require('google-auth-library');
const logger = require('../lib/logger');
const { AppError } = require('../middleware/errorHandler');

function envTrim(key) {
    const raw = process.env[key];
    if (raw == null) return "";
    const t = String(raw).trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1).trim();
    }
    return t;
}

function parseAllowedClientIds() {
    const single = envTrim("GOOGLE_CLIENT_ID");
    const csv = envTrim("GOOGLE_CLIENT_IDS");
    const fromFrontendEnv = envTrim("VITE_GOOGLE_CLIENT_ID");
    const list = []
        .concat(single ? [single] : [])
        .concat(csv ? csv.split(",").map((x) => x.trim()).filter(Boolean) : [])
        .concat(fromFrontendEnv ? [fromFrontendEnv] : []);
    return [...new Set(list)];
}

/**
 * Google Token Verification Service
 * Handles validation of Google ID tokens received from frontend popup
 *
 * Flow:
 * 1. Frontend opens Google popup with Sign-In button
 * 2. User authenticates with Google
 * 3. Google returns ID token to frontend
 * 4. Frontend sends ID token to backend via /api/auth/oauth/google/popup
 * 5. Backend validates token with Google's API
 * 6. Backend returns JWT access token
 */
class GoogleTokenVerificationService {
    constructor() {
        this.client = null;
        this.allowedClientIds = [];
        this.initializeClient();
    }

    /**
     * Initialize Google OAuth2 Client
     * Called during service construction
     */
    initializeClient() {
        try {
            const allowedClientIds = parseAllowedClientIds();

            if (!allowedClientIds.length) {
                logger.warn('No GOOGLE_CLIENT_ID/GOOGLE_CLIENT_IDS set - Google popup login disabled');
                return;
            }

            this.allowedClientIds = allowedClientIds;
            // Initialize OAuth2Client with just client ID (for ID token verification)
            this.client = new OAuth2Client(allowedClientIds[0]);
            logger.info(`Google OAuth2 Client initialized for token verification (${allowedClientIds.length} allowed audience(s))`);
        } catch (error) {
            logger.error('Failed to initialize Google OAuth2 Client:', error);
        }
    }

    /**
     * Verify Google ID Token
     *
     * Called when frontend sends ID token from Google popup
     * Validates token signature and claims
     *
     * @param {string} idToken - Token from Google
     * @returns {object} Decoded token payload with user info
     */
    async verifyIdToken(idToken) {
        try {
            if (!this.client) {
                throw new AppError('Google OAuth not configured', 500, 'OAUTH_NOT_CONFIGURED');
            }
            if (!idToken || typeof idToken !== "string") {
                throw new AppError('Google credential not received', 400, 'MISSING_GOOGLE_CREDENTIAL');
            }

            // Verify token with Google (strict audience check first).
            let ticket;
            try {
                ticket = await this.client.verifyIdToken({
                    idToken,
                    audience: this.allowedClientIds.length ? this.allowedClientIds : undefined,
                });
            } catch (strictErr) {
                const isDev = String(process.env.NODE_ENV || "").toLowerCase().includes("dev");
                const msg = String(strictErr?.message || "");
                const audienceMismatch = /audience|wrong recipient|requiredaudience/i.test(msg);
                // Dev fallback: allow token verification without audience restriction
                // so local env mismatches don't block login while debugging.
                if (isDev && audienceMismatch) {
                    logger.warn("Google token strict audience check failed in development, retrying with relaxed audience validation.");
                    ticket = await this.client.verifyIdToken({ idToken });
                } else {
                    throw strictErr;
                }
            }

            // Get payload (user information)
            const payload = ticket.getPayload();

            // Validate required claims
            if (!payload.email) {
                throw new AppError('Google token missing email claim', 400, 'INVALID_TOKEN');
            }

            if (!payload.sub) {
                throw new AppError('Google token missing user ID', 400, 'INVALID_TOKEN');
            }

            // Check if email is verified by Google
            if (!payload.email_verified) {
                logger.warn(`Google token received for unverified email: ${payload.email}`);
                // Note: You can choose to reject or accept unverified emails
                // For now, we accept it since Google providers usually verify emails
            }

            logger.info(`Google ID token verified for: ${payload.email}`);

            // Return sanitized payload
            return {
                oauthId: String(payload.sub),
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                email_verified: payload.email_verified,
                iss: payload.iss, // Issuer (should be https://accounts.google.com)
                aud: payload.aud, // Audience (should be GOOGLE_CLIENT_ID)
            };
        } catch (error) {
            logger.error('Google ID token verification failed:', {
                message: error?.message,
                code: error?.code,
                allowedAudiences: this.allowedClientIds,
            });

            // Handle specific JWT errors
            if (error.message.includes('Token used too late')) {
                throw new AppError('Google token expired', 400, 'TOKEN_EXPIRED');
            }

            if (error.message.includes('Token used too early')) {
                throw new AppError(
                    'Google token is not valid yet. Please sync backend server date/time and timezone.',
                    400,
                    'TOKEN_USED_TOO_EARLY'
                );
            }

            if (error.message.includes('invalid signature')) {
                throw new AppError('Invalid Google token signature', 400, 'INVALID_SIGNATURE');
            }

            if (error.message.includes('invalid_grant')) {
                throw new AppError('Google token revoked or invalid', 400, 'REVOKED_TOKEN');
            }

            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to verify Google token', 400, 'VERIFICATION_FAILED');
        }
    }

    /**
     * Verify Google Access Token (optional - for additional validation)
     *
     * If frontend provides access token instead of ID token:
     */
    async verifyAccessToken(accessToken) {
        try {
            if (!this.client) {
                throw new AppError('Google OAuth not configured', 500, 'OAUTH_NOT_CONFIGURED');
            }

            // Get token info from Google
            const tokenInfo = await this.client.getTokenInfo(accessToken);

            logger.info(`Google access token verified for: ${tokenInfo.email}`);

            return tokenInfo;
        } catch (error) {
            logger.error('Google access token verification failed:', error.message);
            throw new AppError('Failed to verify Google access token', 400, 'ACCESS_TOKEN_INVALID');
        }
    }

    /**
     * Extract user information from Google token payload
     * Returns standardized user data
     */
    extractUserData(payload) {
        return {
            provider: 'google',
            oauthId: payload.oauthId,
            email: payload.email,
            full_name: payload.name || 'Google User',
            oauth_avatar: payload.picture,
            is_verified: payload.email_verified,
        };
    }

    /**
     * Is Google OAuth configured?
     */
    isConfigured() {
        return !!this.client && this.allowedClientIds.length > 0;
    }
}

module.exports = new GoogleTokenVerificationService();
