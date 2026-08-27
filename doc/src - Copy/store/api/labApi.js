// src/store/api/labApi.js
// ─────────────────────────────────────────────────────────────────────────────
// RTK Query API for Guided Lab CRUD + publish.
// File uploads handled via uploadWithProgress.js for progress tracking.
// ─────────────────────────────────────────────────────────────────────────────
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";
import { createSkillBuilderLabFull } from "@/lib/uploadWithProgress";

export const labApi = createApi({
  reducerPath: "labApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Lab"],

  endpoints: (builder) => ({
    // ── List labs (admin / owner — same pattern as GET /owner/courses) ───────
    getLabs: builder.query({
      query: (params = {}) => ({
        url: "/owner/labs",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: ["Lab"],
    }),

    setLabContentApproval: builder.mutation({
      query: ({ id, status }) => ({
        url: `/owner/labs/${id}/content-approval`,
        method: "PATCH",
        data: { status },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: status === "approved" ? "Lab approved" : "Lab rejected",
        },
      }),
      invalidatesTags: ["Lab"],
    }),

    // ── Public labs (no credentials) ────────────────────────────────────────
    getPublicLabs: builder.query({
      query: (params = {}) => ({
        url: "/labs",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: ["Lab"],
      // Keep the labs list in cache for 5 minutes so navigating:
      // detail -> back -> Explore Labs
      // shows cached results immediately (no repeated API calls),
      // and only refetches after the cache expires.
      keepUnusedDataFor: 300,
      refetchOnMountOrArgChange: false,
    }),
    // ── Public lab by slug ───────────────────────────────────────────────────
    getPublicLabBySlug: builder.query({
      query: (slug) => ({
        url: `/labs/slug/${slug}`,
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: (_, __, slug) => [{ type: "Lab", id: slug }],
    }),

    /** Public lab by URL slug only (canonical catalog links). */
    getPublicLab: builder.query({
      query: (slug) => ({
        url: `/labs/slug/${encodeURIComponent(String(slug || "").trim())}`,
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: (_, __, slug) => [{ type: "Lab", id: slug }],
    }),

    // ── Get single lab ───────────────────────────────────────────────────────
    getLabById: builder.query({
      query: (id) => ({
        url: `/labs/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, id) => [{ type: "Lab", id }],
    }),

    /** Owner/admin lab detail — includes pending content-approval rows (public GET /labs/:id hides them). */
    getOwnerLabById: builder.query({
      query: (id) => ({
        url: `/owner/labs/${id}`,
        method: "GET",
        meta: { withCredentials: true, showToast: false },
      }),
      providesTags: (_, __, id) => [{ type: "Lab", id }],
    }),

    // ── Create lab (JSON metadata — files uploaded separately) ───────────────
    createLab: builder.mutation({
      query: (data) => ({
        url: "/labs",
        method: "POST",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Lab created successfully",
        },
      }),
      invalidatesTags: ["Lab"],
    }),

    // ── Update / save draft ──────────────────────────────────────────────────
    updateLab: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/labs/${id}`,
        method: "PUT",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Lab saved",
        },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Lab", id }, "Lab"],
    }),

    // ── Publish ──────────────────────────────────────────────────────────────
    publishLab: builder.mutation({
      query: ({ id }) => ({
        url: `/labs/${id}/publish`,
        method: "POST",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Lab published 🚀",
        },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Lab", id }, "Lab"],
    }),

    // ── Unpublish ────────────────────────────────────────────────────────────
    unpublishLab: builder.mutation({
      query: ({ id }) => ({
        url: `/labs/${id}/unpublish`,
        method: "POST",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Lab moved to draft" },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Lab", id }, "Lab"],
    }),

    // ── Delete ───────────────────────────────────────────────────────────────
    deleteLab: builder.mutation({
      query: (id) => ({
        url: `/labs/${id}`,
        method: "DELETE",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Lab deleted" },
      }),
      invalidatesTags: ["Lab"],
    }),

    /** Skill Builder wizard → multipart POST /owner/labs/create-full (uses global upload progress) */
    createSkillBuilderLabFull: builder.mutation({
      async queryFn(arg, { dispatch }) {
        try {
          const data = await createSkillBuilderLabFull({ ...arg, dispatch });
          return { data };
        } catch (e) {
          const status = e?.response?.status ?? 500;
          const errData = e?.response?.data ?? e?.message ?? "Request failed";
          return { error: { status, data: errData } };
        }
      },
      invalidatesTags: ["Lab"],
    }),

    // ── Upload thumbnail (fallback — prefer uploadWithProgress) ─────────────
    uploadLabThumbnail: builder.mutation({
      query: ({ labId, file }) => {
        const form = new FormData();
        form.append("thumbnail", file);
        return {
          url: labId ? `/labs/${labId}/thumbnail` : "/labs/upload/thumbnail",
          method: "POST",
          data: form,
          meta: { withCredentials: true },
        };
      },
    }),
  }),
});

export const {
  useGetLabsQuery,
  useGetPublicLabsQuery,
  useGetPublicLabBySlugQuery,
  useGetPublicLabQuery,
  useGetLabByIdQuery,
  useGetOwnerLabByIdQuery,
  useCreateLabMutation,
  useUpdateLabMutation,
  usePublishLabMutation,
  useUnpublishLabMutation,
  useDeleteLabMutation,
  useUploadLabThumbnailMutation,
  useSetLabContentApprovalMutation,
  useCreateSkillBuilderLabFullMutation,
} = labApi;
