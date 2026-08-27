// src/hooks/useInitializePermissions.js (SIMPLE FIX - ALWAYS FETCH AFTER LOGIN)
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useGetUserPermissionsQuery, useGetUserRolesQuery } from "@/store/api/roleAndPermissionApi";

/**
 * Hook to initialize user permissions from API
 * 
 * ✅ SIMPLE FIX FOR LOGOUT/LOGIN ISSUE:
 * - Uses sessionId as dependency to force refetch after new login
 * - When user logs out and logs in, sessionId changes, triggering fresh API calls
 * - Prevents duplicate calls within same session (30 second cache)
 * 
 * How it works:
 * 1. User logs in → New sessionId → Component remounts with new sessionId
 * 2. RTK Query sees new query key → Fetches fresh data
 * 3. Multiple components mounting → Use cached data (30 seconds)
 * 4. User logs out → sessionId cleared
 * 5. User logs in again → New sessionId → Fresh fetch!
 */
export const useInitializePermissions = () => {
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const sessionId = useSelector((state) => state.auth.sessionId); // ✅ Use sessionId to track login changes
    const [isInitialized, setIsInitialized] = useState(false);

    // ✅ Fetch permissions - sessionId acts as query key
    // When sessionId changes (new login), RTK Query treats it as a new query
    const {
        data: permissions,
        isLoading: permissionsLoading,
        isError: permissionsError,
        error: permissionsErrorObj,
        isSuccess: permissionsSuccess,
        isFetching: permissionsFetching,
    } = useGetUserPermissionsQuery(
        sessionId, // ✅ Pass sessionId as argument - changes on new login
        {
            skip: !isAuthenticated || !sessionId,
            // Refetch if data is older than 30 seconds
            refetchOnMountOrArgChange: 30,
        }
    );

    // ✅ Fetch roles - sessionId acts as query key
    const {
        data: roles,
        isLoading: rolesLoading,
        isError: rolesError,
        error: rolesErrorObj,
        isSuccess: rolesSuccess,
        isFetching: rolesFetching,
    } = useGetUserRolesQuery(
        sessionId, // ✅ Pass sessionId as argument
        {
            skip: !isAuthenticated || !sessionId,
            refetchOnMountOrArgChange: 30,
        }
    );

    // Mark as initialized when both queries complete
    useEffect(() => {
        if (!isAuthenticated || !sessionId) {
            setIsInitialized(false);
            return;
        }

        if ((permissionsSuccess || permissionsError) && (rolesSuccess || rolesError)) {
            setIsInitialized(true);
            console.log('✅ Permissions initialization complete');
        }
    }, [
        isAuthenticated,
        sessionId,
        permissionsSuccess,
        rolesSuccess,
        permissionsError,
        rolesError,
    ]);

    // Combined loading state
    const isLoading = isAuthenticated && sessionId && (
        (permissionsLoading || permissionsFetching) || 
        (rolesLoading || rolesFetching)
    ) && !isInitialized;

    // Combined error state
    const hasError = permissionsError || rolesError;
    const error = permissionsErrorObj || rolesErrorObj;

    return {
        isLoading,
        isInitialized,
        error: hasError ? error : null,
        permissions,
        roles,
    };
};

/**
 * Hook to manually refetch user permissions
 */
export const useRefetchPermissions = () => {
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const sessionId = useSelector((state) => state.auth.sessionId);
    const [isRefetching, setIsRefetching] = useState(false);

    const { refetch: refetchPermissions } = useGetUserPermissionsQuery(sessionId, {
        skip: !isAuthenticated || !sessionId,
    });

    const { refetch: refetchRoles } = useGetUserRolesQuery(sessionId, {
        skip: !isAuthenticated || !sessionId,
    });

    const refetchAll = async () => {
        if (!isAuthenticated || !sessionId) {
            console.warn('⚠️ Cannot refetch permissions: User not authenticated');
            return;
        }

        setIsRefetching(true);
        console.log('🔄 Manually refetching user permissions and roles...');

        try {
            await Promise.all([
                refetchPermissions(),
                refetchRoles(),
            ]);

            console.log('✅ Permissions refetch complete');
        } catch (error) {
            console.error('❌ Error refetching permissions:', error);
        } finally {
            setIsRefetching(false);
        }
    };

    return {
        refetchPermissions: refetchAll,
        isRefetching,
    };
};