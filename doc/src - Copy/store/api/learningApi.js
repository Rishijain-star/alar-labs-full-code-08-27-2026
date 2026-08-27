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
  }),
});

export const {
  useGetMyLearningQuery,
  useEnrollCourseMutation,
  useEnrollLabMutation,
  useCompleteLabMutation,
  useGetLabEnrollmentQuery,
  useSubmitSkillBuilderMutation,
  useGetCreatorInsightsQuery,
  useGetAdminEnrollmentsQuery,
  useGetLabAudienceQuery,
} = learningApi;
