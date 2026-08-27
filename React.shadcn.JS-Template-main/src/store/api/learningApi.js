import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const learningApi = createApi({
  reducerPath: "learningApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["Learning"],
  endpoints: (builder) => ({
    getMyLearning: builder.query({
      query: () => ({
        url: "/me/learning",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: ["Learning"],
      keepUnusedDataFor: 180,
    }),
    getMyPaymentHistory: builder.query({
      query: () => ({
        url: "/me/payments/history",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: ["Learning"],
    }),
    enrollCourse: builder.mutation({
      query: ({ courseId, confirmPurchase, orderId }) => ({
        url: `/me/enroll/course/${courseId}`,
        method: "POST",
        data: { confirmPurchase: !!confirmPurchase, orderId },
        meta: { withCredentials: true, showToast: true, successMessage: "Enrolled in course" },
      }),
      invalidatesTags: ["Learning"],
    }),
    enrollLab: builder.mutation({
      query: ({ labId, confirmPurchase, orderId }) => ({
        url: `/me/enroll/lab/${labId}`,
        method: "POST",
        data: { confirmPurchase: !!confirmPurchase, orderId },
        meta: { withCredentials: true, showToast: true, successMessage: "Lab added to your learning" },
      }),
      invalidatesTags: ["Learning"],
    }),
    completeLab: builder.mutation({
      query: (labId) => ({
        url: `/me/labs/${labId}/complete`,
        method: "POST",
        meta: { withCredentials: true, showToast: false },
      }),
      invalidatesTags: ["Learning"],
    }),
    getLabEnrollment: builder.query({
      query: (labId) => ({
        url: `/me/labs/${labId}/enrollment`,
        method: "GET",
        meta: { withCredentials: true },
      }),
    }),
    startLab: builder.mutation({
      query: (labId) => ({
        url: `/me/labs/${labId}/start`,
        method: "POST",
        meta: { withCredentials: true, showToast: false },
      }),
    }),
    submitSkillBuilder: builder.mutation({
      query: ({ labId, answers }) => ({
        url: `/me/labs/${labId}/skill-builder/submit`,
        method: "POST",
        data: { answers: answers || {} },
        meta: { withCredentials: true, showToast: false },
      }),
      invalidatesTags: ["Learning"],
    }),
    getCreatorInsights: builder.query({
      query: (userId) => ({
        url: userId ? `/me/creator/insights/${userId}` : "/me/creator/insights",
        method: "GET",
        meta: { withCredentials: true },
      }),
    }),
    getAdminEnrollments: builder.query({
      query: (params = {}) => ({
        url: "/admin/learning/enrollments",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
    }),
    getLabAudience: builder.query({
      query: (labId) => ({
        url: `/me/creator/labs/${labId}/audience`,
        method: "GET",
        meta: { withCredentials: true },
      }),
    }),

    // ── Grade a block (quiz / fill-blank / true-false) ────────────────────────
    gradeBlock: builder.mutation({
      query: ({ entityType, entityId, ...data }) => ({
        url: `/me/${entityType}/${entityId}/check-block`,
        method: "POST",
        data,
        meta: { withCredentials: true, showToast: false },
      }),
    }),

    // ── Persist lesson/course progress ────────────────────────────────────────
    updateLearningProgress: builder.mutation({
      query: ({ entityType, entityId, ...data }) => ({
        url: `/me/${entityType}/${entityId}/progress`,
        method: "PATCH",
        data,
        meta: { withCredentials: true, showToast: false },
      }),
    }),

    // ── Mark lesson complete inside a course ──────────────────────────────────
    completeCourseLesson: builder.mutation({
      query: ({ courseId, ...data }) => ({
        url: `/me/courses/${courseId}/progress`,
        method: "PATCH",
        data,
        meta: { withCredentials: true, showToast: false },
      }),
      invalidatesTags: ["Learning"],
    }),
  }),
});

export const {
  useGetMyLearningQuery,
  useGetMyPaymentHistoryQuery,
  useEnrollCourseMutation,
  useEnrollLabMutation,
  useCompleteLabMutation,
  useGetLabEnrollmentQuery,
  useStartLabMutation,
  useSubmitSkillBuilderMutation,
  useGetCreatorInsightsQuery,
  useGetAdminEnrollmentsQuery,
  useGetLabAudienceQuery,
  useGradeBlockMutation,
  useUpdateLearningProgressMutation,
  useCompleteCourseLessonMutation,
} = learningApi;
