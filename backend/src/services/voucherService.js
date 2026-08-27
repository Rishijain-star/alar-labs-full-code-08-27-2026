const { Voucher, VoucherPurchase, Course, Lab } = require("../models");
const { Op } = require("sequelize");
const { AppError } = require("../middleware/errorHandler");
const notificationService = require("./notificationService");

function discountedPrice(v) {
  const original = Number(v.original_price || 0);
  const discount = Number(v.discount_value || 0);
  if (String(v.discount_type) === "flat") return Math.max(0, original - discount);
  return Math.max(0, original - (original * discount) / 100);
}

class VoucherService {
  async listPublic({ page = 1, limit = 24, search, userId } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 24));
    const offset = (p - 1) * l;
    const where = { is_active: true };
    if (search) where.title = { [Op.like]: `%${search}%` };
    const { rows, count } = await Voucher.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    let purchasedIds = new Set();
    if (userId) {
      const purchases = await VoucherPurchase.findAll({
        where: { user_id: userId, status: "purchased" },
        attributes: ["voucher_id"],
      });
      purchases.forEach((p) => purchasedIds.add(p.voucher_id));
    }
    const mapped = rows.map((r) => {
      const json = r.toJSON();
      return { ...json, discounted_price: discountedPrice(json), is_purchased: purchasedIds.has(json.id) };
    });
    return {
      rows: mapped,
      pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 },
    };
  }

  async listAdmin(params = {}) {
    const data = await this.listPublic(params);
    const voucherIds = data.rows.map(r => r.id);
    if (voucherIds.length > 0) {
      const db = require('../models');
      const counts = await VoucherPurchase.findAll({
        attributes: ['voucher_id', [db.sequelize.fn('COUNT', '*'), 'count']],
        where: { voucher_id: voucherIds, status: 'purchased' },
        group: ['voucher_id']
      });
      const countMap = {};
      counts.forEach(c => countMap[c.voucher_id] = Number(c.get('count')));
      data.rows.forEach(r => r.purchase_count = countMap[r.id] || 0);
    }
    return data;
  }

  async listMyPurchases(userId, { page = 1, limit = 24 } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 24));
    const offset = (p - 1) * l;
    
    const { rows, count } = await VoucherPurchase.findAndCountAll({
      where: { user_id: userId, status: "purchased" },
      include: [{ model: Voucher, as: "voucher" }],
      order: [["created_at", "DESC"]],
      offset,
      limit: l,
    });
    
    const mapped = rows.map(r => {
      const json = r.toJSON();
      if (json.voucher) {
        json.voucher.discounted_price = discountedPrice(json.voucher);
      }
      return json;
    });
    
    return {
      rows: mapped,
      pagination: { page: p, limit: l, total: count, total_pages: Math.ceil(count / l) || 1 },
    };
  }

  async create(payload, userId) {
    const code = String(payload.code || "").trim().toUpperCase();
    if (!code) throw new AppError("Voucher code is required", 400);
    return Voucher.create({
      code,
      title: payload.title || code,
      provider: payload.provider || null,
      original_price: Number(payload.original_price || 0),
      discount_type: payload.discount_type === "flat" ? "flat" : "percent",
      discount_value: Number(payload.discount_value || 0),
      expires_at: payload.expires_at ? new Date(payload.expires_at) : null,
      applies_to: ["course", "lab", "all"].includes(payload.applies_to) ? payload.applies_to : "all",
      is_active: payload.is_active !== false,
      metadata: payload.metadata || {},
      created_by: userId || null,
      updated_by: userId || null,
    });
  }

  async update(id, payload, userId) {
    const row = await Voucher.findByPk(id);
    if (!row) throw new AppError("Voucher not found", 404);
    Object.assign(row, {
      code: payload.code ? String(payload.code).trim().toUpperCase() : row.code,
      title: payload.title ?? row.title,
      provider: payload.provider ?? row.provider,
      original_price: payload.original_price != null ? Number(payload.original_price) : row.original_price,
      discount_type: payload.discount_type && ["percent", "flat"].includes(payload.discount_type) ? payload.discount_type : row.discount_type,
      discount_value: payload.discount_value != null ? Number(payload.discount_value) : row.discount_value,
      expires_at: payload.expires_at !== undefined ? (payload.expires_at ? new Date(payload.expires_at) : null) : row.expires_at,
      applies_to: payload.applies_to && ["course", "lab", "all"].includes(payload.applies_to) ? payload.applies_to : row.applies_to,
      is_active: payload.is_active != null ? !!payload.is_active : row.is_active,
      metadata: payload.metadata ?? row.metadata,
      updated_by: userId || row.updated_by,
    });
    await row.save();
    return row;
  }

  async remove(id) {
    const row = await Voucher.findByPk(id);
    if (!row) throw new AppError("Voucher not found", 404);
    await row.destroy();
    return { id };
  }

  async purchase(userId, voucherId, qty = 1) {
    const voucher = await Voucher.findByPk(voucherId);
    if (!voucher || !voucher.is_active) throw new AppError("Voucher unavailable", 404);
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      throw new AppError("Voucher expired", 400);
    }
    
    // Create multiple records for the quantity
    const createdRows = [];
    for (let i = 0; i < qty; i++) {
      const row = await VoucherPurchase.create({
        user_id: userId,
        voucher_id: voucherId,
        price_paid: discountedPrice(voucher),
        status: "purchased",
      });
      createdRows.push(row);
    }

    await notificationService.createNotification({
      userId,
      audience: "user",
      eventType: "course_purchase",
      title: "Voucher purchased",
      message: `You purchased ${qty}x voucher ${voucher.code}.`,
      metadata: { voucherId: voucher.id, code: voucher.code, quantity: qty },
    });
    
    return createdRows[0];
  }

  async validateAndApply({ userId, code, resourceType, resourceId }) {
    const voucher = await Voucher.findOne({ where: { code: String(code || "").trim().toUpperCase(), is_active: true } });
    if (!voucher) throw new AppError("Invalid voucher code", 400);
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) throw new AppError("Voucher expired", 400);
    if (voucher.applies_to !== "all" && voucher.applies_to !== resourceType) {
      throw new AppError("Voucher not valid for this purchase type", 400);
    }
    const purchase = await VoucherPurchase.findOne({
      where: { user_id: userId, voucher_id: voucher.id, status: "purchased" },
    });
    if (!purchase) throw new AppError("Purchase voucher before applying", 400);
    let basePrice = 0;
    if (resourceType === "course") {
      const c = await Course.findByPk(resourceId);
      if (!c) throw new AppError("Course not found", 404);
      basePrice = Number(c.price || 0);
    } else if (resourceType === "lab") {
      const l = await Lab.findByPk(resourceId);
      if (!l) throw new AppError("Lab not found", 404);
      basePrice = Number(l.price || 0);
    } else {
      throw new AppError("Unsupported purchase type", 400);
    }
    const discount = voucher.discount_type === "flat"
      ? Number(voucher.discount_value || 0)
      : (basePrice * Number(voucher.discount_value || 0)) / 100;
    const finalPrice = Math.max(0, basePrice - discount);
    purchase.status = "redeemed";
    purchase.redeemed_for = resourceType;
    purchase.redeemed_resource_id = resourceId;
    purchase.redeemed_at = new Date();
    await purchase.save();
    await notificationService.createNotification({
      userId,
      audience: "user",
      eventType: "voucher_applied",
      title: "Voucher applied",
      message: `Voucher ${voucher.code} applied successfully.`,
      metadata: { voucherId: voucher.id, code: voucher.code, resourceType, resourceId },
    });
    return {
      voucher,
      pricing: { base_price: basePrice, discount_amount: discount, final_price: finalPrice },
    };
  }
}

module.exports = new VoucherService();
