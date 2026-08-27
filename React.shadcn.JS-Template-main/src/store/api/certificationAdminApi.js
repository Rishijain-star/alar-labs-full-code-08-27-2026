import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

function normalizeRows(result) {
  return (
    result?.data?.rows ||
    result?.data?.items ||
    result?.rows ||
    result?.items ||
    result?.data ||
    []
  );
}

export const certificationAdminApi = createApi({
  reducerPath: "certificationAdminApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["CertificationAdmin"],
  endpoints: (builder) => ({
    getCertifications: builder.query({
      query: ({ page = 1, limit = 20, is_active } = {}) => ({
        url: "/owner/certifications",
        method: "GET",
        params: {
          page,
          limit,
          ...(is_active !== undefined ? { is_active } : {}),
        },
        meta: { withCredentials: true },
      }),
      providesTags: (result) => [
        ...normalizeRows(result).map((row) => ({
          type: "CertificationAdmin",
          id: row.id,
        })),
        { type: "CertificationAdmin", id: "LIST" },
      ],
    }),
    getCertificationById: builder.query({
      query: (id) => ({
        url: `/owner/certifications/${id}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, id) => [{ type: "CertificationAdmin", id }],
    }),
    createCertification: builder.mutation({
      query: (formData) => ({
        url: "/owner/certifications",
        method: "POST",
        data: formData,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Certificate template created",
        },
      }),
      invalidatesTags: [{ type: "CertificationAdmin", id: "LIST" }],
    }),
    updateCertification: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/owner/certifications/${id}`,
        method: "PUT",
        data: formData,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Certificate template updated",
        },
      }),
      invalidatesTags: (_, __, { id }) => [
        { type: "CertificationAdmin", id },
        { type: "CertificationAdmin", id: "LIST" },
      ],
    }),
    deleteCertification: builder.mutation({
      query: (id) => ({
        url: `/owner/certifications/${id}`,
        method: "DELETE",
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Certificate template deleted",
        },
      }),
      invalidatesTags: (_, __, id) => [
        { type: "CertificationAdmin", id },
        { type: "CertificationAdmin", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCertificationsQuery,
  useGetCertificationByIdQuery,
  useCreateCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
} = certificationAdminApi;
