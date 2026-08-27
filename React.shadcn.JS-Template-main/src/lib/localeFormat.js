/**
 * Client-side price conversion using platform settings + user locale.
 */

const DEFAULT_RATES = { INR: 1, USD: 90, EUR: 98, GBP: 112 };

export { DEFAULT_RATES };

export function resolveItemCurrency(item, fallback = "INR") {
  if (!item) return fallback;
  const meta = typeof item.metadata === "string" ? (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })() : (item.metadata || {});
  const raw = item.currency || item.currency_code || meta.currency;
  return String(raw || fallback).toUpperCase();
}

export function convertPriceForUser(amount, fromCurrency, toCurrency, exchangeRates = {}) {
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return { amount: 0, currency: toCurrency };

  const from = String(fromCurrency || "INR").toUpperCase();
  const to = String(toCurrency || from).toUpperCase();
  if (from === to) return { amount: amt, currency: to };

  const rates = { ...DEFAULT_RATES, ...exchangeRates };
  const fromRate = Number(rates[from]) || 1;
  const toRate = Number(rates[to]) || 1;
  const inBase = amt * fromRate;
  const converted = inBase / toRate;

  return { amount: Math.round(converted * 100) / 100, currency: to };
}

export function formatPriceDisplay(amount, currency, locale = "en-US") {
  const code = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "INR" || code === "JPY" ? 0 : 2,
      maximumFractionDigits: code === "INR" || code === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount}`;
  }
}

export function resolveDisplayCurrency(user, platformSettings = {}) {
  if (user?.currency_code) return String(user.currency_code).toUpperCase();
  const countryMap = {
    US: "USD", IN: "INR", GB: "GBP", DE: "EUR", FR: "EUR",
    CA: "CAD", AU: "AUD", AE: "AED", SG: "SGD", JP: "JPY",
  };
  const cc = String(user?.country || "").trim().toUpperCase();
  if (cc && countryMap[cc]) return countryMap[cc];
  const tz = String(user?.timezone || "");
  if (tz.includes("Kolkata") || tz === "Asia/Calcutta") return "INR";
  if (tz.startsWith("America/")) return "USD";
  if (tz.startsWith("Europe/London")) return "GBP";
  return "INR";
}

export function formatUserPrice(amount, itemCurrency, user, platformSettings = {}) {
  const currency = itemCurrency || platformSettings.currency || platformSettings.baseCurrency || "INR";
  return formatPriceDisplay(amount, currency);
}

export function formatUtcForUser(utcDate, user, platformSettings = {}) {
  if (!utcDate) return "";
  const tz = user?.timezone || platformSettings.timezone || "UTC";
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}
