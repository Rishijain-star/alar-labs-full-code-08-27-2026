const express = require("express");
const router = express.Router();
const c = require("../controllers/voucherController");
const { createRateLimiter } = require("../middleware/rateLimit");
const { optionalAuthenticate } = require("../middleware/auth");

router.get("/", createRateLimiter("default"), optionalAuthenticate, c.listPublic);

module.exports = router;
