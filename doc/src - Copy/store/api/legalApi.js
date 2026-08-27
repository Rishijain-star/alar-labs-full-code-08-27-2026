import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const legalApi = createApi({
  reducerPath: "legalApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Legal"],
  endpoints: (builder) => ({
    getPublicLegal: builder.query({
      query: (type) => ({
        url: `/legal/${type}`,
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: (_, __, type) => [{ type: "Legal", id: type }],
    }),
    getOwnerLegalDocs: builder.query({
      query: () => ({
        url: "/owner/legal",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: ["Legal"],
    }),
    upsertOwnerLegalDoc: builder.mutation({
      query: ({ type, ...data }) => ({
        url: `/owner/legal/${type}`,
        method: "PUT",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Legal"],
    }),
  }),
});

export const {
  useGetPublicLegalQuery,
  useGetOwnerLegalDocsQuery,
  useUpsertOwnerLegalDocMutation,
} = legalApi;
