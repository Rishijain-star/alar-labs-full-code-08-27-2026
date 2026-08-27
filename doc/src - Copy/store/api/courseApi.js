// src/store/api/courseApi.js
// ─────────────────────────────────────────────────────────────────────────────
// RTK Query API — matches actual backend routes in courseRoutes.js exactly
//
//  POST   /owner/courses              → create (basic metadata only → returns { course: { _id } })
//  GET    /owner/courses              → getAll
//  GET    /owner/courses/:id          → getById
//  GET    /owner/courses/slug/:slug   → getBySlug
//  PUT    /owner/courses/:id          → update (full metadata after file uploads)
//  DELETE /owner/courses/:id          → deleteCourse
//  PATCH  /owner/courses/:id/publish  → publish
//  PATCH  /owner/courses/:id/archive  → archive
//  POST   /owner/courses/:id/media    → addMedia  ← thumbnail / video upload target
//  PUT    /owner/courses/:id/media/:mediaId
//  DELETE /owner/courses/:id/media/:mediaId
//  POST   /owner/courses/:id/questions
//  POST   /owner/courses/:id/questions/bulk
//  POST   /owner/courses/create-full  → multipart one-shot (alternative)
// ─────────────────────────────────────────────────────────────────────────────
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const courseApi = createApi({
  reducerPath: "courseApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Course"],

  endpoints: (builder) => ({

    // ── GET /owner/courses ──────────────────────────────────────────────────────────
    getCourses: builder.query({
      query: (params = {}) => ({ url: "/owner/courses", method: "GET", params, meta: { withCredentials: true } }),
      providesTags: ["Course"],
    }),

    // ── PUBLIC: GET /courses (Home/Catalog) ─────────────────────────────────────────
    getPublicCourses: builder.query({
      query: (params = {}) => ({
        url: `/courses`,
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: ["Course"],
      keepUnusedDataFor: 300,
      refetchOnMountOrArgChange: false,
    }),

    // ── PUBLIC: GET /courses/:id/view (Detail page shape) ──────────────────────────
    getCourseView: builder.query({
      query: (id) => ({
        url: `/courses/${id}/view`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, id) => [{ type: "Course", id }],
    }),

    // ── GET /owner/courses/:id ──────────────────────────────────────────────────────
    getCourseById: builder.query({
      query: (id) => ({ url: `/owner/courses/${id}`, method: "GET", meta: { withCredentials: true } }),
      providesTags: (_, __, id) => [{ type: "Course", id }],
    }),

    // ── GET /owner/courses/slug/:slug ───────────────────────────────────────────────
    getCourseBySlug: builder.query({
      query: (slug) => ({ url: `/owner/courses/slug/${slug}`, method: "GET", meta: { withCredentials: true } }),
      providesTags: (_, __, slug) => [{ type: "Course", id: slug }],
    }),

    // ── POST /owner/courses ─────────────────────────────────────────────────────────
    // STEP 1: Create course stub — basic metadata only, no files.
    // Validates: title(required), description, level, price, certificationId
    // Returns:  { course: { _id, title, slug, ... } }
    createCourse: builder.mutation({
      query: (data) => ({
        url: "/owner/courses",
        method: "POST",
        data,
        meta: { withCredentials: true, showSuccessToast: false },
      }),
      // No cache invalidation yet — course is a draft stub
    }),

    // ── PUT /owner/courses/:id ──────────────────────────────────────────────────────
    // STEP 3: Full update with all metadata + CDN URLs from uploads.
    updateCourse: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/owner/courses/${id}`,
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Course saved" },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Course", id }, "Course"],
    }),

    // ── DELETE /owner/courses/:id ───────────────────────────────────────────────────
    deleteCourse: builder.mutation({
      query: (id) => ({
        url: `/owner/courses/${id}`,
        method: "DELETE",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Course deleted" },
      }),
      invalidatesTags: ["Course"],
    }),

    // ── PATCH /owner/courses/:id/publish ────────────────────────────────────────────
    publishCourse: builder.mutation({
      query: ({ id }) => ({
        url: `/owner/courses/${id}/publish`,
        method: "PATCH",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Course published 🚀" },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Course", id }, "Course"],
    }),

    setCourseContentApproval: builder.mutation({
      query: ({ id, status }) => ({
        url: `/owner/courses/${id}/content-approval`,
        method: "PATCH",
        data: { status },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: status === "approved" ? "Course approved" : "Course rejected",
        },
      }),
      invalidatesTags: ["Course"],
    }),

    // ── PATCH /owner/courses/:id/archive ────────────────────────────────────────────
    archiveCourse: builder.mutation({
      query: ({ id }) => ({
        url: `/owner/courses/${id}/archive`,
        method: "PATCH",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Course archived" },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Course", id }, "Course"],
    }),

    // ── POST /owner/courses/:id/media ───────────────────────────────────────────────
    // STEP 2: Upload thumbnail / video AFTER course creation.
    // Use uploadWithProgress() from uploadWithProgress.js for progress bar.
    // This RTK mutation is a non-progress fallback / for small files.
    addMedia: builder.mutation({
      query: ({ courseId, formData }) => ({
        url: `/owner/courses/${courseId}/media`,
        method: "POST",
        data: formData,
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { courseId }) => [{ type: "Course", id: courseId }],
    }),

    // ── PUT /owner/courses/:id/media/:mediaId ───────────────────────────────────────
    updateMedia: builder.mutation({
      query: ({ courseId, mediaId, ...data }) => ({
        url: `/owner/courses/${courseId}/media/${mediaId}`,
        method: "PUT",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { courseId }) => [{ type: "Course", id: courseId }],
    }),

    // ── DELETE /owner/courses/:id/media/:mediaId ────────────────────────────────────
    deleteMedia: builder.mutation({
      query: ({ courseId, mediaId }) => ({
        url: `/owner/courses/${courseId}/media/${mediaId}`,
        method: "DELETE",
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { courseId }) => [{ type: "Course", id: courseId }],
    }),

    // ── POST /owner/courses/:id/questions ───────────────────────────────────────────
    addQuestion: builder.mutation({
      query: ({ courseId, ...data }) => ({
        url: `/owner/courses/${courseId}/questions`,
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { courseId }) => [{ type: "Course", id: courseId }],
    }),

    // ── POST /owner/courses/:id/questions/bulk ─────────────────────────────────────
    addQuestionsBulk: builder.mutation({
      query: ({ courseId, questions }) => ({
        url: `/owner/courses/${courseId}/questions/bulk`,
        method: "POST",
        data: { questions },
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { courseId }) => [{ type: "Course", id: courseId }],
    }),

    // ── POST /owner/courses/create-full ─────────────────────────────────────────────
    // Alternative one-shot multipart (backend handles files + JSON in one request)
    createFull: builder.mutation({
      query: (formData) => ({
        url: "/owner/courses/create-full",
        method: "POST",
        data: formData,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Course"],
    }),

    // ── Certification ─────────────────────────────────────────────────────────
    assignCertification: builder.mutation({
      query: ({ id, certificationId }) => ({
        url: `/owner/courses/${id}/certification`,
        method: "POST",
        data: { certificationId },
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Course", id }],
    }),

    removeCertification: builder.mutation({
      query: ({ id }) => ({
        url: `/owner/courses/${id}/certification`,
        method: "DELETE",
        meta: { withCredentials: true },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Course", id }],
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useGetCourseBySlugQuery,
  useGetPublicCoursesQuery,
  useGetCourseViewQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  usePublishCourseMutation,
  useSetCourseContentApprovalMutation,
  useArchiveCourseMutation,
  useAddMediaMutation,
  useUpdateMediaMutation,
  useDeleteMediaMutation,
  useAddQuestionMutation,
  useAddQuestionsBulkMutation,
  useCreateFullMutation,
  useAssignCertificationMutation,
  useRemoveCertificationMutation,
} = courseApi;
