const { SupportChatMessage, SupportTicket, User } = require("../models");
const { AppError } = require("../middleware/errorHandler");
const redisManager = require("../lib/redisManager");

const REDIS_PREFIX = "support:chat:";

async function publishTicketEvent(ticketId, event) {
  const channel = `${REDIS_PREFIX}${ticketId}`;
  try {
    const client = await redisManager.getClientSafe();
    if (client) await client.publish(channel, JSON.stringify(event));
  } catch (_) {
    /* non-fatal */
  }
}

async function notifyChatRecipients({ ticket, ticketId, senderRole, senderUserId, displayName, body }) {
  const notificationService = require("./notificationService");
  const rbacService = require("./rbac/roleService");
  const { User } = require("../models");
  const { isUserConnectedToTicket } = require("../lib/supportChatWebSocket");

  let recipientUserIds = [];
  let title;
  let message;
  let url;
  const preview = String(body || "").trim().slice(0, 140);

  if (senderRole === "admin") {
    if (!ticket.user_id) return;
    recipientUserIds = [ticket.user_id];
    title = "Support replied";
    message = preview ? `${displayName}: ${preview}` : `${displayName} sent a message`;
    url = `/support/chat/${ticketId}`;
  } else {
    const users = await User.findAll({ where: { is_active: true }, attributes: ["user_id"] });
    for (const u of users) {
      if (senderUserId != null && String(u.user_id) === String(senderUserId)) continue;
      const can = await rbacService.checkUserHasPermission(u.user_id, ["view_support"], "OR");
      if (can) recipientUserIds.push(u.user_id);
    }
    title = "New support message";
    message = preview ? `${displayName}: ${preview}` : `${displayName} sent a message`;
    url = `/app/support?ticket=${ticketId}`;
  }

  recipientUserIds = recipientUserIds.filter(
    (uid) => !isUserConnectedToTicket(ticketId, uid)
  );
  if (!recipientUserIds.length) return;

  await notificationService.createNotification({
    userId: recipientUserIds,
    audience: "user",
    eventType: "support_chat_message",
    title,
    message,
    metadata: {
      ticketId,
      eventType: "support_chat_message",
      url,
      click_action: url,
    },
  });
}

class SupportChatService {
  async assertTicketAccess(ticket, userId, roleHint) {
    if (!ticket) throw new AppError("Ticket not found", 404);
    if (roleHint === "admin") return;
    const user = userId ? await User.findByPk(userId, { attributes: ["email"] }) : null;
    const emailMatch =
      user?.email && ticket.email && String(user.email).toLowerCase() === String(ticket.email).toLowerCase();
    if (ticket.user_id && String(ticket.user_id) === String(userId)) return;
    if (emailMatch) return;
    throw new AppError("Forbidden", 403);
  }

  async listMessages(ticketId, { userId, isAdmin, page = 1, limit = 50 } = {}) {
    const ticket = await SupportTicket.findByPk(ticketId);
    await this.assertTicketAccess(ticket, userId, isAdmin ? "admin" : "user");

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 50));

    const dbCount = await SupportChatMessage.count({ where: { ticket_id: ticketId } });

    const mapRow = (m) => {
      const j = typeof m.toJSON === "function" ? m.toJSON() : m;
      const displayName =
        j.sender_role === "admin"
          ? j.sender?.full_name || j.sender?.email || "Admin"
          : j.sender?.full_name || ticket.name || ticket.email || "You";
      return {
        id: j.id,
        ticket_id: j.ticket_id || ticketId,
        sender_role: j.sender_role,
        sender_user_id: j.sender_user_id,
        body: j.body,
        created_at: j.created_at,
        display_name: j.display_name || displayName,
      };
    };

    let synthetic = [];
    if (dbCount === 0 && ticket.message) {
      synthetic = [
        {
          id: `initial-${ticket.id}`,
          ticket_id: ticketId,
          sender_role: "user",
          sender_user_id: ticket.user_id || null,
          body: ticket.message,
          created_at: ticket.created_at,
          display_name: ticket.name || ticket.email || "User",
        },
      ];
    }

    const total = dbCount > 0 ? dbCount : synthetic.length;
    const totalPages = Math.max(1, Math.ceil(total / l) || 1);
    const endExclusive = Math.max(0, total - (p - 1) * l);
    const startInclusive = Math.max(0, endExclusive - l);
    const hasOlder = startInclusive > 0;

    let messages = [];
    if (dbCount > 0 && endExclusive > startInclusive) {
      const rows = await SupportChatMessage.findAll({
        where: { ticket_id: ticketId },
        order: [["created_at", "ASC"]],
        offset: startInclusive,
        limit: endExclusive - startInclusive,
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["user_id", "full_name", "email"],
            required: false,
          },
        ],
      });
      messages = rows.map(mapRow);
    } else if (synthetic.length && endExclusive > startInclusive) {
      messages = synthetic.slice(startInclusive, endExclusive);
    }

    return {
      ticket: ticket.toJSON(),
      messages,
      pagination: {
        page: p,
        limit: l,
        total,
        total_pages: totalPages,
        has_older: hasOlder,
      },
    };
  }

  async postMessage({ ticketId, userId, isAdmin, body }) {
    const text = String(body || "").trim();
    if (!text) throw new AppError("Message is required", 400);

    const ticket = await SupportTicket.findByPk(ticketId);
    await this.assertTicketAccess(ticket, userId, isAdmin ? "admin" : "user");

    const senderRole = isAdmin ? "admin" : "user";
    const msg = await SupportChatMessage.create({
      ticket_id: ticketId,
      sender_user_id: userId || null,
      sender_role: senderRole,
      body: text,
    });

    const sender = userId
      ? await User.findByPk(userId, { attributes: ["user_id", "full_name", "email"] })
      : null;
    const displayName =
      senderRole === "admin"
        ? sender?.full_name || sender?.email || "Admin"
        : sender?.full_name || ticket.name || ticket.email || "User";

    const payload = {
      ticketId,
      type: "message",
      message: {
        id: msg.id,
        ticket_id: ticketId,
        sender_role: senderRole,
        sender_user_id: userId || null,
        body: text,
        created_at: msg.created_at,
        display_name: displayName,
      },
    };

    await publishTicketEvent(ticketId, payload);
    try {
      const { broadcastLocal } = require("../lib/supportChatWebSocket");
      broadcastLocal(ticketId, JSON.stringify(payload));
    } catch (_) {
      /* ws hub not initialized in tests */
    }

    if (ticket.status === "open" && senderRole === "admin") {
      ticket.status = "in_progress";
      await ticket.save();
    }

    setImmediate(() => {
      notifyChatRecipients({
        ticket,
        ticketId,
        senderRole,
        senderUserId: userId,
        displayName,
        body: text,
      }).catch(() => { /* non-fatal */ });
    });

    return payload.message;
  }
}

module.exports = { supportChatService: new SupportChatService(), publishTicketEvent, REDIS_PREFIX };
