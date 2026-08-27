const express = require("express");
const router = express.Router();
const c = require("../controllers/certificationController");
const { createRateLimiter } = require("../middleware/rateLimit");

/** Public catalog — active certifications only */
router.get("/", createRateLimiter("default"), c.listPublic);

/** Public detail — active cert with its published courses + labs */
router.get("/:id", createRateLimiter("default"), c.getPublicById);

module.exports = router;
