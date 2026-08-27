// src/store/slices/authSlice.js (FIXED - CLEARS RTK QUERY CACHE ON LOGOUT)
import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/authApi";
import { roleAndPermissionApi } from "../api/roleAndPermissionApi";
import { cookieUtils } from "@/lib/cookies";
import { getCurrentUser, getSessionId, hasValidSession } from "@/lib/auth-helpers";
import { saveUserPermissionsToCache, saveUserRolesToCache, clearPermissionCache } from "@/utils/permissions";

const initialState = {
    user: getCurrentUser(),
    sessionId: getSessionId(),
    isAuthenticated: hasValidSession(),
    isLoading: false,
    error: null,

    accessibleRoutes: [],
    routesLoading: false,
    routesError: null,

    tempAuth: null,
    mfaAuth: null,

    forgotPasswordFlow: {
        otpToken: null,
        resetToken: null,
        identifier: null,
    },
};

const persistAuthSuccess = (state, payload) => {
    const user = payload.user;
    const accessToken = payload.accessToken || payload.access_token;
    const sessionId = payload.sessionId || payload.session_id;
    const permissions = payload.permissions;
    const roles = payload.roles;

    if (accessToken) {
        cookieUtils.setToken(accessToken);
    }
    if (user) {
        localStorage.setItem("user", JSON.stringify(user));
    }
    if (sessionId) {
        localStorage.setItem("sessionId", sessionId);
    }

    if (Array.isArray(permissions) && permissions.length > 0) {
        console.log('💾 Saving permissions from auth response:', permissions);
        saveUserPermissionsToCache(permissions);
    }

    if (Array.isArray(roles) && roles.length > 0) {
        console.log('💾 Saving roles from auth response:', roles);
        saveUserRolesToCache(roles);
    }

    state.user = user || null;
    state.sessionId = sessionId || null;
    state.isAuthenticated = true;
    state.isLoading = false;
};

const authSlice = createSlice({
    name: "auth",
    initialState,

    reducers: {
        setUser: (state, { payload }) => {
            state.user = payload;
            state.isAuthenticated = !!payload;
        },
        setLoading: (state, { payload }) => {
            state.isLoading = payload;
        },
        setTempAuth: (state, { payload }) => {
            state.tempAuth = payload;
        },
        clearTempAuth: (state) => {
            state.tempAuth = null;
        },
        setMfaAuth: (state, { payload }) => {
            state.mfaAuth = payload;
        },
        clearMfaAuth: (state) => {
            state.mfaAuth = null;
        },
        setForgotPasswordOtpToken: (state, { payload }) => {
            state.forgotPasswordFlow.otpToken = payload.otpToken;
            state.forgotPasswordFlow.identifier = payload.identifier;
        },
        setForgotPasswordResetToken: (state, { payload }) => {
            state.forgotPasswordFlow.resetToken = payload;
        },
        clearForgotPasswordFlow: (state) => {
            state.forgotPasswordFlow = { otpToken: null, resetToken: null, identifier: null };
        },
        setAccessibleRoutes: (state, { payload }) => {
            state.accessibleRoutes = payload;
        },
        clearAccessibleRoutes: (state) => {
            state.accessibleRoutes = [];
        },

        // ✅ Regular logout action (called from Sidebar)
        logout: (state) => {
            state.user = null;
            state.sessionId = null;
            state.isAuthenticated = false;
            state.tempAuth = null;
            state.mfaAuth = null;
            state.accessibleRoutes = [];
            state.forgotPasswordFlow = { otpToken: null, resetToken: null, identifier: null };
            cookieUtils.clearAll();
            clearPermissionCache();

            // ✅ Note: RTK Query cache will be cleared by middleware
            // See store configuration
        },
    },

    extraReducers: (builder) => {
        builder
            .addMatcher(
                authApi.endpoints.login.matchFulfilled,
                (state, { payload }) => {
                    if (payload.data?.requiresMfa && payload.data?.mfaToken) {
                        state.mfaAuth = {
                            mfaToken: payload.data.mfaToken,
                            method: payload.data.method || null,
                        };
                        state.isLoading = false;
                        return;
                    }

                    // Normalize payload keys from backend (snake_case / camelCase)
                    const normalized = {
                        user: payload.data?.user,
                        accessToken: payload.data?.accessToken || payload.data?.access_token,
                        sessionId: payload.data?.sessionId || payload.data?.session_id,
                        permissions: payload.data?.permissions,
                        roles: payload.data?.roles,
                    };
                    persistAuthSuccess(state, normalized);
                    state.mfaAuth = null;
                }
            )

            // Google popup login success → persist same as normal login
            .addMatcher(
                authApi.endpoints.googlePopupLogin.matchFulfilled,
                (state, { payload }) => {
                    const normalized = {
                        user: payload.data?.user,
                        accessToken: payload.data?.accessToken || payload.data?.access_token,
                        sessionId: payload.data?.sessionId || payload.data?.session_id,
                        permissions: payload.data?.permissions,
                        roles: payload.data?.roles,
                    };
                    persistAuthSuccess(state, normalized);
                    state.mfaAuth = null;
                }
            )

            .addMatcher(
                authApi.endpoints.verifyMfa.matchFulfilled,
                (state, { payload }) => {
                    const { user, accessToken, sessionId, permissions, roles } = payload.data;
                    persistAuthSuccess(state, { user, accessToken, sessionId, permissions, roles });
                    state.mfaAuth = null;
                }
            )

            .addMatcher(
                authApi.endpoints.verifyOtp.matchFulfilled,
                (state) => {
                    state.tempAuth = null;
                    state.isLoading = false;
                }
            )

            .addMatcher(
                authApi.endpoints.refreshToken.matchFulfilled,
                (state, { payload }) => {
                    const data = payload?.data;
                    const accessToken = data?.access_token || data?.accessToken;
                    if (accessToken) {
                        cookieUtils.setToken(accessToken);
                        state.isAuthenticated = true;
                    }
                    const newSessionId = data?.session_id || data?.sessionId;
                    if (newSessionId) {
                        localStorage.setItem("sessionId", newSessionId);
                        state.sessionId = newSessionId;
                    }

                    const permissions = data?.permissions;
                    const roles = data?.roles;

                    if (Array.isArray(permissions) && permissions.length > 0) {
                        console.log('💾 Saving permissions from refresh:', permissions);
                        saveUserPermissionsToCache(permissions);
                    }

                    if (Array.isArray(roles) && roles.length > 0) {
                        console.log('💾 Saving roles from refresh:', roles);
                        saveUserRolesToCache(roles);
                    }

                    state.isLoading = false;
                }
            )

            .addMatcher(
                authApi.endpoints.forgotPassword.matchFulfilled,
                (state, { payload, meta }) => {
                    if (payload.data?.otpToken) {
                        state.forgotPasswordFlow.otpToken = payload.data.otpToken;
                        if (meta?.arg?.originalArgs?.identifier) {
                            state.forgotPasswordFlow.identifier =
                                meta.arg.originalArgs.identifier;
                        }
                    }
                    state.isLoading = false;
                }
            )

            .addMatcher(
                authApi.endpoints.verifyForgotOtp.matchFulfilled,
                (state, { payload }) => {
                    if (payload.data?.resetToken) {
                        state.forgotPasswordFlow.resetToken = payload.data.resetToken;
                    }
                    state.isLoading = false;
                }
            )

            .addMatcher(
                authApi.endpoints.resetPassword.matchFulfilled,
                (state) => {
                    state.forgotPasswordFlow = { otpToken: null, resetToken: null, identifier: null };
                    state.isLoading = false;
                }
            )

            /* ══════════════════════════════════════════════════════════
               LOGOUT SUCCESS - Clear everything
               ══════════════════════════════════════════════════════════ */
            .addMatcher(
                authApi.endpoints.logout.matchFulfilled,
                (state) => {
                    state.user = null;
                    state.sessionId = null;
                    state.isAuthenticated = false;
                    state.tempAuth = null;
                    state.mfaAuth = null;
                    state.accessibleRoutes = [];
                    state.forgotPasswordFlow = { otpToken: null, resetToken: null, identifier: null };
                    cookieUtils.clearAll();
                    clearPermissionCache();
                }
            )

            .addMatcher(
                (action) =>
                    action.type.endsWith("/pending") &&
                    action.type.startsWith("authApi"),
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )

            .addMatcher(
                (action) =>
                    action.type.endsWith("/rejected") &&
                    action.type.startsWith("authApi"),
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.error = payload?.message || error?.message || "Unknown error";
                }
            );
    },
});

export const {
    setUser,
    setLoading,
    setTempAuth,
    clearTempAuth,
    setMfaAuth,
    clearMfaAuth,
    setForgotPasswordOtpToken,
    setForgotPasswordResetToken,
    clearForgotPasswordFlow,
    setAccessibleRoutes,
    clearAccessibleRoutes,
    logout,
} = authSlice.actions;

export default authSlice.reducer;

export const selectAccessibleRoutes = (state) => state.auth.accessibleRoutes;
export const selectRoutesLoading = (state) => state.auth.routesLoading;
export const selectRoutesError = (state) => state.auth.routesError;
