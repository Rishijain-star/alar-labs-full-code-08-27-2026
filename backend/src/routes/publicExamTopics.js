const express = require("express");
const router = express.Router();
const c = require("../controllers/examTopicsConfigController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/config", createRateLimiter("default"), c.getConfig);
router.post("/verify", createRateLimiter("default"), c.verifyAnswer);
router.post("/attempts", createRateLimiter("default"), c.saveAttempt);
router.get("/attempts", createRateLimiter("default"), c.getAttempts);
router.get("/attempts/:setId", createRateLimiter("default"), c.getAttempts);

module.exports = router;
