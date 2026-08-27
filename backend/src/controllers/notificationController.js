const notificationService = require("../services/notificationService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class NotificationController {
  listMine = async (req, res) => {
    try {
      if (!req.user?.user_id) {
        return response.fail(res, "Authentication required", 401);
      }
      const data = await notificationService.listForUser(req.user.user_id, req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  markRead = async (req, res) => {
    try {
      const data = await notificationService.markAsRead(req.user?.user_id, req.params.id);
      return response.success(res, "Marked read", 200, { notification: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  registerDeviceToken = async (req, res) => {
    try {
      if (!req.user?.user_id) {
        return response.fail(res, "Unauthorized", 401);
      }
      const data = await notificationService.registerDeviceToken(req.user?.user_id, {
        deviceToken: req.body?.device_token || req.body?.deviceToken,
        platform: req.body?.platform,
        metadata: req.body?.metadata || {},
      });
      if (!data) {
        return response.fail(res, "Device token could not be saved. Please try again after login.", 400);
      }
      return response.success(res, "Token registered", 200, { token: data });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new NotificationController();
