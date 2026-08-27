import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const cloudServiceApi = createApi({
  reducerPath: "cloudServiceApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["CloudService", "CloudServiceRequest"],
  endpoints: (builder) => ({
    getPublicCloudServices: builder.query({
      query: () => ({
        url: "/cloud-services",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "CloudService", id: "PUBLIC_LIST" }],
    }),
    submitCloudServiceRequest: builder.mutation({
      query: (data) => ({
        url: "/cloud-services/request",
        method: "POST",
        data,
        meta: {
          withCredentials: false,
          showSuccessToast: true,
          successMessage: "Request submitted successfully",
        },
      }),
    }),
    getAdminCloudServices: builder.query({
      query: () => ({
        url: "/owner/cloud-services",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "CloudService", id: "ADMIN_LIST" }],
    }),
    getAdminCloudService: builder.query({
      query: (id) => ({
        url: `/owner/cloud-services/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, id) => [{ type: "CloudService", id }],
    }),
    createCloudService: builder.mutation({
      query: (data) => ({
        url: "/owner/cloud-services",
        method: "POST",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Cloud service created",
        },
      }),
      invalidatesTags: [
        { type: "CloudService", id: "ADMIN_LIST" },
        { type: "CloudService", id: "PUBLIC_LIST" },
      ],
    }),
    updateCloudService: builder.mutation({
      query: ({ id, data }) => ({
        url: `/owner/cloud-services/${id}`,
        method: "PUT",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Cloud service updated",
        },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "CloudService", id: "ADMIN_LIST" },
        { type: "CloudService", id: "PUBLIC_LIST" },
        { type: "CloudService", id },
      ],
    }),
    deleteCloudService: builder.mutation({
      query: (id) => ({
        url: `/owner/cloud-services/${id}`,
        method: "DELETE",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Cloud service deleted",
        },
      }),
      invalidatesTags: [
        { type: "CloudService", id: "ADMIN_LIST" },
        { type: "CloudService", id: "PUBLIC_LIST" },
      ],
    }),
    getCloudServiceRequests: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams(params).toString();
        return {
          url: `/owner/cloud-services/requests${searchParams ? `?${searchParams}` : ""}`,
          method: "GET",
          meta: { withCredentials: true },
        };
      },
      providesTags: [{ type: "CloudServiceRequest", id: "LIST" }],
    }),
    updateCloudServiceRequestStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/owner/cloud-services/requests/${id}`,
        method: "PUT",
        data: { status },
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Request status updated",
        },
      }),
      invalidatesTags: [{ type: "CloudServiceRequest", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPublicCloudServicesQuery,
  useSubmitCloudServiceRequestMutation,
  useGetAdminCloudServicesQuery,
  useGetAdminCloudServiceQuery,
  useCreateCloudServiceMutation,
  useUpdateCloudServiceMutation,
  useDeleteCloudServiceMutation,
  useGetCloudServiceRequestsQuery,
  useUpdateCloudServiceRequestStatusMutation,
} = cloudServiceApi;
