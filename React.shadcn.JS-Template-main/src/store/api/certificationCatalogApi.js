import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const certificationCatalogApi = createApi({
  reducerPath: "certificationCatalogApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["CertificationCatalog"],
  endpoints: (builder) => ({
    getPublicCertifications: builder.query({
      query: (params = {}) => ({
        url: "/certifications",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "CertificationCatalog", id: "LIST" }],
    }),
    getPublicCertificationById: builder.query({
      query: (id) => ({
        url: `/certifications/${id}`,
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: (result, error, id) => [{ type: "CertificationCatalog", id }],
    }),
  }),
});

export const {
  useGetPublicCertificationsQuery,
  useGetPublicCertificationByIdQuery,
} = certificationCatalogApi;
