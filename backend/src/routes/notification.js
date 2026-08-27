const express = require("express");
const router = express.Router();
const c = require("../controllers/notificationController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/me", createRateLimiter("authenticatedDefault"), c.listMine);
router.post("/device-token", createRateLimiter("authenticatedDefault"), c.registerDeviceToken);
router.patch("/:id/read", createRateLimiter("authenticatedDefault"), c.markRead);

module.exports = router;
