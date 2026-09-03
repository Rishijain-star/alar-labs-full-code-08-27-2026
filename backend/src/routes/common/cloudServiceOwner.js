const express = require("express");
const router = express.Router();
const c = require("../../controllers/cloudServiceController");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// Admin
router.get(
  "/",
  checkPermission(["manage_cloud_services", "approve_cloud_services", "view_cloud_services", "view_programs"], "OR"),
  createRateLimiter("default"),
  c.getAll
);

// Requests - MUST COME BEFORE /:id route!
router.get("/requests", createRateLimiter("default"), c.getAllRequests);
router.put("/requests/:id", checkPermission("manage_cloud_services"), createRateLimiter("update"), c.updateRequestStatus);

// Single resource routes
router.get(
  "/:id",
  checkPermission(["manage_cloud_services", "approve_cloud_services", "view_cloud_services", "view_programs"], "OR"),
  createRateLimiter("default"),
  c.getById
);
router.post("/", checkPermission("manage_cloud_services"), createRateLimiter("create"), c.create);
router.put("/:id", checkPermission("manage_cloud_services"), createRateLimiter("update"), c.update);
router.put("/:id/approval", checkPermission("approve_cloud_services"), createRateLimiter("update"), c.setContentApproval);
router.delete("/:id", checkPermission("manage_cloud_services"), createRateLimiter("delete"), c.deleteCloudService);

module.exports = router;
