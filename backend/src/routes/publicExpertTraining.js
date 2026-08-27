const express = require("express");
const router = express.Router();
const c = require("../controllers/expertTrainingProgramController");
const { optionalAuthenticate } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/", createRateLimiter("default"), c.listPublic);
router.get("/slug/:slug", optionalAuthenticate, createRateLimiter("default"), c.getBySlug);

module.exports = router;
