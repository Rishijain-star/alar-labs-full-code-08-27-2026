const express = require("express");
const router = express.Router();
const c = require("../../controllers/voucherController");
const { createRateLimiter } = require("../../middleware/rateLimit");

router.get("/", createRateLimiter("authenticatedDefault"), c.listAdmin);
router.post("/", createRateLimiter("authenticatedDefault"), c.create);
router.put("/:id", createRateLimiter("authenticatedDefault"), c.update);
router.delete("/:id", createRateLimiter("authenticatedDefault"), c.remove);

module.exports = router;
