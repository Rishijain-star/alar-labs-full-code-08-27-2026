// src/store/slices/roleAndPermissionSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { roleAndPermissionApi } from "../api/roleAndPermissionApi";

/**
 * Role and Permission slice manages RBAC data:
 * - roles: All available roles in the system
 * - permissions: All available permissions
 * - permissionGroups: Grouped permissions for UI organization
 * 
 * This data is fetched from API and cached in Redux.
 */

const initialState = {
    roles: [],
    permissions: [],
    permissionGroups: [],
    userRoutes: [],
    isLoading: false,
    error: null,
    initialized: false,
};

const roleAndPermissionSlice = createSlice({
    name: "roleAndPermission",
    initialState,

    reducers: {
        // Manual setters for fallback/local updates
        setRoles: (state, { payload }) => {
            state.roles = payload;
            state.initialized = true;
        },
        setPermissions: (state, { payload }) => {
            state.permissions = payload;
        },
        setPermissionGroups: (state, { payload }) => {
            state.permissionGroups = payload;
        },


        // Reset RBAC data (e.g., on logout)
        clearRBACData: (state) => {
            state.roles = [];
            state.permissions = [];
            state.permissionGroups = [];

            state.initialized = false;
            state.error = null;
        },
    },

    extraReducers: (builder) => {
        builder
            /* ═══════════════════════════════════════════════════════
               ROLES API MATCHERS
               ═══════════════════════════════════════════════════════ */

            // Get All Roles
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllRoles.matchFulfilled,
                (state, { payload }) => {
                    state.roles = payload.data || [];
                    state.initialized = true;
                    state.isLoading = false;
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

            /* ═══════════════════════════════════════════════════════
               PERMISSIONS API MATCHERS
               ═══════════════════════════════════════════════════════ */

            // Get All Permissions
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissions.matchFulfilled,
                (state, { payload }) => {
                    state.permissions = payload.data || [];
                    state.isLoading = false;
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
               PERMISSION GROUPS API MATCHERS
               ═══════════════════════════════════════════════════════ */

            // Get All Permission Groups
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissionGroups.matchFulfilled,
                (state, { payload }) => {
                    state.permissionGroups = payload.data || [];
                    state.isLoading = false;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissionGroups.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                roleAndPermissionApi.endpoints.getAllPermissionGroups.matchRejected,
                (state, { payload, error }) => {
                    state.isLoading = false;
                    state.error = payload?.message || error?.message || "Failed to load permission groups";
                }
            )


    },
});

export const {
    setRoles,
    setPermissions,
    setPermissionGroups,

    clearRBACData,
} = roleAndPermissionSlice.actions;

export default roleAndPermissionSlice.reducer;

/* ═══════════════════════════════════════════════════════
   SELECTORS
   ═══════════════════════════════════════════════════════ */

// Basic Selectors
export const selectRoles = (state) => state.roleAndPermission.roles;
export const selectPermissions = (state) => state.roleAndPermission.permissions;
export const selectIsRBACDataInitialized = (state) => state.roleAndPermission.initialized;
export const selectRBACDataLoading = (state) => state.roleAndPermission.isLoading;
export const selectRBACDataError = (state) => state.roleAndPermission.error;

// Lookup Helpers
export const selectRoleById = (roleId) => (state) =>
    state.roleAndPermission.roles.find((r) => r.id === roleId);

export const selectPermissionById = (permissionId) => (state) =>
    state.roleAndPermission.permissions.find((p) => p.id === permissionId);

export const selectPermissionGroupById = (groupId) => (state) =>
    state.roleAndPermission.permissionGroups.find((g) => g.id === groupId);