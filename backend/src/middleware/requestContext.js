/**
 * Request Context Middleware
 * Attaches auth context and request metadata to all requests
 */

const { v4: uuidv4 } = require('uuid');
const authContextService = require('../services/auth/authContextService');
const logger = require('../lib/logger');

/**
 * Create and attach auth context to every request
 */
function requestContextMiddleware(req, res, next) {
  try {
    // Get IP address
    const ipAddress = req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      'unknown';

    // Get user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create context
    const context = authContextService.createContext({
      ipAddress,
      userAgent,
    });

    // Get geolocation
    const location = authContextService.getLocationFromIP(ipAddress);
    if (location) {
      authContextService.updateContext(context.contextId, { location });
    }

    // Generate device fingerprint
    const deviceFingerprint = authContextService.generateDeviceFingerprint(
      userAgent,
      ipAddress,
      {
        acceptLanguage: req.headers['accept-language'],
        acceptEncoding: req.headers['accept-encoding'],
      }
    );

    authContextService.updateContext(context.contextId, { deviceFingerprint });

    // Attach to request
    req.authContext = context;
    req.authContext.ipAddress = ipAddress;
    req.authContext.userAgent = userAgent;
    req.authContext.deviceFingerprint = deviceFingerprint;
    req.authContext.location = location;

    // Add request tracking methods
    req.addAuthEvent = (type, data) => {
      authContextService.addEvent(context.contextId, type, {
        ...data,
        path: req.path,
        method: req.method,
      });
    };

    req.setAuthState = (state) => {
      authContextService.setState(context.contextId, state);
    };

    // Add to request ID for logging
    res.locals.authContextId = context.contextId;

    logger.debug(`[RequestContext] Context created: ${context.contextId} from ${ipAddress}`);

    next();
  } catch (error) {
    logger.error('[RequestContext] Middleware error:', error);
    // Don't fail the request, just continue without context
    next();
  }
}

/**
 * Ensure auth context exists (for optional requests)
 */
function ensureAuthContext(req, res, next) {
  if (!req.authContext) {
    // Create minimal context if middleware didn't run
    const context = authContextService.createContext({
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    req.authContext = context;
    res.locals.authContextId = context.contextId;

    req.addAuthEvent = (type, data) => {
      authContextService.addEvent(context.contextId, type, data);
    };

    req.setAuthState = (state) => {
      authContextService.setState(context.contextId, state);
    };
  }

  next();
}

/**
 * Store context metadata for anomaly detection
 */
function storeContextMetadata(userId, context) {
  try {
    authContextService.storeMetadata(context.contextId, {
      userId,
      lastKnownIP: context.ipAddress,
      lastKnownCountry: context.location?.country,
      lastKnownDeviceFingerprint: context.deviceFingerprint,
      lastKnownUserAgent: context.userAgent,
      lastLoginHour: new Date().getHours(),
      lastLoginAt: new Date(),
    });
  } catch (error) {
    logger.error('[RequestContext] Failed to store metadata:', error);
  }
}

/**
 * Get context analysis for security decision-making
 */
function getContextAnalysis(context) {
  const riskScore = authContextService.analyzeRequest(context);

  return {
    riskScore,
    requiresMFA: riskScore > 0.3,
    requiresDeviceVerification: riskScore > 0.5,
    recommendation: (() => {
      if (riskScore > 0.7) return 'BLOCK';
      if (riskScore > 0.5) return 'REQUIRE_MFA';
      if (riskScore > 0.3) return 'VERIFY_DEVICE';
      return 'ALLOW';
    })(),
  };
}

/**
 * Cleanup middleware (call this when request completes)
 */
function cleanupAuthContext(req, res, next) {
  res.on('finish', () => {
    try {
      if (req.authContext) {
        // Optionally persist context events to database for audit
        if (req.authContext.events.length > 0) {
          logger.debug(
            `[RequestContext] Events for context ${req.authContext.contextId}:`,
            req.authContext.events
          );
        }

        // Keep context in memory for reference during request lifecycle
        // It will be cleaned up by authContextService's TTL mechanism
      }
    } catch (error) {
      logger.debug('[RequestContext] Cleanup error:', error);
    }
  });

  next();
}

module.exports = {
  requestContextMiddleware,
  ensureAuthContext,
  storeContextMetadata,
  getContextAnalysis,
  cleanupAuthContext,
};
