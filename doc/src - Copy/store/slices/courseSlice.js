// src/store/slices/courseSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lastCreated: null,   // { id, title, code } of the last successfully created item
  isPublishing: false, // true while publish API call is in-flight
};

const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {
    setLastCreated(state, action) {
      state.lastCreated = action.payload || null;
    },
    setPublishing(state, action) {
      state.isPublishing = !!action.payload;
    },
    clearLastCreated(state) {
      state.lastCreated = null;
    },
  },
});

export const { setLastCreated, setPublishing, clearLastCreated } = courseSlice.actions;
export default courseSlice.reducer;