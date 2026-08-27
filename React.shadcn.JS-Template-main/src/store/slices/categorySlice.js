import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  current: null,
  filters: {
    search: "",
    page: 1,
    limit: 10,
  },
  isLoading: false,
  error: null,
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    setFilters: (state, { payload }) => {
      state.filters = { ...state.filters, ...payload };
    },
    setLoading: (state, { payload }) => {
      state.isLoading = payload;
    },
    setError: (state, { payload }) => {
      state.error = payload;
    },
    setItems: (state, { payload }) => {
      state.items = payload || [];
    },
    setCurrent: (state, { payload }) => {
      state.current = payload || null;
    },
    updateCategoryLocally: (state, { payload }) => {
      const idx = state.items.findIndex((c) => (c.id || c._id) === (payload.id || payload._id));
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...payload };
      if (state.current && (state.current.id || state.current._id) === (payload.id || payload._id)) {
        state.current = { ...state.current, ...payload };
      }
    },
    removeCategoryLocally: (state, { payload }) => {
      state.items = state.items.filter((c) => (c.id || c._id) !== payload);
      if (state.current && (state.current.id || state.current._id) === payload) {
        state.current = null;
      }
    },
  },
});

export const {
  setFilters,
  setLoading,
  setError,
  setItems,
  setCurrent,
  updateCategoryLocally,
  removeCategoryLocally,
} = categorySlice.actions;

export default categorySlice.reducer;

export const selectCategories = (state) => state.category.items;
export const selectCategoryCurrent = (state) => state.category.current;
export const selectCategoryFilters = (state) => state.category.filters;
export const selectCategoryLoading = (state) => state.category.isLoading;
export const selectCategoryError = (state) => state.category.error;
