/**
 * Auth Context Service
 * Manages request context tracking, device identification, and auth state
 */

const { v4: uuidv4 } = require('uuid');
const geoip = require('geoip-lite');
const logger = require('../lib/logger');

class AuthContextService {
  constructor() {
    this.contextMap = new Map(); // In-memory context cache
    this.contextTTL = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Create a new auth context
   * @param {Object} options - Context options
   * @returns {Object} Auth context
   */
  createContext({
    userId = null,
    sessionId = null,
    ipAddress = null,
    userAgent = null,
    deviceFingerprint = null,
    location = null,
  } = {}) {
    const contextId = uuidv4();

    const context = {
      contextId,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      deviceFingerprint,
      location,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.contextTTL),
      metadata: {},
      events: [],
      state: {}, // Auth state (e.g., mfaRequired, passwordChangeRequired)
    };

    this.contextMap.set(contextId, context);

    // Cleanup old contexts periodically
    this._cleanupExpiredContexts();

    logger.debug(`[AuthContext] Created context ${contextId} for user ${userId || 'anonymous'}`);

    return context;
  }

  /**
   * Get context by ID
   */
  getContext(contextId) {
    const context = this.contextMap.get(contextId);

    if (!context) {
      return null;
    }

    // Check expiration
    if (new Date() > context.expiresAt) {
      this.contextMap.delete(contextId);
      return null;
    }

    return context;
  }

  /**
   * Update context
   */
  updateContext(contextId, updates) {
    const context = this.getContext(contextId);

    if (!context) {
      return null;
    }

    Object.assign(context, updates, {
      updatedAt: new Date(),
    });

    this.contextMap.set(contextId, context);
    return context;
  }

  /**
   * Add event to context
   */
  addEvent(contextId, eventType, eventData = {}) {
    const context = this.getContext(contextId);

    if (!context) {
      return false;
    }

    context.events.push({
      type: eventType,
      timestamp: new Date(),
      data: eventData,
    });

    return true;
  }

  /**
   * Set auth state requirement
   * Examples: mfaRequired, passwordChangeRequired, deviceVerificationRequired
   */
  setState(contextId, state) {
    const context = this.getContext(contextId);

    if (!context) {
      return false;
    }

    context.state = { ...context.state, ...state };
    return true;
  }

  /**
   * Get geolocation from IP address
   */
  getLocationFromIP(ipAddress) {
    try {
      if (!ipAddress || ipAddress === 'unknown') {
        return null;
      }

      const geo = geoip.lookup(ipAddress);

      if (!geo) {
        return null;
      }

      return {
        country: geo.country,
        timezone: geo.timezone,
        ll: geo.ll, // [latitude, longitude]
        metro: geo.metro,
        area: geo.area,
      };
    } catch (error) {
      logger.debug(`[AuthContext] Geolocation lookup failed for IP ${ipAddress}:`, error.message);
      return null;
    }
  }

  /**
   * Generate device fingerprint from user agent and other factors
   * This is a basic implementation - in production use a library like fingerprintjs2
   */
  generateDeviceFingerprint(userAgent, ipAddress, additionalData = {}) {
    const crypto = require('crypto');

    const data = JSON.stringify({
      userAgent: userAgent || 'unknown',
      ipAddress: ipAddress || 'unknown',
      ...additionalData,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Analyze request for anomalies and assign risk score
   */
  analyzeRequest(context) {
    let riskScore = 0;

    // Check if IP has changed significantly from last known location
    if (context.metadata.lastKnownIP && context.metadata.lastKnownIP !== context.ipAddress) {
      riskScore += 0.2;
    }

    // Check if coming from unusual country
    if (context.metadata.lastKnownCountry && context.location?.country !== context.metadata.lastKnownCountry) {
      riskScore += 0.15;
    }

    // Check if device fingerprint changed
    if (context.metadata.lastKnownDeviceFingerprint && context.metadata.lastKnownDeviceFingerprint !== context.deviceFingerprint) {
      riskScore += 0.25;
    }

    // Check if user agent changed significantly
    if (context.metadata.lastKnownUserAgent && context.userAgent !== context.metadata.lastKnownUserAgent) {
      riskScore += 0.1;
    }

    // Check time-based anomaly (e.g., login at unusual hour)
    const hour = new Date().getHours();
    if (context.metadata.lastLoginHour !== undefined) {
      const hourDiff = Math.abs(hour - context.metadata.lastLoginHour);
      if (hourDiff > 12) {
        riskScore += 0.1;
      }
    }

    // Cap the score at 1.0
    return Math.min(riskScore, 1.0);
  }

  /**
   * Check if location change is suspicious
   */
  isLocationChangeSuspicious(oldLocation, newLocation) {
    if (!oldLocation || !newLocation) {
      return false;
    }

    // Same country = not suspicious
    if (oldLocation.country === newLocation.country) {
      return false;
    }

    // Different country might be suspicious (could be vacation)
    // In production, implement Haversine distance calculation for lat/long
    return true;
  }

  /**
   * Store metadata for future anomaly detection
   */
  storeMetadata(contextId, metadata) {
    const context = this.getContext(contextId);

    if (!context) {
      return false;
    }

    context.metadata = {
      ...context.metadata,
      ...metadata,
      updatedAt: new Date(),
    };

    return true;
  }

  /**
   * Cleanup expired contexts to prevent memory leak
   */
  _cleanupExpiredContexts() {
    const now = new Date();

    for (const [contextId, context] of this.contextMap.entries()) {
      if (now > context.expiresAt) {
        this.contextMap.delete(contextId);
      }
    }
  }

  /**
   * Get context statistics (for monitoring)
   */
  getStats() {
    return {
      totalContexts: this.contextMap.size,
      contexts: Array.from(this.contextMap.values()).map(ctx => ({
        contextId: ctx.contextId,
        userId: ctx.userId,
        createdAt: ctx.createdAt,
        events: ctx.events.length,
      })),
    };
  }

  /**
   * Clear specific context
   */
  clearContext(contextId) {
    return this.contextMap.delete(contextId);
  }

  /**
   * Clear all contexts for a user (on logout)
   */
  clearUserContexts(userId) {
    let cleared = 0;

    for (const [contextId, context] of this.contextMap.entries()) {
      if (context.userId === userId) {
        this.contextMap.delete(contextId);
        cleared++;
      }
    }

    logger.debug(`[AuthContext] Cleared ${cleared} contexts for user ${userId}`);
    return cleared;
  }
}

module.exports = new AuthContextService();
