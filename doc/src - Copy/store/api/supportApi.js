import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const supportApi = createApi({
  reducerPath: "supportApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Support"],
  endpoints: (builder) => ({
    submitSupport: builder.mutation({
      query: (data) => ({
        url: "/support",
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Support"],
    }),
    getMySupportTickets: builder.query({
      query: (params = {}) => ({
        url: "/me/support",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: ["Support"],
    }),
    getAdminSupportTickets: builder.query({
      query: (params = {}) => ({
        url: "/owner/support",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: ["Support"],
    }),
    replySupportTicket: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/owner/support/${id}/reply`,
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Support"],
    }),
    getSupportChat: builder.query({
      query: (id) => ({
        url: `/me/support/${id}/chat`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (result, error, id) => [{ type: "Support", id: `CHAT_${id}` }],
    }),
    postSupportChat: builder.mutation({
      query: ({ id, message }) => ({
        url: `/me/support/${id}/chat`,
        method: "POST",
        data: { message },
        meta: { withCredentials: true },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Support", id: `CHAT_${id}` }, "Support"],
    }),
    getAdminSupportChat: builder.query({
      query: (id) => ({
        url: `/owner/support/${id}/chat`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (result, error, id) => [{ type: "Support", id: `ADMIN_CHAT_${id}` }],
    }),
    postAdminSupportChat: builder.mutation({
      query: ({ id, message }) => ({
        url: `/owner/support/${id}/chat`,
        method: "POST",
        data: { message },
        meta: { withCredentials: true },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Support", id: `ADMIN_CHAT_${id}` }, "Support"],
    }),
  }),
});

export const {
  useSubmitSupportMutation,
  useGetMySupportTicketsQuery,
  useGetAdminSupportTicketsQuery,
  useReplySupportTicketMutation,
  useGetSupportChatQuery,
  usePostSupportChatMutation,
  useGetAdminSupportChatQuery,
  usePostAdminSupportChatMutation,
} = supportApi;
