/**
 * Shared CORS / WebSocket Origin allowlist (must match app.js).
 */
const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5501",
];

function getAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    const fromEnv = process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
  }
  return DEFAULT_ORIGINS;
}

function isLocalDevOrigin(originHeader) {
  return LOCALHOST_ORIGIN_RE.test(originHeader || "");
}

function isOriginAllowed(originHeader) {
  if (!originHeader) return true;
  if (getAllowedOrigins().includes(originHeader)) return true;
  if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(originHeader)) return true;
  return false;
}

/** Express CORS origin callback — reflects allowed origin for credentials. */
function corsOriginDelegate(origin, callback) {
  if (!origin || isOriginAllowed(origin)) {
    callback(null, origin || true);
    return;
  }
  callback(null, false);
}

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  isLocalDevOrigin,
  corsOriginDelegate,
};
