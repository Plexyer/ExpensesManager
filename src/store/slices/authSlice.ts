import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  username: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  username: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(state: AuthState, action: PayloadAction<{ username: string }>) {
      state.username = action.payload.username;
      state.isAuthenticated = true;
    },
    logout(state: AuthState) {
      state.username = null;
      state.isAuthenticated = false;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;


