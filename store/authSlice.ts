import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  jobRole: string | null;
  empId: string | null;
}

const initialState: AuthState = {
  token: null,
  jobRole: null,
  empId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{ token: string; jobRole: string; empId: string }>,
    ) => {
      const { token, jobRole, empId } = action.payload;
      console.log("Dispatching setUser action:");
      console.log("jobRole redux:", jobRole);
      state.token = action.payload.token;
      state.jobRole = action.payload.jobRole;
      state.empId = action.payload.empId;
    },
    logoutUser: (state) => {
      state.token = null;
      state.jobRole = null;
      state.empId = null;
    },
  },
});

export const { setUser, logoutUser } = authSlice.actions;
export default authSlice.reducer;
