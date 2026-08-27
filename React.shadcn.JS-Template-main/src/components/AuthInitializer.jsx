// src/components/AuthInitializer.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useRefreshTokenMutation } from "@/store/api/authApi";
import { useRegisterDeviceTokenMutation } from "@/store/api/notificationApi";
import { logout } from "@/store/slices/authSlice";
import { cookieUtils } from "@/lib/cookies";
import { getBrowserFcmToken, subscribeToForegroundMessages } from "@/lib/fcm";
import { toast } from "@/lib/toast";
import {
  isSupportNotificationPayload,
  resolveSupportNotificationUrl,
} from "@/lib/supportChatNotifications";

/**
 * AuthInitializer - Handles authentication initialization on app load
 * 
 * This component:
 * 1. Checks if user has a valid session
 * 2. Attempts to refresh the access token if expired
 * 3. ✅ DOES NOT fetch permissions (let components do that via useInitializePermissions)
 * 4. Logs out user if refresh fails
 * 
 * ✅ OPTIMIZATION: Only handles token refresh
 * - Permissions are fetched by useInitializePermissions hook in components
 * - This prevents duplicate API calls
 * - Each component that needs permissions will use the cached data
 */
export const AuthInitializer = ({ children }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isInitialized, setIsInitialized] = useState(false);
    const [refreshToken, { isLoading }] = useRefreshTokenMutation();
    const [registerDeviceToken] = useRegisterDeviceTokenMutation();

    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const sessionId = useSelector((state) => state.auth.sessionId);
    const userId = useSelector((state) => state.auth.user?.user_id);

    const registerFcmTokenOnce = async () => {
        if (!userId || !isAuthenticated) return;

        // Push notifications optional — set VITE_ENABLE_PUSH_NOTIFICATIONS=false to skip entirely
        if (import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === "false") return;

        const cacheKey = userId ? `fcm_registered_tokens_${userId}` : "fcm_registered_tokens";
        let known = [];
        try {
            const raw = localStorage.getItem(cacheKey);
            known = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(known)) known = [];
        } catch {
            known = [];
        }

        const cachedToken = localStorage.getItem("fcm_device_token");
        // Already registered this browser token for this user — do not call API again on refresh
        if (cachedToken && known.includes(cachedToken)) {
            return;
        }

        const fcmToken = cachedToken || (await getBrowserFcmToken());
        if (!fcmToken) return;

        if (known.includes(fcmToken)) {
            return;
        }

        try {
            await registerDeviceToken({ device_token: fcmToken, platform: "web" }).unwrap();
        } catch (e) {
            const status = e?.status || e?.data?.status;
            const message = String(e?.data?.message || e?.message || "");
            if (status === 401 || /authentication required|unauthorized/i.test(message)) return;
            if (status === 400 && /session/i.test(message)) return;
            console.warn("FCM token register skipped:", message || e);
            return;
        }

        if (!known.includes(fcmToken)) {
            known.push(fcmToken);
            localStorage.setItem(cacheKey, JSON.stringify(known));
        }
        console.log("✅ FCM token registered");
    };

    useEffect(() => {
        const initializeAuth = async () => {
            console.log('🔄 Initializing authentication...');

            // Check if user appears to be authenticated
            const hasToken = cookieUtils.getToken();
            const hasSession = sessionId || localStorage.getItem('sessionId');
            const hasUser = localStorage.getItem('user');

            console.log('📊 Auth state:', {
                hasToken: !!hasToken,
                hasSession: !!hasSession,
                hasUser: !!hasUser,
                isAuthenticated,
            });

            // If no session/user data at all, nothing to restore
            if (!hasSession || !hasUser) {
                console.log('❌ No authentication data found');
                setIsInitialized(true);
                return;
            }

            // Session + user present and token available — ready to go
            if (hasToken && isAuthenticated) {
                console.log('✅ User authenticated, components will load permissions');
                setIsInitialized(true);
                // Background only — never block page load on slow FCM / device-token API
                void registerFcmTokenOnce().catch((e) => {
                    console.warn("FCM token register (background):", e);
                });
                return;
            }

            // Session exists but access token missing (e.g. Secure cookie on HTTP) — refresh
            try {
                console.log('🔄 Attempting token refresh...');
                const response = await refreshToken({
                    sessionId: hasSession
                }).unwrap();

                if (response?.success) {
                    console.log('✅ Token refreshed successfully');
                    setIsInitialized(true);
                    void registerFcmTokenOnce().catch((e) => {
                        console.warn("FCM token register (background):", e);
                    });

                    console.log('ℹ️ Permissions will be loaded by components');
                } else {
                    console.log('❌ Token refresh failed');
                    dispatch(logout());
                }
            } catch (error) {
                console.error('❌ Token refresh error:', error);
                dispatch(logout());
            } finally {
                setIsInitialized(true);
            }
        };

        initializeAuth();
    }, [isAuthenticated, sessionId, userId]); // Re-run when auth state changes

    const showPushToast = useCallback((title, body, data = {}) => {
        const support = isSupportNotificationPayload(data);
        const url = support ? resolveSupportNotificationUrl(data) : null;
        toast.info(title, {
            description: body || (support ? "You have a new support message." : "You have received a new update."),
            action: url
                ? {
                    label: "Open",
                    onClick: () => navigate(url),
                }
                : undefined,
        });
    }, [navigate]);

    useEffect(() => {
        let unsubscribe = () => { };

        const setupForegroundNotifications = async () => {
            if (!isAuthenticated) return;

            unsubscribe = await subscribeToForegroundMessages((payload) => {
                const title = payload?.notification?.title || "New notification";
                const body = payload?.notification?.body || "";
                const data = payload?.data || {};
                console.log("[FCM] foreground message received:", payload);
                showPushToast(title, body, data);
            });
        };

        setupForegroundNotifications();

        return () => {
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, [isAuthenticated, showPushToast]);

    useEffect(() => {
        if (!isAuthenticated || typeof navigator === "undefined" || !navigator.serviceWorker) return undefined;

        const onSwMessage = (event) => {
            if (event?.data?.type !== "FCM_SW_PUSH") return;
            const title = event.data.title || "New notification";
            const body = event.data.body || "";
            const data = event.data.payload?.data || {};
            showPushToast(title, body, data);
        };

        navigator.serviceWorker.addEventListener("message", onSwMessage);
        return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
    }, [isAuthenticated, showPushToast]);

    // Show loading state while initializing
    if (!isInitialized || isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="text-sm text-muted-foreground">Initializing...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};