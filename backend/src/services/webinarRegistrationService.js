const { Webinar, WebinarRegistration, User } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { Op } = require("sequelize");

async function syncWebinarEnrolledCount(webinarId) {
  const count = await WebinarRegistration.count({
    where: {
      webinar_id: webinarId,
      status: { [Op.in]: ["pending", "confirmed"] },
    },
  });
  await Webinar.update({ enrolled_count: count }, { where: { id: webinarId } });
  return count;
}

class WebinarRegistrationService {
  async registerFree(userId, webinarId, profile = {}) {
    const webinar = await Webinar.findByPk(webinarId);
    if (!webinar || webinar.status !== "published") {
      throw new AppError("Webinar not found", 404);
    }
    if (!webinar.is_free && Number(webinar.price) > 0) {
      throw new AppError("This webinar requires payment", 402);
    }
    if (webinar.max_capacity && webinar.enrolled_count >= webinar.max_capacity) {
      throw new AppError("Webinar is full", 400);
    }

    const existing = await WebinarRegistration.findOne({
      where: { webinar_id: webinarId, user_id: userId },
    });
    if (existing && existing.status !== "cancelled") {
      return { registration: existing, alreadyRegistered: true };
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });

    let row = existing;
    if (row) {
      await row.update({
        status: "confirmed",
        payment_status: "free",
        amount_paid: 0,
        full_name: profile.full_name || user?.full_name || row.full_name,
        email: profile.email || user?.email || row.email,
        company: profile.company ?? row.company,
        job_title: profile.job_title ?? row.job_title,
        registered_at: new Date(),
      });
    } else {
      row = await WebinarRegistration.create({
        webinar_id: webinarId,
        user_id: userId,
        full_name: profile.full_name || user?.full_name || "Attendee",
        email: profile.email || user?.email || null,
        company: profile.company || null,
        job_title: profile.job_title || null,
        status: "confirmed",
        payment_status: "free",
        amount_paid: 0,
        registered_at: new Date(),
      });
    }

    await syncWebinarEnrolledCount(webinarId);
    return { registration: row, alreadyRegistered: false };
  }

  async registerAfterPayment(userId, webinarId, { orderId, amountPaid } = {}) {
    const webinar = await Webinar.findByPk(webinarId);
    if (!webinar || webinar.status !== "published") {
      throw new AppError("Webinar not found", 404);
    }
    if (webinar.is_free || Number(webinar.price) <= 0) {
      throw new AppError("Webinar is free — use free registration", 400);
    }
    if (webinar.max_capacity && webinar.enrolled_count >= webinar.max_capacity) {
      const existingFull = await WebinarRegistration.findOne({
        where: { webinar_id: webinarId, user_id: userId },
      });
      if (!existingFull || existingFull.status === "cancelled") {
        throw new AppError("Webinar is full", 400);
      }
    }

    const existing = await WebinarRegistration.findOne({
      where: { webinar_id: webinarId, user_id: userId },
    });
    if (existing?.payment_status === "paid" && existing.status === "confirmed") {
      return { registration: existing, alreadyRegistered: true };
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });

    const payload = {
      status: "confirmed",
      payment_status: "paid",
      amount_paid: amountPaid != null ? Number(amountPaid) : Number(webinar.price),
      order_id: orderId || null,
      full_name: user?.full_name || existing?.full_name || "Attendee",
      email: user?.email || existing?.email || null,
      registered_at: new Date(),
    };

    let row = existing;
    if (row) {
      await row.update(payload);
    } else {
      if (webinar.max_capacity && webinar.enrolled_count >= webinar.max_capacity) {
        throw new AppError("Webinar is full", 400);
      }
      row = await WebinarRegistration.create({
        webinar_id: webinarId,
        user_id: userId,
        ...payload,
      });
    }

    await syncWebinarEnrolledCount(webinarId);
    return { registration: row, alreadyRegistered: false };
  }

  async listForWebinar(webinarId, { search } = {}) {
    const webinar = await Webinar.findByPk(webinarId);
    if (!webinar) throw new AppError("Webinar not found", 404);

    const where = { webinar_id: webinarId };
    const rows = await WebinarRegistration.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "email"],
          required: false,
        },
      ],
      order: [["registered_at", "DESC"]],
    });

    let mapped = rows.map((r) => {
      const j = typeof r.toJSON === "function" ? r.toJSON() : r;
      return {
        id: j.id,
        name: j.full_name || j.user?.full_name || "—",
        email: j.email || j.user?.email || "—",
        company: j.company || "—",
        title: j.job_title || "—",
        registeredAt: j.registered_at,
        status: j.status === "confirmed" ? "Confirmed" : j.status === "pending" ? "Pending" : "Cancelled",
        paymentStatus: j.payment_status,
        paymentLabel:
          j.payment_status === "paid"
            ? "Paid"
            : j.payment_status === "free"
              ? "Free"
              : j.payment_status === "pending"
                ? "Pending"
                : "Failed",
        amountPaid: Number(j.amount_paid || 0),
      };
    });

    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      mapped = mapped.filter(
        (a) =>
          a.name.toLowerCase().includes(q)
          || a.email.toLowerCase().includes(q)
          || a.company.toLowerCase().includes(q)
      );
    }

    const confirmed = mapped.filter((a) => a.status === "Confirmed").length;
    const pending = mapped.filter((a) => a.status === "Pending").length;

    return {
      rows: mapped,
      stats: {
        total: mapped.length,
        confirmed,
        pending,
        capacity: webinar.max_capacity,
      },
    };
  }

  async isUserRegistered(userId, webinarId) {
    if (!userId || !webinarId) return false;
    const row = await WebinarRegistration.findOne({
      where: {
        webinar_id: webinarId,
        user_id: userId,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    return !!row;
  }

  async listUserRegistrations(userId) {
    if (!userId) return [];
    const rows = await WebinarRegistration.findAll({
      where: {
        user_id: String(userId),
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      include: [
        {
          model: Webinar,
          as: "webinar",
        },
      ],
      order: [["registered_at", "DESC"]],
    });
    return rows.map((r) => r.webinar).filter(Boolean);
  }
}

module.exports = new WebinarRegistrationService();
