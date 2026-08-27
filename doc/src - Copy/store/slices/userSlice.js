// src/store/slices/userSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { roleAndPermissionApi } from "../api/roleAndPermissionApi";
import { userApi } from "../api/userApi";

/**
 * User slice manages:
 * 1. RBAC data (roles, permissions) - cached for 10 minutes
 * 2. User management data (users list, current user being edited)
 * 3. User stats and analytics
 * 
 * This is separate from authSlice which only handles authentication.
 */

const initialState = {
    // RBAC Data (from roleAndPermissionApi)
    roles: [],
    permissions: [],

    // User Management Data (from userApi)
    users: [],
    currentUser: null, // User being viewed/edited
    userStats: null,

    // Pagination & Filters
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    },
    filters: {
        search: "",
        roleId: "",
        status: "",
    },

    // Loading & Error States
    isLoading: false,
    error: null,
    initialized: false, // Track if RBAC data has been loaded
};

const userSlice = createSlice({
    name: "user",
    initialState,

    reducers: {
        /* ═══════════════════════════════════════════
           RBAC Data Manual Setters
           ═══════════════════════════════════════════ */
        setRoles: (state, { payload }) => {
            state.roles = payload;
            state.initialized = true;
        },
        setPermissions: (state, { payload }) => {
            state.permissions = payload;
        },

        /* ═══════════════════════════════════════════
           User Management Manual Setters
           ═══════════════════════════════════════════ */
        setUsers: (state, { payload }) => {
            state.users = payload;
        },
        setCurrentUser: (state, { payload }) => {
            state.currentUser = payload;
        },
        clearCurrentUser: (state) => {
            state.currentUser = null;
        },
        setUserStats: (state, { payload }) => {
            state.userStats = payload;
        },

        /* ═══════════════════════════════════════════
           Pagination & Filters
           ═══════════════════════════════════════════ */
        setPagination: (state, { payload }) => {
            state.pagination = { ...state.pagination, ...payload };
        },
        setFilters: (state, { payload }) => {
            state.filters = { ...state.filters, ...payload };
        },
        resetFilters: (state) => {
            state.filters = {
                search: "",
                roleId: "",
                status: "",
            };
            state.pagination.page = 1;
        },

        /* ═══════════════════════════════════════════
           Optimistic Updates
           ═══════════════════════════════════════════ */
        // Update user locally (optimistic update)
        updateUserLocally: (state, { payload }) => {
            const index = state.users.findIndex(u => u.id === payload.id);
            if (index !== -1) {
                state.users[index] = { ...state.users[index], ...payload };
            }
            if (state.currentUser?.id === payload.id) {
                state.currentUser = { ...state.currentUser, ...payload };
            }
        },

        // Remove user locally (optimistic update)
        removeUserLocally: (state, { payload }) => {
            state.users = state.users.filter(u => u.id !== payload);
            if (state.currentUser?.id === payload) {
                state.currentUser = null;
            }
        },

        /* ═══════════════════════════════════════════
           Clear All Data (on logout)
           ═══════════════════════════════════════════ */
        clearUserData: (state) => {
            state.roles = [];
            state.permissions = [];
            state.users = [];
            state.currentUser = null;
            state.userStats = null;
            state.pagination = {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            };
            state.filters = {
                search: "",
                roleId: "",
                status: "",
            };
            state.initialized = false;
            state.error = null;
        },
    },

    extraReducers: (builder) => {
        builder
            /* ═══════════════════════════════════════════════════════
               ROLE & PERMISSION API MATCHERS
               ═══════════════════════════════════════════════════════ */

            /* ── Get All Roles ── */
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllRoles.matchFulfilled,
                (state, { payload }) => {
                    const roles = payload?.data?.roles || payload?.data || [];
                    state.roles = roles;
                    state.initialized = true;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllRoles.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllRoles.matchRejected,
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.error = payload?.message || error?.message || "Failed to load roles";
                }
            )
          
            /* ── Get All Permissions ── */
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissions.matchFulfilled,
                (state, { payload }) => {
                    const permissions = payload?.data?.permissions || payload?.data || [];
                    state.permissions = permissions;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissions.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissions.matchRejected,
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.error = payload?.message || error?.message || "Failed to load permissions";
                }
            )

            /* ═══════════════════════════════════════════════════════
               USER API MATCHERS
               ═══════════════════════════════════════════════════════ */

            /* ── Get All Users ── */
            .addMatcher(
                userApi.endpoints.getAllUsers.matchFulfilled,
                (state, { payload }) => {
                    const users = payload?.data?.users || payload?.data || [];
                    const total = payload?.data?.total || users.length;
                    const totalPages = payload?.data?.totalPages || Math.ceil(total / state.pagination.limit);

                    state.users = users;
                    state.pagination = {
                        ...state.pagination,
                        total,
                        totalPages,
                    };
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                userApi.endpoints.getAllUsers.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                userApi.endpoints.getAllUsers.matchRejected,
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.error = payload?.message || error?.message || "Failed to load users";
                }
            )

            /* ── Get User By ID ── */
            .addMatcher(
                userApi.endpoints.getUserById.matchFulfilled,
                (state, { payload }) => {
                    state.currentUser = payload?.data || null;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                userApi.endpoints.getUserById.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                userApi.endpoints.getUserById.matchRejected,
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.currentUser = null;
                    state.error = payload?.message || error?.message || "Failed to load user";
                }
            )

            /* ── Get User Stats ── */
            .addMatcher(
                userApi.endpoints.getUserStats.matchFulfilled,
                (state, { payload }) => {
                    state.userStats = payload?.data || null;
                }
            )

            /* ── Assign Role to User (Optimistic Update) ── */
            .addMatcher(
                userApi.endpoints.assignRoleToUser.matchPending,
                (state, { meta }) => {
                    const { userId, roleId } = meta.arg.originalArgs;
                    const userIndex = state.users.findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        state.users[userIndex] = {
                            ...state.users[userIndex],
                            role_id: roleId,
                            roleId: roleId,
                        };
                    }
                }
            )
            .addMatcher(
                userApi.endpoints.assignRoleToUser.matchFulfilled,
                (state, { payload, meta }) => {
                    const { userId } = meta.arg.originalArgs;
                    const userIndex = state.users.findIndex(u => u.id === userId);
                    if (userIndex !== -1 && payload?.data) {
                        state.users[userIndex] = {
                            ...state.users[userIndex],
                            ...payload.data,
                        };
                    }
                }
            )

            /* ── Bulk Assign Role (Optimistic Update) ── */
            .addMatcher(
                userApi.endpoints.bulkAssignRole.matchPending,
                (state, { meta }) => {
                    const { userIds, roleId } = meta.arg.originalArgs;
                    state.users = state.users.map(user =>
                        userIds.includes(user.id)
                            ? { ...user, role_id: roleId, roleId: roleId }
                            : user
                    );
                }
            )

            /* ── Delete User (Optimistic Update) ── */
            .addMatcher(
                userApi.endpoints.deleteUser.matchPending,
                (state, { meta }) => {
                    const userId = meta.arg.originalArgs;
                    state.users = state.users.filter(u => u.id !== userId);
                    if (state.currentUser?.id === userId) {
                        state.currentUser = null;
                    }
                }
            )

            /* ── Bulk Delete Users (Optimistic Update) ── */
            .addMatcher(
                userApi.endpoints.bulkDeleteUsers.matchPending,
                (state, { meta }) => {
                    const { userIds } = meta.arg.originalArgs;
                    state.users = state.users.filter(u => !userIds.includes(u.id));
                    if (state.currentUser && userIds.includes(state.currentUser.id)) {
                        state.currentUser = null;
                    }
                }
            );
    },
});

export const {
    // RBAC actions
    setRoles,
    setPermissions,

    // User management actions
    setUsers,
    setCurrentUser,
    clearCurrentUser,
    setUserStats,

    // Pagination & Filters
    setPagination,
    setFilters,
    resetFilters,

    // Optimistic updates
    updateUserLocally,
    removeUserLocally,

    // Clear all
    clearUserData,
} = userSlice.actions;

export default userSlice.reducer;

/* ═══════════════════════════════════════════════════════
   SELECTORS
   ═══════════════════════════════════════════════════════ */

// RBAC Selectors
export const selectRoles = (state) => state.user.roles;
export const selectPermissions = (state) => state.user.permissions;
export const selectIsUserDataInitialized = (state) => state.user.initialized;

// User Management Selectors
export const selectUsers = (state) => state.user.users;
export const selectCurrentUser = (state) => state.user.currentUser;
export const selectUserStats = (state) => state.user.userStats;

// Pagination & Filters Selectors
export const selectPagination = (state) => state.user.pagination;
export const selectFilters = (state) => state.user.filters;

// Loading & Error Selectors
export const selectUserDataLoading = (state) => state.user.isLoading;
export const selectUserDataError = (state) => state.user.error;

/* ═══════════════════════════════════════════════════════
   LOOKUP HELPERS
   ═══════════════════════════════════════════════════════ */

// RBAC Lookup Helpers
export const selectRoleById = (roleId) => (state) =>
    state.user.roles.find((r) => r.id === roleId);

export const selectPermissionById = (permissionId) => (state) =>
    state.user.permissions.find((p) => p.id === permissionId);

// User Lookup Helpers
export const selectUserByIdFromList = (userId) => (state) =>
    state.user.users.find((u) => u.id === userId);

// Get role name by ID
export const selectRoleNameById = (roleId) => (state) => {
    const role = state.user.roles.find((r) => r.id === roleId);
    return role?.name || "Unknown";
};

// Get users by role
export const selectUsersByRole = (roleId) => (state) =>
    state.user.users.filter((u) => u.role_id === roleId || u.roleId === roleId);

// Get active users count
export const selectActiveUsersCount = (state) =>
    state.user.users.filter((u) => u.is_active || u.status === "active").length;

// Get users count by status
export const selectUsersByStatus = (status) => (state) =>
    state.user.users.filter((u) =>
        status === "active"
            ? u.is_active || u.status === "active"
            : u.status === status
    );