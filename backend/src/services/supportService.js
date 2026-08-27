const { SupportTicket, User } = require("../models");
const { Op } = require("sequelize");
const { AppError } = require("../middleware/errorHandler");
const emailService = require("./emailService");
const notificationService = require("./notificationService");
const { sequelize } = require("../models");
const { nextTicketRef, formatTicketRefLabel } = require("../utils/supportTicketRef");

class SupportService {
  async createTicket({ userId = null, name, email, subject, message }) {
    if (!name || !email || !subject || !message) throw new AppError("All fields are required", 400);
    const ticketRef = await nextTicketRef(sequelize);
    const row = await SupportTicket.create({
      user_id: userId || null,
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      ticket_ref: ticketRef,
      status: "open",
    });
    await notificationService.createNotification({
      audience: "admin",
      eventType: "support_request_created",
      title: "New support request",
      message: `${row.name} submitted ${formatTicketRefLabel(ticketRef)}.`,
      metadata: {
        ticketId: row.id,
        email: row.email,
        eventType: "support_request_created",
        url: `/app/support?ticket=${row.id}`,
        click_action: `/app/support?ticket=${row.id}`,
      },
    });
    return row;
  }

  async listAdmin({ page = 1, limit = 20, q = "" } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    const where = q
      ? {
          [Op.or]: [
            { subject: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
            { message: { [Op.like]: `%${q}%` } },
            { ticket_ref: { [Op.like]: `%${q.replace(/^ticket-/i, "TICKET-")}%` } },
          ],
        }
      : {};
    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    return { rows, pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 } };
  }

  async listForUser(userId, { page = 1, limit = 20 } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    const user = await User.findOne({ where: { user_id: userId }, attributes: ["email"] });
    const where = user?.email ? { [Op.or]: [{ user_id: userId }, { email: user.email }] } : { user_id: userId };
    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    return { rows, pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 } };
  }

  async replyAdmin({ ticketId, adminId, reply, status = "resolved" }) {
    const row = await SupportTicket.findByPk(ticketId);
    if (!row) throw new AppError("Support ticket not found", 404);
    row.admin_reply = String(reply || "").trim();
    row.replied_by = adminId || null;
    row.replied_at = new Date();
    row.status = ["open", "in_progress", "resolved", "closed"].includes(status) ? status : "resolved";
    await row.save();
    if (row.user_id) {
      await notificationService.createNotification({
        userId: row.user_id,
        audience: "user",
        eventType: "support_reply",
        title: "Support reply received",
        message: `Admin replied to your ticket: ${row.subject}`,
        metadata: { ticketId: row.id },
      });
    }
    try {
      await emailService.sendCustom(row.email, `Support Reply: ${row.subject}`, "verification.html", {
        OTP: "N/A",
        PURPOSE: "Support Reply",
        EMAIL: row.email,
        EXPIRY_MINUTES: "-",
        YEAR: new Date().getFullYear(),
        APP_NAME: process.env.EMAIL_FROM_NAME || "ALAR Labs",
      });
    } catch (_) {}
    return row;
  }
}

module.exports = new SupportService();
