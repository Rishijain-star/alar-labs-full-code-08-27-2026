// src/store/api/technologySkillApi.js
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const technologySkillApi = createApi({
  reducerPath: "technologySkillApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["TechSkill", "TechCategory"],
  endpoints: (builder) => ({
    // Public: active skills
    getActiveTechSkills: builder.query({
      query: (params = {}) => ({
        url: "/technology-skills/active",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      keepUnusedDataFor: 600, // 10 minutes cache
      providesTags: ["TechSkill"],
    }),
    // Public: categories
    getTechSkillCategories: builder.query({
      query: () => ({
        url: "/technology-skills/categories/all",
        method: "GET",
        meta: { withCredentials: false },
      }),
      keepUnusedDataFor: 600, // 10 minutes cache
      providesTags: ["TechCategory"],
    }),
    // Public: by category
    getTechSkillsByCategory: builder.query({
      query: ({ category, ...params }) => ({
        url: `/technology-skills/category/${category}`,
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      keepUnusedDataFor: 600,
      providesTags: (_r, _e, arg) => [{ type: "TechSkill", id: `cat:${arg?.category}` }],
    }),
    // Public: search
    searchTechSkills: builder.query({
      query: ({ q, ...params }) => ({
        url: "/technology-skills/search",
        method: "GET",
        params: { q, ...params },
        meta: { withCredentials: false },
      }),
      keepUnusedDataFor: 600,
      providesTags: ["TechSkill"],
    }),
  }),
});

export const {
  useGetActiveTechSkillsQuery,
  useGetTechSkillCategoriesQuery,
  useGetTechSkillsByCategoryQuery,
  useSearchTechSkillsQuery,
} = technologySkillApi;
