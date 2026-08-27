const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const config = require("../config");

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(logColors);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.colorize({
    all: true,
  }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// File format without colors
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.uncolorize(),
  winston.format.printf((info) => {
    const message =
      typeof info.message === "object"
        ? JSON.stringify(info.message, null, 2)
        : info.message;

    let log = `${info.timestamp} [${info.level.toUpperCase()}]: ${message}`;

    // Add stack trace for errors
    if (info.stack) {
      log += `\n${info.stack}`;
    }

    // Add metadata if present
    if (Object.keys(info).length > 4) {
      // More than timestamp, level, message, stack
      const metadata = {
        ...info,
      };
      delete metadata.timestamp;
      delete metadata.level;
      delete metadata.message;
      delete metadata.stack;
      log += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
    }

    return log;
  }),
);

// Create logs directory if it doesn't exist
const fs = require("fs");
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, {
    recursive: true,
  });
}

// Daily rotate file transport for errors (day-wise)
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  format: fileFormat,
  maxSize: "20m", // Rotate if file exceeds 20MB
  maxFiles: "30d", // Keep logs for 30 days
  zippedArchive: true, // Compress old logs
});

// Daily rotate file transport for warnings
const warnRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "warn-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "warn",
  format: fileFormat,
  maxSize: "20m",
  maxFiles: "30d",
  zippedArchive: true,
});

// Daily rotate file transport for all logs (combined)
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  format: fileFormat,
  maxSize: "20m",
  maxFiles: "14d", // Keep combined logs for 14 days
  zippedArchive: true,
});

// Daily rotate file transport for HTTP logs (optional)
const httpRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "http-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "http",
  format: fileFormat,
  maxSize: "20m",
  maxFiles: "7d", // Keep HTTP logs for 7 days
  zippedArchive: true,
});

const transports = [
  // Console transport with colors
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Daily rotating file transports
  errorRotateTransport,
  warnRotateTransport,
  combinedRotateTransport,
  httpRotateTransport,
];

const logger = winston.createLogger({
  level: config.env === "development" ? "debug" : "info",
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Log rotation events
errorRotateTransport.on("rotate", (oldFilename, newFilename) => {
  logger.info(`Error log rotated from ${oldFilename} to ${newFilename}`);
});

combinedRotateTransport.on("rotate", (oldFilename, newFilename) => {
  logger.info(`Combined log rotated from ${oldFilename} to ${newFilename}`);
});

// Helper methods for structured logging
logger.logError = (message, error, metadata = {}) => {
  logger.error(message, {
    error: error?.message,
    stack: error?.stack,
    code: error?.code,
    ...metadata,
  });
};

logger.logHttp = (req, res, responseTime) => {
  logger.http(
    `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`,
    {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    },
  );
};

logger.logAuth = (action, userId, metadata = {}) => {
  logger.info(`Auth: ${action}`, {
    action,
    userId,
    ...metadata,
  });
};

logger.logSecurity = (event, metadata = {}) => {
  logger.warn(`Security: ${event}`, {
    event,
    ...metadata,
  });
};

// Stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
