// src/components/AuthInitializer.jsx
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRefreshTokenMutation } from "@/store/api/authApi";
import { useRegisterDeviceTokenMutation } from "@/store/api/notificationApi";
import { logout } from "@/store/slices/authSlice";
import { cookieUtils } from "@/lib/cookies";
import { getBrowserFcmToken, subscribeToForegroundMessages } from "@/lib/fcm";
import { toast } from "@/lib/toast";

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
    const [isInitialized, setIsInitialized] = useState(false);
    const [refreshToken, { isLoading }] = useRefreshTokenMutation();
    const [registerDeviceToken] = useRegisterDeviceTokenMutation();

    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const sessionId = useSelector((state) => state.auth.sessionId);
    const userId = useSelector((state) => state.auth.user?.user_id);

    const registerFcmTokenOnce = async () => {
        const fcmToken = localStorage.getItem("fcm_device_token") || (await getBrowserFcmToken());
        if (!fcmToken) return;

        const cacheKey = userId ? `fcm_registered_token_${userId}` : "fcm_registered_token";
        const alreadyRegisteredToken = localStorage.getItem(cacheKey);
        if (alreadyRegisteredToken === fcmToken) {
            console.log("ℹ️ FCM token already registered, skipping duplicate API call");
            return;
        }

        await registerDeviceToken({ device_token: fcmToken, platform: "web" }).unwrap();
        localStorage.setItem(cacheKey, fcmToken);
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

            // If no authentication data, just mark as initialized
            if (!hasToken || !hasSession || !hasUser) {
                console.log('❌ No authentication data found');
                setIsInitialized(true);
                return;
            }

            // If authenticated, just mark as initialized
            // ✅ Components will fetch permissions via useInitializePermissions hook
            if (isAuthenticated) {
                console.log('✅ User authenticated, components will load permissions');
                try {
                    await registerFcmTokenOnce();
                } catch (e) {
                    console.error("❌ FCM token register failed:", e);
                }
                setIsInitialized(true);
                return;
            }

            // Try to refresh token
            try {
                console.log('🔄 Attempting token refresh...');
                const response = await refreshToken({
                    sessionId: hasSession
                }).unwrap();

                if (response?.success) {
                    console.log('✅ Token refreshed successfully');
                    try {
                        await registerFcmTokenOnce();
                    } catch (e) {
                        console.error("❌ FCM token register failed after refresh:", e);
                    }

                    // ✅ Don't fetch permissions here - let components do it
                    // This prevents duplicate API calls when multiple components mount
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

    useEffect(() => {
        let unsubscribe = () => { };

        const setupForegroundNotifications = async () => {
            if (!isAuthenticated) return;

            unsubscribe = await subscribeToForegroundMessages((payload) => {
                const title = payload?.notification?.title || "New notification";
                const body = payload?.notification?.body || "";
                console.log("[FCM] foreground message received:", payload);
                toast.info(title, { description: body || "You have received a new update." });
            });
        };

        setupForegroundNotifications();

        return () => {
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, [isAuthenticated]);

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