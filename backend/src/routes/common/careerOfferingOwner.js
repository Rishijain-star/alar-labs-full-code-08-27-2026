const express = require("express");
const router = express.Router();
const c = require("../../controllers/careerOfferingController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// Admin
router.get("/", checkPermission("manage_career_offerings"), createRateLimiter("default"), c.getAll);

// Requests - MUST COME BEFORE /:id route!
router.get("/requests", checkPermission("manage_career_offerings"), createRateLimiter("default"), c.getAllRequests);
router.put("/requests/:id", checkPermission("manage_career_offerings"), createRateLimiter("update"), c.updateRequestStatus);

// Single resource routes
router.get("/:id", checkPermission("manage_career_offerings"), createRateLimiter("default"), c.getById);
router.post("/", checkPermission("manage_career_offerings"), createRateLimiter("create"), c.create);
router.put("/:id", checkPermission("manage_career_offerings"), createRateLimiter("update"), c.update);
router.patch("/:id/approval", checkPermission("approve_career_offerings"), createRateLimiter("update"), c.setContentApproval);
router.delete("/:id", checkPermission("manage_career_offerings"), createRateLimiter("delete"), c.deleteCareerOffering);

module.exports = router;
