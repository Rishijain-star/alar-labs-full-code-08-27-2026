const { AppError } = require('../middleware/errorHandler');
const learningService = require('../services/learningService');
const db = require('../models');
const { Op } = require('sequelize');
const response = require('../utils/response');
const { fail } = require('../helper/helper');

// Razorpay client — lazily created from DB settings or .env
let razorpay = null;
let razorpayKeyHash = null;

async function getRazorpayClient() {
  const systemSettingsService = require('../services/systemSettingsService');
  const { keyId, keySecret } = await systemSettingsService.getRazorpayConfig();
  if (!keyId || !keySecret) return null;
  const hash = `${keyId}:${keySecret}`;
  if (razorpay && razorpayKeyHash === hash) return razorpay;
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  razorpayKeyHash = hash;
  return razorpay;
}

/**
 * Resolve authenticated user id from request
 */
function requireUserId(req) {
  const id = req.user?.user_id ?? req.user?.id ?? req.user?.sub ?? null;
  if (!id) {
    throw new AppError("Authentication required", 401);
  }
  return id;
}

/** Razorpay receipt max length is 40 characters. */
function buildReceipt(prefix, id) {
  const shortId = String(id).replace(/-/g, "").slice(0, 8);
  const ts = Date.now().toString(36);
  return `${prefix}${shortId}${ts}`.slice(0, 40);
}

function mapRazorpayError(err) {
  const description = err?.error?.description || err?.description;
  if (description) {
    const status = err?.statusCode == 401 ? 400 : 400;
    console.log(err);
    return new AppError(description, status);
  }
  return err;
}

class PaymentController {
  /**
   * Create a Razorpay order for a lab or course
   */
  createOrder = async (req, res) => {
    try {
      const rzp = await getRazorpayClient();
      if (!rzp) {
        throw new AppError("Payment integration not configured. Add Razorpay keys in Settings → Payments or set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.", 501);
      }
      const systemSettingsService = require('../services/systemSettingsService');
      const { keyId } = await systemSettingsService.getRazorpayConfig();

      const userId = requireUserId(req);
      const { type, id } = req.body;

      const user = await db.User.findByPk(userId);
      const settings = (await systemSettingsService.getAllForClient(['general'])) || {};
      const platformDefaults = settings.general || {};
      const { resolveUserCurrency, convertPrice } = require('../utils/localeHelper');

      let item;
      let amount;
      let currency = 'INR';
      let receipt;
      let basePrice = 0;
      let itemCurrency = 'INR';

      const parseMeta = (m) => {
        if (!m) return {};
        let val = m;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { return {}; }
        }
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { return {}; }
        }
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) return val;
        return {};
      };

      if (type === 'lab') {
        item = await db.Lab.findByPk(id);
        if (!item) throw new AppError("Lab not found", 404);
        if (item.is_free) throw new AppError("Lab is free", 400);
        basePrice = parseFloat(item.price);
        const meta = parseMeta(item.metadata);
        itemCurrency = item.currency || meta.currency || 'INR';
        receipt = buildReceipt("lab", item.id);
      } else if (type === 'course') {
        item = await db.Course.findByPk(id);
        if (!item) throw new AppError("Course not found", 404);
        if (item.is_free) throw new AppError("Course is free", 400);
        basePrice = parseFloat(item.price);
        const meta = parseMeta(item.metadata);
        itemCurrency = item.currency || meta.currency || 'INR';
        receipt = buildReceipt("crs", item.id);
      } else if (type === 'webinar') {
        item = await db.Webinar.findByPk(id);
        if (!item) throw new AppError("Webinar not found", 404);
        if (item.status !== 'published') throw new AppError("Webinar not available", 404);
        if (item.is_free || Number(item.price) <= 0) throw new AppError("Webinar is free", 400);
        if (item.max_capacity && item.enrolled_count >= item.max_capacity) {
          throw new AppError("Webinar is full", 400);
        }
        const existingReg = await db.WebinarRegistration.findOne({
          where: {
            webinar_id: id,
            user_id: userId,
            status: { [Op.in]: ['pending', 'confirmed'] },
          },
        });
        if (existingReg?.payment_status === 'paid') {
          throw new AppError("You are already registered for this webinar", 400);
        }
        basePrice = parseFloat(item.price);
        const meta = parseMeta(item.metadata);
        itemCurrency = item.currency || meta.currency || 'INR';
        receipt = buildReceipt("wbn", item.id);
      } else if (type === 'training_program') {
        item = await db.ExpertTrainingProgram.findByPk(id);
        if (!item) throw new AppError("Training program not found", 404);
        if (!item.is_published) throw new AppError("Training program not available", 404);
        if (item.is_free || Number(item.price) <= 0) throw new AppError("Training program is free", 400);
        basePrice = parseFloat(item.price);
        const meta = parseMeta(item.metadata);
        itemCurrency = item.currency || item.currency_code || meta.currency || 'INR';
        receipt = buildReceipt("trn", item.id);
      } else if (type === 'voucher') {
        item = await db.Voucher.findByPk(id);
        if (!item) throw new AppError("Voucher not found", 404);
        if (!item.is_active) throw new AppError("Voucher not available", 404);
        if (item.expires_at && new Date(item.expires_at) < new Date()) throw new AppError("Voucher expired", 400);
        const original = Number(item.original_price || 0);
        const discount = Number(item.discount_value || 0);
        const finalPrice = Math.max(0, original - discount);
        if (finalPrice <= 0) throw new AppError("Voucher is free", 400);
        
        let qty = parseInt(req.body.quantity, 10);
        if (isNaN(qty) || qty < 1) qty = 1;

        basePrice = finalPrice * qty;
        const meta = parseMeta(item.metadata);
        itemCurrency = item.currency || meta.currency || 'INR';
        receipt = buildReceipt("vcr", item.id);
      } else {
        throw new AppError("Invalid type, must be 'lab', 'course', 'webinar', 'training_program', or 'voucher'", 400);
      }

      const { amount: inrAmount } = convertPrice(
        basePrice,
        itemCurrency || 'INR',
        'INR',
        platformDefaults.exchangeRates
      );
      amount = Math.round(inrAmount * 100);
      currency = 'INR';

      // Create Razorpay order
      const options = {
        amount,
        currency,
        receipt,
      };
      let order;
      try {
        order = await rzp.orders.create(options);
      } catch (rzpErr) {
        console.log(rzpErr);
        throw mapRazorpayError(rzpErr);
      }

      return response.success(res, "Order created", 200, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: keyId || process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      return fail(res, err);
    }
  };

  /**
   * Verify Razorpay payment and enroll user
   */
  verifyPayment = async (req, res) => {
    try {
      const rzp = await getRazorpayClient();
      if (!rzp) {
        throw new AppError("Payment integration not configured. Add Razorpay keys in Settings → Payments or set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.", 501);
      }
      const systemSettingsService = require('../services/systemSettingsService');
      const { keySecret } = await systemSettingsService.getRazorpayConfig();

      const userId = requireUserId(req);
      const crypto = require('crypto');
      const { orderId, paymentId, signature, type, id, quantity } = req.body;

      const secret = keySecret || process.env.RAZORPAY_KEY_SECRET;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(orderId + "|" + paymentId);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== signature) {
        throw new AppError("Invalid payment signature", 400);
      }

      // Enroll user
      if (type === 'lab') {
        const lab = await db.Lab.findByPk(id);
        if (lab && lab.is_free) {
          await lab.update({ is_free: false });
        }
        await learningService.enrollLab(userId, id, { confirmPurchase: true, orderId: paymentId });
      } else if (type === 'course') {
        const course = await db.Course.findByPk(id);
        if (course && course.is_free) {
          await course.update({ is_free: false });
        }
        await learningService.enrollCourse(userId, id, { confirmPurchase: true, orderId: paymentId });
      } else if (type === 'webinar') {
        const webinarRegistrationService = require('../services/webinarRegistrationService');
        const webinar = await db.Webinar.findByPk(id);
        if (!webinar) throw new AppError("Webinar not found", 404);
        await webinarRegistrationService.registerAfterPayment(userId, id, {
          orderId: paymentId,
          amountPaid: webinar.price,
        });
      } else if (type === 'training_program') {
        const expertTrainingProgramEnrollmentService = require('../services/expertTrainingProgramEnrollmentService');
        const program = await db.ExpertTrainingProgram.findByPk(id);
        if (!program) throw new AppError("Training program not found", 404);
        await expertTrainingProgramEnrollmentService.enrollAfterPayment(userId, id, {
          orderId: paymentId,
          amountPaid: program.price,
        });
      } else if (type === 'voucher') {
        const voucherService = require('../services/voucherService');
        let qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 1) qty = 1;

        const voucher = await db.Voucher.findByPk(id);
        if (!voucher) throw new AppError("Voucher not found", 404);
        
        const original = Number(voucher.original_price || 0);
        const discount = Number(voucher.discount_value || 0);
        const finalPrice = Math.max(0, original - discount);

        const { convertPrice } = require('../utils/localeHelper');
        const settings = (await systemSettingsService.getAllForClient(['general'])) || {};
        const platformDefaults = settings.general || {};
        
        let meta = voucher.metadata || {};
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
        }
        const itemCurrency = voucher.currency || meta.currency || 'INR';

        const basePrice = finalPrice * qty;
        const { amount: expectedInrAmount } = convertPrice(
          basePrice,
          itemCurrency,
          'INR',
          platformDefaults.exchangeRates
        );
        const expectedAmountPaise = Math.round(expectedInrAmount * 100);

        const rzpOrder = await rzp.orders.fetch(orderId);
        if (Number(rzpOrder.amount) < expectedAmountPaise) {
          throw new AppError("Payment amount mismatch", 400);
        }

        await voucherService.purchase(userId, id, qty);
      } else {
        throw new AppError("Invalid type, must be 'lab', 'course', 'webinar', 'training_program', or 'voucher'", 400);
      }

      return response.success(res, "Payment verified and enrollment successful", 200, { success: true });
    } catch (err) {
      return fail(res, err);
    }
  };

  /**
   * Get user payment history (Returns all transactions for Super Admin/Admin)
   */
  getMyPaymentHistory = async (req, res) => {
    try {
      const userId = requireUserId(req);

      const rbacService = require('../services/rbac/roleService');
      const role = await rbacService.getUserRole(userId);
      const roleName = String(role?.name || "").trim().toLowerCase();
      const isSuperAdmin =
        roleName === "super admin"
        || roleName === "super_admin"
        || String(role?.id || "") === "23ea22ce-e1f5-4435-8cd2-162756cb4be0";

      const hasAllPaymentsPerm = await rbacService.checkUserHasPermission(userId, "view_all_payments");
      const hasOwnPaymentsPerm = await rbacService.checkUserHasPermission(userId, "view_own_payments");

      const isAdminView = isSuperAdmin || hasAllPaymentsPerm;

      if (!isAdminView && !hasOwnPaymentsPerm) {
        return response.success(res, "Payment history retrieved", 200, { history: [], isAdmin: false, accessDenied: true });
      }

      const systemSettingsService = require('../services/systemSettingsService');
      const settings = (await systemSettingsService.getAllForClient(['general'])) || {};
      const platformDefaults = settings.general || {};
      const { convertPrice } = require('../utils/localeHelper');

      const userWhere = isAdminView ? {} : { user_id: userId };

      const userInclude = {
        model: db.User,
        as: "user",
        attributes: ["user_id", "full_name", "email"],
      };

      const rawCourseEnrollments = await db.Enrollment.findAll({
        where: userWhere,
        include: [
          { model: db.Course, as: "course", attributes: ["title", "price", "metadata", "is_free"] },
          userInclude,
        ],
        order: [["created_at", "DESC"]],
      });
      const courseEnrollments = rawCourseEnrollments.filter((item) => {
        return !!item.order_id || (item.course && !item.course.is_free && Number(item.course.price || 0) > 0);
      });

      const rawLabEnrollments = await db.LabEnrollment.findAll({
        where: userWhere,
        include: [
          { model: db.Lab, as: "lab", attributes: ["title", "price", "metadata", "is_free"] },
          userInclude,
        ],
        order: [["created_at", "DESC"]],
      });
      const labEnrollments = rawLabEnrollments.filter((item) => {
        return !!item.order_id || item.source === "purchase" || (item.lab && !item.lab.is_free && Number(item.lab.price || 0) > 0);
      });

      const webinarRegs = await db.WebinarRegistration.findAll({
        where: {
          ...userWhere,
          payment_status: "paid",
        },
        include: [
          { model: db.Webinar, as: "webinar", attributes: ["title", "price"] },
          userInclude,
        ],
        order: [["created_at", "DESC"]],
      });

      const programEnrollments = await db.ExpertTrainingProgramEnrollment.findAll({
        where: {
          ...userWhere,
          payment_status: "paid",
        },
        include: [
          { model: db.ExpertTrainingProgram, as: "program", attributes: ["title", "price", "currency"] },
          userInclude,
        ],
        order: [["created_at", "DESC"]],
      });

      let voucherPurchases = [];
      if (db.VoucherPurchase) {
        try {
          voucherPurchases = await db.VoucherPurchase.findAll({
            where: { ...userWhere },
            include: [
              { model: db.Voucher, as: "voucher", attributes: ["title", "code"] },
              userInclude,
            ],
            order: [["created_at", "DESC"]],
          });
        } catch (e) {
          console.error("Error fetching voucher purchases:", e.message);
        }
      }

      const parseMeta = (m) => {
        if (!m) return {};
        let val = m;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { return {}; }
        }
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { return {}; }
        }
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) return val;
        return {};
      };

      const formatUserInfo = (u) => {
        if (!u) return null;
        const name = u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Platform User";
        return {
          id: u.user_id,
          name,
          email: u.email || "",
        };
      };

      const history = [];

      courseEnrollments.forEach((item) => {
        const rawPrice = item.course?.price || 0;
        const meta = parseMeta(item.course?.metadata);
        const fromCurr = item.course?.currency || meta.currency || 'INR';
        const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;

        history.push({
          id: item.id,
          paymentId: item.order_id || `PAY-CRS-${item.id.slice(0, 8)}`,
          itemTitle: item.course?.title || "Course Purchase",
          itemType: "Course",
          amount: inrAmount,
          currency: 'INR',
          paymentMethod: "Razorpay",
          status: "Success",
          date: item.created_at || item.enrolled_at || item.updated_at,
          user: formatUserInfo(item.user),
        });
      });

      labEnrollments.forEach((item) => {
        const rawPrice = item.lab?.price || 0;
        const meta = parseMeta(item.lab?.metadata);
        const fromCurr = item.lab?.currency || meta.currency || 'INR';
        const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;

        history.push({
          id: item.id,
          paymentId: item.order_id || `PAY-LAB-${item.id.slice(0, 8)}`,
          itemTitle: item.lab?.title || "Lab Purchase",
          itemType: "Lab",
          amount: inrAmount,
          currency: 'INR',
          paymentMethod: "Razorpay",
          status: "Success",
          date: item.created_at || item.assigned_at || item.started_at || item.updated_at,
          user: formatUserInfo(item.user),
        });
      });

      webinarRegs.forEach((item) => {
        const rawPrice = item.amount_paid || item.webinar?.price || 0;
        const inrAmount = convertPrice(rawPrice, 'INR', 'INR', platformDefaults.exchangeRates).amount;

        history.push({
          id: item.id,
          paymentId: item.order_id || `PAY-WBN-${item.id.slice(0, 8)}`,
          itemTitle: item.webinar?.title || "Webinar Registration",
          itemType: "Webinar",
          amount: inrAmount,
          currency: 'INR',
          paymentMethod: "Razorpay",
          status: "Success",
          date: item.registered_at || item.created_at || item.updated_at,
          user: formatUserInfo(item.user),
        });
      });

      programEnrollments.forEach((item) => {
        const rawPrice = Number(item.amount_paid) || item.program?.price || 0;
        const fromCurr = item.program?.currency || 'INR';
        const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;

        history.push({
          id: item.id,
          paymentId: item.order_id || `PAY-PRG-${item.id.slice(0, 8)}`,
          itemTitle: item.program?.title || "Program Purchase",
          itemType: "Program",
          amount: inrAmount,
          currency: 'INR',
          paymentMethod: "Razorpay",
          status: "Success",
          date: item.enrolled_at || item.created_at || item.updated_at,
          user: formatUserInfo(item.user),
        });
      });

      voucherPurchases.forEach((item) => {
        const rawPrice = Number(item.price_paid || 0);

        history.push({
          id: item.id,
          paymentId: `PAY-VCR-${item.id.slice(0, 8)}`,
          itemTitle: item.voucher?.title || `Voucher (${item.voucher?.code || 'Exam'})`,
          itemType: "Voucher",
          amount: rawPrice,
          currency: 'INR',
          paymentMethod: "Razorpay",
          status: "Success",
          date: item.created_at || item.updated_at,
          user: formatUserInfo(item.user),
        });
      });

      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      return response.success(res, "Payment history retrieved", 200, { history, isAdmin: isAdminView });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new PaymentController();
