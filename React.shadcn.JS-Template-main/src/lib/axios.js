// src/lib/axios.js
import axios from "axios";
import { showError, showSuccess } from "./toast-utils";
import { cookieUtils } from "./cookies";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Global state for refresh management
let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

// Verbose API logging — off in production unless VITE_DEBUG=true
const DEBUG =
    import.meta.env.DEV === true ||
    String(import.meta.env.VITE_DEBUG || "").toLowerCase() === "true";

const log = (...args) => {
    if (DEBUG) console.log(...args);
};

const processFailedQueue = (error, token = null) => {
    const queue = failedQueue;
    failedQueue = [];
    queue.forEach(({ resolve, reject, requestUrl }) => {
        if (error) {
            log("❌ Rejecting queued request:", requestUrl, error?.message || error);
            reject(error);
            return;
        }
        log("🔁 Replaying queued request:", requestUrl);
        resolve(token);
    });
};

// Single-flight redirect guard
const redirectToLogin = (reason = "") => {
    try {
        if (window.__redirectingToLogin) {
            return;
        }
        window.__redirectingToLogin = true;
        log("🔁 Redirecting to login", { reason });

        // Clear auth artifacts
        cookieUtils.clearAuth();
        try {
            localStorage.removeItem("sessionId");
            localStorage.removeItem("user");
        } catch { }

        // Avoid redirect loop from /auth/*
        const current = window.location.pathname || "";
        if (!current.startsWith("/auth")) {
            window.location.replace("/auth/login");
        }
    } catch (e) {
        console.error("Redirect to login failed:", e);
    }
};

/**
 * Get session ID from localStorage
 * (Since session_id is stored in localStorage, not cookies)
 */
const getSessionId = () => {
    try {
        return localStorage.getItem('sessionId');
    } catch (error) {
        log('Error getting session_id from localStorage:', error);
        return null;
    }
};

/**
 * Set session ID to localStorage
 */
const setSessionId = (sessionId) => {
    try {
        if (sessionId) {
            localStorage.setItem('sessionId', sessionId);
        } else {
            localStorage.removeItem('sessionId');
        }
    } catch (error) {
        log('Error setting session_id to localStorage:', error);
    }
};

/** Normalize API error message from common backend shapes (e.g. response.fail JSON). */
const getResponseErrorText = (error) => {
    const d = error?.response?.data;
    if (!d) return (error?.message || "").toString();
    if (typeof d === "string") return d;
    if (typeof d.message === "string" && d.message) return d.message;
    if (typeof d.msg === "string" && d.msg) return d.msg;
    if (typeof d.error === "string" && d.error) return d.error;
    if (d.error && typeof d.error.message === "string") return d.error.message;
    return (error?.message || "").toString();
};

/** Normalize API error code (string or symbol). */
const getResponseErrorCode = (error) => {
    const c = error?.response?.data?.code;
    if (c == null || c === "") return "";
    return String(c).toUpperCase();
};

/** True when the API error means the server session is dead (logout required). */
const isHardSessionFailure = (error) => {
    const status = error?.response?.status;
    const code = getResponseErrorCode(error);
    const msg = getResponseErrorText(error).toLowerCase();
    if (["INVALID_SESSION", "SESSION_INVALID", "EXPIRED_SESSION", "TOKENS_REVOKED"].includes(code)) {
        return true;
    }
    if (status === 401 && /invalid session|session not found|tokens have been revoked/i.test(msg)) {
        return true;
    }
    if (status === 400 && /invalid session|expired session|session invalid|session expired/i.test(msg)) {
        return true;
    }
    return false;
};

/** True when access token should be refreshed and the request retried (JWT expiry, etc.). */
const isRefreshableTokenError = (error) => {
    const status = error?.response?.status;
    const code = getResponseErrorCode(error);
    const msg = getResponseErrorText(error);
    const msgLower = msg.toLowerCase();

    const tokenErrorCodes = ["INVALID_TOKEN", "NO_TOKEN", "TOKEN_EXPIRED", "JWT_EXPIRED", "ACCESS_TOKEN_EXPIRED"];
    if (tokenErrorCodes.includes(code)) return true;
    if (status === 401) {
        // Login failure — never try refresh
        if (code === "INVALID_CREDENTIALS") return false;
        // Missing bearer on protected route — refresh cannot help
        if (code === "AUTHENTICATION_REQUIRED") return false;
        // Wrong permissions — user is logged in but not allowed
        if (code === "PERMISSION_DENIED") return false;
        return true;
    }

    if (status === 403 && code === "PERMISSION_DENIED") return false;

    /* Validation / upload errors — never treat as token issues */
    if (status === 400) {
        if (/invalid\s+file\s+type/i.test(msg)) return false;
        if (code === "AUTHENTICATION_REQUIRED") return false;
    }

    /* Backend auth uses response.fail(..., 400) for expired JWT — must retry after refresh */
    if (status === 400 || status === 403) {
        if (/token\s*expired|jwt\s*expired|access\s*token\s*expired/i.test(msg)) return true;
        if (msgLower.includes("expired") && /token|jwt|bearer/i.test(msg) && !/session/i.test(msgLower)) return true;
    }

    if (/token\s*expired|jwt\s*expired/i.test(msg)) return true;

    /* Bad/malformed token — do not refresh */
    if (status === 400 && /^invalid\s+token$/i.test(msg.trim())) return false;
    if (status === 400 && /invalid\s+token/i.test(msg) && !/expired/i.test(msg)) return false;

    return false;
};

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        // 'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});

// Add request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = cookieUtils.getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const sessionId = getSessionId() || cookieUtils.getSessionId?.();
        if (sessionId) {
            config.headers["x-session-id"] = sessionId;
        }

        log('🚀 API Request:', {
            url: config.url,
            method: config.method,
            hasToken: !!token,
        });

        return config;
    },
    (error) => {
        log('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor with token refresh logic
axiosInstance.interceptors.response.use(
    (response) => {
        log('✅ API Response:', {
            url: response.config?.url,
            status: response.status,
            success: response.data?.success,
            code: response.data?.code,
        });

        // Check if response has success: false with token-related error codes
        const tokenErrorCodes = ['INVALID_TOKEN', 'NO_TOKEN', 'TOKEN_EXPIRED'];

        if (response.data?.success === false && tokenErrorCodes.includes(response.data?.code)) {
            log(`⚠️ Token error in SUCCESS response: ${response.data.code}`);

            // Convert to error to trigger error interceptor
            const error = new Error(response.data.error || 'Token error');
            error.response = {
                ...response,
                status: 401,
                data: response.data
            };
            error.config = response.config;

            return Promise.reject(error);
        }

        // Also handle message-based token expiry
        if (response.data?.success === false) {
            const msg = (response.data?.message || "").toString();
            if (/token\s*expired|jwt\s*expired/i.test(msg)) {
                log('⚠️ Token expired message in SUCCESS response');
                const error = new Error('Token expired');
                error.response = {
                    ...response,
                    status: 401,
                    data: response.data
                };
                error.config = response.config;
                return Promise.reject(error);
            }
        }

        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        log('❌ API Error:', {
            url: originalRequest?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            code: error.response?.data?.code,
            message: error.response?.data?.message || error.message,
            hasResponse: !!error.response,
        });

        const is400 = error.response?.status === 400;
        const message = getResponseErrorText(error);
        const isInvalidSessionMessage = /\binvalid\s+session\b|\bexpired\s+session\b|\bsession\s+invalid\b|\bsession\s+expired\b/i.test(
            message
        );
        const isInvalidSessionCode = /INVALID_SESSION|SESSION_INVALID|EXPIRED_SESSION/i.test(
            error.response?.data?.code || ""
        );
        if (is400 && (isInvalidSessionMessage || isInvalidSessionCode)) {
            log("🔒 Invalid/expired session detected (400). Forcing logout and redirect.");
            redirectToLogin("invalid_session_400");
            return Promise.reject(error);
        }

        // Handle CORS errors
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            log('🌐 CORS or Network Error');
            return Promise.reject(error);
        }

        // Don't refresh on auth endpoints that signal bad credentials / anonymous login
        const reqUrl = originalRequest?.url || "";
        const isRefreshUrl = /(^|\/)owner\/refresh(\/|$|\?)/.test(reqUrl);

        // Don't refresh on auth endpoints that signal bad credentials / anonymous login
        if (reqUrl.includes("/auth/login") || reqUrl.includes("/auth/register")) {
            log("⏭️ Skipping refresh for auth credential endpoint");
            return Promise.reject(error);
        }

        // Skip refresh for the refresh endpoint itself
        if (isRefreshUrl) {
            log('🔒 Refresh endpoint failed - clearing auth');
            cookieUtils.clearAuth();
            setSessionId(null); // Clear session_id from localStorage
            isRefreshing = false;
            refreshPromise = null;
            return Promise.reject(error);
        }

        if (!originalRequest) {
            log("⚠️ Axios error without config — cannot refresh/retry");
            return Promise.reject(error);
        }

        const shouldTryRefresh = isRefreshableTokenError(error);

        log('🔍 Error Analysis:', {
            status: error.response?.status,
            code: error.response?.data?.code,
            msgSample: getResponseErrorText(error).slice(0, 80),
            shouldTryRefresh,
            alreadyRetried: originalRequest._retry,
        });

        // Should we attempt refresh?
        if (shouldTryRefresh && !originalRequest._retry) {
            log('🎯 Token refresh conditions met');

            // Check for session ID (localStorage) or refresh token (cookies)
            const sessionId = getSessionId() || cookieUtils.getSessionId?.() || null;
            const refreshToken = cookieUtils.getRefreshToken();

            log('🔑 Auth tokens:', {
                hasSessionId: !!sessionId,
                hasRefreshToken: !!refreshToken,
                sessionIdValue: sessionId ? `${sessionId.substring(0, 20)}...` : 'null',
            });

            // Session may exist only as an httpOnly cookie — still call refresh withCredentials.
            if (!sessionId && !refreshToken) {
                log('⚠️ No client-readable session id or refresh token; trying refresh via cookies only');
            }

            // ===== HANDLE CONCURRENT REQUESTS =====
            if (isRefreshing) {
                log('⏳ Already refreshing - queuing request');
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        requestUrl: originalRequest?.url || "(unknown)",
                        resolve,
                        reject,
                    });
                })
                    .then((token) => {
                        log('✅ Queued request proceeding with new token');
                        if (!originalRequest.headers) originalRequest.headers = {};
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        originalRequest._retry = true;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        log('❌ Queued request failed:', err.message);
                        return Promise.reject(err);
                    });
            }

            // ===== START NEW REFRESH (no async Promise executor — avoids races / lost retries) =====
            originalRequest._retry = true;
            isRefreshing = true;

            log('🔄 Starting NEW token refresh');

            const runRefresh = async () => {
                log('📡 Calling refresh API with:', {
                    endpoint: `${BASE_URL}/owner/refresh`,
                    hasSessionId: !!sessionId,
                    hasRefreshToken: !!refreshToken,
                });

                const refreshResponse = await axios.post(
                    `${BASE_URL}/owner/refresh`,
                    {
                        session_id: sessionId || undefined,
                        sessionId: sessionId || undefined,
                        refreshToken: refreshToken || undefined,
                    },
                    {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const payload = refreshResponse.data?.data ?? refreshResponse.data;
                const newToken = payload?.access_token || payload?.accessToken;

                log('📥 Refresh API response:', {
                    status: refreshResponse.status,
                    success: refreshResponse.data?.success,
                    hasAccessToken: !!newToken,
                });

                if (refreshResponse.data?.success && newToken) {
                    cookieUtils.setToken(newToken);
                    const newRt = payload?.refresh_token || payload?.refreshToken;
                    if (newRt) {
                        cookieUtils.setRefreshToken(newRt);
                    }
                    const newSid = payload?.session_id || payload?.sessionId;
                    if (newSid) {
                        setSessionId(newSid);
                    }
                    log('✅ Token refreshed successfully');
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    return newToken;
                }
                log('❌ Invalid refresh response structure');
                throw new Error('Refresh token response invalid');
            };

            refreshPromise = runRefresh()
                .then((token) => {
                    processFailedQueue(null, token);
                    return token;
                })
                .catch((refreshError) => {
                    log('❌ Token refresh failed:', {
                        status: refreshError.response?.status,
                        message: refreshError.message,
                    });
                    processFailedQueue(refreshError, null);
                    if (isHardSessionFailure(refreshError)) {
                        cookieUtils.clearAuth();
                        setSessionId(null);
                        redirectToLogin('refresh_failed');
                    }
                    throw refreshError;
                })
                .finally(() => {
                    log('🧹 Cleaning up refresh state');
                    isRefreshing = false;
                    refreshPromise = null;
                });

            try {
                const newToken = await refreshPromise;
                log('🔁 Retrying original request with new token');
                if (!originalRequest.headers) originalRequest.headers = {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);
            } catch (err) {
                log('❌ Failed to retry after refresh:', err.message);
                if (isHardSessionFailure(err)) {
                    redirectToLogin('retry_after_refresh_failed');
                }
                return Promise.reject(err);
            }
        }

        log('⏭️ Skipping refresh - rejecting error');
        return Promise.reject(error);
    }
);

/**
 * Extract error message from various error formats
 */
const getErrorMessage = (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        if (import.meta.env.DEV) {
            return "Cannot reach the API server. Make sure the backend is running (e.g. npm run dev in the backend folder on port 3005).";
        }
        return "Unable to connect to server. Please check your internet connection.";
    }

    if (error.response?.status === 401) {
        const d = error.response?.data;
        return (
            (typeof d?.message === "string" && d.message) ||
            (typeof d?.error === "string" && d.error) ||
            "Authentication required. Please log in."
        );
    }

    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    if (error.response?.data?.error) {
        return typeof error.response.data.error === 'string' ?
            error.response.data.error :
            error.response.data.error.message;
    }

    if (error.message) {
        return error.message;
    }

    return "Something went wrong";
};

/**
 * RTK Query base query using axios
 */
export const axiosBaseQuery =
    ({ showToast = false, showSuccessToast = false } = {}) =>
        async ({ url, method, data, params, headers, meta = {} }) => {
            try {
                const token = cookieUtils.getToken();
                const isAuthenticated = cookieUtils.isAuthenticated();
                const shouldUseCredentials = meta?.withCredentials ?? isAuthenticated;

                log('📡 RTK Query Request:', {
                    url,
                    method,
                    hasToken: !!token,
                    withCredentials: shouldUseCredentials,
                });

                const reqConfig = {
                    url,
                    method,
                    data,
                    params,
                    headers: {
                        ...headers,
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        ...((getSessionId() || cookieUtils.getSessionId?.())
                            ? { "x-session-id": getSessionId() || cookieUtils.getSessionId() }
                            : {}),
                    },
                    withCredentials: shouldUseCredentials,
                };

                if (data instanceof FormData) {
                    delete reqConfig.headers["Content-Type"];
                }

                const result = await axiosInstance(reqConfig);

                if (result.data?.success === false) {
                    const errorMessage = result.data?.message || result.data?.error || "Operation failed";

                    // Handle token errors
                    const tokenErrorCodes = ['INVALID_TOKEN', 'NO_TOKEN', 'TOKEN_EXPIRED'];
                    if (tokenErrorCodes.includes(result.data?.code)) {
                        log(`⚠️ ${result.data.code} in RTK Query response - triggering refresh`);
                        const error = new Error(errorMessage);
                        error.response = {
                            status: 401,
                            data: result.data,
                        };
                        error.config = result.config || reqConfig;
                        throw error;
                    }

                    // Message-only token expiry
                    const msgOnly = (result.data?.message || "").toString();
                    if (/token\s*expired|jwt\s*expired/i.test(msgOnly)) {
                        log("⚠️ Token expired message in RTK Query response - triggering refresh");
                        const error = new Error(errorMessage);
                        error.response = {
                            status: 401,
                            data: result.data,
                        };
                        error.config = result.config || reqConfig;
                        throw error;
                    }

                    // Handle explicit invalid/expired session surfaced as success: false status 400
                    const msg = (result.data?.message || "").toString();
                    const code = (result.data?.code || "").toString();
                    const invalidSession =
                        /\binvalid\s+session\b|\bexpired\s+session\b/i.test(msg) ||
                        /INVALID_SESSION|SESSION_INVALID|EXPIRED_SESSION/i.test(code);
                    if (invalidSession) {
                        log("🔒 Invalid/expired session detected in RTK path. Forcing logout and redirect.");
                        redirectToLogin("invalid_session_success_false");
                        return {
                            error: {
                                status: result.status || 400,
                                data: result.data,
                                message: errorMessage,
                            },
                        };
                    }

                    if (showToast || meta.showToast) {
                        showError("Error", errorMessage);
                    }

                    return {
                        error: {
                            status: result.status,
                            data: result.data,
                            message: errorMessage,
                        },
                    };
                }

                if (showSuccessToast || meta.showSuccessToast) {
                    const successMessage = result.data?.message || meta.successMessage || "Operation successful";
                    showSuccess("Success", successMessage);
                }

                return {
                    data: result.data,
                };
            } catch (axiosError) {
                const errorMessage = getErrorMessage(axiosError);
                const status = axiosError.response?.status || 500;
                const msg = (axiosError.response?.data?.message || "").toString();
                const code = (axiosError.response?.data?.code || "").toString();
                const invalidSession =
                    status === 400 &&
                    (/\binvalid\s+session\b|\bexpired\s+session\b/i.test(msg) ||
                        /INVALID_SESSION|SESSION_INVALID|EXPIRED_SESSION/i.test(code));

                if (invalidSession) {
                    log("🔒 Invalid/expired session detected in catch. Suppressing toast and redirecting.");
                    redirectToLogin("invalid_session_catch");
                } else if (showToast || meta?.showToast) {
                    showError("Error", errorMessage);
                }

                return {
                    error: {
                        status,
                        data: axiosError.response?.data || { message: axiosError.message },
                        message: errorMessage,
                    },
                };
            }
        };

export default axiosInstance;
