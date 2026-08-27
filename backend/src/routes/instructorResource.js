const express = require('express');
const router = express.Router();
const c = require('../controllers/instructorResourceController');
const { checkPermission } = require('../middleware/rbac');

// Admin Routes (CRUD)
// Using checkPermission or assume authenticate is already called in index.js
// Assuming roles like manage_courses or manage_certifications covers this.
router.post(
    '/',
    checkPermission(['manage_courses']), // Use appropriate permission
    c.create
);

router.put(
    '/:id',
    checkPermission(['manage_courses']),
    c.update
);

router.delete(
    '/:id',
    checkPermission(['manage_courses']),
    c.delete
);

// Trainer / Authenticated user routes
router.get('/', c.list);
router.post('/:id/download', c.download); // Using POST to indicate action (checking access)
router.post('/:id/opt-in', c.optIn);
router.get('/:id/opt-in', c.getOptInStatus);

module.exports = router;
