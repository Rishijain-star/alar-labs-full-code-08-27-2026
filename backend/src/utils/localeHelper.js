/** Country ISO code → currency + common IANA timezone */
const COUNTRY_LOCALE = {
  US: { currency: "USD", timezone: "America/New_York" },
  IN: { currency: "INR", timezone: "Asia/Kolkata" },
  GB: { currency: "GBP", timezone: "Europe/London" },
  DE: { currency: "EUR", timezone: "Europe/Berlin" },
  FR: { currency: "EUR", timezone: "Europe/Paris" },
  CA: { currency: "CAD", timezone: "America/Toronto" },
  AU: { currency: "AUD", timezone: "Australia/Sydney" },
  AE: { currency: "AED", timezone: "Asia/Dubai" },
  SG: { currency: "SGD", timezone: "Asia/Singapore" },
  JP: { currency: "JPY", timezone: "Asia/Tokyo" },
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  AED: "د.إ",
  SGD: "S$",
  JPY: "¥",
};

const DEFAULT_EXCHANGE_RATES = {
  INR: 1,
  USD: 90,
  EUR: 98,
  GBP: 112,
};

function detectCountryFromPhone(phone) {
  if (!phone) return null;
  const p = String(phone).trim().replace(/[^\d+]/g, "");
  if (!p) return null;

  if (p.startsWith("+91") || (p.startsWith("91") && p.length === 12)) return { country: "IN", currency: "INR" };
  if (p.startsWith("+1") || (p.startsWith("1") && p.length === 11)) return { country: "US", currency: "USD" };
  if (p.startsWith("+44") || (p.startsWith("44") && p.length >= 11)) return { country: "GB", currency: "GBP" };
  if (p.startsWith("+49") || (p.startsWith("49") && p.length >= 11)) return { country: "DE", currency: "EUR" };
  if (p.startsWith("+33") || (p.startsWith("33") && p.length >= 10)) return { country: "FR", currency: "EUR" };
  if (p.startsWith("+39") || (p.startsWith("39") && p.length >= 10)) return { country: "IT", currency: "EUR" };
  if (p.startsWith("+34") || (p.startsWith("34") && p.length >= 10)) return { country: "ES", currency: "EUR" };
  if (p.startsWith("+31") || (p.startsWith("31") && p.length >= 10)) return { country: "NL", currency: "EUR" };
  if (p.startsWith("+61") || (p.startsWith("61") && p.length >= 10)) return { country: "AU", currency: "AUD" };
  if (p.startsWith("+971") || (p.startsWith("971") && p.length >= 11)) return { country: "AE", currency: "AED" };
  if (p.startsWith("+65") || (p.startsWith("65") && p.length >= 9)) return { country: "SG", currency: "SGD" };
  if (p.startsWith("+81") || (p.startsWith("81") && p.length >= 10)) return { country: "JP", currency: "JPY" };
  if (p.startsWith("+86") || (p.startsWith("86") && p.length >= 12)) return { country: "CN", currency: "CNY" };
  if (p.startsWith("+92") || (p.startsWith("92") && p.length >= 11)) return { country: "PK", currency: "PKR" };
  if (p.startsWith("+880") || (p.startsWith("880") && p.length >= 12)) return { country: "BD", currency: "BDT" };

  if (/^[6-9]\d{9}$/.test(p)) {
    return { country: "IN", currency: "INR" };
  }

  return null;
}

function currencyForCountry(countryCode) {
  if (!countryCode) return null;
  const entry = COUNTRY_LOCALE[String(countryCode).toUpperCase()];
  return entry ? entry.currency : null;
}

function timezoneForCountry(countryCode) {
  if (!countryCode) return null;
  const entry = COUNTRY_LOCALE[String(countryCode).toUpperCase()];
  return entry ? entry.timezone : null;
}

function resolveUserCurrency(user = {}, platformDefaults = {}) {
  if (user?.currency_code) return String(user.currency_code).toUpperCase();
  if (user?.phone) {
    const phoneGeo = detectCountryFromPhone(user.phone);
    if (phoneGeo?.currency) return phoneGeo.currency;
  }
  const fromCountry = currencyForCountry(user?.country);
  if (fromCountry) return fromCountry;
  return String(platformDefaults.currency || platformDefaults.baseCurrency || "INR").toUpperCase();
}

/**
 * Convert amount stored in baseCurrency to target currency.
 * exchangeRates: how many base-currency units equal 1 unit of foreign currency.
 * Example: base INR, rates.USD = 90 → 100 INR → 100/90 USD
 */
function convertPrice(amount, fromCurrency, toCurrency, exchangeRates = {}) {
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return { amount: 0, currency: toCurrency };

  const from = String(fromCurrency || "INR").toUpperCase();
  const to = String(toCurrency || from).toUpperCase();
  if (from === to) return { amount: amt, currency: to };

  const rates = { ...DEFAULT_EXCHANGE_RATES, ...exchangeRates };
  const fromRate = Number(rates[from]) || 1;
  const toRate = Number(rates[to]) || 1;

  const inBase = amt * fromRate;
  const converted = inBase / toRate;

  return {
    amount: Math.round(converted * 100) / 100,
    currency: to,
  };
}

function formatPriceDisplay(amount, currency, locale = "en-US") {
  const code = String(currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "INR" || code === "JPY" ? 0 : 2,
      maximumFractionDigits: code === "INR" || code === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    const sym = CURRENCY_SYMBOLS[code] || code;
    return `${sym}${amount}`;
  }
}

function formatUtcInTimezone(utcDate, timezone, locale = "en-US") {
  if (!utcDate) return "";
  const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
  if (Number.isNaN(d.getTime())) return "";
  const tz = timezone || "UTC";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

module.exports = {
  COUNTRY_LOCALE,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES,
  detectCountryFromPhone,
  currencyForCountry,
  timezoneForCountry,
  resolveUserCurrency,
  convertPrice,
  formatPriceDisplay,
  formatUtcInTimezone,
};

