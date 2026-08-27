// src/hooks/useLazyRBAC.js
import {
    useCallback
} from "react";
import {
    useLazyGetAllRolesQuery,
    useLazyGetAllPermissionsQuery,
    useLazyGetAllPermissionGroupsQuery,
} from "@/store/api/userApi";
import {
    hasAnyPermission,
    hasAnyRole
} from "@/lib/auth";

/**
 * useLazyRBAC
 * - Permission/role-aware, on-demand loader for RBAC resources
 * - Does NOT fetch automatically — caller must call `fetchIfAllowed`
 * - Checks requiredRoles / requiredPermissions before making requests
 * - Returns structured results or `error: 'forbidden'` when access is denied
 *
 * Usage:
 * const { fetchIfAllowed } = useLazyRBAC();
 * const res = await fetchIfAllowed({ endpoints: ['roles','groups'], requiredPermissions: ['view_roles'] });
 */
export const useLazyRBAC = () => {
    const [triggerRoles, rolesResult] = useLazyGetAllRolesQuery();
    const [triggerPermissions, permissionsResult] = useLazyGetAllPermissionsQuery();
    const [triggerGroups, groupsResult] = useLazyGetAllPermissionGroupsQuery();

    const canAccess = useCallback((requiredPermissions = [], requiredRoles = []) => {
        if (requiredRoles && requiredRoles.length && !hasAnyRole(requiredRoles)) return false;
        if (requiredPermissions && requiredPermissions.length && !hasAnyPermission(requiredPermissions)) return false;
        return true;
    }, []);

    const fetchIfAllowed = useCallback(async ({
        endpoints = ["roles"],
        requiredPermissions = [],
        requiredRoles = [],
    } = {}) => {
        // quick check
        if (!canAccess(requiredPermissions, requiredRoles)) {
            return {
                error: "forbidden"
            };
        }

        try {
            const tasks = [];
            const mapping = [];

            if (endpoints.includes("roles")) {
                // default get params to fetch all
                tasks.push(triggerRoles({
                    page: 1,
                    limit: 100
                }));
                mapping.push("roles");
            }
            if (endpoints.includes("permissions")) {
                tasks.push(triggerPermissions());
                mapping.push("permissions");
            }
            if (endpoints.includes("groups")) {
                tasks.push(triggerGroups());
                mapping.push("groups");
            }

            // run in parallel
            const results = await Promise.all(tasks);

            const data = {};
            results.forEach((r, i) => {
                // RTK Query lazy trigger returns { data } on success or { error } on failure
                const key = mapping[i];
                if (r?.error) {
                    data[key] = {
                        error: r.error
                    };
                } else {
                    data[key] = r.data || null;
                }
            });

            // if any explicit error, bubble it up (but not a forbidden)
            const anyError = Object.values(data).find((v) => v && v.error);
            if (anyError) return {
                error: anyError.error,
                data
            };

            return {
                data
            };
        } catch (err) {
            return {
                error: err
            }; // network / unexpected
        }
    }, [triggerRoles, triggerPermissions, triggerGroups, canAccess]);

    return {
        fetchIfAllowed,
        // expose underlying lazy query states if needed
        rolesResult,
        permissionsResult,
        groupsResult,
        canAccess,
    };
};

export default useLazyRBAC;