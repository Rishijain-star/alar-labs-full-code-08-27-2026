const express = require("express");
const router = express.Router();
const c = require("../../controllers/digitalProgramSectionController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

router.get(
  "/digital-program/sections",
  checkPermission("manage_programs"),
  createRateLimiter("default"),
  c.listAdmin,
);

router.get(
  "/digital-program/sections/:sectionKey",
  checkPermission("manage_programs"),
  createRateLimiter("default"),
  c.getAdmin,
);

router.put(
  "/digital-program/sections/:sectionKey",
  checkPermission("manage_programs"),
  createRateLimiter("update"),
  c.upsert,
);

module.exports = router;
