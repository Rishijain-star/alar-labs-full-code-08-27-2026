import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const examTopicsApi = createApi({
  reducerPath: "examTopicsApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["ExamTopicsConfig", "ExamTopicsPending"],
  endpoints: (builder) => ({
    getExamTopicsConfig: builder.query({
      query: () => ({
        url: "/exam-topics/config",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "ExamTopicsConfig", id: "PUBLIC" }],
    }),
    getAdminExamTopicsConfig: builder.query({
      query: () => ({
        url: "/owner/exam-topics/config",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "ExamTopicsConfig", id: "ADMIN" }],
    }),
    getPendingExamTopicsSets: builder.query({
      query: () => ({
        url: "/owner/exam-topics/pending",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "ExamTopicsPending", id: "LIST" }],
    }),
    getExamTopicsSetForReview: builder.query({
      query: ({ type, setId }) => ({
        url: `/owner/exam-topics/sets/${type}/${setId}/review`,
        method: "GET",
        meta: { withCredentials: true },
      }),
    }),
    upsertExamTopicsConfig: builder.mutation({
      query: (body) => ({
        url: "/owner/exam-topics/config",
        method: "PUT",
        data: body,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Exam Topics saved!",
        },
      }),
      invalidatesTags: [
        { type: "ExamTopicsConfig", id: "ADMIN" },
        { type: "ExamTopicsConfig", id: "PUBLIC" },
        { type: "ExamTopicsPending", id: "LIST" },
      ],
    }),
    publishExamTopicsSet: builder.mutation({
      query: ({ type, setId }) => ({
        url: `/owner/exam-topics/sets/${type}/${setId}/publish`,
        method: "PATCH",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Submitted for content approval",
        },
      }),
      invalidatesTags: [
        { type: "ExamTopicsConfig", id: "ADMIN" },
        { type: "ExamTopicsConfig", id: "PUBLIC" },
        { type: "ExamTopicsPending", id: "LIST" },
      ],
    }),
    setExamTopicsContentApproval: builder.mutation({
      query: ({ type, setId, status, rejection_reason }) => ({
        url: `/owner/exam-topics/sets/${type}/${setId}/content-approval`,
        method: "PATCH",
        data: { status, rejection_reason },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: status === "approved" ? "Exam topic approved" : "Exam topic rejected",
        },
      }),
      invalidatesTags: [
        { type: "ExamTopicsConfig", id: "ADMIN" },
        { type: "ExamTopicsConfig", id: "PUBLIC" },
        { type: "ExamTopicsPending", id: "LIST" },
      ],
    }),
    verifyExamTopicsAnswer: builder.mutation({
      query: (body) => ({
        url: "/exam-topics/verify",
        method: "POST",
        data: body,
        meta: { withCredentials: false, showErrorToast: true },
      }),
    }),
    bulkUploadQuestions: builder.mutation({
      query: (body) => ({
        url: "/owner/exam-topics/bulk-upload-questions",
        method: "POST",
        data: body,
        meta: { withCredentials: true, showErrorToast: true },
      }),
    }),
    saveExamAttempt: builder.mutation({
      query: (body) => ({
        url: "/exam-topics/attempts",
        method: "POST",
        data: body,
        meta: { withCredentials: true, showErrorToast: false },
      }),
      invalidatesTags: ["ExamAttempts"],
    }),
    getExamAttempts: builder.query({
      query: (setId) => ({
        url: setId ? `/exam-topics/attempts/${setId}` : "/exam-topics/attempts",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: ["ExamAttempts"],
    }),
  }),
});

export const {
  useGetExamTopicsConfigQuery,
  useGetAdminExamTopicsConfigQuery,
  useGetPendingExamTopicsSetsQuery,
  useGetExamTopicsSetForReviewQuery,
  useUpsertExamTopicsConfigMutation,
  usePublishExamTopicsSetMutation,
  useSetExamTopicsContentApprovalMutation,
  useVerifyExamTopicsAnswerMutation,
  useBulkUploadQuestionsMutation,
  useSaveExamAttemptMutation,
  useGetExamAttemptsQuery,
} = examTopicsApi;
