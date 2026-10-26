/**
 * slices/complaintSlice.js
 *
 * Manages the draft state for the multi-step complaint registration wizard.
 * Each step reads from and writes to this slice so navigating backward
 * restores prior inputs.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  step: 0,
  // Step 1 — Images (supports up to 5)
  images: [],              // Array of { previewUrl, base64, mimeType }
  // Step 2 — Location
  location: null,          // { lat, lng, address, userAddress }
  // Step 3 — Description
  description: '',
  // Step 4 — AI result
  aiResult: null,          // structured response from /api/complaints/analyze
  // Rejection flow
  isRejected: false,
  rejectionReason: null,
  short_id: null,
};

const MAX_IMAGES = 5;

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    setStep(state, action) {
      state.step = action.payload;
    },
    /** Add an image. payload: { previewUrl, base64, mimeType } */
    addImage(state, action) {
      if (state.images.length >= MAX_IMAGES) return;
      state.images.push(action.payload);
      state.isRejected = false;
      state.rejectionReason = null;
    },
    /** Remove image at index */
    removeImage(state, action) {
      state.images.splice(action.payload, 1);
    },
    setLocation(state, action) {
      state.location = action.payload;
    },
    setDescription(state, action) {
      state.description = action.payload;
    },
    setAiResult(state, action) {
      state.aiResult = action.payload;
    },
    setRejected(state, action) {
      state.isRejected = true;
      state.rejectionReason = action.payload.reason;
    },
    resetComplaint() {
      return initialState;
    },
    setShortID(state , action) {
      state.short_id = action.payload
    }
  },
});

export const {
  setStep,
  addImage,
  removeImage,
  setLocation,
  setDescription,
  setAiResult,
  setRejected,
  resetComplaint,
  setShortID,
} = complaintSlice.actions;

export default complaintSlice.reducer;
