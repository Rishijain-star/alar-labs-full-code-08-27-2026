import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const siteContentApi = createApi({
  reducerPath: "siteContentApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["SiteBranding", "SiteBanners", "TrainingPrograms", "OwnerTrainingPrograms", "ProgramEnrollments", "PlatformSettings", "MyTrainingPrograms", "Learning"],
  endpoints: (builder) => ({
    getPublicPlatformSettings: builder.query({
      query: () => ({
        url: "/site/platform-settings",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "PlatformSettings", id: "PUBLIC" }],
      keepUnusedDataFor: 600,
    }),
    getPublicBranding: builder.query({
      query: () => ({
        url: "/site/branding",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "SiteBranding", id: "PUBLIC" }],
      keepUnusedDataFor: 600,
    }),
    getPublicBanners: builder.query({
      query: () => ({
        url: "/site/banners",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "SiteBanners", id: "PUBLIC" }],
      keepUnusedDataFor: 300,
    }),
    getPublicTrainingPrograms: builder.query({
      query: (params = {}) => ({
        url: "/training-programs",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "TrainingPrograms", id: "LIST" }],
      keepUnusedDataFor: 180,
    }),
    getTrainingProgramBySlug: builder.query({
      query: (slug) => ({
        url: `/training-programs/slug/${encodeURIComponent(slug)}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_r, _e, slug) => [{ type: "TrainingPrograms", id: `SLUG_${slug}` }],
      keepUnusedDataFor: 300,
    }),
    getMyTrainingPrograms: builder.query({
      query: () => ({
        url: "/me/training-programs",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "MyTrainingPrograms", id: "LIST" }],
      keepUnusedDataFor: 180,
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
    getTrainingProgramEnrollments: builder.query({
      query: ({ id, search }) => ({
        url: `/owner/training-programs/${id}/enrollments`,
        method: "GET",
        params: search ? { search } : undefined,
        meta: { withCredentials: true },
      }),
      providesTags: (_r, _e, { id }) => [{ type: "ProgramEnrollments", id }],
    }),
    createOwnerTrainingProgram: builder.mutation({
      query: (data) => ({
        url: "/owner/training-programs",
        method: "POST",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Program created" },
      }),
      invalidatesTags: [
        { type: "OwnerTrainingPrograms", id: "LIST" },
        { type: "TrainingPrograms", id: "LIST" },
      ],
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
      invalidatesTags: [
        { type: "OwnerTrainingPrograms", id: "LIST" },
        { type: "TrainingPrograms", id: "LIST" },
      ],
    }),
    uploadTrainingProgramBanner: builder.mutation({
      query: (formData) => ({
        url: "/owner/training-programs/upload-banner",
        method: "POST",
        data: formData,
        meta: { withCredentials: true, isMultipart: true },
      }),
    }),
    enrollTrainingProgramFree: builder.mutation({
      query: (id) => ({
        url: `/me/training-programs/${id}/enroll`,
        method: "POST",
        data: {},
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Enrolled successfully",
        },
      }),
      invalidatesTags: [
        { type: "TrainingPrograms" },
        { type: "ProgramEnrollments" },
        { type: "MyTrainingPrograms", id: "LIST" },
        "Learning",
      ],
    }),
  }),
});

export const {
  useGetPublicPlatformSettingsQuery,
  useGetPublicBrandingQuery,
  useGetPublicBannersQuery,
  useGetPublicTrainingProgramsQuery,
  useGetTrainingProgramBySlugQuery,
  useGetMyTrainingProgramsQuery,
  useGetOwnerBrandingQuery,
  useUpdateOwnerBrandingMutation,
  useUploadSiteAssetMutation,
  useGetOwnerBannersQuery,
  useCreateOwnerBannerMutation,
  useUpdateOwnerBannerMutation,
  useDeleteOwnerBannerMutation,
  useGetOwnerTrainingProgramsQuery,
  useGetOwnerTrainingProgramQuery,
  useGetTrainingProgramEnrollmentsQuery,
  useCreateOwnerTrainingProgramMutation,
  useUpdateOwnerTrainingProgramMutation,
  useDeleteOwnerTrainingProgramMutation,
  useUploadTrainingProgramBannerMutation,
  useEnrollTrainingProgramFreeMutation,
} = siteContentApi;
