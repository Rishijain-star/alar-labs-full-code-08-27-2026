const { Op } = require("sequelize");
const {
  User,
  Course,
  Lab,
  Role,
  Enrollment,
  LabEnrollment,
  Webinar,
  WebinarRegistration,
  ExpertTrainingProgram,
  ExpertTrainingProgramEnrollment,
  Voucher,
  VoucherPurchase,
} = require("../models");
const learningService = require("./learningService");
const rbacService = require("./rbac/roleService");
const systemSettingsService = require("./systemSettingsService");
const { convertPrice } = require("../utils/localeHelper");

class DashboardService {
  async getStatsForUser(userId, permissions = []) {
    const personal = await learningService.getMyLearning(userId);
    const directLabs = (personal?.labs || []).filter((l) => l.source === "free_enroll" || l.source === "purchase");
    const stats = {
      scope: "personal",
      personal: {
        coursesEnrolled: personal?.stats?.coursesEnrolled || 0,
        labsEnrolled: personal?.stats?.labsInList || 0,
        labsStarted: personal?.stats?.labsStarted || 0,
        labsCompleted: personal?.stats?.labsCompleted || 0,
        purchases:
          (personal?.courses || []).filter((c) => c.source === "purchase").length
          + directLabs.filter((l) => l.source === "purchase").length,
      },
      admin: {},
      cards: [],
      recentUsers: [],
      recentActivity: [],
    };

    const role = await rbacService.getUserRole(userId);
    const roleName = String(role?.name || "").trim().toLowerCase();
    const isSuperAdmin =
      roleName === "super admin"
      || roleName === "super_admin"
      || String(role?.id || "") === "23ea22ce-e1f5-4435-8cd2-162756cb4be0";

    const isAdmin = isSuperAdmin || roleName === "admin" || roleName === "administrator";

    if (isAdmin || isSuperAdmin) {
      stats.scope = isSuperAdmin ? "super_admin" : "admin";

      try {
        const [totalCourses, totalLabs, totalUsers, totalWebinars] = await Promise.all([
          Course ? Course.count() : 0,
          Lab ? Lab.count() : 0,
          User ? User.count() : 0,
          Webinar ? Webinar.count().catch(() => 0) : 0,
        ]);

        // Count instructors
        let totalInstructors = 0;
        try {
          const instructorRoles = await Role.findAll({
            where: {
              name: {
                [Op.or]: [
                  { [Op.like]: "%instructor%" },
                  { [Op.like]: "%creator%" },
                  { [Op.like]: "%trainer%" },
                  { [Op.like]: "%admin%" },
                ],
              },
            },
            attributes: ["id"],
          });
          const roleIds = instructorRoles.map((r) => r.id);
          if (roleIds.length > 0) {
            totalInstructors = await User.count({ where: { role_id: roleIds } });
          }
        } catch (e) {
          totalInstructors = 0;
        }

        // Comprehensive Revenue calculation across Courses, Labs, Webinars, Programs & Vouchers
        let totalRevenue = 0;
        try {
          const settings = (await systemSettingsService.getAllForClient(['general'])) || {};
          const platformDefaults = settings.general || {};

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

          // 1. Course enrollments revenue
          if (Enrollment && Course) {
            const allCourseEnrollments = await Enrollment.findAll({
              include: [{ model: Course, as: "course", attributes: ["price", "metadata", "is_free"] }],
            });
            allCourseEnrollments.forEach((e) => {
              const isPaid = !!e.order_id || (e.course && !e.course.is_free && Number(e.course.price || 0) > 0);
              if (isPaid) {
                const rawPrice = Number(e.course?.price || 0);
                const meta = parseMeta(e.course?.metadata);
                const fromCurr = meta.currency || 'INR';
                const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;
                if (inrAmount > 0) totalRevenue += inrAmount;
              }
            });
          }

          // 2. Lab enrollments revenue
          if (LabEnrollment && Lab) {
            const allLabEnrollments = await LabEnrollment.findAll({
              include: [{ model: Lab, as: "lab", attributes: ["price", "metadata", "is_free"] }],
            });
            allLabEnrollments.forEach((e) => {
              const isPaid = !!e.order_id || e.source === "purchase" || (e.lab && !e.lab.is_free && Number(e.lab.price || 0) > 0);
              if (isPaid) {
                const rawPrice = Number(e.lab?.price || 0);
                const meta = parseMeta(e.lab?.metadata);
                const fromCurr = meta.currency || 'INR';
                const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;
                if (inrAmount > 0) totalRevenue += inrAmount;
              }
            });
          }

          // 3. Webinar registrations revenue
          if (WebinarRegistration) {
            const regs = await WebinarRegistration.findAll({
              where: { payment_status: "paid" },
              include: [{ model: Webinar, as: "webinar", attributes: ["price"] }],
            });
            regs.forEach((r) => {
              const rawPrice = Number(r.amount_paid || r.webinar?.price || 0);
              if (rawPrice > 0) totalRevenue += rawPrice;
            });
          }

          // 4. Program enrollments revenue
          if (ExpertTrainingProgramEnrollment) {
            const progs = await ExpertTrainingProgramEnrollment.findAll({
              where: { payment_status: "paid" },
              include: [{ model: ExpertTrainingProgram, as: "program", attributes: ["price", "currency"] }],
            });
            progs.forEach((r) => {
              const rawPrice = Number(r.amount_paid || r.program?.price || 0);
              const fromCurr = r.program?.currency || 'INR';
              const inrAmount = convertPrice(rawPrice, fromCurr, 'INR', platformDefaults.exchangeRates).amount;
              if (inrAmount > 0) totalRevenue += inrAmount;
            });
          }

          // 5. Voucher purchases revenue
          if (VoucherPurchase) {
            const vPurchases = await VoucherPurchase.findAll();
            vPurchases.forEach((v) => {
              const rawPrice = Number(v.price_paid || 0);
              if (rawPrice > 0) totalRevenue += rawPrice;
            });
          }
        } catch (e) {
          console.error("Dashboard revenue calculation error:", e.message);
        }

        stats.admin = {
          totalCourses,
          totalLabs,
          totalUsers,
          totalInstructors,
          totalWebinars,
          totalRevenue,
        };

        stats.cards = [
          { key: "courses", label: "Total Courses", value: totalCourses },
          { key: "labs", label: "Total Labs", value: totalLabs },
          { key: "purchases", label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}` },
          { key: "users", label: "Total Users", value: totalUsers },
          { key: "instructors", label: "Instructors", value: totalInstructors },
          { key: "webinars", label: "Live Webinars", value: totalWebinars },
        ];

        // Fetch Recent Users
        try {
          const recentUsersList = await User.findAll({
            limit: 6,
            order: [["created_at", "DESC"]],
            include: [{ model: Role, as: "role", attributes: ["name"] }],
            attributes: ["user_id", "full_name", "email", "created_at", "role_id"],
          });
          stats.recentUsers = recentUsersList.map((u) => {
            const name = u.full_name || u.email;
            return {
              id: u.user_id,
              name,
              email: u.email,
              role: u.role?.name || "User",
              created_at: u.created_at,
            };
          });
        } catch (e) {
          console.error("Error fetching recent users:", e.message);
        }

        // Fetch Recent Content Activity Stream (Courses, Labs, Webinars & Programs)
        try {
          const [recentCourses, recentLabs, recentWebinars, recentPrograms] = await Promise.all([
            Course ? Course.findAll({
              limit: 5,
              order: [["created_at", "DESC"]],
              attributes: ["id", "title", "slug", "created_at", "updated_at", "status", "thumbnail"],
            }).catch(() => []) : [],
            Lab ? Lab.findAll({
              limit: 5,
              order: [["created_at", "DESC"]],
              attributes: ["id", "title", "slug", "created_at", "updated_at", "status", "thumbnail"],
            }).catch(() => []) : [],
            Webinar ? Webinar.findAll({
              limit: 5,
              order: [["created_at", "DESC"]],
              attributes: ["id", "title", "slug", "created_at", "updated_at", "status"],
            }).catch(() => []) : [],
            ExpertTrainingProgram ? ExpertTrainingProgram.findAll({
              limit: 5,
              order: [["created_at", "DESC"]],
              attributes: ["id", "title", "slug", "created_at", "updated_at", "is_published"],
            }).catch(() => []) : [],
          ]);

          const activities = [
            ...recentCourses.map((c) => ({
              id: c.id,
              title: c.title,
              slug: c.slug,
              type: "Course",
              created_at: c.updated_at || c.created_at,
              status: c.status || "published",
              thumbnail: c.thumbnail,
            })),
            ...recentLabs.map((l) => ({
              id: l.id,
              title: l.title,
              slug: l.slug,
              type: "Lab",
              created_at: l.updated_at || l.created_at,
              status: l.status || "published",
              thumbnail: l.thumbnail,
            })),
            ...recentWebinars.map((w) => ({
              id: w.id,
              title: w.title,
              slug: w.slug,
              type: "Webinar",
              created_at: w.updated_at || w.created_at,
              status: w.status || "published",
            })),
            ...recentPrograms.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              type: "Program",
              created_at: p.updated_at || p.created_at,
              status: p.is_published ? "published" : "draft",
            })),
          ];

          activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          stats.recentActivity = activities.slice(0, 6);
        } catch (e) {
          console.error("Error fetching recent content activity:", e.message);
        }
      } catch (err) {
        console.error("Error generating admin dashboard stats:", err);
      }
    } else {
      stats.cards = [
        { key: "my_courses", label: "My Courses", value: stats.personal.coursesEnrolled, permission: null },
        { key: "my_labs", label: "My Labs", value: stats.personal.labsEnrolled, permission: null },
      ];
    }

    return stats;
  }
}

module.exports = new DashboardService();
