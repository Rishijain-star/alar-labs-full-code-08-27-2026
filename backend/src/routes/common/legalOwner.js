const express = require("express");
const router = express.Router();
const c = require("../../controllers/legalController");
const { createRateLimiter } = require("../../middleware/rateLimit");

router.get("/", createRateLimiter("authenticatedDefault"), c.listAdmin);
router.put("/:type", createRateLimiter("authenticatedDefault"), c.upsertType);

module.exports = router;
