// src/store/slices/labSlice.js
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors courseSlice — stores the last-created lab so other pages
// (e.g. AdminLabList) can show a success toast / highlight the new row.
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    lastCreated: null, // { id, title, code } — set after successful createFull
};

const labSlice = createSlice({
    name: "lab",
    initialState,
    reducers: {
        setLastCreated(state, action) {
            state.lastCreated = action.payload; // { id, title, code }
        },
        clearLastCreated(state) {
            state.lastCreated = null;
        },
    },
});

export const { setLastCreated, clearLastCreated } = labSlice.actions;
export default labSlice.reducer;