import { cookieUtils } from "@/lib/cookies";
import { markTokenExpiry, tokenNeedsRefresh } from "@/lib/tokenExpiryStorage";

export const IDLE_LOGOUT_MS = 15 * 60 * 1000;
export const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
export const ACTIVITY_TICK_MS = 30 * 1000;
export const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000;

let refreshInFlight = null;

/**
 * Refresh access token if missing/expiring soon. Safe to call before uploads.
 */
export async function ensureFreshToken() {
  const sessionId = localStorage.getItem("sessionId");
  if (!sessionId || !cookieUtils.getToken()) return false;
  if (!tokenNeedsRefresh()) return true;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const [{ store }, { authApi }] = await Promise.all([
        import("@/store/store"),
        import("@/store/api/authApi"),
      ]);

      const result = await store
        .dispatch(authApi.endpoints.refreshToken.initiate({ sessionId }))
        .unwrap();

      const data = result?.data || result;
      const accessToken = data?.access_token || data?.accessToken;
      if (!result?.success || !accessToken) return false;

      cookieUtils.setToken(accessToken);
      markTokenExpiry(data?.expires_in ?? data?.expiresIn ?? 300);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
