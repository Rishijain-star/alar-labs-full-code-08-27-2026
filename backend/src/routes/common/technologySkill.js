const express = require("express");
const router = express.Router();
const c = require("../../controllers/technologySkillController");
const { authenticate } = require("../../middleware/auth");
const { checkPermission } = require("../../middleware/rbac");
const { createRateLimiter } = require("../../middleware/rateLimit");

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get active technology skills (public)
router.get("/active", createRateLimiter("default"), c.getActive);

// Get all skill categories (public)
router.get("/categories/all", createRateLimiter("default"), c.getAllCategories);

// Get skills by category (public)
router.get("/category/:category", createRateLimiter("default"), c.getByCategory);

// Get skill by slug (public)
router.get("/slug/:slug", createRateLimiter("default"), c.getBySlug);

// Search skills (public)
router.get("/search", createRateLimiter("default"), c.search);

// ─────────────────────────────────────────────────────────────────────────────
//  PROTECTED ROUTES (Admin/Creator)
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

// Get all technology skills (with pagination, filtering)
router.get("/", checkPermission("view_tech_skills"), createRateLimiter("default"), c.getAll);

// Get technology skill by ID
router.get("/:id", checkPermission("view_tech_skills"), createRateLimiter("default"), c.getById);

// Create technology skill
router.post("/", checkPermission("create_tech_skills"), createRateLimiter("create"), c.create);

// Update technology skill
router.put("/:id", checkPermission("edit_tech_skills"), createRateLimiter("update"), c.update);

// Delete technology skill
router.delete("/:id", checkPermission("delete_tech_skills"), createRateLimiter("delete"), c.delete);

module.exports = router;
