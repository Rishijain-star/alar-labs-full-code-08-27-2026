export const TOKEN_REFRESH_LEAD_MS = 60 * 1000;

const TOKEN_EXPIRES_KEY = "tokenExpiresAt";
const LAST_REFRESH_KEY = "tokenLastRefreshedAt";

export function markTokenExpiry(expiresInSeconds = 900) {
  const sec = Number(expiresInSeconds);
  if (!Number.isFinite(sec) || sec <= 0) return;
  const expiresAt = Date.now() + sec * 1000;
  try {
    sessionStorage.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
    sessionStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function clearTokenExpiry() {
  try {
    sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
    sessionStorage.removeItem(LAST_REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function getTokenExpiresAt() {
  try {
    const raw = sessionStorage.getItem(TOKEN_EXPIRES_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function getLastTokenRefreshAt() {
  try {
    const raw = sessionStorage.getItem(LAST_REFRESH_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function tokenNeedsRefresh() {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - TOKEN_REFRESH_LEAD_MS;
}
