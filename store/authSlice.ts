import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ActiveAssignmentState {
  rowId: number;
  positionId: number;
  positionName: string;
  pType: string;
  targetId?: number;
  timeSlot?: string;
}

interface AuthState {
  token: string | null;
  jobRole: string | null;
  empId: string | null;
  companyNameEnglish: string | null;
  companyNameSinhala: string | null;
  companyNameTamil: string | null;
  tokenStoredTime: string | null;
  tokenExpirationTime: string | null;
  activeAssignment: ActiveAssignmentState | null;
}

const initialState: AuthState = {
  token: null,
  jobRole: null,
  empId: null,
  companyNameEnglish: null,
  companyNameSinhala: null,
  companyNameTamil: null,
  tokenStoredTime: null,
  tokenExpirationTime: null,
  activeAssignment: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        token: string;
        jobRole: string;
        empId: string;
        companyNameEnglish?: string | null;
        companyNameSinhala?: string | null;
        companyNameTamil?: string | null;
        tokenStoredTime?: string | null;
        tokenExpirationTime?: string | null;
      }>,
    ) => {
      console.log("👤 User logged:", action.payload.empId);
      state.token = action.payload.token;
      state.jobRole = action.payload.jobRole;
      state.empId = action.payload.empId;
      state.companyNameEnglish = action.payload.companyNameEnglish ?? null;
      state.companyNameSinhala = action.payload.companyNameSinhala ?? null;
      state.companyNameTamil = action.payload.companyNameTamil ?? null;
      state.tokenStoredTime = action.payload.tokenStoredTime ?? null;
      state.tokenExpirationTime = action.payload.tokenExpirationTime ?? null;
    },
    setActiveAssignment: (
      state,
      action: PayloadAction<ActiveAssignmentState>,
    ) => {
      console.log("📌 Active assignment saved in Redux:", action.payload);
      state.activeAssignment = action.payload;
    },
    clearActiveAssignment: (state) => {
      state.activeAssignment = null;
    },
    logoutUser: (state) => {
      state.token = null;
      state.jobRole = null;
      state.empId = null;
      state.companyNameEnglish = null;
      state.companyNameSinhala = null;
      state.companyNameTamil = null;
      state.tokenStoredTime = null;
      state.tokenExpirationTime = null;
      state.activeAssignment = null;
    },
  },
});

export const { setUser, setActiveAssignment, clearActiveAssignment, logoutUser } = authSlice.actions;
export default authSlice.reducer;

