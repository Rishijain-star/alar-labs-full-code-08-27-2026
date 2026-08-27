const { Notification, UserDeviceToken, User, Role } = require("../models");
const { Op } = require("sequelize");
const logger = require("../lib/logger");
const firebaseAdminService = require("./firebaseAdminService");

const INVALID_FCM_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
  "messaging/mismatched-credential",
  "messaging/invalid-apns-credentials",
]);

function isInvalidFcmTokenError(error) {
  const code = String(error?.code || error?.errorInfo?.code || "").toLowerCase();
  if (!code) return false;
  if (INVALID_FCM_ERROR_CODES.has(code)) return true;
  return (
    code.includes("registration-token-not-registered") ||
    code.includes("invalid-registration-token") ||
    code.includes("invalid-registration")
  );
}

class NotificationService {
  async _getAdminUserIds() {
    const users = await User.findAll({
      attributes: ["user_id"],
      include: [{ model: Role, as: "role", attributes: ["name"], required: false }],
      where: { is_active: true },
    });
    return users
      .filter((u) => {
        const roleName = String(u?.role?.name || "").toLowerCase();
        return roleName.includes("admin") || roleName.includes("super");
      })
      .map((u) => u.user_id)
      .filter(Boolean);
  }

  async _getAllActiveUserIds() {
    const users = await User.findAll({
      attributes: ["user_id"],
      where: { is_active: true },
    });
    return users.map((u) => u.user_id).filter(Boolean);
  }

  async createNotification({
    userId = null,
    audience = "user",
    eventType,
    title,
    message,
    metadata = {},
  }) {
    logger.info(
      `[Notification] createNotification called eventType=${eventType || "unknown"} audience=${audience} userId=${Array.isArray(userId) ? userId.join(",") : (userId || "null")}`
    );

    let recipientUserIds = [];
    if (Array.isArray(userId)) {
      recipientUserIds = userId.filter(Boolean);
    } else if (userId) {
      recipientUserIds = [userId];
    } else if (audience === "admin") {
      recipientUserIds = await this._getAdminUserIds();
    } else if (metadata?.broadcast_all_users === true) {
      recipientUserIds = await this._getAllActiveUserIds();
    }

    if (!recipientUserIds.length) {
      const single = await Notification.create({
        user_id: userId || null,
        audience,
        event_type: eventType,
        title,
        message,
        metadata,
      });
      await this.sendPushToAudience({ userId, audience, title, message, metadata });
      return single;
    }

    const payload = recipientUserIds.map((uid) => ({
      user_id: uid,
      audience,
      event_type: eventType,
      title,
      message,
      metadata,
    }));
    const rows = await Notification.bulkCreate(payload);
    await this.sendPushToAudience({
      userId: recipientUserIds,
      audience,
      title,
      message,
      metadata,
    });
    return rows[0];
  }

  async listForUser(userId, { page = 1, limit = 20 } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;
    const { rows, count } = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    return {
      rows,
      pagination: {
        page: p,
        limit: l,
        total: count,
        total_pages: Math.ceil(count / l) || 1,
      },
    };
  }

  async markAsRead(userId, id) {
    const row = await Notification.findOne({ where: { id, user_id: userId } });
    if (!row) return null;
    row.is_read = true;
    await row.save();
    return row;
  }

  async registerDeviceToken(userId, { deviceToken, platform, metadata = {} }) {
    if (!userId) {
      logger.warn("registerDeviceToken called without authenticated user");
      return null;
    }

    const normalizedToken =
      typeof deviceToken === "string" ? deviceToken.trim() : String(deviceToken || "").trim();
    if (!normalizedToken) {
      logger.warn(`registerDeviceToken called without token for user ${userId}`);
      return null;
    }

    let tokenRow = null;
    try {
      const [row, created] = await UserDeviceToken.findOrCreate({
        where: { device_token: normalizedToken },
        defaults: {
          user_id: userId,
          device_token: normalizedToken,
          platform: platform || null,
          metadata: metadata || {},
          is_active: true,
        },
      });
      if (!created) {
        row.user_id = userId;
        row.platform = platform || row.platform;
        row.metadata = { ...(row.metadata || {}), ...(metadata || {}) };
        row.is_active = true;
        await row.save();
      }
      tokenRow = row;
      logger.info(
        `Device token ${created ? "registered" : "updated"} in user_device_tokens for user ${userId}`
      );
    } catch (error) {
      logger.error(`Failed to save device token row: ${error.message}`);
    }

    let syncedLegacy = false;
    try {
      const user = await User.findOne({ where: { user_id: userId } });
      if (user) {
        const existingTokens = Array.isArray(user.fcm_token) ? user.fcm_token : [];
        if (!existingTokens.includes(normalizedToken)) {
          user.fcm_token = [...existingTokens, normalizedToken];
          await user.save();
        }
        syncedLegacy = true;
      }
      logger.info(`Device token synced in users.fcm_token for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to sync users.fcm_token: ${error.message}`);
    }

    if (tokenRow) return tokenRow;
    if (syncedLegacy) {
      return {
        user_id: userId,
        device_token: normalizedToken,
        platform: platform || "web",
        metadata: metadata || {},
        is_active: true,
      };
    }
    return null;
  }

  async sendPushToAudience({ userId = null, audience = "user", title, message, metadata = {} }) {
    const where = { is_active: true };
    if (Array.isArray(userId) && userId.length) {
      where.user_id = { [Op.in]: userId };
    } else if (audience === "admin") {
      const adminUserIds = await this._getAdminUserIds();
      if (!adminUserIds.length) return { tokens: 0, sent: false };
      where.user_id = { [Op.in]: adminUserIds };
    } else if (userId) {
      where.user_id = userId;
    } else if (metadata?.broadcast_all_users === true) {
      where.user_id = { [Op.ne]: null };
    } else {
      return { tokens: 0, sent: false };
    }
    const tokenRows = await UserDeviceToken.findAll({ where, attributes: ["device_token", "user_id"] });
    const deviceTokenToUserId = new Map(
      tokenRows
        .filter((r) => r?.device_token && r?.user_id)
        .map((r) => [r.device_token, r.user_id])
    );
    const userDeviceTokens = tokenRows.map((t) => t.device_token).filter(Boolean);

    // Fallback source for legacy rows where token was only stored on users.fcm_token
    const userWhere = {};
    if (where.user_id?.[Op.in]) userWhere.user_id = { [Op.in]: where.user_id[Op.in] };
    else if (where.user_id?.[Op.ne] !== undefined) userWhere.user_id = { [Op.ne]: null };
    else if (typeof where.user_id === "string") userWhere.user_id = where.user_id;

    const userRows = await User.findAll({
      where: userWhere,
      attributes: ["fcm_token"],
    }).catch(() => []);
    const userTableTokens = (userRows || [])
      .flatMap((u) => (Array.isArray(u.fcm_token) ? u.fcm_token : []))
      .filter(Boolean);

    const tokens = Array.from(new Set([...userDeviceTokens, ...userTableTokens]));
    if (!tokens.length) {
      logger.warn(
        `[Notification] Push skipped (no tokens) audience=${audience} userId=${Array.isArray(userId) ? userId.join(",") : (userId || "null")} title="${title || ""}"`
      );
      return { tokens: 0, sent: false, title, message, metadata };
    }

    logger.info(
      `[Notification] Push trigger start audience=${audience} tokens=${tokens.length} title="${title || ""}"`
    );

    const pushResult = await firebaseAdminService.sendMulticast({
      tokens,
      notification: { title, body: message },
      data: metadata || {},
    });

    // Remove invalid/expired tokens rejected by Firebase from both storage places.
    const invalidTokens = [];
    (pushResult.responses || []).forEach((r, idx) => {
      if (r?.success) return;
      if (isInvalidFcmTokenError(r?.error)) {
        invalidTokens.push(tokens[idx]);
      }
    });
    if (invalidTokens.length) {
      logger.warn(`[Notification] Invalid tokens detected count=${invalidTokens.length}`);
      // 1) Remove from user_device_tokens table
      await UserDeviceToken.destroy({
        where: { device_token: { [Op.in]: invalidTokens } },
        force: true,
      }).catch(() => { });

      // 2) Remove from users.fcm_token list
      const mappedUserIds = invalidTokens
        .map((t) => deviceTokenToUserId.get(t))
        .filter(Boolean);
      const targetUserIds =
        mappedUserIds.length > 0
          ? Array.from(new Set(mappedUserIds))
          : (Object.keys(userWhere).length ? (
            await User.findAll({ where: userWhere, attributes: ["user_id"] })
          ).map((u) => u.user_id) : []);

      if (targetUserIds.length) {
        const usersToClean = await User.findAll({
          where: { user_id: { [Op.in]: targetUserIds } },
          attributes: ["user_id", "fcm_token"],
        }).catch(() => []);

        for (const user of usersToClean) {
          const oldTokens = Array.isArray(user.fcm_token) ? user.fcm_token : [];
          const newTokens = oldTokens.filter((t) => !invalidTokens.includes(t));
          if (newTokens.length !== oldTokens.length) {
            user.fcm_token = newTokens;
            await user.save().catch(() => { });
          }
        }
      }
    }

    logger.info(
      `[Notification] Push trigger result success=${pushResult.successCount || 0} failure=${pushResult.failureCount || 0} audience=${audience}`
    );

    return {
      tokens: tokens.length,
      sent: (pushResult.successCount || 0) > 0,
      successCount: pushResult.successCount || 0,
      failureCount: pushResult.failureCount || 0,
      title,
      message,
      metadata,
    };
  }
}

module.exports = new NotificationService();
