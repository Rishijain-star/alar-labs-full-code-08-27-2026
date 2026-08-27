/**
 * API Key Management Service
 * Handles creation, validation, and rotation of API keys
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../lib/logger');

// In-memory store (in production, use database)
const apiKeys = new Map();
const keyHashes = new Map(); // Maps hash -> keyId for quick lookup

class APIKeyService {
  constructor() {
    this.keyPrefix = 'sk_'; // sk = secret key
    this.hashAlgorithm = 'sha256';
    this.defaultExpiry = 365 * 24 * 60 * 60 * 1000; // 1 year
  }

  /**
   * Generate a new API key
   */
  generateKey() {
    const randomBytes = crypto.randomBytes(32);
    return this.keyPrefix + randomBytes.toString('hex');
  }

  /**
   * Hash an API key
   */
  hashKey(key) {
    return crypto.createHash(this.hashAlgorithm).update(key).digest('hex');
  }

  /**
   * Create and store a new API key
   */
  createKey(options = {}) {
    try {
      const keyId = uuidv4();
      const key = this.generateKey();
      const keyHash = this.hashKey(key);

      const apiKey = {
        id: keyId,
        name: options.name || `API Key ${new Date().toLocaleDateString()}`,
        hash: keyHash,
        createdAt: new Date(),
        expiresAt: options.expiresAt || new Date(Date.now() + this.defaultExpiry),
        lastUsedAt: null,
        usageCount: 0,
        isActive: true,
        scope: options.scope || ['*'], // '*' = full access
        rateLimit: options.rateLimit || 1000, // requests per hour
        ipWhitelist: options.ipWhitelist || [], // empty = any IP
        metadata: options.metadata || {},
        createdBy: options.createdBy || 'system',
      };

      apiKeys.set(keyId, apiKey);
      keyHashes.set(keyHash, keyId);

      logger.info(`[APIKey] Created new key: ${keyId} (${apiKey.name})`);

      // Return key only on creation (never again)
      return {
        id: keyId,
        key, // Plain key returned only once
        ...apiKey,
      };
    } catch (error) {
      logger.error('[APIKey] Create key error:', error);
      throw new AppError('Failed to create API key', 500);
    }
  }

  /**
   * Validate an API key
   */
  async validateKey(key, options = {}) {
    try {
      const keyHash = this.hashKey(key);
      const keyId = keyHashes.get(keyHash);

      if (!keyId) {
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      const apiKey = apiKeys.get(keyId);

      if (!apiKey) {
        return {
          valid: false,
          error: 'API key not found',
        };
      }

      // Check active status
      if (!apiKey.isActive) {
        return {
          valid: false,
          error: 'API key is deactivated',
        };
      }

      // Check expiration
      if (new Date() > apiKey.expiresAt) {
        apiKey.isActive = false;
        return {
          valid: false,
          error: 'API key has expired',
        };
      }

      // Check IP whitelist
      if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
        const clientIP = options.ipAddress;
        if (!apiKey.ipWhitelist.includes(clientIP)) {
          return {
            valid: false,
            error: 'IP address not whitelisted for this key',
          };
        }
      }

      // Check rate limit
      const hourStart = new Date();
      hourStart.setHours(hourStart.getHours() - 1);

      // In production, use Redis for tracking requests
      // For now, just return the limit
      if (apiKey.usageCount > apiKey.rateLimit) {
        return {
          valid: false,
          error: 'API key rate limit exceeded',
          retryAfter: 3600,
        };
      }

      // Update usage
      apiKey.lastUsedAt = new Date();
      apiKey.usageCount = (apiKey.usageCount || 0) + 1;

      return {
        valid: true,
        keyId,
        scope: apiKey.scope,
        metadata: apiKey.metadata,
      };
    } catch (error) {
      logger.error('[APIKey] Validate key error:', error);
      return {
        valid: false,
        error: 'Key validation failed',
      };
    }
  }

  /**
   * Revoke an API key
   */
  revokeKey(keyId, reason = 'Manually revoked') {
    try {
      const apiKey = apiKeys.get(keyId);

      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }

      apiKey.isActive = false;
      apiKey.revokedAt = new Date();
      apiKey.revokeReason = reason;

      logger.info(`[APIKey] Revoked key: ${keyId} (${reason})`);
      return apiKey;
    } catch (error) {
      logger.error('[APIKey] Revoke key error:', error);
      throw error;
    }
  }

  /**
   * Rotate an API key (create new key, deactivate old)
   */
  rotateKey(keyId, options = {}) {
    try {
      const oldKey = apiKeys.get(keyId);

      if (!oldKey) {
        throw new AppError('API key not found', 404);
      }

      // Create new key with same properties
      const newKey = this.createKey({
        name: `${oldKey.name} (rotated)`,
        scope: oldKey.scope,
        rateLimit: oldKey.rateLimit,
        ipWhitelist: oldKey.ipWhitelist,
        metadata: oldKey.metadata,
        expiresAt: options.expiresAt || oldKey.expiresAt,
      });

      // Deactivate old key
      oldKey.isActive = false;
      oldKey.rotatedAt = new Date();

      logger.info(`[APIKey] Rotated key: ${keyId} -> ${newKey.id}`);

      return newKey;
    } catch (error) {
      logger.error('[APIKey] Rotate key error:', error);
      throw error;
    }
  }

  /**
   * Get key details (without revealing full key)
   */
  getKeyDetails(keyId) {
    try {
      const apiKey = apiKeys.get(keyId);

      if (!apiKey) {
        return null;
      }

      // Return details without the hash
      const { hash, ...details } = apiKey;
      return {
        ...details,
        lastUsedAt: apiKey.lastUsedAt,
        usageCount: apiKey.usageCount,
      };
    } catch (error) {
      logger.error('[APIKey] Get key details error:', error);
      return null;
    }
  }

  /**
   * List all keys (admin only)
   */
  listKeys(filter = {}) {
    try {
      const keys = Array.from(apiKeys.values()).map(key => {
        const { hash, ...details } = key;
        return details;
      });

      // Apply filters
      if (filter.isActive !== undefined) {
        return keys.filter(k => k.isActive === filter.isActive);
      }

      if (filter.createdBy) {
        return keys.filter(k => k.createdBy === filter.createdBy);
      }

      return keys;
    } catch (error) {
      logger.error('[APIKey] List keys error:', error);
      return [];
    }
  }

  /**
   * Update key details
   */
  updateKey(keyId, updates) {
    try {
      const apiKey = apiKeys.get(keyId);

      if (!apiKey) {
        throw new AppError('API key not found', 404);
      }

      // Allow updating these fields
      const allowedUpdates = ['name', 'rateLimit', 'ipWhitelist', 'metadata', 'expiresAt'];

      for (const field of allowedUpdates) {
        if (field in updates) {
          apiKey[field] = updates[field];
        }
      }

      apiKey.updatedAt = new Date();

      logger.info(`[APIKey] Updated key: ${keyId}`);
      return apiKey;
    } catch (error) {
      logger.error('[APIKey] Update key error:', error);
      throw error;
    }
  }

  /**
   * Get key statistics
   */
  getStats() {
    const keys = Array.from(apiKeys.values());
    const totalRequests = keys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      expiredKeys: keys.filter(k => new Date() > k.expiresAt).length,
      revokedKeys: keys.filter(k => !k.isActive).length,
      totalRequests,
      avgRequestsPerKey: Math.round(totalRequests / keys.length || 0),
    };
  }

  /**
   * Cleanup expired keys periodically
   */
  cleanupExpiredKeys() {
    try {
      const before = apiKeys.size;
      const now = new Date();

      for (const [keyId, apiKey] of apiKeys.entries()) {
        if (now > apiKey.expiresAt && apiKey.isActive) {
          apiKey.isActive = false;
          logger.debug(`[APIKey] Auto-deactivated expired key: ${keyId}`);
        }
      }

      const after = apiKeys.size;
      logger.info(`[APIKey] Cleanup: deactivated ${before - after} expired keys`);
    } catch (error) {
      logger.error('[APIKey] Cleanup error:', error);
    }
  }
}

module.exports = new APIKeyService();
