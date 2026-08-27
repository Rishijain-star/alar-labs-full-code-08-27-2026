/**
 * Redis Manager - Safe wrapper for Redis client
 * Ensures Redis is connected and provides automatic reconnection logic
 * All services should use this instead of directly calling redisClient.getClient()
 */

const redisClient = require('./redis');
const logger = require('./logger');

class RedisManager {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize Redis connection (called once at app startup)
   */
  async initialize() {
    if (this.initialized) return true;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        await redisClient.connect();
        this.initialized = true;
        logger.info('✅ Redis Manager initialized');
        return true;
      } catch (error) {
        logger.error('❌ Redis Manager initialization failed:', error);
        this.initialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Get Redis client safely
   * Will throw if not initialized - services must await initialize() at startup
   */
  async getClient() {
    // Ensure Redis is ready
    if (!this.initialized) {
      if (!this.initPromise) {
        throw new Error(
          'Redis not initialized. Call redisManager.initialize() at app startup.'
        );
      }
      await this.initPromise;
    }

    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    return await redisClient.getClient();
  }

  /**
   * Get Redis client safely with fallback
   * Returns null if Redis is unavailable instead of throwing
   * Use this for non-critical operations
   */
  async getClientSafe() {
    try {
      // Wait for initialization if it's in progress
      if (this.initPromise && !this.initialized) {
        try {
          await this.initPromise;
        } catch (initError) {
          logger.debug('Redis initialization failed:', initError.message);
          return null;
        }
      }

      if (this.initialized && this.isReady()) {
        try {
          return await redisClient.getClient();
        } catch (clientError) {
          logger.debug('Failed to get Redis client:', clientError.message);
          return null;
        }
      }
    } catch (error) {
      logger.debug('Redis unavailable, operations will be skipped:', error.message);
    }
    return null;
  }

  /**
   * Check if Redis is ready
   */
  isReady() {
    return this.initialized && redisClient.isReady();
  }

  /**
   * Disconnect Redis
   */
  async disconnect() {
    await redisClient.disconnect();
    this.initialized = false;
  }

  /**
   * Health check for Redis
   */
  async healthCheck() {
    try {
      const client = await this.getClientSafe();
      if (!client) {
        return {
          status: 'disconnected',
          message: 'Redis not available',
        };
      }

      try {
        await client.ping();
        return {
          status: 'connected',
          message: 'Redis is healthy',
        };
      } catch (pingError) {
        logger.error('Redis ping failed:', pingError.message);
        return {
          status: 'error',
          message: 'Redis ping failed: ' + pingError.message,
        };
      }
    } catch (error) {
      logger.error('Redis health check error:', error.message);
      return {
        status: 'error',
        message: 'Health check error: ' + error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new RedisManager();
