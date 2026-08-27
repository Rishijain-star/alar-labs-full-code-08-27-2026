const crypto = require("crypto");
const { SystemSetting } = require("../models");
const logger = require("../lib/logger");
const redisManager = require("../lib/redisManager");
const { DEFAULT_EXCHANGE_RATES } = require("../utils/localeHelper");

const REDIS_PUBLIC_KEY = "system:settings:public";
const REDIS_PUBLIC_TTL = 300;

const SECTIONS = ["general", "notifications", "security", "payments", "email"];

const SECRET_KEY = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || "alar-labs-settings-key";

function envTrim(key) {
  const v = process.env[key];
  if (v == null || v === "") return v;
  const t = String(v).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function encryptSecret(plain) {
  if (!plain) return "";
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(SECRET_KEY).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let enc = cipher.update(String(plain), "utf8", "hex");
  enc += cipher.final("hex");
  return `${iv.toString("hex")}:${enc}`;
}

function decryptSecret(stored) {
  if (!stored || typeof stored !== "string") return "";
  if (!stored.includes(":")) return stored;
  try {
    const [ivHex, enc] = stored.split(":");
    const key = crypto.createHash("sha256").update(SECRET_KEY).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
    let dec = decipher.update(enc, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (e) {
    logger.warn("[SystemSettings] Could not decrypt secret, using env fallback");
    return "";
  }
}

function maskSecret(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 4) return "****";
  return `${"*".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

const DEFAULTS = {
  general: {
    siteName: "TechSkills Academy",
    siteDescription: "Learn, Practice & Master Real-World Tech Skills",
    supportEmail: "support@techskills.com",
    timezone: "UTC",
    currency: "USD",
    baseCurrency: "INR",
    exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
  },
  notifications: {
    emailNotifications: true,
    newUserNotify: true,
    purchaseNotify: true,
    completionNotify: false,
    enrollmentEmailUser: true,
    enrollmentEmailAdmin: true,
    enrollmentPushUser: true,
  },
  security: {
    require2faForAll: false,
  },
  payments: {
    provider: "razorpay",
    keyId: "",
    keySecret: "",
    connected: false,
  },
  email: {
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "ALAR Labs",
  },
};

class SystemSettingsService {
  async getSection(section) {
    const row = await SystemSetting.findByPk(section);
    const stored = row?.value && typeof row.value === "object" ? row.value : {};
    const defaults = DEFAULTS[section] || {};
    const merged = { ...defaults, ...stored };

    if (section === "email") {
      const envHost = envTrim("SMTP_HOST");
      if (!merged.host && envHost) merged.host = envHost;
      if (!merged.port && envTrim("SMTP_PORT")) merged.port = parseInt(envTrim("SMTP_PORT"), 10) || 587;
      if (merged.secure == null && envTrim("SMTP_SECURE")) merged.secure = envTrim("SMTP_SECURE") === "true";
      if (!merged.user && envTrim("SMTP_USER")) merged.user = envTrim("SMTP_USER");
      if (!merged.pass && envTrim("SMTP_PASS")) merged.pass = envTrim("SMTP_PASS");
      if (!merged.fromEmail && envTrim("SMTP_FROM")) {
        const raw = envTrim("SMTP_FROM");
        const m = raw.match(/<([^>]+)>/);
        merged.fromEmail = m ? m[1] : raw;
      }
      if (!merged.fromName && envTrim("EMAIL_FROM_NAME")) merged.fromName = envTrim("EMAIL_FROM_NAME");
    }

    if (section === "payments") {
      const envKey = envTrim("RAZORPAY_KEY_ID");
      const envSecret = envTrim("RAZORPAY_KEY_SECRET");
      if (!merged.keyId && envKey) merged.keyId = envKey;
      if (!merged.keySecret && envSecret) merged.keySecret = envSecret;
      merged.connected = !!(merged.keyId && (merged.keySecret || envSecret));
      merged.provider = "razorpay";
    }

    return merged;
  }

  /** Public-safe view — secrets masked */
  async getSectionForClient(section) {
    const data = await this.getSection(section);
    if (section === "email") {
      return {
        ...data,
        pass: data.pass ? maskSecret(decryptSecret(data.pass) || data.pass) : "",
        hasPassword: !!(data.pass || envTrim("SMTP_PASS")),
      };
    }
    if (section === "payments") {
      const secret = decryptSecret(data.keySecret) || data.keySecret || envTrim("RAZORPAY_KEY_SECRET");
      return {
        ...data,
        keySecret: secret ? maskSecret(secret) : "",
        hasKeySecret: !!secret,
        connected: !!(data.keyId || envTrim("RAZORPAY_KEY_ID")) && !!secret,
      };
    }
    return data;
  }

  async getAllForClient(allowedSections = SECTIONS) {
    const out = {};
    for (const s of allowedSections) {
      out[s] = await this.getSectionForClient(s);
    }
    return out;
  }

  async upsertSection(section, payload, userId) {
    if (!SECTIONS.includes(section)) {
      throw new Error(`Invalid settings section: ${section}`);
    }
    const current = await this.getSection(section);
    const next = { ...current, ...payload };

    if (section === "email" && payload.pass != null) {
      const p = String(payload.pass).trim();
      if (p && !p.includes("*")) {
        next.pass = encryptSecret(p);
      } else if (!p) {
        next.pass = current.pass || "";
      } else {
        next.pass = current.pass || "";
      }
    }

    if (section === "payments" && payload.keySecret != null) {
      const s = String(payload.keySecret).trim();
      if (s && !s.includes("*")) {
        next.keySecret = encryptSecret(s);
      } else if (!s) {
        next.keySecret = current.keySecret || "";
      } else {
        next.keySecret = current.keySecret || "";
      }
      next.connected = !!(next.keyId && (decryptSecret(next.keySecret) || next.keySecret));
    }

    await SystemSetting.upsert({
      id: section,
      value: next,
      updated_by: userId || "system",
    });

    if (section === "general") {
      await this.invalidatePublicCache();
    }

    return this.getSectionForClient(section);
  }

  async invalidatePublicCache() {
    try {
      const redis = await redisManager.getClientSafe();
      if (redis) await redis.del(REDIS_PUBLIC_KEY);
    } catch (e) {
      logger.debug("[SystemSettings] Redis invalidate skipped:", e.message);
    }
  }

  /** Public platform settings — cached in Redis */
  async getPublicSettings() {
    try {
      const redis = await redisManager.getClientSafe();
      if (redis) {
        const cached = await redis.get(REDIS_PUBLIC_KEY);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {
      logger.debug("[SystemSettings] Redis read skipped:", e.message);
    }

    const general = await this.getSection("general");
    const payload = {
      siteName: general.siteName || DEFAULTS.general.siteName,
      siteDescription: general.siteDescription || DEFAULTS.general.siteDescription,
      supportEmail: general.supportEmail || DEFAULTS.general.supportEmail,
      timezone: general.timezone || "UTC",
      currency: general.currency || "USD",
      baseCurrency: general.baseCurrency || general.currency || "INR",
      exchangeRates: {
        ...DEFAULT_EXCHANGE_RATES,
        ...(general.exchangeRates && typeof general.exchangeRates === "object" ? general.exchangeRates : {}),
      },
    };

    try {
      const redis = await redisManager.getClientSafe();
      if (redis) {
        await redis.setEx(REDIS_PUBLIC_KEY, REDIS_PUBLIC_TTL, JSON.stringify(payload));
      }
    } catch (e) {
      logger.debug("[SystemSettings] Redis write skipped:", e.message);
    }

    return payload;
  }

  async getSiteName() {
    const pub = await this.getPublicSettings();
    return pub.siteName || DEFAULTS.general.siteName;
  }

  async getSmtpConfig() {
    const email = await this.getSection("email");
    const pass = decryptSecret(email.pass) || email.pass || envTrim("SMTP_PASS") || "";
    const port = parseInt(email.port, 10) || parseInt(envTrim("SMTP_PORT"), 10) || 587;
    let secure = email.secure === true || envTrim("SMTP_SECURE") === "true";
    if (port === 587) {
      secure = false;
    }
    return {
      host: email.host || envTrim("SMTP_HOST"),
      port,
      secure,
      user: email.user || envTrim("SMTP_USER"),
      pass,
      fromEmail: email.fromEmail || envTrim("SMTP_FROM")?.replace(/.*<([^>]+)>.*/, "$1") || envTrim("SMTP_FROM"),
      fromName: email.fromName || envTrim("EMAIL_FROM_NAME") || (await this.getSiteName()),
    };
  }

  async getRazorpayConfig() {
    const payments = await this.getSection("payments");
    const keyId = payments.keyId || envTrim("RAZORPAY_KEY_ID");
    const keySecret =
      decryptSecret(payments.keySecret) ||
      payments.keySecret ||
      envTrim("RAZORPAY_KEY_SECRET") ||
      "";
    return { keyId, keySecret, provider: "razorpay" };
  }

  async getNotificationPrefs() {
    return this.getSection("notifications");
  }
}

module.exports = new SystemSettingsService();
