const express = require("express");
const router = express.Router();
const c = require("../controllers/assessmentConfigController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/config", createRateLimiter("default"), c.getConfig);
router.post("/recommend", createRateLimiter("default"), c.recommend);

module.exports = router;
