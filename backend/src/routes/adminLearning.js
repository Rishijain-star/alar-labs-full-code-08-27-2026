const express = require("express");
const router = express.Router();
const c = require("../controllers/learningController");
const { checkPermission } = require("../middleware/rbac");
const { createRateLimiter } = require("../middleware/rateLimit");

router.get(
  "/enrollments",
  checkPermission(["view_users", "manage_enrollments"], "OR"),
  createRateLimiter("default"),
  c.adminList
);

module.exports = router;
