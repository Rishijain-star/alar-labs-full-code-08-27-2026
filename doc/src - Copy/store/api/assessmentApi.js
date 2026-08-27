import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const assessmentApi = createApi({
  reducerPath: "assessmentApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["AssessmentConfig"],
  endpoints: (builder) => ({
    getAssessmentConfig: builder.query({
      query: () => ({
        url: "/assessment/config",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "AssessmentConfig", id: "TECH_READINESS" }],
    }),
    getAdminAssessmentConfig: builder.query({
      query: () => ({
        url: "/owner/assessment/config",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "AssessmentConfig", id: "TECH_READINESS" }],
    }),
    upsertAssessmentConfig: builder.mutation({
      query: (body) => ({
        url: "/owner/assessment/config",
        method: "PUT",
        data: body,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Assessment config saved!" },
      }),
      invalidatesTags: [{ type: "AssessmentConfig", id: "TECH_READINESS" }],
    }),
    postAssessmentRecommend: builder.mutation({
      query: (body) => ({
        url: "/assessment/recommend",
        method: "POST",
        data: body,
        meta: { withCredentials: false, showErrorToast: true },
      }),
    }),
  }),
});

export const { 
  useGetAssessmentConfigQuery, 
  usePostAssessmentRecommendMutation,
  useGetAdminAssessmentConfigQuery,
  useUpsertAssessmentConfigMutation
} = assessmentApi;
