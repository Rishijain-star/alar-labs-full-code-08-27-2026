const express = require('express');
const router = express.Router();
const roleRoute = require('./roles')
const permissionRoute = require('./permission')

router.use('/roles', roleRoute)
router.use('/permissions', permissionRoute)
module.exports = router