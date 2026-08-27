import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const digitalProgramApi = createApi({
  reducerPath: "digitalProgramApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["DigitalProgramSection"],
  endpoints: (builder) => ({
    getPublicSections: builder.query({
      query: () => ({
        url: "/digital-program/sections",
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: [{ type: "DigitalProgramSection", id: "PUBLIC_LIST" }],
      keepUnusedDataFor: 600,
    }),
    getPublicSection: builder.query({
      query: (sectionKey) => ({
        url: `/digital-program/sections/${encodeURIComponent(sectionKey)}`,
        method: "GET",
        meta: { withCredentials: false },
      }),
      providesTags: (_, __, sectionKey) => [
        { type: "DigitalProgramSection", id: `pub-${sectionKey}` },
      ],
      keepUnusedDataFor: 600,
    }),
    getAdminSections: builder.query({
      query: () => ({
        url: "/owner/digital-program/sections",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: [{ type: "DigitalProgramSection", id: "ADMIN_LIST" }],
    }),
    getAdminSection: builder.query({
      query: (sectionKey) => ({
        url: `/owner/digital-program/sections/${encodeURIComponent(sectionKey)}`,
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: (_, __, sectionKey) => [
        { type: "DigitalProgramSection", id: `adm-${sectionKey}` },
      ],
    }),
    upsertSection: builder.mutation({
      query: ({ sectionKey, data }) => ({
        url: `/owner/digital-program/sections/${encodeURIComponent(sectionKey)}`,
        method: "PUT",
        data,
        meta: {
          withCredentials: true,
          showSuccessToast: true,
          successMessage: "Section saved",
        },
      }),
      invalidatesTags: (_, __, { sectionKey }) => [
        { type: "DigitalProgramSection", id: "ADMIN_LIST" },
        { type: "DigitalProgramSection", id: `adm-${sectionKey}` },
        { type: "DigitalProgramSection", id: "PUBLIC_LIST" },
        { type: "DigitalProgramSection", id: `pub-${sectionKey}` },
      ],
    }),
  }),
});

export const {
  useGetPublicSectionsQuery,
  useGetPublicSectionQuery,
  useGetAdminSectionsQuery,
  useGetAdminSectionQuery,
  useUpsertSectionMutation,
} = digitalProgramApi;
