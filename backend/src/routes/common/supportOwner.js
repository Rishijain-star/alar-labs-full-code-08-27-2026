const express = require("express");
const router = express.Router();
const c = require("../../controllers/supportController");
const { createRateLimiter } = require("../../middleware/rateLimit");

router.get("/", createRateLimiter("authenticatedDefault"), c.listAdmin);
router.get("/:id/chat", createRateLimiter("authenticatedDefault"), c.listChatAdmin);
router.post("/:id/chat", createRateLimiter("authenticatedDefault"), c.postChatAdmin);
router.post("/:id/reply", createRateLimiter("authenticatedDefault"), c.replyAdmin);

module.exports = router;
