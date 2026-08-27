import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const favoriteApi = createApi({
  reducerPath: "favoriteApi",
  baseQuery: axiosBaseQuery({ showToast: false }),
  tagTypes: ["Favorites", "FavoriteStatus"],
  endpoints: (builder) => ({
    getFavoriteStatus: builder.query({
      query: () => ({
        url: "/me/favorites/status",
        method: "GET",
        meta: { withCredentials: true },
      }),
      providesTags: ["FavoriteStatus"],
      transformResponse: (res) => res?.data ?? res,
    }),
    getFavorites: builder.query({
      query: ({ tab = "courses", page = 1, limit = 12 } = {}) => ({
        url: "/me/favorites",
        method: "GET",
        params: { tab, page, limit },
        meta: { withCredentials: true },
      }),
      providesTags: ["Favorites"],
      transformResponse: (res) => res?.data ?? res,
    }),
    addFavorite: builder.mutation({
      query: ({ itemType, targetId }) => ({
        url: "/me/favorites",
        method: "POST",
        data: { item_type: itemType, target_id: targetId },
        meta: { withCredentials: true, showToast: true, successMessage: "Added to favorites" },
      }),
      invalidatesTags: ["Favorites", "FavoriteStatus"],
    }),
    removeFavorite: builder.mutation({
      query: ({ itemType, targetId }) => ({
        url: "/me/favorites",
        method: "DELETE",
        data: { item_type: itemType, target_id: targetId },
        meta: { withCredentials: true, showToast: true, successMessage: "Removed from favorites" },
      }),
      invalidatesTags: ["Favorites", "FavoriteStatus"],
    }),
  }),
});

export const {
  useGetFavoriteStatusQuery,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = favoriteApi;
