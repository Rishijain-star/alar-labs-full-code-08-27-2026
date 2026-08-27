const express = require("express");
const router = express.Router();
const c = require("../controllers/examTopicsConfigController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/config", createRateLimiter("default"), c.getConfig);
router.post("/verify", createRateLimiter("default"), c.verifyAnswer);

module.exports = router;
