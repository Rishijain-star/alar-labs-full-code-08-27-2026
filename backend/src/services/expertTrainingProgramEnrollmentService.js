const { ExpertTrainingProgram, ExpertTrainingProgramEnrollment, User } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const { Op } = require("sequelize");

async function syncProgramEnrolledCount(programId) {
  const count = await ExpertTrainingProgramEnrollment.count({
    where: {
      program_id: programId,
      status: { [Op.in]: ["pending", "confirmed"] },
    },
  });
  await ExpertTrainingProgram.update({ enrolled_count: count }, { where: { id: programId } });
  return count;
}

class ExpertTrainingProgramEnrollmentService {
  async enrollFree(userId, programId, profile = {}) {
    const program = await ExpertTrainingProgram.findByPk(programId);
    if (!program || !program.is_published) {
      throw new AppError("Program not found", 404);
    }
    const price = Number(program.price);
    const isFree = Boolean(program.is_free) || price <= 0;
    if (!isFree) {
      throw new AppError("This program requires payment", 402);
    }
    if (program.max_seats && program.enrolled_count >= program.max_seats) {
      throw new AppError("Program is full", 400);
    }

    const existing = await ExpertTrainingProgramEnrollment.findOne({
      where: { program_id: programId, user_id: userId },
    });
    if (existing && existing.status !== "cancelled") {
      return { enrollment: existing, alreadyEnrolled: true };
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });

    let row = existing;
    const payload = {
      status: "confirmed",
      payment_status: "free",
      amount_paid: 0,
      full_name: profile.full_name || user?.full_name || existing?.full_name || "Student",
      email: profile.email || user?.email || existing?.email || null,
      company: profile.company ?? existing?.company ?? null,
      job_title: profile.job_title ?? existing?.job_title ?? null,
      enrolled_at: new Date(),
    };

    if (row) {
      await row.update(payload);
    } else {
      row = await ExpertTrainingProgramEnrollment.create({
        program_id: programId,
        user_id: userId,
        ...payload,
      });
    }

    await syncProgramEnrolledCount(programId);
    return { enrollment: row, alreadyEnrolled: false };
  }

  async enrollAfterPayment(userId, programId, { orderId, amountPaid } = {}) {
    const program = await ExpertTrainingProgram.findByPk(programId);
    if (!program || !program.is_published) {
      throw new AppError("Program not found", 404);
    }
    const price = Number(program.price);
    if (Boolean(program.is_free) || price <= 0) {
      throw new AppError("Program is free — use free enrollment", 400);
    }

    const existing = await ExpertTrainingProgramEnrollment.findOne({
      where: { program_id: programId, user_id: userId },
    });
    if (existing?.payment_status === "paid" && existing.status === "confirmed") {
      return { enrollment: existing, alreadyEnrolled: true };
    }

    const user = await User.findByPk(userId, {
      attributes: ["user_id", "full_name", "email"],
    });

    const payload = {
      status: "confirmed",
      payment_status: "paid",
      amount_paid: amountPaid != null ? Number(amountPaid) : price,
      order_id: orderId || null,
      full_name: user?.full_name || existing?.full_name || "Student",
      email: user?.email || existing?.email || null,
      enrolled_at: new Date(),
    };

    let row = existing;
    if (row) {
      await row.update(payload);
    } else {
      if (program.max_seats && program.enrolled_count >= program.max_seats) {
        throw new AppError("Program is full", 400);
      }
      row = await ExpertTrainingProgramEnrollment.create({
        program_id: programId,
        user_id: userId,
        ...payload,
      });
    }

    await syncProgramEnrolledCount(programId);
    return { enrollment: row, alreadyEnrolled: false };
  }

  async listForProgram(programId, { search } = {}) {
    const program = await ExpertTrainingProgram.findByPk(programId);
    if (!program) throw new AppError("Program not found", 404);

    const rows = await ExpertTrainingProgramEnrollment.findAll({
      where: { program_id: programId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "email"],
          required: false,
        },
      ],
      order: [["enrolled_at", "DESC"]],
    });

    let mapped = rows.map((r) => {
      const j = typeof r.toJSON === "function" ? r.toJSON() : r;
      return {
        id: j.id,
        name: j.full_name || j.user?.full_name || "—",
        email: j.email || j.user?.email || "—",
        company: j.company || "—",
        title: j.job_title || "—",
        enrolledAt: j.enrolled_at,
        status:
          j.status === "confirmed"
            ? "Confirmed"
            : j.status === "pending"
              ? "Pending"
              : "Cancelled",
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
        capacity: program.max_seats,
      },
    };
  }

  async isUserEnrolled(userId, programId) {
    if (!userId || !programId) return false;
    const row = await ExpertTrainingProgramEnrollment.findOne({
      where: {
        program_id: programId,
        user_id: userId,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    return !!row;
  }

  /** Enrolled published programs for the signed-in student (My Programs). */
  async listForUser(userId) {
    if (!userId) return [];

    const rows = await ExpertTrainingProgramEnrollment.findAll({
      where: {
        user_id: userId,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      include: [
        {
          model: ExpertTrainingProgram,
          as: "program",
          required: true,
          where: { is_published: true },
        },
      ],
      order: [["enrolled_at", "DESC"]],
    });

    return rows
      .map((e) => {
        const program = typeof e.program?.toJSON === "function" ? e.program.toJSON() : e.program;
        if (!program) return null;
        program.meeting_link = null;
        return {
          enrollmentId: e.id,
          programId: program.id,
          enrolledAt: e.enrolled_at,
          enrollmentStatus: e.status,
          source: e.payment_status === "paid" ? "purchase" : "free",
          paymentStatus: e.payment_status,
          ...program,
        };
      })
      .filter(Boolean);
  }
}

module.exports = new ExpertTrainingProgramEnrollmentService();
