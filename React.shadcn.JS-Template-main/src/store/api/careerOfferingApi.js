import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const careerOfferingApi = createApi({
  reducerPath: "careerOfferingApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["CareerOffering", "CareerRequest"],
  endpoints: (builder) => ({
    getPublicCareerOfferings: builder.query({
      query: () => ({
        url: "/careers",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "CareerOffering", id: "PUBLIC_LIST" }],
    }),
    submitCareerRequest: builder.mutation({
      query: (data) => ({
        url: "/careers/request",
        method: "POST",
        data,
        meta: {
          withCredentials: false,
          showSuccessToast: true,
          successMessage: "Request submitted successfully",
        },
      }),
    }),
    getAdminCareerOfferings: builder.query({
      query: () => ({
        url: "/owner/careers",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "CareerOffering", id: "ADMIN_LIST" }],
    }),
    getAdminCareerOffering: builder.query({
      query: (id) => ({
        url: `/owner/careers/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, id) => [{ type: "CareerOffering", id }],
    }),
    createCareerOffering: builder.mutation({
      query: (data) => ({
        url: "/owner/careers",
        method: "POST",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Career offering created",
        },
      }),
      invalidatesTags: [
        { type: "CareerOffering", id: "ADMIN_LIST" },
        { type: "CareerOffering", id: "PUBLIC_LIST" },
      ],
    }),
    updateCareerOffering: builder.mutation({
      query: ({ id, data }) => ({
        url: `/owner/careers/${id}`,
        method: "PUT",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Career offering updated",
        },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "CareerOffering", id: "ADMIN_LIST" },
        { type: "CareerOffering", id: "PUBLIC_LIST" },
        { type: "CareerOffering", id },
      ],
    }),
    deleteCareerOffering: builder.mutation({
      query: (id) => ({
        url: `/owner/careers/${id}`,
        method: "DELETE",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Career offering deleted",
        },
      }),
      invalidatesTags: [
        { type: "CareerOffering", id: "ADMIN_LIST" },
        { type: "CareerOffering", id: "PUBLIC_LIST" },
      ],
    }),
    setCareerOfferingApproval: builder.mutation({
      query: ({ id, status }) => ({
        url: `/owner/careers/${id}/approval`,
        method: "PATCH",
        data: { status },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: `Career offering ${status === "approved" ? "approved" : "rejected"}`,
        },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "CareerOffering", id: "ADMIN_LIST" },
        { type: "CareerOffering", id: "PUBLIC_LIST" },
        { type: "CareerOffering", id },
      ],
    }),
    getCareerRequests: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams(params).toString();
        return {
          url: `/owner/careers/requests${searchParams ? `?${searchParams}` : ""}`,
          method: "GET",
          meta: { withCredentials: true },
        };
      },
      providesTags: [{ type: "CareerRequest", id: "LIST" }],
    }),
    updateCareerRequestStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/owner/careers/requests/${id}`,
        method: "PUT",
        data: { status },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Request status updated",
        },
      }),
      invalidatesTags: [{ type: "CareerRequest", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPublicCareerOfferingsQuery,
  useSubmitCareerRequestMutation,
  useGetAdminCareerOfferingsQuery,
  useGetAdminCareerOfferingQuery,
  useCreateCareerOfferingMutation,
  useUpdateCareerOfferingMutation,
  useDeleteCareerOfferingMutation,
  useSetCareerOfferingApprovalMutation,
  useGetCareerRequestsQuery,
  useUpdateCareerRequestStatusMutation,
} = careerOfferingApi;
