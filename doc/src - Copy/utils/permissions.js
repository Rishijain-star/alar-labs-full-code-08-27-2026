/**
 * PERMISSIONS & ROLES SYSTEM - LOCALSTORAGE ONLY (FIXED VERSION)
 * This file ONLY reads from localStorage (no API calls)
 * Data is populated by Redux RTK Query (roleAndPermissionApi)
 * 
 * FIXES:
 * - Added role permission resolution
 * - Better error handling
 * - Improved data parsing
 * - Added debug logging
 */

// ============= LOCALSTORAGE KEYS =============

export const STORAGE_KEYS = {
    PERMISSIONS: 'rbac_permissions',
    ROLES: 'rbac_roles',
    USER_PERMISSIONS: 'rbac_user_permissions',
    USER_ROLES: 'rbac_user_roles',
    LAST_UPDATED: 'rbac_last_updated',
};

// Cache expiration time (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

const RBAC_PERMISSIONS_KEY = "rbac_user_permissions";
const RBAC_LAST_UPDATED_KEY = "rbac_last_updated";
// ============= HELPER TO PARSE DATA =============

/**
 * Save fresh permissions to localStorage (called after every refresh or login)
 */
export const savePermissionCache = (permissions = []) => {
    try {
        localStorage.setItem(
            RBAC_PERMISSIONS_KEY,
            JSON.stringify({ permissions })
        );
        localStorage.setItem(RBAC_LAST_UPDATED_KEY, Date.now().toString());
    } catch (e) {
        console.error("Failed to save permission cache:", e);
    }
};

/**
 * Read permissions from localStorage
 */
export const getPermissionCache = () => {
    try {
        const raw = localStorage.getItem(RBAC_PERMISSIONS_KEY);
        if (!raw) return null;
        return JSON.parse(raw); // { permissions: [...] }
    } catch (e) {
        return null;
    }
};



/**
 * Safely parse data from localStorage and extract array
 * Handles cases where API response object is stored instead of just the array
 */
const parseStorageData = (data, key) => {
    if (!data) return [];
    
    try {
        const parsed = JSON.parse(data);
        
        // If it's already an array, return it
        if (Array.isArray(parsed)) {
            return parsed;
        }
        
        // If it's an API response object, try to extract the data
        if (parsed && typeof parsed === 'object') {
            // Try common response formats
            if (Array.isArray(parsed.data)) return parsed.data;
            if (Array.isArray(parsed.permissions)) return parsed.permissions;
            if (Array.isArray(parsed.roles)) return parsed.roles;
            if (Array.isArray(parsed.userPermissions)) return parsed.userPermissions;
            if (Array.isArray(parsed.userRoles)) return parsed.userRoles;
            
            // Log warning about unexpected format
            console.warn(`⚠️ Unexpected data format in ${key}:`, parsed);
            return [];
        }
        
        return [];
    } catch (error) {
        console.error(`❌ Error parsing ${key}:`, error);
        return [];
    }
};

// ============= STATE MANAGEMENT =============

class PermissionStore {
    constructor() {
        this.permissions = [];
        this.roles = [];
        this.userPermissions = [];
        this.userRoles = [];
        this.initialized = false;
        this.debugMode = true; // Enable debug logging
    }

    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        const lastUpdated = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
        if (!lastUpdated) return false;
        
        const now = Date.now();
        const cacheAge = now - parseInt(lastUpdated, 10);
        return cacheAge < CACHE_DURATION;
    }

    /**
     * Load data from localStorage
     */
    loadFromCache() {
        try {
            const permissionsData = localStorage.getItem(STORAGE_KEYS.PERMISSIONS);
            const rolesData = localStorage.getItem(STORAGE_KEYS.ROLES);
            const userPermissionsData = localStorage.getItem(STORAGE_KEYS.USER_PERMISSIONS);
            const userRolesData = localStorage.getItem(STORAGE_KEYS.USER_ROLES);

            this.permissions = parseStorageData(permissionsData, STORAGE_KEYS.PERMISSIONS);
            this.roles = parseStorageData(rolesData, STORAGE_KEYS.ROLES);
            this.userPermissions = parseStorageData(userPermissionsData, STORAGE_KEYS.USER_PERMISSIONS);
            this.userRoles = parseStorageData(userRolesData, STORAGE_KEYS.USER_ROLES);

            if (this.debugMode) {
                console.log('✅ Loaded from localStorage:', {
                    permissions: this.permissions.length,
                    roles: this.roles.length,
                    userPermissions: this.userPermissions.length,
                    userRoles: this.userRoles.length,
                });

                // Log actual user permissions for debugging
                console.log('🔍 User Permissions:', this.userPermissions);
                console.log('🔍 User Roles:', this.userRoles);
            }

            // Log warnings if arrays are empty
            if (this.userPermissions.length === 0 && this.userRoles.length === 0) {
                console.warn('⚠️ No user permissions or roles loaded!');
                console.warn('📦 Raw userPermissions data:', userPermissionsData?.substring(0, 300));
                console.warn('📦 Raw userRoles data:', userRolesData?.substring(0, 300));
            }

            return true;
        } catch (error) {
            console.error('❌ Error loading from cache:', error);
            return false;
        }
    }

    /**
     * Initialize permission system (load from localStorage only)
     */
    initialize() {
        if (this.initialized) return;

        this.loadFromCache();
        this.initialized = true;
    }

    /**
     * Refresh data from localStorage
     */
    refresh() {
        this.initialized = false;
        this.initialize();
    }

    /**
     * Get all permissions from user's roles
     * NEW: This resolves permissions granted through roles
     */
    getPermissionsFromRoles() {
        const rolePermissions = [];
        
        try {
            // For each user role, find the full role object and extract its permissions
            this.userRoles.forEach(userRole => {
                // Get role ID (handle both string and object formats)
                const roleId = typeof userRole === 'string' ? userRole : (userRole.id || userRole.name);
                
                // Find the full role object from the roles array
                const fullRole = this.roles.find(r => 
                    r.id === roleId || r.name === roleId
                );
                
                if (fullRole && fullRole.permissions) {
                    // Handle different permission formats
                    if (Array.isArray(fullRole.permissions)) {
                        rolePermissions.push(...fullRole.permissions);
                    } else if (typeof fullRole.permissions === 'object') {
                        // If permissions is an object, extract permission IDs
                        Object.values(fullRole.permissions).forEach(perm => {
                            if (typeof perm === 'string') {
                                rolePermissions.push(perm);
                            } else if (perm && perm.id) {
                                rolePermissions.push(perm.id);
                            }
                        });
                    }
                }
            });

            if (this.debugMode && rolePermissions.length > 0) {
                console.log('🔑 Permissions from roles:', rolePermissions);
            }
        } catch (error) {
            console.error('❌ Error extracting permissions from roles:', error);
        }

        return rolePermissions;
    }

    /**
     * Get all user permissions (direct + from roles)
     * NEW: Combines direct permissions and role-based permissions
     */
    getAllUserPermissions() {
        const directPermissions = this.userPermissions.map(p => 
            typeof p === 'string' ? p : (p.id || p.name)
        );

        const rolePermissions = this.getPermissionsFromRoles();

        // Combine and deduplicate
        const allPermissions = [...new Set([...directPermissions, ...rolePermissions])];

        if (this.debugMode) {
            console.log('🎯 All user permissions:', allPermissions);
        }

        return allPermissions;
    }

    /**
     * Check if user has a specific permission
     * FIXED: Now checks both direct permissions and role-based permissions
     */
    hasPermission(permissionId) {
        if (!permissionId) return true; // No permission required
        
        // Ensure userPermissions is an array
        if (!Array.isArray(this.userPermissions)) {
            console.error('❌ userPermissions is not an array:', this.userPermissions);
            return false;
        }
        
        // Get all permissions (direct + from roles)
        const allPermissions = this.getAllUserPermissions();
        
        // Check if user has this permission
        const hasAccess = allPermissions.some(p => p === permissionId);

        if (this.debugMode) {
            console.log(`🔍 Permission check: "${permissionId}" = ${hasAccess}`);
            if (!hasAccess) {
                console.log('Available permissions:', allPermissions);
            }
        }

        return hasAccess;
    }

    /**
     * Check if user has ANY of the required permissions
     */
    hasAnyPermission(permissionIds) {
        if (!permissionIds || permissionIds.length === 0) return true;
        
        // Ensure userPermissions is an array
        if (!Array.isArray(this.userPermissions)) {
            console.error('❌ userPermissions is not an array:', this.userPermissions);
            return false;
        }
        
        const hasAccess = permissionIds.some(permissionId => this.hasPermission(permissionId));

        if (this.debugMode) {
            console.log(`🔍 Any permission check: ${permissionIds.join(' OR ')} = ${hasAccess}`);
        }

        return hasAccess;
    }

    /**
     * Check if user has ALL required permissions
     */
    hasAllPermissions(permissionIds) {
        if (!permissionIds || permissionIds.length === 0) return true;
        
        // Ensure userPermissions is an array
        if (!Array.isArray(this.userPermissions)) {
            console.error('❌ userPermissions is not an array:', this.userPermissions);
            return false;
        }
        
        const hasAccess = permissionIds.every(permissionId => this.hasPermission(permissionId));

        if (this.debugMode) {
            console.log(`🔍 All permissions check: ${permissionIds.join(' AND ')} = ${hasAccess}`);
        }

        return hasAccess;
    }

    /**
     * Check if user has a specific role
     */
    hasRole(roleId) {
        if (!roleId) return true;
        
        // Ensure userRoles is an array
        if (!Array.isArray(this.userRoles)) {
            console.error('❌ userRoles is not an array:', this.userRoles);
            return false;
        }
        
        return this.userRoles.some(r => 
            typeof r === 'string' ? r === roleId : r.id === roleId || r.name === roleId
        );
    }

    /**
     * Check if route is accessible by user
     */
    canAccessRoute(route) {
        // System routes with no permissions are accessible to all authenticated users
        if (!route.permissions || route.permissions.length === 0) {
            return true;
        }

        // Check if user has required permissions
        return this.hasAnyPermission(route.permissions);
    }

    /**
     * Enable/disable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    getPermissions() {
        return this.permissions;
    }

    getRoles() {
        return this.roles;
    }

    getUserPermissions() {
        return this.userPermissions;
    }

    getUserRoles() {
        return this.userRoles;
    }
}

// Create singleton instance
export const permissionStore = new PermissionStore();

// ============= HELPER FUNCTIONS TO SAVE DATA (Called by Redux) =============

/**
 * Save permissions to localStorage (called by Redux after API fetch)
 */
export const savePermissionsToCache = (permissions) => {
    try {
        // Extract array from response if needed
        const permissionsArray = Array.isArray(permissions) 
            ? permissions 
            : (permissions?.data || permissions?.permissions || []);
            
        localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissionsArray));
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
        console.log('✅ Permissions saved to localStorage:', permissionsArray.length);
        permissionStore.refresh();
    } catch (error) {
        console.error('❌ Error saving permissions to cache:', error);
    }
};

/**
 * Save roles to localStorage (called by Redux after API fetch)
 */
export const saveRolesToCache = (roles) => {
    try {
        // Extract array from response if needed
        const rolesArray = Array.isArray(roles)
            ? roles
            : (roles?.data || roles?.roles || []);
            
        localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(rolesArray));
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
        console.log('✅ Roles saved to localStorage:', rolesArray.length);
        permissionStore.refresh();
    } catch (error) {
        console.error('❌ Error saving roles to cache:', error);
    }
};

/**
 * Save user permissions to localStorage (called by Redux after API fetch)
 */
export const saveUserPermissionsToCache = (userPermissions) => {
    try {
        // Extract array from response if needed
        const permissionsArray = Array.isArray(userPermissions)
            ? userPermissions
            : (userPermissions?.data || userPermissions?.permissions || userPermissions?.userPermissions || []);
            
        localStorage.setItem(STORAGE_KEYS.USER_PERMISSIONS, JSON.stringify(permissionsArray));
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
        console.log('✅ User permissions saved to localStorage:', permissionsArray.length);
        console.log('📦 User permissions data:', permissionsArray);
        permissionStore.refresh();
    } catch (error) {
        console.error('❌ Error saving user permissions to cache:', error);
    }
};

/**
 * Save user roles to localStorage (called by Redux after API fetch)
 */
export const saveUserRolesToCache = (userRoles) => {
    try {
        // Extract array from response if needed
        const rolesArray = Array.isArray(userRoles)
            ? userRoles
            : (userRoles?.data || userRoles?.roles || userRoles?.userRoles || []);
            
        localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(rolesArray));
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
        console.log('✅ User roles saved to localStorage:', rolesArray.length);
        console.log('📦 User roles data:', rolesArray);
        permissionStore.refresh();
    } catch (error) {
        console.error('❌ Error saving user roles to cache:', error);
    }
};

// ============= HELPER FUNCTIONS FOR READING DATA =============

/**
 * Get all permissions
 */
export const getPermissions = () => {
    permissionStore.initialize();
    return permissionStore.getPermissions();
};

/**
 * Get all roles
 */
export const getRoles = () => {
    permissionStore.initialize();
    return permissionStore.getRoles();
};

/**
 * Get user's permissions (direct only, not from roles)
 */
export const getUserPermissions = () => {
    permissionStore.initialize();
    return permissionStore.getUserPermissions();
};

/**
 * Get user's roles
 */
export const getUserRoles = () => {
    permissionStore.initialize();
    return permissionStore.getUserRoles();
};

/**
 * Get all user permissions (direct + from roles)
 * NEW: Use this to see all effective permissions
 */
export const getAllUserPermissions = () => {
    permissionStore.initialize();
    return permissionStore.getAllUserPermissions();
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (permissionId) => {
    permissionStore.initialize();
    return permissionStore.hasPermission(permissionId);
};

/**
 * Check if user has any of the permissions
 */
export const hasAnyPermission = (permissionIds) => {
    permissionStore.initialize();
    return permissionStore.hasAnyPermission(permissionIds);
};

/**
 * Check if user has all permissions
 */
export const hasAllPermissions = (permissionIds) => {
    permissionStore.initialize();
    return permissionStore.hasAllPermissions(permissionIds);
};

/**
 * Check if user has a specific role
 */
export const hasRole = (roleId) => {
    permissionStore.initialize();
    return permissionStore.hasRole(roleId);
};

/**
 * Check if user can access a specific route
 */
export const canAccessRoute = (route) => {
    permissionStore.initialize();
    return permissionStore.canAccessRoute(route);
};

/**
 * Get permission label by ID
 */
export const getPermissionLabel = (permissionId) => {
    const permissions = permissionStore.getPermissions();
    const permission = permissions.find(p => p.id === permissionId);
    return permission?.label || permission?.name || permissionId;
};

/**
 * Get permission description by ID
 */
export const getPermissionDescription = (permissionId) => {
    const permissions = permissionStore.getPermissions();
    const permission = permissions.find(p => p.id === permissionId);
    return permission?.description || '';
};

/**
 * Refresh all permission data from localStorage
 */
export const refreshPermissionData = async (fetchFn) => {
    try {
        const data = await fetchFn();
        const permissions = data?.permissions ?? data?.data?.permissions ?? [];
        savePermissionCache(permissions);
        console.log("✅ Permission cache refreshed:", permissions);
        return permissions;
    } catch (err) {
        console.warn("⚠️ Could not refresh permissions from server:", err);
        return null;
    }
};

/**
 * Get role by ID
 */
export const getRoleById = (roleId) => {
    const roles = permissionStore.getRoles();
    return roles.find(r => r.id === roleId);
};

/**
 * Check if store is initialized
 */
export const isStoreInitialized = () => {
    return permissionStore.initialized;
};

/**
 * Clear all cached data
 */
export const clearPermissionCache = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    permissionStore.refresh();
    console.log('✅ Cache cleared');
};

/**
 * Check if cache exists
 */
export const hasCachedData = () => {
    return !!localStorage.getItem(STORAGE_KEYS.PERMISSIONS) ||
           !!localStorage.getItem(STORAGE_KEYS.USER_PERMISSIONS);
};

/**
 * Enable/disable debug mode
 */
export const setDebugMode = (enabled) => {
    permissionStore.setDebugMode(enabled);
};

/**
 * Debug: Print current permission state
 */
export const debugPermissions = () => {
    permissionStore.initialize();
    console.log('=== PERMISSION DEBUG ===');
    console.log('All Permissions:', permissionStore.getPermissions());
    console.log('All Roles:', permissionStore.getRoles());
    console.log('User Permissions (direct):', permissionStore.getUserPermissions());
    console.log('User Roles:', permissionStore.getUserRoles());
    console.log('User Permissions (all):', permissionStore.getAllUserPermissions());
    console.log('======================');
};