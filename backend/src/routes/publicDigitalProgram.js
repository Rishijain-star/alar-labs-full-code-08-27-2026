const express = require("express");
const router = express.Router();
const c = require("../controllers/digitalProgramSectionController");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get("/sections", createRateLimiter("default"), c.listPublished);
router.get("/sections/:sectionKey", createRateLimiter("default"), c.getPublishedByKey);

module.exports = router;
