const crypto = require('crypto');
const redisManager = require('../lib/redisManager');
const logger = require('../lib/logger');

/**
 * WebAuthn Service (Simplified Implementation)
 * For production, use @simplewebauthn/server
 */
class WebAuthnService {
  constructor() {
    this.credentialPrefix = 'webauthn_cred:';
    this.userCredentialsPrefix = 'webauthn_user_creds:';
  }

  async generateRegistrationOptions(userId, displayName) {
    const challenge = crypto.randomBytes(32).toString('base64url');

    return {
      challenge,
      rp: {
        name: 'AuthSystem',
        id: 'localhost',
      },
      user: {
        id: Buffer.from(userId).toString('base64url'),
        name: userId,
        displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred',
      },
    };
  }

  async verifyRegistration(credential, expectedChallenge) {
    // Simplified verification - in production use @simplewebauthn/server
    return {
      verified: true,
      registrationInfo: {
        credentialID: credential.id,
        credentialPublicKey: credential.publicKey,
        counter: 0,
      },
    };
  }

  async storeCredential(userId, registrationInfo, name) {
    const redis = await redisManager.getClientSafe();
    const credentialKey = `${this.credentialPrefix}${userId}:${registrationInfo.credentialID}`;
    const userCredsKey = `${this.userCredentialsPrefix}${userId}`;

    await redis.set(credentialKey, JSON.stringify({
      ...registrationInfo,
      name,
      createdAt: Date.now(),
    }));

    await redis.sAdd(userCredsKey, registrationInfo.credentialID);
    logger.info(`WebAuthn credential stored for user: ${userId}`);
  }

  async generateAuthenticationOptions(userId) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const allowCredentials = await this.getUserCredentialIds(userId);

    return {
      challenge,
      timeout: 60000,
      rpId: 'localhost',
      allowCredentials: allowCredentials.map(id => ({
        type: 'public-key',
        id,
      })),
      userVerification: 'preferred',
    };
  }

  async verifyAuthentication(userId, credential, expectedChallenge) {
    // Simplified verification
    return {
      verified: true,
      credentialId: credential.id,
    };
  }

  async getUserCredentials(userId) {
    const redis = await redisManager.getClientSafe();
    const userCredsKey = `${this.userCredentialsPrefix}${userId}`;
    const credentialIds = await redis.sMembers(userCredsKey);

    const credentials = await Promise.all(
      credentialIds.map(async (id) => {
        const key = `${this.credentialPrefix}${userId}:${id}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    return credentials.filter(c => c !== null);
  }

  async getUserCredentialIds(userId) {
    const redis = await redisManager.getClientSafe();
    const userCredsKey = `${this.userCredentialsPrefix}${userId}`;
    return await redis.sMembers(userCredsKey);
  }

  async deleteCredential(userId, credentialId) {
    const redis = await redisManager.getClientSafe();
    const credentialKey = `${this.credentialPrefix}${userId}:${credentialId}`;
    const userCredsKey = `${this.userCredentialsPrefix}${userId}`;

    await redis.del(credentialKey);
    await redis.sRem(userCredsKey, credentialId);
    logger.info(`WebAuthn credential deleted for user ${userId}: ${credentialId}`);
  }
}

module.exports = new WebAuthnService();
