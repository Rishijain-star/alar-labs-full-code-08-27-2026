const voucherService = require("../services/voucherService");
const response = require("../utils/response");
const { fail } = require("../helper/helper");

class VoucherController {
  listPublic = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const data = await voucherService.listPublic({ ...(req.query || {}), userId });
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  listMyPurchases = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) return response.fail(res, "Unauthorized", 401);
      const data = await voucherService.listMyPurchases(userId, req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  listAdmin = async (req, res) => {
    try {
      const data = await voucherService.listAdmin(req.query || {});
      return response.success(res, "OK", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  create = async (req, res) => {
    try {
      const data = await voucherService.create(req.body || {}, req.user?.user_id || null);
      return response.success(res, "Voucher created", 201, { voucher: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  update = async (req, res) => {
    try {
      const data = await voucherService.update(req.params.id, req.body || {}, req.user?.user_id || null);
      return response.success(res, "Voucher updated", 200, { voucher: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  remove = async (req, res) => {
    try {
      const data = await voucherService.remove(req.params.id);
      return response.success(res, "Voucher deleted", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };

  purchase = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const data = await voucherService.purchase(userId, req.params.id);
      return response.success(res, "Voucher purchased", 200, { purchase: data });
    } catch (err) {
      return fail(res, err);
    }
  };

  apply = async (req, res) => {
    try {
      const userId = req.user?.user_id;
      const data = await voucherService.validateAndApply({
        userId,
        code: req.body?.code,
        resourceType: req.body?.resource_type,
        resourceId: req.body?.resource_id,
      });
      return response.success(res, "Voucher applied", 200, data);
    } catch (err) {
      return fail(res, err);
    }
  };
}

module.exports = new VoucherController();
