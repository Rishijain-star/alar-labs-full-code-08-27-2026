const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams for /courses/:courseId/labs
const c = require("../controllers/labController");
const { authenticate, optionalAuthenticate } = require("../middleware/auth");
const { checkPermission, checkSuperAdmin } = require("../middleware/rbac");
const { createRateLimiter } = require("../middleware/rateLimit");
const labService = require("../services/labService");
const rbacService = require("../services/rbac/roleService");
const CERT_PERMS = require("../constants/certificationPermissions");

// Custom middleware for lab access: super admin OR lab owner OR has permission
const checkLabAccess = (requiredPermission) => async (req, res, next) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: "Authentication required", code: "AUTHENTICATION_REQUIRED" });
    }

    // Check if user is super admin
    const user_role = await rbacService.getUserRole(user_id);
    const rn = String(user_role?.name || "").trim().toLowerCase();
    if (rn === "super_admin" || rn === "super admin") {
      return next();
    }

    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasPermission = await rbacService.checkUserHasPermission(user_id, perms, "OR");
    if (hasPermission) {
      return next();
    }

    const lab = await labService.getById(req.params.id);
    if (lab && String(lab.created_by) === String(user_id)) {
      return next();
    }

    // If none of the above, deny access
    return res.status(403).json({ success: false, error: "Insufficient permissions or not lab owner", code: "ACCESS_DENIED" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Access check failed", code: "ACCESS_CHECK_ERROR" });
  }
};

router.get("/", createRateLimiter("default"), c.getAll);
// Public catalog detail: do not gate on enrollment here (checkLabAccess* blocked paid labs for everyone).
// Published + content-approval rules are enforced in labController.getBySlug / getById.
router.get("/slug/:slug/overview", optionalAuthenticate, createRateLimiter("default"), c.getBySlugOverview);
router.get("/slug/:slug", optionalAuthenticate, createRateLimiter("default"), c.getBySlug);
router.get("/slug/:slug/view", optionalAuthenticate, createRateLimiter("default"), c.getBySlugView);
router.get(
  "/intro-media/:labId/:filename",
  createRateLimiter("default"),
  c.serveIntroMedia
);
router.get(
  "/instruction-media/:mediaId/:filename",
  createRateLimiter("default"),
  c.serveInstructionMedia
);
router.get("/:id", optionalAuthenticate, createRateLimiter("default"), c.getById);

// ── Lab CRUD ──────────────────────────────────────────────────────────────────
router.use(authenticate);

router.post("/", checkPermission("create_labs"), createRateLimiter("create"), c.create);
/**
 * POST /api/labs/create-full
 * Frontend sends lab + questions in one request
 */
router.post("/create-full", checkPermission("create_labs"), createRateLimiter("create"), c.createFull);
/**
 * PUT /api/labs/:id/update-full
 * Frontend sends lab + questions in one request for updating
 */
router.put("/:id/update-full", checkLabAccess(["edit_labs", "create_labs"]), createRateLimiter("update"), c.updateFull);
router.put("/:id", checkLabAccess(["edit_labs", "create_labs"]), createRateLimiter("update"), c.update);
router.delete("/:id", checkLabAccess("delete_labs"), createRateLimiter("delete"), c.deleteLab);

// Reorder labs within a course:  PATCH /courses/:courseId/labs/reorder
router.patch("/reorder", checkPermission("edit_labs"), createRateLimiter("update"), c.reorder);

// ── Certification assign/remove ────────────────────────────────────────────────
router.post("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.assignCertification);
router.delete("/:id/certification", checkPermission(CERT_PERMS.ASSIGN), createRateLimiter("update"), c.removeCertification);

// ── Questions ─────────────────────────────────────────────────────────────────
router.post("/:id/questions", checkPermission("edit_labs"), createRateLimiter("create"), c.addQuestion);
router.post("/:id/questions/bulk", checkPermission("edit_labs"), createRateLimiter("create"), c.bulkCreateQuestions);
router.put("/:id/questions/:question_id", checkPermission("edit_labs"), createRateLimiter("update"), c.updateQuestion);
router.delete("/:id/questions/:question_id", checkPermission("edit_labs"), createRateLimiter("delete"), c.deleteQuestion);

// ── Assignments (standalone lab → user) ───────────────────────────────────────
router.get("/my/assignments", checkPermission("view_labs"), createRateLimiter("default"), c.getMyAssignments);
router.get("/:id/assignments", checkPermission("view_labs"), createRateLimiter("default"), c.getAssignments);
router.post("/:id/assignments", checkPermission("assign_labs"), createRateLimiter("create"), c.assignLab);
router.put("/:id/assignments/:assignment_id", checkPermission("edit_labs"), createRateLimiter("update"), c.updateAssignment);
router.delete("/:id/assignments", checkPermission("assign_labs"), createRateLimiter("delete"), c.revokeAssignment);

module.exports = router;
