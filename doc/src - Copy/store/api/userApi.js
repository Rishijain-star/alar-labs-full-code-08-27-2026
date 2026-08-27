// src/store/api/userApi.js
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

/**
 * User API handles user-specific endpoints:
 * - User Profile
 * - User Management (CRUD)
 * - Role Assignment
 * - MFA/2FA Management
 * 
 * Cache Time: 10 minutes (600 seconds)
 */

export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: axiosBaseQuery({ showToast: true }),
    tagTypes: ["User", "Users", "MFAStatus"],

    // Global cache settings
    keepUnusedDataFor: 600, // 10 minutes in seconds

    endpoints: (builder) => ({
        /* ═══════════════════════════════════════════════════════
           USER PROFILE
           ═══════════════════════════════════════════════════════ */

        // GET: Current User Profile
        getCurrentUser: builder.query({
            query: () => ({
                url: "/owner/me",
                method: "GET",
                meta: { withCredentials: true },
            }),
            providesTags: ["User"],
            keepUnusedDataFor: 600, // 10 minutes
        }),

        // PUT: Update Current User Profile
        updateCurrentUser: builder.mutation({
            query: (data) => ({
                url: "/owner/me",
                method: "PUT",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Profile updated successfully",
                },
            }),
            invalidatesTags: ["User"],
        }),

        /* ═══════════════════════════════════════════════════════
           USER MANAGEMENT (CRUD)
           ═══════════════════════════════════════════════════════ */

        // GET: All Users (with pagination)
        getAllUsers: builder.query({
            query: ({
                page = 1,
                limit = 10,
                search = "",
                roleId = "",
                status = ""
            } = {}) => ({
                url: "/owner/users",
                method: "GET",
                params: { page, limit, search, role_id: roleId, status },
                meta: { withCredentials: true },
            }),
            providesTags: (result) => [
                ...(result?.data ?? result ?? []).map?.((user) => ({
                    type: "Users",
                    id: user.user_id,
                })) ?? [],
                { type: "Users", id: "LIST" },
            ],
            keepUnusedDataFor: 600, // 10 minutes
        }),

        // GET: User by ID
        getUserById: builder.query({
            query: (userId) => ({
                url: `/users/${userId}`,
                method: "GET",
                meta: { withCredentials: true },
            }),
            providesTags: (result, error, userId) => [{ type: "Users", id: userId }],
            keepUnusedDataFor: 600, // 10 minutes
        }),

        // POST: Create User
        createUser: builder.mutation({
            query: (data) => ({
                url: "/users",
                method: "POST",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User created successfully",
                },
            }),
            invalidatesTags: [{ type: "Users", id: "LIST" }],
        }),

        // PUT: Update User
        updateUser: builder.mutation({
            query: ({ userId, data }) => ({
                url: `/owner/users/${userId}`,
                method: "PUT",
                data,
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User updated successfully",
                },
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // DELETE: Delete User
        deleteUser: builder.mutation({
            query: (userId) => ({
                url: `/users/${userId}`,
                method: "DELETE",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User deleted successfully",
                },
            }),
            invalidatesTags: (result, error, userId) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // DELETE: Bulk Delete Users
        bulkDeleteUsers: builder.mutation({
            query: ({ userIds }) => ({
                url: "/users/bulk-delete",
                method: "DELETE",
                data: { userIds },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: `${userIds.length} user(s) deleted successfully`,
                },
            }),
            invalidatesTags: (result, error, { userIds }) => [
                ...userIds.map((id) => ({ type: "Users", id })),
                { type: "Users", id: "LIST" },
            ],
        }),

        /* ═══════════════════════════════════════════════════════
           ROLE ASSIGNMENT
           ═══════════════════════════════════════════════════════ */

        // POST: Assign Role to User
        assignRoleToUser: builder.mutation({
            query: ({ userId, roleId }) => ({
                url: `/owner/users/${userId}/role`,
                method: "PUT",
                data: { role_id: roleId, roleId },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Role assigned successfully",
                },
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // POST: Bulk Assign Role to Users
        bulkAssignRole: builder.mutation({
            query: ({ userIds, roleId }) => ({
                url: "/users/bulk-assign-role",
                method: "POST",
                data: { userIds, roleId },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: `Role assigned to ${userIds.length} user(s) successfully`,
                },
            }),
            invalidatesTags: (result, error, { userIds }) => [
                ...userIds.map((id) => ({ type: "Users", id })),
                { type: "Users", id: "LIST" },
            ],
        }),

        /* ═══════════════════════════════════════════════════════
           USER STATUS MANAGEMENT
           ═══════════════════════════════════════════════════════ */

        // PUT: Update User Status
        updateUserStatus: builder.mutation({
            query: ({ userId, status }) => ({
                url: `/users/${userId}/status`,
                method: "PUT",
                data: { status },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User status updated successfully",
                },
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // PUT: Activate User
        activateUser: builder.mutation({
            query: (userId) => ({
                url: `/users/${userId}/activate`,
                method: "PUT",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User activated successfully",
                },
            }),
            invalidatesTags: (result, error, userId) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // PUT: Deactivate User
        deactivateUser: builder.mutation({
            query: (userId) => ({
                url: `/users/${userId}/deactivate`,
                method: "PUT",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User deactivated successfully",
                },
            }),
            invalidatesTags: (result, error, userId) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        // PUT: Suspend User
        suspendUser: builder.mutation({
            query: ({ userId, reason }) => ({
                url: `/users/${userId}/suspend`,
                method: "PUT",
                data: { reason },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "User suspended successfully",
                },
            }),
            invalidatesTags: (result, error, { userId }) => [
                { type: "Users", id: userId },
                { type: "Users", id: "LIST" },
            ],
        }),

        /* ═══════════════════════════════════════════════════════
           MFA/2FA MANAGEMENT
           ═══════════════════════════════════════════════════════ */

        // GET: Check MFA Status
        getMFAStatus: builder.query({
            query: () => ({
                url: "/owner/mfa/status",
                method: "GET",
                meta: { withCredentials: true },
            }),
            providesTags: ["MFAStatus"],
            transformResponse: (response) => ({
                enabled: response.data?.enabled || false,
                hasBackupCodes: response.data?.hasBackupCodes || false,
            }),
            keepUnusedDataFor: 300, // 5 minutes for security-sensitive data
        }),

        // POST: Start MFA Enable Process (Get QR Code)
        startMFAEnable: builder.mutation({
            query: () => ({
                url: "/owner/mfa/enable/start",
                method: "POST",
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Scan the QR code with your authenticator app",
                },
            }),
            transformResponse: (response) => response.data,
        }),

        // POST: Complete MFA Enable (Verify Code)
        completeMFAEnable: builder.mutation({
            query: (code) => ({
                url: "/owner/mfa/enable/complete",
                method: "POST",
                data: { code },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "2FA enabled successfully!",
                },
            }),
            invalidatesTags: ["MFAStatus", "User"],
        }),

        // POST: Disable MFA
        disableMFA: builder.mutation({
            query: (password) => ({
                url: "/owner/mfa/disable",
                method: "POST",
                data: { password },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "2FA disabled successfully",
                },
            }),
            invalidatesTags: ["MFAStatus", "User"],
        }),

        /* ═══════════════════════════════════════════════════════
           USER ANALYTICS & STATS
           ═══════════════════════════════════════════════════════ */

        // GET: User Stats
        getUserStats: builder.query({
            query: () => ({
                url: "/users/stats",
                method: "GET",
                meta: { withCredentials: true },
            }),
            providesTags: ["Users"],
            keepUnusedDataFor: 300, // 5 minutes for stats
        }),

        // GET: User Activity
        getUserActivity: builder.query({
            query: ({ userId, limit = 10 }) => ({
                url: `/users/${userId}/activity`,
                method: "GET",
                params: { limit },
                meta: { withCredentials: true },
            }),
            providesTags: (result, error, { userId }) => [
                { type: "Users", id: `${userId}-activity` },
            ],
            keepUnusedDataFor: 300, // 5 minutes for activity data
        }),

    }),
});

export const {
    // User Profile
    useGetCurrentUserQuery,
    useUpdateCurrentUserMutation,

    // User Management
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useBulkDeleteUsersMutation,

    // Role Assignment
    useAssignRoleToUserMutation,
    useBulkAssignRoleMutation,

    // User Status
    useUpdateUserStatusMutation,
    useActivateUserMutation,
    useDeactivateUserMutation,
    useSuspendUserMutation,

    // MFA/2FA Management
    useGetMFAStatusQuery,
    useStartMFAEnableMutation,
    useCompleteMFAEnableMutation,
    useDisableMFAMutation,

    // Analytics & Stats
    useGetUserStatsQuery,
    useGetUserActivityQuery,

    // Lazy queries (for manual triggering)
    useLazyGetAllUsersQuery,
    useLazyGetUserByIdQuery,
    useLazyGetUserStatsQuery,
} = userApi;
