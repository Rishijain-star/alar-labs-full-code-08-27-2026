const axios = require('axios');
const crypto = require('crypto');
const redisManager = require('../lib/redisManager');
const config = require('../config');
const logger = require('../lib/logger');

class OAuth2Service {
  constructor() {
    this.statePrefix = 'oauth_state:';
    this.connectionPrefix = 'oauth_connection:';
    this.stateTTL = 10 * 60; // 10 minutes

    this.providers = {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: 'openid email profile',
      },
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scope: 'read:user user:email',
      },
      facebook: {
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfoUrl: 'https://graph.facebook.com/me',
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        scope: 'email public_profile',
      },
    };
  }

  async getAuthorizationUrl(provider, redirectUri) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    const redis = await redisManager.getClientSafe();

    await redis.setEx(
      `${this.statePrefix}${state}`,
      this.stateTTL,
      JSON.stringify({ provider, redirectUri, createdAt: Date.now() })
    );

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri || config.oauth.callbackUrl,
      scope: providerConfig.scope,
      state,
      response_type: 'code',
    });

    return `${providerConfig.authUrl}?${params.toString()}`;
  }

  async handleCallback(provider, code, state) {
    const redis = await redisManager.getClientSafe();
    const stateData = await redis.get(`${this.statePrefix}${state}`);

    if (!stateData) {
      throw new Error('Invalid or expired state');
    }

    await redis.del(`${this.statePrefix}${state}`);

    const providerConfig = this.providers[provider];
    const tokens = await this.exchangeCodeForTokens(provider, code);
    const userInfo = await this.getUserInfo(provider, tokens.access_token);

    return {
      id: userInfo.id || userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture || userInfo.avatar_url,
      provider,
    };
  }

  async exchangeCodeForTokens(provider, code) {
    const providerConfig = this.providers[provider];

    const response = await axios.post(providerConfig.tokenUrl, {
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.oauth.callbackUrl,
    });

    return response.data;
  }

  async getUserInfo(provider, accessToken) {
    const providerConfig = this.providers[provider];

    const response = await axios.get(providerConfig.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  }

  async getUserConnections(userId) {
    const redis = await redisManager.getClientSafe();
    const connectionKey = `${this.connectionPrefix}${userId}`;

    const data = await redis.get(connectionKey);
    return data ? JSON.parse(data) : [];
  }

  async disconnectProvider(userId, provider) {
    const redis = await redisManager.getClientSafe();
    const connectionKey = `${this.connectionPrefix}${userId}`;

    const connections = await this.getUserConnections(userId);
    const updated = connections.filter(c => c.provider !== provider);

    await redis.set(connectionKey, JSON.stringify(updated));
  }
}

module.exports = new OAuth2Service();
