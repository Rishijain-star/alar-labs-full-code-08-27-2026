import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    getActiveCategories: builder.query({
      query: () => ({ url: "/categories/active", method: "GET", meta: { withCredentials: false } }),
      keepUnusedDataFor: 600,
      providesTags: ["Category"],
    }),
    getCategoryBySlug: builder.query({
      query: (slug) => ({ url: `/categories/slug/${slug}`, method: "GET", meta: { withCredentials: true } }),
      providesTags: (_, __, slug) => [{ type: "Category", id: `slug-${slug}` }],
    }),
    getCategories: builder.query({
      query: ({ page = 1, limit = 10, search = "" } = {}) => ({
        url: "/categories",
        method: "GET",
        params: { page, limit, search },
        meta: { withCredentials: true },
      }),
      providesTags: (result) => [
        ...(result?.data ?? result ?? []).map?.((cat) => ({ type: "Category", id: cat.id || cat._id })) ?? [],
        { type: "Category", id: "LIST" },
      ],
    }),
    getCategoryById: builder.query({
      query: (id) => ({ url: `/categories/${id}`, method: "GET", meta: { withCredentials: true } }),
      providesTags: (_, __, id) => [{ type: "Category", id }],
    }),
    createCategory: builder.mutation({
      query: (data) => ({
        url: "/categories",
        method: "POST",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Category created" },
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    updateCategory: builder.mutation({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Category updated" },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Category", id }, { type: "Category", id: "LIST" }],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Category deleted" },
      }),
      invalidatesTags: (_, __, id) => [{ type: "Category", id }, { type: "Category", id: "LIST" }],
    }),
  }),
});

export const {
  useGetActiveCategoriesQuery,
  useGetCategoryBySlugQuery,
  useGetCategoriesQuery,
  useLazyGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
