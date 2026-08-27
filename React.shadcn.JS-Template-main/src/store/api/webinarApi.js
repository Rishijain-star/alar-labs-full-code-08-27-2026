import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const webinarApi = createApi({
  reducerPath: "webinarApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Webinar", "WebinarRegistrations"],
  endpoints: (builder) => ({
    getPublicWebinars: builder.query({
      query: (params = {}) => ({
        url: "/webinars",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "Webinar", id: "PUBLIC_LIST" }],
      keepUnusedDataFor: 180,
    }),
    getWebinarBySlug: builder.query({
      query: (slug) => ({
        url: `/webinars/slug/${encodeURIComponent(slug)}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_r, _e, slug) => [{ type: "Webinar", id: `SLUG_${slug}` }],
      keepUnusedDataFor: 300,
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
    getOwnerWebinarById: builder.query({
      query: (id) => ({
        url: `/owner/webinars/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_r, _e, id) => [{ type: "Webinar", id }],
    }),
    getWebinarRegistrations: builder.query({
      query: ({ id, search }) => ({
        url: `/owner/webinars/${id}/registrations`,
        method: "GET",
        params: search ? { search } : undefined,
        meta: { withCredentials: true },
      }),
      providesTags: (_r, _e, { id }) => [{ type: "WebinarRegistrations", id }],
    }),
    createOwnerWebinar: builder.mutation({
      query: (body) => ({
        url: "/owner/webinars",
        method: "POST",
        data: body,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Webinar created",
        },
      }),
      invalidatesTags: [{ type: "Webinar", id: "OWNER_LIST" }, { type: "Webinar", id: "PUBLIC_LIST" }],
    }),
    updateOwnerWebinar: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/owner/webinars/${id}`,
        method: "PUT",
        data: body,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Webinar updated",
        },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Webinar", id },
        { type: "Webinar", id: "OWNER_LIST" },
        { type: "Webinar", id: "PUBLIC_LIST" },
        { type: "WebinarRegistrations", id },
      ],
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
      invalidatesTags: [{ type: "Webinar", id: "OWNER_LIST" }, { type: "Webinar", id: "PUBLIC_LIST" }],
    }),
    uploadWebinarImage: builder.mutation({
      query: (formData) => ({
        url: "/owner/webinars/upload-image",
        method: "POST",
        data: formData,
        meta: { withCredentials: true, isMultipart: true, showToast: true },
      }),
    }),
    getMyWebinars: builder.query({
      query: () => ({
        url: "/me/webinars",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "Webinar", id: "MY_LIST" }],
    }),
    registerWebinarFree: builder.mutation({
      query: (id) => ({
        url: `/me/webinars/${id}/register`,
        method: "POST",
        data: {},
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Registered successfully",
        },
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Webinar", id: `SLUG_${id}` },
        { type: "WebinarRegistrations", id },
        { type: "Webinar", id: "MY_LIST" },
      ],
    }),
  }),
});

export const {
  useGetPublicWebinarsQuery,
  useGetWebinarBySlugQuery,
  useGetOwnerWebinarsQuery,
  useGetOwnerWebinarByIdQuery,
  useGetWebinarRegistrationsQuery,
  useCreateOwnerWebinarMutation,
  useUpdateOwnerWebinarMutation,
  useDeleteOwnerWebinarMutation,
  useUploadWebinarImageMutation,
  useGetMyWebinarsQuery,
  useRegisterWebinarFreeMutation,
} = webinarApi;
