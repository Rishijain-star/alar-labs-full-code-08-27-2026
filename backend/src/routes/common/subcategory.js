const express = require("express");
const router = express.Router();
const c = require("../../controllers/subcategoryController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get active subcategories (public)
router.get("/active", createRateLimiter("default"), c.getActive);

// Get subcategory by slug (public)
router.get("/slug/:slug", createRateLimiter("default"), c.getBySlug);

// Get subcategories for a category (public)
router.get("/category/:categoryId", createRateLimiter("default"), c.getByCategory);

// ─────────────────────────────────────────────────────────────────────────────
//  PROTECTED ROUTES (Admin/Creator)
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

// Get all subcategories (with pagination, filtering)
router.get("/", checkPermission("view_subcategories"), createRateLimiter("default"), c.getAll);

// Get subcategory by ID with category details
router.get("/:id", checkPermission("view_subcategories"), createRateLimiter("default"), c.getById);

// Create subcategory
router.post("/", checkPermission("create_subcategories"), createRateLimiter("create"), c.create);

// Update subcategory
router.put("/:id", checkPermission("edit_subcategories"), createRateLimiter("update"), c.update);

// Delete subcategory
router.delete("/:id", checkPermission("delete_subcategories"), createRateLimiter("delete"), c.delete);

module.exports = router;
