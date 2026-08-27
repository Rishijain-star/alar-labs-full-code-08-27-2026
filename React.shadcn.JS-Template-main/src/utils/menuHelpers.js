/**
 * MENU HELPERS
 * ─────────────────────────────────────────────────────────────
 * All permission/role logic lives in permissions.js.
 * This file ONLY contains menu-specific utilities.
 * It re-exports the shared helpers so callers can import from
 * one place if they prefer.
 */

import {
    hasAnyPermission,
    hasRole,
    getUserRoles,
    hasPermission,
} from "@/utils/permissions";

// Re-export so callers who previously imported from here still work
export { hasAnyPermission, hasRole, getUserRoles, hasPermission };

// ─────────────────────────────────────────────────────────────
// MENU-SPECIFIC HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Check if the current user can access a menu item.
 * No permissions = visible to all authenticated users.
 */
export const canAccessMenuItem = (item) => {
    if (!item?.permissions || item.permissions.length === 0) return true;
    return hasAnyPermission(item.permissions);
};

/**
 * Filter a menu tree recursively based on the current user's permissions.
 * Parents with no accessible children are removed.
 */
export const filterMenuItems = (menuItems) => {
    return menuItems
        .filter(canAccessMenuItem)
        .map((item) => {
            if (!item.children || item.children.length === 0) return item;
            const filteredChildren = filterMenuItems(item.children);
            return filteredChildren.length > 0
                ? { ...item, children: filteredChildren }
                : null;
        })
        .filter(Boolean);
};

/**
 * Check if user can access a route given required permissions array/string.
 */
export const canAccessRoute = (requiredPermissions) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    const perms = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];
    return hasAnyPermission(perms);
};

/**
 * Check whether the user has any of the provided roles.
 */
export const hasUserRole = (requiredRoles) => {
    const userRoles = getUserRoles();
    if (!userRoles || userRoles.length === 0) return false;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.some((role) =>
        userRoles.some((ur) => {
            const id = typeof ur === "string" ? ur : ur?.id || ur?.name;
            return id === role;
        })
    );
};

/** Convenience: is the current user an admin? */
export const isAdmin = () =>
    hasUserRole("admin") || hasUserRole("administrator");

/** Check route visibility (respects isVisible flag + permissions) */
export const isRouteVisible = (route) => {
    if (route.isVisible === false) return false;
    return canAccessMenuItem(route);
};

export const getAccessibleRoutes = (routes) => routes.filter(isRouteVisible);

// ─────────────────────────────────────────────────────────────
// DISPLAY / FORMATTING UTILITIES
// ─────────────────────────────────────────────────────────────

/** "view_users" → "View Users" */
export const formatPermissionLabel = (id) => {
    if (!id) return "";
    return id
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
};

/** Get user initials (max 2 chars) */
export const getUserInitials = (name) => {
    if (!name) return "U";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

/** Get a display name from a user object */
export const getUserDisplayName = (user) => {
    if (!user) return "Guest";
    return user.name || user.email?.split("@")[0] || "User";
};

/** Sort menu items by an order key */
export const sortMenuItems = (items, orderKey = "order") => {
    return [...items].sort(
        (a, b) => (a[orderKey] || 0) - (b[orderKey] || 0)
    );
};

/** Find a menu item by id (recursive) */
export const findMenuItemById = (items, id) => {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children?.length) {
            const found = findMenuItemById(item.children, id);
            if (found) return found;
        }
    }
    return null;
};

/** Build breadcrumb trail for the current path */
export const getBreadcrumbs = (menuItems, currentPath) => {
    const breadcrumbs = [];
    const findPath = (items, path, trail = []) => {
        for (const item of items) {
            const newTrail = [...trail, { label: item.label, path: item.path }];
            if (item.path === path) {
                breadcrumbs.push(...newTrail);
                return true;
            }
            if (item.children?.length && findPath(item.children, path, newTrail)) {
                return true;
            }
        }
        return false;
    };
    findPath(menuItems, currentPath);
    return breadcrumbs;
};

/** Flatten a nested menu tree into a flat array */
export const flattenMenuItems = (items) => {
    const out = [];
    const walk = (list) => {
        list.forEach((item) => {
            out.push(item);
            if (item.children?.length) walk(item.children);
        });
    };
    walk(items);
    return out;
};

/** Group permissions by their permission-group definitions */
export const groupPermissions = (permissions, permissionGroups) => {
    const grouped = {};
    if (!permissionGroups || !permissions) return grouped;
    permissionGroups.forEach((group) => {
        const matching = permissions.filter((permission) =>
            group.permissions?.some((gp) => {
                const gpId = typeof gp === "string" ? gp : gp.id;
                const permId =
                    typeof permission === "string" ? permission : permission.id;
                return gpId === permId;
            })
        );
        if (matching.length > 0) {
            grouped[group.id] = {
                label: group.label || group.name,
                permissions: matching,
            };
        }
    });
    return grouped;
};

/** Compare two permission arrays — returns added / removed / common */
export const comparePermissions = (oldPerms, newPerms) => {
    const setA = new Set(oldPerms);
    const setB = new Set(newPerms);
    return {
        added: newPerms.filter((p) => !setA.has(p)),
        removed: oldPerms.filter((p) => !setB.has(p)),
        common: oldPerms.filter((p) => setB.has(p)),
        hasChanges:
            newPerms.filter((p) => !setA.has(p)).length > 0 ||
            oldPerms.filter((p) => !setB.has(p)).length > 0,
    };
};

/** Validate a route config object */
export const validateRoute = (route) => {
    const errors = [];
    if (!route.label?.trim()) errors.push("Route label is required");
    if (!route.path?.trim()) errors.push("Route path is required");
    if (route.path && !route.path.startsWith("/"))
        errors.push('Route path must start with "/"');
    if (route.icon && typeof route.icon !== "string")
        errors.push("Route icon must be a string");
    return { isValid: errors.length === 0, errors };
};