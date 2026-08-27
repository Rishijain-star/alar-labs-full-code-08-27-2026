const logger = require("../lib/logger");
const config = require("../config");

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler
 */
function notFound(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    "NOT_FOUND",
  );
  next(error);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Handle non-AppError errors
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";
    error = new AppError(message, statusCode, "INTERNAL_ERROR");
    error.stack = err.stack;
  }

  // Log error
  if (error.statusCode >= 500) {
    logger.error("Server error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn("Client error:", {
      message: error.message,
      code: error.code,
      path: req.path,
      method: req.method,
    });
  }

  // Prepare response
  const response = {
    error: error.message,
    code: error.code,
  };

  // Add details in development
  if (config.env === "development") {
    response.stack = error.stack;
    if (error.details) {
      response.details = error.details;
    }
  }

  res.status(error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 */
function handleValidationError(errors) {
  const formattedErrors = errors.map((err) => ({
    field: err.path || err.param,
    message: err.msg || err.message,
  }));

  throw new AppError(
    "Validation failed",
    400,
    "VALIDATION_ERROR",
    formattedErrors,
  );
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
  handleValidationError,
};
