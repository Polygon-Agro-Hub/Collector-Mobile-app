import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ActiveAssignmentState {
  rowId: number;
  rowIndex?: number;
  rowName?: string;
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
  id?: number | string | null;
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
  id: null,
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
        id?: number | string | null;
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

      let userId = action.payload.id ?? null;
      if (!userId && action.payload.token) {
        try {
          const parts = action.payload.token.split(".");
          if (parts.length >= 2) {
            let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4 !== 0) b64 += "=";
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            let str = "";
            for (let i = 0; i < b64.length; i += 4) {
              const b0 = chars.indexOf(b64.charAt(i));
              const b1 = chars.indexOf(b64.charAt(i + 1));
              const b2 = chars.indexOf(b64.charAt(i + 2));
              const b3 = chars.indexOf(b64.charAt(i + 3));
              const c0 = (b0 << 2) | (b1 >> 4);
              const c1 = ((b1 & 15) << 4) | (b2 >> 2);
              const c2 = ((b2 & 3) << 6) | b3;
              str += String.fromCharCode(c0);
              if (b2 !== 64 && b2 !== -1) str += String.fromCharCode(c1);
              if (b3 !== 64 && b3 !== -1) str += String.fromCharCode(c2);
            }
            const parsed = JSON.parse(str);
            userId = parsed.id || parsed.officerId || parsed.userId || null;
          }
        } catch (err) {
          console.warn("Could not decode user id from JWT:", err);
        }
      }
      state.id = userId;
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

