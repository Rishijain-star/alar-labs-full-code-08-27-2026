import Cookies from "js-cookie";

// Role definitions
export const ROLES = {
    ADMIN: "admin",
    CONTENT_MANAGER: "content_manager",
    APPROVAL_MANAGER: "approval_manager",
    CUSTOMER_SUPPORT: "customer_support",
    INSTRUCTOR: "instructor",
    GUEST: "guest",
    USER: "user",
};

// Import permissions from the enhanced permissions system
import {
    PERMISSIONS as ENHANCED_PERMISSIONS
} from '@/utils/permissions';

// Re-export enhanced permissions for backward compatibility
export const PERMISSIONS = ENHANCED_PERMISSIONS;

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
    try {
        const authToken = Cookies.get("authToken");
        const userStr = localStorage.getItem("user");

        if (!authToken || !userStr) {
            return null;
        }

        const user = JSON.parse(userStr);

        // Log user data for debugging (remove in production)
        if (process.env.NODE_ENV === 'development') {
            console.log("👤 Current user:", {
                role: user.role,
                permissionsCount: user.permissions?.length || 0,
                hasPermissionsArray: Array.isArray(user.permissions)
            });
        }

        return user;
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    const authToken = Cookies.get("authToken");
    const user = getCurrentUser();

    // Must have BOTH token AND user
    return !!authToken && !!user;
};

/**
 * Check if user has a specific role
 */
export const hasRole = (role) => {
    const user = getCurrentUser();

    if (!user || !user.role) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ hasRole: No user or role found", {
                role
            });
        }
        return false;
    }

    // Admin has all roles
    if (user.role === ROLES.ADMIN) return true;

    return user.role === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles = []) => {
    const user = getCurrentUser();

    if (!user || !user.role) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ hasAnyRole: No user or role found", {
                roles
            });
        }
        return false;
    }

    // Admin has all roles
    if (user.role === ROLES.ADMIN) return true;

    return roles.includes(user.role);
};

/**
 * Check if user has a specific permission
 * Requires backend to send user.permissions array
 */
export const hasPermission = (permission) => {
    const user = getCurrentUser();

    if (!user) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ hasPermission: No user found", {
                permission
            });
        }
        return false;
    }

    // Backend must send permissions array
    if (!user.permissions || !Array.isArray(user.permissions)) {
        console.error("⚠️ Backend must send user.permissions array");
        return false;
    }

    const has = user.permissions.includes(permission);

    if (process.env.NODE_ENV === 'development') {
        console.log("🔑 Permission check:", {
            permission,
            userPermissions: user.permissions.length,
            hasPermission: has
        });
    }

    return has;
};

/**
 * Check if user has all specified permissions
 */
export const hasAllPermissions = (permissionsToCheck = []) => {
    const user = getCurrentUser();

    if (!user) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ hasAllPermissions: No user found");
        }
        return false;
    }

    // Empty array check - no permissions required
    if (permissionsToCheck.length === 0) {
        return true;
    }

    // Backend must send permissions array
    if (!user.permissions || !Array.isArray(user.permissions)) {
        console.error("⚠️ Backend must send user.permissions array");
        return false;
    }

    const hasAll = permissionsToCheck.every(permission =>
        user.permissions.includes(permission)
    );

    if (process.env.NODE_ENV === 'development') {
        console.log("🔑 hasAllPermissions:", {
            permissionsToCheck,
            userPermissions: user.permissions.length,
            hasAll
        });
    }

    return hasAll;
};

/**
 * Check if user has any of the specified permissions
 * This is the primary permission check used by the routing system
 */
export const hasAnyPermission = (permissionsToCheck = []) => {
    const user = getCurrentUser();

    if (!user) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ hasAnyPermission: No user found");
        }
        return false;
    }

    // Empty array means no permissions required - allow access
    if (permissionsToCheck.length === 0) {
        return true;
    }

    // Backend must send permissions array
    if (!user.permissions || !Array.isArray(user.permissions)) {
        console.error("⚠️ Backend must send user.permissions array");
        return false;
    }

    const hasAny = permissionsToCheck.some(permission =>
        user.permissions.includes(permission)
    );

    if (process.env.NODE_ENV === 'development') {
        console.log("🔑 hasAnyPermission:", {
            permissionsToCheck,
            userPermissions: user.permissions.length,
            hasAny
        });
    }

    return hasAny;
};

/**
 * Get all permissions for current user
 */
export const getUserPermissions = () => {
    const user = getCurrentUser();

    if (!user) {
        if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ getUserPermissions: No user found");
        }
        return [];
    }

    // Return permissions from backend
    if (!user.permissions || !Array.isArray(user.permissions)) {
        console.error("⚠️ Backend must send user.permissions array");
        return [];
    }

    return user.permissions;
};

/**
 * Check if user is admin
 */
export const isAdmin = () => {
    const user = getCurrentUser();
    return user?.role === ROLES.ADMIN;
};

/**
 * Get user role
 */
export const getUserRole = () => {
    const user = getCurrentUser();
    return user?.role || null;
};

/**
 * Update user permissions in localStorage
 * Used when backend sends updated permissions
 */
export const updateUserPermissions = (permissions) => {
    try {
        const user = getCurrentUser();
        if (user) {
            user.permissions = permissions;
            localStorage.setItem("user", JSON.stringify(user));

            if (process.env.NODE_ENV === 'development') {
                console.log("✅ User permissions updated:", permissions.length);
            }
        }
    } catch (error) {
        console.error("Error updating user permissions:", error);
    }
};

/**
 * Update user role in localStorage
 * Used when backend sends updated role
 */
export const updateUserRole = (role) => {
    try {
        const user = getCurrentUser();
        if (user) {
            user.role = role;
            localStorage.setItem("user", JSON.stringify(user));

            if (process.env.NODE_ENV === 'development') {
                console.log("✅ User role updated:", role);
            }
        }
    } catch (error) {
        console.error("Error updating user role:", error);
    }
};

/**
 * Sync user data with backend
 * Call this after login or when you need fresh user data
 */
export const syncUserData = async (apiClient) => {
    try {
        const response = await apiClient.get('/api/auth/me');
        const userData = response.data;

        // Validate that backend sent permissions
        if (!userData.permissions || !Array.isArray(userData.permissions)) {
            console.error("⚠️ Backend response missing permissions array");
            return null;
        }

        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(userData));

        if (process.env.NODE_ENV === 'development') {
            console.log("✅ User data synced with backend:", {
                role: userData.role,
                permissionsCount: userData.permissions.length
            });
        }

        return userData;
    } catch (error) {
        console.error("Error syncing user data:", error);
        return null;
    }
};

/**
 * Logout user
 */
export const logout = () => {
    Cookies.remove("authToken");
    Cookies.remove("refreshToken");
    localStorage.removeItem("user");

    if (process.env.NODE_ENV === 'development') {
        console.log("👋 User logged out");
    }

    window.location.href = "/auth/login";
};

/**
 * Check if user has access to a specific route
 * Used by route guards
 */
export const canAccessRoute = (requiredPermissions = []) => {
    const user = getCurrentUser();

    // Not authenticated
    if (!user) return false;

    // Admin can access everything
    if (user.role === ROLES.ADMIN) return true;

    // No permissions required
    if (requiredPermissions.length === 0) return true;

    // Check if user has any of the required permissions
    return hasAnyPermission(requiredPermissions);
};

/**
 * Get user display name
 */
export const getUserDisplayName = () => {
    const user = getCurrentUser();
    if (!user) return "Guest";
    return user.name || user.email?.split("@")[0] || "User";
};

/**
 * Get user initials for avatar
 */
export const getUserInitials = () => {
    const user = getCurrentUser();
    if (!user || !user.name) return "U";

    return user.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

// Export for backward compatibility
export default {
    getCurrentUser,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getUserPermissions,
    isAdmin,
    getUserRole,
    updateUserPermissions,
    updateUserRole,
    syncUserData,
    logout,
    canAccessRoute,
    getUserDisplayName,
    getUserInitials,
    ROLES,
    PERMISSIONS
};