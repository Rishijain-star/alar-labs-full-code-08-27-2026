// src/store/slices/uploadSlice.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  active: false,
  label: null,
  percentage: 0,
  bytesUploaded: 0,
  bytesTotal: 0,
  itemsUploaded: 0,
  itemsTotal: 0,
  error: null,
  isError: false,
};

const uploadSlice = createSlice({
  name: "upload",
  initialState,
  reducers: {
    start(state, action) {
      const { bytesTotal = 0, itemsTotal = 0, label = "Uploading" } = action.payload || {};
      state.active = true;
      state.label = label;
      state.bytesTotal = bytesTotal;
      state.itemsTotal = itemsTotal;
      state.bytesUploaded = 0;
      state.itemsUploaded = 0;
      state.percentage = 0;
      state.isError = false;
      state.error = null;
    },

    // ✅ THIS WAS MISSING — progress was exported but never defined
    progress(state, action) {
      const { bytesUploaded = 0, bytesTotal, itemsUploaded } = action.payload || {};
      if (typeof bytesUploaded === "number") state.bytesUploaded = bytesUploaded;
      if (typeof bytesTotal === "number" && bytesTotal > 0) state.bytesTotal = bytesTotal;
      if (typeof itemsUploaded === "number") state.itemsUploaded = itemsUploaded;

      const total = state.bytesTotal || 1;
      state.percentage = Math.min(99, Math.round((state.bytesUploaded / total) * 100));
      // Capped at 99 — only complete() sets 100 so the bar doesn't "finish" before the response arrives
    },

    complete(state) {
      state.percentage = 100;
      state.itemsUploaded = state.itemsTotal;
      state.isError = false;
      state.error = null;
      state.active = true; // Keep visible; component hides after timeout via hide()
    },

    hide(state) {
      state.active = false;
      state.percentage = 0;
    },

    fail(state, action) {
      state.active = true;
      state.isError = true;
      state.error = action.payload || "Upload failed";
    },

    reset() {
      return initialState;
    },
  },
});

export const { start, progress, complete, fail, hide, reset } = uploadSlice.actions;
export default uploadSlice.reducer;