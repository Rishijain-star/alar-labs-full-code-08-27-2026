// src/lib/auth.js

/**
 * Get current user's role
 * @returns {string|null} User role or null
 */
export const getUserRole = () => {
    const user = getCurrentUser();
    return user?.role || null;
};

/**
 * Get the current user from localStorage
 * @returns {Object|null} User object or null if not found
 */
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem("user");

        return userStr ? JSON.parse(userStr) : null;

    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

/**
 * Get current user's permissions
 * @returns {Array} Array of permission strings
 */
export const getUserPermissions = () => {
    const user = getCurrentUser();
    return user?.permissions || [];
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (role) => {
    const userRole = getUserRole();
    return userRole === role;
};

/**
 * Check if user has any of the specified roles
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (roles) => {
    if (!Array.isArray(roles) || roles.length === 0) return true;

    const userRole = getUserRole();
    if (!userRole) return false;

    return roles.includes(userRole);
};

/**
 * Check if user has all of the specified roles
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAllRoles = (roles) => {
    if (!Array.isArray(roles) || roles.length === 0) return true;

    const userRole = getUserRole();
    if (!userRole) return false;

    // Since a user typically has one role, this checks if their role is in the list
    return roles.every(role => role === userRole);
};

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
    const permissions = getUserPermissions();
    return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;

    const userPermissions = getUserPermissions();
    if (!userPermissions || userPermissions.length === 0) return false;

    return permissions.some(permission => userPermissions.includes(permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;

    const userPermissions = getUserPermissions();
    if (!userPermissions || userPermissions.length === 0) return false;

    return permissions.every(permission => userPermissions.includes(permission));
};

/**
 * Check if user is super admin
 * @returns {boolean}
 */
export const isSuperAdmin = () => {
    return hasRole('super_admin') || hasRole('superadmin');
};

/**
 * Check if user is admin (any kind)
 * @returns {boolean}
 */
export const isAdmin = () => {
    return hasAnyRole(['admin', 'super_admin', 'superadmin']);
};

/**
 * Check if user is student
 * @returns {boolean}
 */
export const isStudent = () => {
    return hasRole('student');
};

/**
 * Check if user is instructor
 * @returns {boolean}
 */
export const isInstructor = () => {
    return hasRole('instructor');
};

/**
 * Get user's full name
 * @returns {string}
 */
export const getUserFullName = () => {
    const user = getCurrentUser();
    if (!user) return '';

    if (user.fullName) return user.fullName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.name) return user.name;

    return user.email || 'User';
};

/**
 * Get user's email
 * @returns {string}
 */
export const getUserEmail = () => {
    const user = getCurrentUser();
    return user?.email || '';
};

/**
 * Get user's ID
 * @returns {string}
 */
export const getUserId = () => {
    const user = getCurrentUser();
    return user?.userId || user?.id || '';
};

/**
 * Check if route is accessible by user
 * @param {Object} route - Route object with roles and permissions
 * @returns {boolean}
 */
export const canAccessRoute = (route) => {
    // If route is explicitly invisible, deny access
    if (route.isVisible === false) return false;

    // Super admin can access everything
    if (isSuperAdmin()) return true;

    // No restrictions - allow access
    if ((!route.roles || route.roles.length === 0) &&
        (!route.permissions || route.permissions.length === 0)) {
        return true;
    }

    // Check roles
    if (route.roles && route.roles.length > 0) {
        if (!hasAnyRole(route.roles)) return false;
    }

    // Check permissions
    if (route.permissions && route.permissions.length > 0) {
        if (!hasAnyPermission(route.permissions)) return false;
    }

    return true;
};

export default {
    getUserRole,
    getUserPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isAdmin,
    isStudent,
    isInstructor,
    getUserFullName,
    getUserEmail,
    getUserId,
    canAccessRoute,
};