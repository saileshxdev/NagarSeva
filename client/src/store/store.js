import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import complaintReducer from "../slices/complaintSlice";

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    complaint: complaintReducer,
  },
});
