const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const config = require('./src/config');
const { corsOriginDelegate } = require('./src/lib/allowedOrigins');
const redisManager = require('./src/lib/redisManager');
const logger = require('./src/lib/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
// Routes
const routes = require('./src/routes/index');
const db = require('./src/models');
const multer = require('multer');
const app = express();
const path = require('path');
const http = require('http');


// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration (same list as WebSocket origin check)

app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-session-id',
      'x-upload-id',
      'x-chunk-index',
      'x-total-chunks',
      'x-filename',
      'x-is-last',
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  })
);
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Request ID middleware
app.use((req, res, next) => {
  res.locals.requestId = uuidv4();
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: res.locals.requestId,
    });
  });

  next();
});

/**
 * Routes
 */

// Health check (without /api prefix for load balancers)
app.get('/health', async (req, res) => {
  const redisHealth = await redisManager.healthCheck();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: redisHealth.status,
    },
  });
});

app.use(
  '/uploads/labs/instruction-media',
  (req, res, next) => {
    if (/\.(m3u8|ts)(\?.*)?$/i.test(req.path)) {
      return res.status(403).json({
        success: false,
        message: 'This video can only be played inside the learning workspace.',
      });
    }
    next();
  }
);

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Add this AFTER your routes
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Max size is 5MB',
      });
    }
  }

  if (err.message === 'Only images allowed: jpeg, jpg, png, webp') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
});
/**
 * Server Initialization
 */

// static uploads already mounted above

let server;

async function startServer() {
  try {
    // Initialize Redis connection - WAIT for it to complete
    logger.info('Initializing Redis connection...');
    const redisReady = await redisManager.initialize();

    if (redisReady) {
      logger.info('✅ Redis Manager initialized successfully');
    } else {
      logger.warn('⚠️ Redis initialization failed - app will continue with degraded functionality');
    }

    const PORT = config.port;
    server = http.createServer(app);
    // Large video uploads + FFmpeg HLS can exceed default ~2 min socket timeouts
    server.requestTimeout = 600_000;
    server.headersTimeout = 610_000;
    try {
      const { initSupportChatWebSocket } = require('./src/lib/supportChatWebSocket');
      initSupportChatWebSocket(server);
    } catch (e) {
      logger.warn('WebSocket support chat not initialized:', e.message);
    }
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        logger.error(
          `Port ${PORT} is already in use. Stop the other process or set a different PORT in .env`
        );
        process.exit(1);
      }
      logger.error("Server error:", err);
      process.exit(1);
    });
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`Auth API: http://localhost:${PORT}/api/auth`);
      logger.info('✅ Ready to accept requests');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */

async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Force exit after 3 seconds if graceful shutdown hangs
  setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
  }, 3000).unref();

  try {
    // Close the HTTP server first to stop accepting new connections
    if (server) {
      if (server.closeAllConnections) {
        server.closeAllConnections();
      }
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing server:', err);
          } else {
            logger.info('HTTP server closed');
          }
          resolve();
        });
      });
    }

    // Close Redis connection through manager
    await redisManager.disconnect();
    logger.info('Redis disconnected');

    // Exit process
    logger.info('Graceful shutdown completed');
    if (signal === 'SIGUSR2') {
      process.kill(process.pid, 'SIGUSR2');
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Handle nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (reason instanceof Error) {
    logger.error('Unhandled Rejection:', {
      message: reason.message,
      stack: reason.stack,
    });
  } else {
    logger.error('Unhandled Rejection (non-error):', reason);
  }

  gracefulShutdown('UNHANDLED_REJECTION');
});


// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
// Trigger nodemon restart
