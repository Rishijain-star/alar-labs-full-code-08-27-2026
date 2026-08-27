const express = require("express");
const router = express.Router();
const c = require("../controllers/learningController");
const voucherController = require("../controllers/voucherController");
const supportController = require("../controllers/supportController");
const paymentController = require("../controllers/paymentController");

const { checkPermission } = require("../middleware/rbac");
const favoriteController = require("../controllers/favoriteController");

router.get("/learning", c.getMyLearning);
router.get("/courses/:courseId/certificate", c.getCourseCertificate);
router.get("/labs/:labId/certificate", c.getLabCertificate);
router.get("/support", supportController.listMine);
router.post("/support", supportController.create);
router.get("/support/:id/chat", supportController.listChatMine);
router.post("/support/:id/chat", supportController.postChatMine);
router.get("/vouchers/purchased", voucherController.listMyPurchases);
router.post("/vouchers/:id/purchase", voucherController.purchase);
router.post("/vouchers/apply", voucherController.apply);
router.post("/payments/create-order", paymentController.createOrder);
router.post("/payments/verify", paymentController.verifyPayment);
router.get("/payments/history", paymentController.getMyPaymentHistory);
router.get("/webinars", require("../controllers/webinarController").getMyWebinars);
router.post("/webinars/:id/register", require("../controllers/webinarController").registerFree);
router.get("/training-programs", require("../controllers/expertTrainingProgramController").listMine);
router.post("/training-programs/:id/enroll", require("../controllers/expertTrainingProgramController").enrollFree);
router.post("/enroll/course/:courseId", c.enrollCourse);
router.post("/enroll/lab/:labId", c.enrollLab);
router.get("/labs/:labId/enrollment", c.getLabEnrollment);
router.post("/labs/:labId/start", c.startLab);
router.patch("/labs/:labId/progress", c.saveLabProgress);
router.post("/labs/:labId/complete", c.completeLab);
router.get("/labs/:labId/time", c.getLabTime);
router.patch("/labs/:labId/time", c.addLabTime);
router.patch("/courses/:courseId/progress", c.saveCourseProgress);
router.get("/courses/:courseId/time", c.getCourseTime);
router.patch("/courses/:courseId/time", c.addCourseTime);
router.post("/courses/:courseId/check-block", c.checkCourseBlock);
router.post("/labs/:labId/skill-builder/submit", c.submitSkillBuilder);
router.post("/labs/:labId/check-block", c.checkLabBlock);
router.get("/creator/insights/:userId", c.creatorInsights);
router.get("/creator/insights", c.creatorInsights);
router.get("/creator/labs/:labId/audience", c.labAudience);

router.get(
  "/favorites",
  checkPermission("view_favorites"),
  favoriteController.list,
);
router.get(
  "/favorites/status",
  checkPermission("view_favorites"),
  favoriteController.status,
);
router.post(
  "/favorites",
  checkPermission("manage_favorites"),
  favoriteController.add,
);
router.delete(
  "/favorites",
  checkPermission("manage_favorites"),
  favoriteController.remove,
);

module.exports = router;
