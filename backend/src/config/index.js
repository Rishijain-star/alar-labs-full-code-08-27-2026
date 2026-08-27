require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3003,

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '180m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    privateKey: process.env.JWT_PRIVATE_KEY || null,
    publicKey: process.env.JWT_PUBLIC_KEY || null,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'sid',
    ttl: parseInt(process.env.SESSION_TTL_SECONDS, 10) || 30 * 24 * 60 * 60,
    extendedTtl: parseInt(process.env.SESSION_EXTENDED_TTL_SECONDS, 10) || 90 * 24 * 60 * 60,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAME_SITE || 'strict',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: (parseInt(process.env.SESSION_TTL_SECONDS, 10) || 30 * 24 * 60 * 60) * 1000,
    },
  },

  security: {
    requireDeviceVerification: process.env.REQUIRE_DEVICE_VERIFICATION === 'true',
    checkIpWhitelist: process.env.CHECK_IP_WHITELIST === 'true',
  },

  oauth: {
    callbackUrl: process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/api/auth/oauth/callback',
    frontendRedirect: process.env.OAUTH_FRONTEND_REDIRECT || 'http://localhost:3000/auth/callback',
  },

  rateLimit: {
    refreshLimit: parseInt(process.env.REFRESH_RATE_LIMIT, 10) || 10,
    refreshWindow: parseInt(process.env.REFRESH_RATE_WINDOW, 10) || 60,
  },

  admin: {
    apiKey: process.env.ADMIN_API_KEY || 'change-this-key',
  },
};

module.exports = config;
