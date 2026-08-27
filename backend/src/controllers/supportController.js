const supportService = require("../services/supportService");
const { supportChatService } = require("../services/supportChatService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class SupportController {
  create = async (req, res) => {
    try {
      const userId = req.user?.user_id || null;
      const data = await supportService.createTicket({ userId, ...(req.body || {}) });
      return response.success(res, "Support request submitted", 201, { ticket: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  listMine = async (req, res) => {
    try {
      if (!req.user?.user_id) {
        return response.fail(res, "Authentication required", 401);
      }
      const data = await supportService.listForUser(req.user.user_id, req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const data = await supportService.listAdmin(req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  replyAdmin = async (req, res) => {
    try {
      const data = await supportService.replyAdmin({
        ticketId: req.params.id,
        adminId: req.user?.user_id || null,
        reply: req.body?.reply,
        status: req.body?.status,
      });
      return response.success(res, "Reply sent", 200, { ticket: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  listChatAdmin = async (req, res) => {
    try {
      const data = await supportChatService.listMessages(req.params.id, {
        userId: req.user?.user_id,
        isAdmin: true,
        page: req.query?.page,
        limit: req.query?.limit,
      });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  postChatAdmin = async (req, res) => {
    try {
      const msg = await supportChatService.postMessage({
        ticketId: req.params.id,
        userId: req.user?.user_id,
        isAdmin: true,
        body: req.body?.message || req.body?.body,
      });
      return response.success(res, "Sent", 200, { message: msg });
    } catch (err) {
      return fail(res, err);
    }
  };

  listChatMine = async (req, res) => {
    try {
      const data = await supportChatService.listMessages(req.params.id, {
        userId: req.user?.user_id,
        isAdmin: false,
        page: req.query?.page,
        limit: req.query?.limit,
      });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  postChatMine = async (req, res) => {
    try {
      const msg = await supportChatService.postMessage({
        ticketId: req.params.id,
        userId: req.user?.user_id,
        isAdmin: false,
        body: req.body?.message || req.body?.body,
      });
      return response.success(res, "Sent", 200, { message: msg });
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new SupportController();
