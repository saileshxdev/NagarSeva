import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true, // true until /me check completes
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action) {
      state.isAuthenticated = true;
      state.user = action.payload; // { id, name, email, role }
      state.loading = false;
    },
    clearAuth(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
