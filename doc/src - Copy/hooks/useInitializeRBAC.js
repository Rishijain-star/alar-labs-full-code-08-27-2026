// src/hooks/useInitializeRBAC.js
import {
    useEffect
} from "react";
import {
    useDispatch,
    useSelector
} from "react-redux";
import {
    selectIsUserDataInitialized,
    setRoles,
    setPermissions,
    setPermissionGroups
} from "@/store/slices/userSlice";
import {
    useGetAllRolesQuery,
    useGetAllPermissionsQuery,
    useGetAllPermissionGroupsQuery,
} from "@/store/api/roleAndPermissionApi"; // ← Updated import
import {
    STATIC_ROLES,
    STATIC_PERMISSIONS,
    STATIC_PERMISSION_GROUPS
} from "@/utils/permissions";
import {
    hasPermission
} from "@/utils/permissions";

/**
 * Smart RBAC initialization hook
 * 
 * This hook:
 * 1. Checks if user is authenticated
 * 2. Checks if user has required permissions
 * 3. Only fetches RBAC data if user has permission
 * 4. Falls back to static data if no permissions or API fails
 * 
 * Usage in components that need RBAC data:
 * 
 * const { isLoading } = useInitializeRBAC({
 *   requirePermissions: ["view_roles"], // Only fetch if user has this permission
 *   fetchRoles: true,                   // Fetch roles
 *   fetchPermissions: true,             // Fetch permissions
 *   fetchGroups: true                   // Fetch permission groups
 * });
 * 
 * @param {object} options
 * @param {string|string[]} options.requirePermissions - Required permission(s) to fetch data
 * @param {boolean} options.fetchRoles - Fetch roles data
 * @param {boolean} options.fetchPermissions - Fetch permissions data
 * @param {boolean} options.fetchGroups - Fetch permission groups data
 * @param {boolean} options.useStatic - Use static data instead of API
 * @returns {object} - { isLoading, error, initialized, hasAccess }
 */
export const useInitializeRBAC = (options = {}) => {
    const {
        requirePermissions = null,
            fetchRoles = true,
            fetchPermissions = true,
            fetchGroups = true,
            useStatic = false,
    } = options;

    const dispatch = useDispatch();

    // Get auth state
    const user = useSelector((state) => state.auth.user);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const initialized = useSelector(selectIsUserDataInitialized);

    // Check if user has required permissions
    const hasAccess = requirePermissions ?
        hasPermission(user?.permissions, requirePermissions) :
        true; // If no permission required, grant access

    // Only fetch if:
    // 1. User is authenticated
    // 2. User has required permissions
    // 3. Not already initialized
    // 4. Not using static data
    const shouldFetchRoles = isAuthenticated && hasAccess && !initialized && fetchRoles && !useStatic;
    const shouldFetchPermissions = isAuthenticated && hasAccess && fetchPermissions && !useStatic;
    const shouldFetchGroups = isAuthenticated && hasAccess && fetchGroups && !useStatic;

    // RTK Query hooks - will skip if shouldFetch is false
    const {
        data: rolesData,
        isLoading: rolesLoading,
        error: rolesError,
    } = useGetAllRolesQuery({
        page: 1,
        limit: 100
    }, {
        skip: !shouldFetchRoles
    });

    const {
        data: permissionsData,
        isLoading: permissionsLoading,
        error: permissionsError,
    } = useGetAllPermissionsQuery(
        undefined, {
            skip: !shouldFetchPermissions
        }
    );

    const {
        data: groupsData,
        isLoading: groupsLoading,
        error: groupsError,
    } = useGetAllPermissionGroupsQuery(
        undefined, {
            skip: !shouldFetchGroups
        }
    );

    useEffect(() => {
        // If user is not authenticated, don't do anything
        if (!isAuthenticated) {
            return;
        }

        // If user doesn't have permission, use static data
        if (!hasAccess || useStatic) {
            if (!initialized) {
                console.warn("User lacks permission or using static data. Loading static RBAC data.");
                dispatch(setRoles(STATIC_ROLES));
                dispatch(setPermissions(STATIC_PERMISSIONS));
                dispatch(setPermissionGroups(STATIC_PERMISSION_GROUPS));
            }
            return;
        }

        // If any API call fails, fall back to static data
        if ((rolesError && fetchRoles) || (permissionsError && fetchPermissions) || (groupsError && fetchGroups)) {
            console.warn("RBAC API failed, falling back to static data:", {
                rolesError,
                permissionsError,
                groupsError,
            });

            dispatch(setRoles(STATIC_ROLES));
            dispatch(setPermissions(STATIC_PERMISSIONS));
            dispatch(setPermissionGroups(STATIC_PERMISSION_GROUPS));
        }
    }, [
        isAuthenticated,
        hasAccess,
        useStatic,
        initialized,
        rolesError,
        permissionsError,
        groupsError,
        fetchRoles,
        fetchPermissions,
        fetchGroups,
        dispatch
    ]);

    const isLoading = rolesLoading || permissionsLoading || groupsLoading;
    const error = rolesError || permissionsError || groupsError;

    return {
        isLoading,
        error,
        initialized,
        hasAccess, // Whether user has permission to access this data
    };
};

/**
 * Convenience hooks for specific use cases
 */

// Hook for Role Management pages
export const useRolesData = () => {
    return useInitializeRBAC({
        requirePermissions: "view_roles",
        fetchRoles: true,
        fetchPermissions: false,
        fetchGroups: false,
    });
};

// Hook for Permission Management pages
export const usePermissionsData = () => {
    return useInitializeRBAC({
        requirePermissions: "view_roles", // Usually permissions are part of role management
        fetchRoles: false,
        fetchPermissions: true,
        fetchGroups: true,
    });
};

// Hook for pages that need all RBAC data
export const useFullRBACData = () => {
    return useInitializeRBAC({
        requirePermissions: "manage_access_control",
        fetchRoles: true,
        fetchPermissions: true,
        fetchGroups: true,
    });
};