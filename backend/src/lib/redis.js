require("dotenv").config();
const redis = require("redis");
const logger = require("./logger");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    // If already connecting, wait for that connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return existing client
    if (this.client && this.isConnected) {
      return this.client;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  async _connect() {
    try {
      const host = process.env.REDIS_HOST || "localhost";
      const port = parseInt(process.env.REDIS_PORT, 10) || 6379;
      const url = process.env.REDIS_URL || `redis://${host}:${port}`;
      logger.info(`Connecting to Redis: ${host}:${port}`);

      this.client = await redis.createClient({
        url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error("Redis reconnection failed after 10 attempts");
              return new Error("Redis reconnection limit reached");
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on("connect", () => {
        logger.info("Redis client connecting...");
      });

      this.client.on("ready", () => {
        logger.info("Redis client ready");
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        logger.error("Redis error:", err);
        this.isConnected = false;
      });

      this.client.on("end", () => {
        logger.warn("Redis connection closed");
        this.isConnected = false;
        this.connectionPromise = null;
      });

      this.client.on("reconnecting", () => {
        logger.info("Redis reconnecting...");
      });

      await this.client.connect();
      await this.client.ping();

      logger.info("✅ Redis connected successfully");
      this.connectionPromise = null;
      return this.client;
    } catch (error) {
      logger.error("❌ Redis connection error:", error);
      this.connectionPromise = null;

      try {
        if (this.client) {
          await this.client.quit();
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      this.client = null;
      this.isConnected = false;
      throw error;
    }
  }

  async getClient() {

    if (!this.client || !this.isConnected) {
      throw new Error(
        "Redis client not initialized or not connected. Call connect() first.",
      );
    }
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client !== null;
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info("Redis disconnected gracefully");
      } catch (err) {
        logger.warn("Error during redis.quit():", err);
        try {
          await this.client.disconnect();
        } catch (e) {
          // Ignore
        }
      } finally {
        this.isConnected = false;
        this.client = null;
        this.connectionPromise = null;
      }
    }
  }
}

module.exports = new RedisClient();
