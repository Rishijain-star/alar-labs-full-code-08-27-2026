const { body, validationResult } = require("express-validator");
const { handleValidationError } = require("./errorHandler");

/**
 * Validation middleware to check results
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return handleValidationError(errors.array());
  }

  next();
}

/**
 * Login validation rules
 */
const loginValidation = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("User ID must be between 3 and 100 characters"),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  validate,
];

/**
 * Refresh token validation rules
 */
const refreshValidation = [
  body("refresh_token")
    .trim()
    .notEmpty()
    .withMessage("Refresh token is required")
    .isLength({ min: 32 })
    .withMessage("Invalid refresh token format"),

  validate,
];

/**
 * User ID param validation
 */
const userIdValidation = [
  body("userId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("User ID cannot be empty")
    .isLength({ max: 100 })
    .withMessage("User ID too long"),

  validate,
];

module.exports = {
  validate,
  loginValidation,
  refreshValidation,
  userIdValidation,
};
