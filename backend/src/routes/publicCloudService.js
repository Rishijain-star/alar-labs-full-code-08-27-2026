const express = require("express");
const router = express.Router();
const c = require("../controllers/cloudServiceController");
const { createRateLimiter } = require("../middleware/rateLimit");
const auth = require("../middleware/auth");

// Public
router.get("/", createRateLimiter("default"), c.listPublic);
router.post("/request", createRateLimiter("default"), c.submitRequest);

module.exports = router;
