const express = require("express");
const router = express.Router();
const c = require("../controllers/legalController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/:type", createRateLimiter("default"), c.getPublic);

module.exports = router;
