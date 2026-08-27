const express = require("express");
const router = express.Router();
const c = require("../../controllers/categoryController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get active categories (public)
router.get("/active", createRateLimiter("default"), c.getActive);

// Get category by slug (public)
router.get("/slug/:slug", createRateLimiter("default"), c.getBySlug);

// ─────────────────────────────────────────────────────────────────────────────
//  PROTECTED ROUTES (Admin/Creator)
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

// Get all categories (with pagination, filtering)
router.get("/", checkPermission("view_categories"), createRateLimiter("default"), c.getAll);

// Get category by ID with subcategories
router.get("/:id", checkPermission("view_categories"), createRateLimiter("default"), c.getById);

// Create category
router.post("/", checkPermission("create_categories"), createRateLimiter("create"), c.create);

// Update category
router.put("/:id", checkPermission("edit_categories"), createRateLimiter("update"), c.update);

// Delete category
router.delete("/:id", checkPermission("delete_categories"), createRateLimiter("delete"), c.delete);

module.exports = router;
