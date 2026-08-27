// src/lib/token-refresh.js
import { store } from "@/store/store";
import { authApi } from "@/store/api/authApi";
import { cookieUtils } from "./cookies";
import { savePermissionCache } from "../utils/permissions";

/**
 * Token Refresh Utility - Using RTK Query
 * Works with your existing authApi.refreshToken mutation
 */

let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh completion
 */
const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers when token is refreshed
 */
const onTokenRefreshed = (newToken) => {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
};
let refreshPromise = null;

/**
 * Refresh the access token using RTK Query mutation
 * @returns {Promise<boolean>} Success status
 */
export const refreshAccessToken = async () => {
    try {
        // Check if refresh is already in progress
        if (isRefreshing) {
            console.log("🔄 Token refresh already in progress, waiting...");
            return new Promise((resolve) => {
                subscribeTokenRefresh((newToken) => {
                    resolve(!!newToken);
                });
            });
        }

        // Check for sessionId
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
            console.warn("⚠️ No sessionId found in localStorage, cannot refresh token");
            return false;
        }

        console.log("🔄 Starting token refresh using RTK Query...");
        isRefreshing = true;

        // Use RTK Query mutation
        const result = await store.dispatch(
            authApi.endpoints.refreshToken.initiate({
                sessionId: sessionId,
            })
        ).unwrap();

        // Check if refresh was successful
        if (result?.success && result?.data?.accessToken) {
            const newToken = result.data.accessToken;

            const permissions = result.data.permissions; // ← from backend now
            cookieUtils.setToken(newToken);

            if (Array.isArray(permissions)) {
                savePermissionCache(permissions);  // updates localStorage immediately
            }
            console.log("✅ Token refreshed successfully");

            // Notify all waiting subscribers
            onTokenRefreshed(newToken);
            isRefreshing = false;

            return true;
        } else {
            console.error("❌ Token refresh failed: Invalid response format", result);
            isRefreshing = false;
            return false;
        }
    } catch (error) {
        console.error("❌ Token refresh failed:", error);
        isRefreshing = false;

        // If refresh fails, session is invalid
        console.warn("🔒 Session expired or invalid, clearing auth data");
        clearAuthData();

        return false;
    }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
    cookieUtils.removeToken();
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    console.log("🗑️ Auth data cleared");
};

/**
 * Initialize token refresh on app load
 * Call this when the app starts
 */
export const initializeTokenRefresh = async () => {
    const sessionId = localStorage.getItem("sessionId");
    const user = localStorage.getItem("user");

    // Only refresh if we have session data
    if (sessionId && user) {
        console.log("🚀 Initializing token refresh on app load...");
        const success = await refreshAccessToken();

        if (!success) {
            console.warn("⚠️ Initial token refresh failed");
        }

        return success;
    } else {
        console.log("ℹ️ No session found, skipping token refresh");
        return false;
    }
};

/**
 * Setup automatic token refresh before expiration
 * @param {number} refreshBeforeExpiry - Minutes before expiry to refresh (default: 5)
 */
export const setupAutoRefresh = (refreshBeforeExpiry = 5) => {
    const token = cookieUtils.getToken();

    if (!token) {
        console.log("ℹ️ No token found, cannot setup auto-refresh");
        return null;
    }

    try {
        // Decode JWT to get expiry time
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        const refreshTime = timeUntilExpiry - (refreshBeforeExpiry * 60 * 1000);

        if (refreshTime > 0) {
            console.log(`⏰ Auto-refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);

            const timeoutId = setTimeout(() => {
                console.log("⏰ Auto-refresh triggered");
                refreshAccessToken();
            }, refreshTime);

            return timeoutId;
        } else {
            console.log("⚠️ Token already expired or will expire soon, refreshing now");
            refreshAccessToken();
            return null;
        }
    } catch (error) {
        console.error("❌ Failed to setup auto-refresh:", error);
        return null;
    }
};

export default {
    refreshAccessToken,
    initializeTokenRefresh,
    setupAutoRefresh,
    clearAuthData,
    subscribeTokenRefresh,
};