import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  accessToken: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    clearCredentials(state) {
      state.accessToken = null;
      state.user = null;
    },
  },
});

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;

export const selectAccessToken = (state) => state.auth.accessToken;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken);

export default authSlice.reducer;
