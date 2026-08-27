import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    getMyNotifications: builder.query({
      query: (params = {}) => ({
        url: "/notifications/me",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: ["Notification"],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Notification"],
    }),
    registerDeviceToken: builder.mutation({
      query: (data) => ({
        url: "/notifications/device-token",
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
    }),
  }),
});

export const {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useRegisterDeviceTokenMutation,
} = notificationApi;
