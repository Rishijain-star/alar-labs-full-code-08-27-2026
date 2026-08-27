const express = require("express");
const router = express.Router();
const autoSaveController = require("../controllers/autoSaveController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/autosave/:entityType/:entityId
// Fetch the latest autosaved draft for the user
router.get("/:entityType/:entityId", autoSaveController.getDraft);

// POST /api/autosave/:entityType/:entityId
// Save or update a draft
router.post("/:entityType/:entityId", autoSaveController.saveDraft);

// DELETE /api/autosave/:entityType/:entityId
// Clear/Discard a draft
router.delete("/:entityType/:entityId", autoSaveController.clearDraft);

module.exports = router;
