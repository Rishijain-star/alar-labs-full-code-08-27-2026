// src/hooks/useRouteAccess.js
import { useSelector } from "react-redux";
import { useGetUserRoutesQuery } from "@/store/api/userApi";
import { useMemo } from "react";

/**
 * Hook to check if user has access to specific routes
 * 
 * Usage:
 * const { hasAccess, isLoading, canAccess } = useRouteAccess();
 * 
 * // Check single route
 * if (canAccess("/app/users")) {
 *   // User can access users page
 * }
 * 
 * // Check multiple routes
 * const canAccessAny = canAccess(["/app/users", "/app/courses"]);
 */
export const useRouteAccess = () => {
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    const {
        data: accessibleRoutes = [],
        isLoading,
        error,
    } = useGetUserRoutesQuery(undefined, {
        skip: !isAuthenticated,
    });

    // Create a flat map of all accessible paths for quick lookup
    const accessiblePaths = useMemo(() => {
        if (!accessibleRoutes || accessibleRoutes.length === 0) {
            return new Set();
        }

        const paths = new Set();

        const addPaths = (routes) => {
            routes.forEach((route) => {
                paths.add(route.path);
                if (route.children && route.children.length > 0) {
                    addPaths(route.children);
                }
            });
        };

        addPaths(accessibleRoutes);
        return paths;
    }, [accessibleRoutes]);

    /**
     * Check if user can access a path or paths
     * @param {string|string[]} pathOrPaths - Single path or array of paths
     * @returns {boolean} - True if user can access at least one of the paths
     */
    const canAccess = (pathOrPaths) => {
        if (!isAuthenticated) return false;

        if (typeof pathOrPaths === "string") {
            return checkSinglePath(pathOrPaths);
        }

        if (Array.isArray(pathOrPaths)) {
            return pathOrPaths.some((path) => checkSinglePath(path));
        }

        return false;
    };

    /**
     * Check if user can access ALL specified paths
     * @param {string[]} paths - Array of paths
     * @returns {boolean} - True only if user can access all paths
     */
    const canAccessAll = (paths) => {
        if (!isAuthenticated) return false;
        return paths.every((path) => checkSinglePath(path));
    };

    /**
     * Helper to check a single path
     */
    const checkSinglePath = (path) => {
        // Exact match
        if (accessiblePaths.has(path)) {
            return true;
        }

        // Check if any accessible path is a parent of this path
        // e.g., /app/users allows /app/users/123
        for (const accessiblePath of accessiblePaths) {
            if (path.startsWith(accessiblePath + "/")) {
                return true;
            }
        }

        return false;
    };

    /**
     * Get all routes the user has access to
     */
    const getAccessibleRoutes = () => accessibleRoutes;

    /**
     * Check if user has access to a specific route by ID
     */
    const canAccessRouteById = (routeId) => {
        const findRoute = (routes) => {
            for (const route of routes) {
                if (route.id === routeId) return true;
                if (route.children && findRoute(route.children)) return true;
            }
            return false;
        };

        return findRoute(accessibleRoutes);
    };

    return {
        // Access check functions
        canAccess,
        canAccessAll,
        canAccessRouteById,

        // Route data
        accessibleRoutes,
        getAccessibleRoutes,
        accessiblePaths: Array.from(accessiblePaths),

        // Loading states
        isLoading,
        error,
        hasAccess: accessibleRoutes.length > 0,
    };
};

/**
 * Hook to check access to a specific route
 * Simpler version for single route checks
 * 
 * Usage:
 * const { hasAccess, isLoading } = useHasRouteAccess("/app/users");
 */
export const useHasRouteAccess = (path) => {
    const { canAccess, isLoading, error } = useRouteAccess();

    return {
        hasAccess: canAccess(path),
        isLoading,
        error,
    };
};

export default useRouteAccess;