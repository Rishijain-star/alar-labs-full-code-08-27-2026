import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const siteContentApi = createApi({
  reducerPath: "siteContentApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["SiteBranding", "SiteBanners", "TrainingPrograms", "OwnerTrainingPrograms"],
  endpoints: (builder) => ({
    getPublicBranding: builder.query({
      query: () => ({
        url: "/site/branding",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "SiteBranding", id: "PUBLIC" }],
    }),
    getPublicBanners: builder.query({
      query: () => ({
        url: "/site/banners",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "SiteBanners", id: "PUBLIC" }],
    }),
    getPublicTrainingPrograms: builder.query({
      query: (params = {}) => ({
        url: "/training-programs",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "TrainingPrograms", id: "LIST" }],
    }),
    getOwnerBranding: builder.query({
      query: () => ({
        url: "/owner/site/branding",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "SiteBranding", id: "OWNER" }],
    }),
    updateOwnerBranding: builder.mutation({
      query: (data) => ({
        url: "/owner/site/branding",
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Saved" },
      }),
      invalidatesTags: [
        { type: "SiteBranding", id: "OWNER" },
        { type: "SiteBranding", id: "PUBLIC" },
      ],
    }),
    uploadSiteAsset: builder.mutation({
      query: (formData) => ({
        url: "/owner/site/upload",
        method: "POST",
        data: formData,
        meta: { withCredentials: true, isMultipart: true },
      }),
    }),
    getOwnerBanners: builder.query({
      query: (params) => ({
        url: "/owner/site/banners",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "SiteBanners", id: "OWNER" }],
    }),
    createOwnerBanner: builder.mutation({
      query: (data) => ({
        url: "/owner/site/banners",
        method: "POST",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Banner created" },
      }),
      invalidatesTags: [
        { type: "SiteBanners", id: "OWNER" },
        { type: "SiteBanners", id: "PUBLIC" },
      ],
    }),
    updateOwnerBanner: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/owner/site/banners/${id}`,
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Banner updated" },
      }),
      invalidatesTags: [
        { type: "SiteBanners", id: "OWNER" },
        { type: "SiteBanners", id: "PUBLIC" },
      ],
    }),
    deleteOwnerBanner: builder.mutation({
      query: (id) => ({
        url: `/owner/site/banners/${id}`,
        method: "DELETE",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Banner removed" },
      }),
      invalidatesTags: [
        { type: "SiteBanners", id: "OWNER" },
        { type: "SiteBanners", id: "PUBLIC" },
      ],
    }),
    getOwnerTrainingPrograms: builder.query({
      query: (params) => ({
        url: "/owner/training-programs",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "OwnerTrainingPrograms", id: "LIST" }],
    }),
    getOwnerTrainingProgram: builder.query({
      query: (id) => ({
        url: `/owner/training-programs/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (result, error, id) => [{ type: "OwnerTrainingPrograms", id }],
    }),
    createOwnerTrainingProgram: builder.mutation({
      query: (data) => ({
        url: "/owner/training-programs",
        method: "POST",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Program created" },
      }),
      invalidatesTags: [{ type: "OwnerTrainingPrograms", id: "LIST" }],
    }),
    updateOwnerTrainingProgram: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/owner/training-programs/${id}`,
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Program updated" },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "OwnerTrainingPrograms", id: "LIST" },
        { type: "OwnerTrainingPrograms", id: arg.id },
      ],
    }),
    deleteOwnerTrainingProgram: builder.mutation({
      query: (id) => ({
        url: `/owner/training-programs/${id}`,
        method: "DELETE",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Program deleted" },
      }),
      invalidatesTags: [{ type: "OwnerTrainingPrograms", id: "LIST" }],
    }),
    uploadTrainingProgramBanner: builder.mutation({
      query: (formData) => ({
        url: "/owner/training-programs/upload-banner",
        method: "POST",
        data: formData,
        meta: { withCredentials: true, isMultipart: true },
      }),
    }),
  }),
});

export const {
  useGetPublicBrandingQuery,
  useGetPublicBannersQuery,
  useGetPublicTrainingProgramsQuery,
  useGetOwnerBrandingQuery,
  useUpdateOwnerBrandingMutation,
  useUploadSiteAssetMutation,
  useGetOwnerBannersQuery,
  useCreateOwnerBannerMutation,
  useUpdateOwnerBannerMutation,
  useDeleteOwnerBannerMutation,
  useGetOwnerTrainingProgramsQuery,
  useGetOwnerTrainingProgramQuery,
  useCreateOwnerTrainingProgramMutation,
  useUpdateOwnerTrainingProgramMutation,
  useDeleteOwnerTrainingProgramMutation,
  useUploadTrainingProgramBannerMutation,
} = siteContentApi;
