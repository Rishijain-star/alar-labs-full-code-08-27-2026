const express = require("express");
const router = express.Router();
const c = require("../controllers/currencyController");
const { createRateLimiter } = require("../middleware/rateLimit");

/**
 * @route GET /api/currencies
 * @description Get all currencies.
 * @access Public
 */
router.get("/", createRateLimiter("default"), c.getAll);

/**
 * @route GET /api/currencies/:id
 * @description Get a currency by its ID.
 * @access Public
 */
router.get("/:id", createRateLimiter("default"), c.getById);

/**
 * @route POST /api/currencies
 * @description Create a new currency.
 * @access Admin
 */
router.post("/", createRateLimiter("default"), c.create);

/**
 * @route PUT /api/currencies/:id
 * @description Update a currency.
 * @access Admin
 */
router.put("/:id", createRateLimiter("default"), c.update);

/**
 * @route DELETE /api/currencies/:id
 * @description Delete a currency.
 * @access Admin
 */
router.delete("/:id", createRateLimiter("default"), c.delete);

module.exports = router;