const express = require("express");
const router = express.Router();
const c = require("../controllers/supportController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.post("/", createRateLimiter("default"), c.create);

module.exports = router;
