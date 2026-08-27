// src/store/api/roleAndPermissionApi.js (WITH CACHING OPTIMIZATIONS)
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";
import {
    savePermissionsToCache,
    saveRolesToCache,
    saveUserPermissionsToCache,
    saveUserRolesToCache,
} from "@/utils/permissions";

/**
 * Role and Permission API handles RBAC-related endpoints
 * and automatically saves data to localStorage
 * 
 * ✅ OPTIMIZED WITH CACHING:
 * - keepUnusedDataFor: 300 seconds (5 minutes) for user data
 * - keepUnusedDataFor: 600 seconds (10 minutes) for system data
 * - Prevents duplicate API calls via proper cache configuration
 */

export const roleAndPermissionApi = createApi({
    reducerPath: "roleAndPermissionApi",
    baseQuery: axiosBaseQuery({
        showToast: false // ✅ Changed to false for permission queries (they're silent)
    }),
    tagTypes: ["Roles", "Permissions", "UserPermissions", "UserRoles"],

    // ✅ Global cache setting - keep data for 5 minutes
    keepUnusedDataFor: 300, // 5 minutes

    endpoints: (builder) => ({

        /* ═══════════════════════════════════════════════════════
           USER PERMISSIONS & ROLES ENDPOINTS
           ═══════════════════════════════════════════════════════ */

        // GET: Current User's Permissions
        getUserPermissions: builder.query({
            query: () => ({
                url: "/owner/me/permissions",
                method: "GET",
                meta: {
                    withCredentials: true,
                    showToast: false, // ✅ Silent fetch
                },
            }),
            providesTags: ["UserPermissions"],

            // ✅ Cache for 5 minutes - prevents duplicate calls
            keepUnusedDataFor: 300,

            onQueryStarted: async (arg, { queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    const payload = data?.data ?? data;
                    const permissions = payload?.permissions ?? data?.permissions ?? [];
                    console.log('✅ User permissions fetched from API:', permissions.length);
                    saveUserPermissionsToCache(permissions);
                } catch (error) {
                    console.error('❌ Failed to fetch user permissions:', error);
                }
            },
        }),

        // GET: Current User's Role
        getUserRoles: builder.query({
            query: () => ({
                url: "/owner/me/role",
                method: "GET",
                meta: {
                    withCredentials: true,
                    showToast: false, // ✅ Silent fetch
                },
            }),
            providesTags: ["UserRoles"],

            // ✅ Cache for 5 minutes
            keepUnusedDataFor: 300,

            onQueryStarted: async (arg, { queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    const payload = data?.data ?? data;
                    const roles =
                        payload?.roles ||
                        (payload?.role ? [payload.role] : []) ||
                        [];
                    console.log('✅ User roles fetched from API:', roles);
                    saveUserRolesToCache(roles);
                } catch (error) {
                    console.error('❌ Failed to fetch user roles:', error);
                }
            },
        }),

        /* ═══════════════════════════════════════════════════════
           ROLE MANAGEMENT ENDPOINTS
           ═══════════════════════════════════════════════════════ */

        // GET: All Roles (with pagination and filters)
        getAllRoles: builder.query({
            query: ({
                page = 1,
                limit = 12,
                search = "",
                sortBy = "name",
                sortOrder = "asc"
            } = {}) => ({
                url: "/rbac/roles",
                method: "GET",
                params: {
                    page,
                    limit,
                    search,
                    sortBy,
                    sortOrder
                },
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: ["Roles"],

            // ✅ Cache for 10 minutes (system data changes less frequently)
            keepUnusedDataFor: 600,

            onQueryStarted: async (arg, { queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    saveRolesToCache(data.roles || data.data || data || []);
                } catch (error) {
                    console.error('Failed to fetch roles:', error);
                }
            },
        }),

        // GET: Single Role by ID
        getRoleById: builder.query({
            query: (roleId) => ({
                url: `/rbac/roles/${roleId}`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, roleId) => [{
                type: "Roles",
                id: roleId
            }],
            keepUnusedDataFor: 600,
        }),

        // GET: Role Permissions
        getRolePermissions: builder.query({
            query: (roleId) => ({
                url: `/rbac/roles/${roleId}/permissions`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, roleId) => [{
                type: "Roles",
                id: `${roleId}-permissions`
            }],
            keepUnusedDataFor: 600,
        }),

        // GET: Role Users
        getRoleUsers: builder.query({
            query: (roleId) => ({
                url: `/rbac/roles/${roleId}/users`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, roleId) => [{
                type: "Roles",
                id: `${roleId}-users`
            }],
            keepUnusedDataFor: 600,
        }),

        // POST: Create New Role
        createRole: builder.mutation({
            query: (data) => ({
                url: "/rbac/roles",
                method: "POST",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Role created successfully",
                },
            }),
            invalidatesTags: ["Roles", "UserPermissions", "UserRoles"],
        }),

        // POST: Assign Permissions to Role
        assignPermissionsToRole: builder.mutation({
            query: ({
                roleId,
                permissionIds
            }) => ({
                url: `/rbac/roles/${roleId}/permissions`,
                method: "POST",
                data: {
                    permission_ids: permissionIds,
                },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Permissions assigned successfully",
                },
            }),
            invalidatesTags: (result, error, { roleId }) => [
                { type: "Roles", id: roleId },
                { type: "Roles", id: `${roleId}-permissions` },
                "Roles",
                "UserPermissions",
                "UserRoles",
            ],
        }),

        // POST: Duplicate Role
        duplicateRole: builder.mutation({
            query: (roleId) => ({
                url: `/rbac/roles/${roleId}/duplicate`,
                method: "POST",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Role duplicated successfully",
                },
            }),
            invalidatesTags: ["Roles"],
        }),

        // PUT: Update Role
        updateRole: builder.mutation({
            query: ({ roleId, data }) => ({
                url: `/rbac/roles/${roleId}`,
                method: "PUT",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Role updated successfully",
                },
            }),
            invalidatesTags: (result, error, { roleId }) => [
                { type: "Roles", id: roleId },
                "Roles",
                "UserPermissions",
                "UserRoles",
            ],
        }),

        // DELETE: Delete Role
        deleteRole: builder.mutation({
            query: (roleId) => ({
                url: `/rbac/roles/${roleId}`,
                method: "DELETE",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Role deleted successfully",
                },
            }),
            invalidatesTags: ["Roles", "UserRoles"],
        }),

        // DELETE: Remove Permission from Role
        removePermissionFromRole: builder.mutation({
            query: ({ roleId, permissionId }) => ({
                url: `/rbac/roles/${roleId}/permissions/${permissionId}`,
                method: "DELETE",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Permission removed successfully",
                },
            }),
            invalidatesTags: (result, error, { roleId }) => [
                { type: "Roles", id: roleId },
                { type: "Roles", id: `${roleId}-permissions` },
                "Roles",
                "UserPermissions",
                "UserRoles",
            ],
        }),

        /* ═══════════════════════════════════════════════════════
           PERMISSION MANAGEMENT ENDPOINTS
           ═══════════════════════════════════════════════════════ */

        // GET: All Permissions (with pagination and filters)
        getAllPermissions: builder.query({
            query: ({
                page,
                limit,
                search,
                groupId
            } = {}) => ({
                url: "/rbac/permissions",
                method: "GET",
                params: {
                    page,
                    limit,
                    search,
                    groupId
                },
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: ["Permissions"],

            // ✅ Cache for 10 minutes
            keepUnusedDataFor: 600,

            onQueryStarted: async (arg, { queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    savePermissionsToCache(data.permissions || data.data || data || []);
                } catch (error) {
                    console.error('Failed to fetch permissions:', error);
                }
            },
        }),

        // GET: Permissions by Group
        getPermissionsByGroup: builder.query({
            query: (groupId) => ({
                url: `/rbac/permissions/group/${groupId}`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, groupId) => [{
                type: "Permissions",
                id: `group-${groupId}`
            }],
            keepUnusedDataFor: 600,
        }),

        // GET: Permission by ID
        getPermissionById: builder.query({
            query: (permissionId) => ({
                url: `/rbac/permissions/${permissionId}`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, permissionId) => [{
                type: "Permissions",
                id: permissionId
            }],
            keepUnusedDataFor: 600,
        }),

        // GET: Roles that have this permission
        getRolesByPermission: builder.query({
            query: (permissionId) => ({
                url: `/rbac/permissions/${permissionId}/roles`,
                method: "GET",
                meta: {
                    withCredentials: true
                },
            }),
            providesTags: (result, error, permissionId) => [{
                type: "Permissions",
                id: `${permissionId}-roles`
            }],
            keepUnusedDataFor: 600,
        }),

        // POST: Create New Permission
        createPermission: builder.mutation({
            query: (data) => ({
                url: "/rbac/permissions",
                method: "POST",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Permission created successfully",
                },
            }),
            invalidatesTags: ["Permissions"],
        }),

        // PUT: Update Permission
        updatePermission: builder.mutation({
            query: ({ permissionId, data }) => ({
                url: `/rbac/permissions/${permissionId}`,
                method: "PUT",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Permission updated successfully",
                },
            }),
            invalidatesTags: (result, error, { permissionId }) => [
                { type: "Permissions", id: permissionId },
                "Permissions",
            ],
        }),

        // DELETE: Delete Permission
        deletePermission: builder.mutation({
            query: (permissionId) => ({
                url: `/rbac/permissions/${permissionId}`,
                method: "DELETE",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Permission deleted successfully",
                },
            }),
            invalidatesTags: ["Permissions", "Roles", "UserPermissions"],
        }),

    }),
});

export const {
    // User Permissions & Roles
    useGetUserPermissionsQuery,
    useGetUserRolesQuery,
    useLazyGetUserPermissionsQuery,
    useLazyGetUserRolesQuery,

    // Role Management
    useGetAllRolesQuery,
    useGetRoleByIdQuery,
    useGetRolePermissionsQuery,
    useGetRoleUsersQuery,
    useCreateRoleMutation,
    useAssignPermissionsToRoleMutation,
    useDuplicateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useRemovePermissionFromRoleMutation,

    // Permission Management
    useGetAllPermissionsQuery,
    useGetPermissionsByGroupQuery,
    useGetPermissionByIdQuery,
    useGetRolesByPermissionQuery,
    useCreatePermissionMutation,
    useUpdatePermissionMutation,
    useDeletePermissionMutation,
} = roleAndPermissionApi;