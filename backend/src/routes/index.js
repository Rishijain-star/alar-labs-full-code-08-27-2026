const express = require('express');
const router = express.Router();
const authRoute = require('./auth')
const ownerRoute = require('./common/owner')
const rbacRoute = require('./rbac/index')
const labsRoute = require('./lab')
const categoryRoute = require('./common/category')
const subcategoryRoute = require('./common/subcategory')
const technologySkillRoute = require('./common/technologySkill');
const coursePublicRoute = require('./course');
const publicDigitalProgram = require('./publicDigitalProgram');
const publicWebinar = require('./publicWebinar');
const publicAssessment = require('./publicAssessment');
const publicExamTopics = require('./publicExamTopics');
const publicCertification = require('./publicCertification');
const publicVoucher = require('./publicVoucher');
const publicLegal = require('./publicLegal');
const publicSite = require('./publicSite');
const publicExpertTraining = require('./publicExpertTraining');
const publicCloudService = require('./publicCloudService');
const publicCareerOffering = require('./publicCareerOffering');
const supportRoute = require('./support');
const streamRoute = require('./stream');

const notificationRoute = require('./notification');
const meRoute = require('./me');
const autoSaveRoute = require('./autoSaveRoutes');
const adminLearningRoute = require('./adminLearning');
const instructorResourceRoute = require('./instructorResource');
const { createRateLimiter } = require('../middleware/rateLimit');
const ownerController = require('../controllers/common/ownerController');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

router.use('/auth', authRoute)
router.use('/courses', coursePublicRoute)
router.use('/labs', labsRoute)
router.use('/digital-program', publicDigitalProgram)
router.use('/webinars', publicWebinar)
router.use('/assessment', publicAssessment)
router.use('/exam-topics', publicExamTopics)
router.use('/certifications', publicCertification)
router.use('/vouchers', publicVoucher)
router.use('/cloud-services', publicCloudService)
router.use('/careers', publicCareerOffering)
router.use('/legal', publicLegal)
router.use('/site', publicSite)
router.use('/training-programs', publicExpertTraining)
router.use('/support', supportRoute)
router.use('/stream', streamRoute);


// SECURITY: the former public `/owner/courses/:course_id/content/key/:lesson_id`
// route was removed. It served the raw AES key with no auth and used the URL
// params directly in a filesystem path (traversal). HLS keys are now served via
// the protected stream key endpoints, backed by the DB.
router.use(authenticate)
router.use('/me', meRoute)
router.use('/admin/learning', adminLearningRoute)
router.use('/owner', ownerRoute)
router.use('/notifications', notificationRoute)
router.use('/autosave', autoSaveRoute)
router.use('/rbac', rbacRoute)
router.use('/categories', categoryRoute)
router.use('/subcategories', subcategoryRoute)
router.use('/technology-skills', technologySkillRoute)
router.use('/instructor-resources', instructorResourceRoute)
// router.use("/content", require("../routes/content"));
module.exports = router
