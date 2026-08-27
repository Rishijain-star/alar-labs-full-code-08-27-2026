import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const webinarApi = createApi({
  reducerPath: "webinarApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Webinar"],
  endpoints: (builder) => ({
    getPublicWebinars: builder.query({
      query: (params = {}) => ({
        url: "/webinars",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "Webinar", id: "PUBLIC_LIST" }],
    }),
    getOwnerWebinars: builder.query({
      query: (params = {}) => ({
        url: "/owner/webinars",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "Webinar", id: "OWNER_LIST" }],
    }),
    deleteOwnerWebinar: builder.mutation({
      query: (id) => ({
        url: `/owner/webinars/${id}`,
        method: "DELETE",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Webinar deleted successfully",
        },
      }),
      invalidatesTags: [{ type: "Webinar", id: "OWNER_LIST" }],
    }),
  }),
});

export const { useGetPublicWebinarsQuery, useGetOwnerWebinarsQuery, useDeleteOwnerWebinarMutation } = webinarApi;
