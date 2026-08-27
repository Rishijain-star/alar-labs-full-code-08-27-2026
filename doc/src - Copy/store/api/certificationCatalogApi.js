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
  }),
});

export const { useGetPublicCertificationsQuery } = certificationCatalogApi;
