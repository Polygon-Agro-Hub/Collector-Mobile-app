import { configureStore } from "@reduxjs/toolkit";
import authReducer, { setUser, setActiveAssignment } from "../store/authSlice";
import transportReducer from "../store/transportSlice";
import unloadReducer from "../store/unloadSlice";
import { getAuthData, saveAuthData, clearAuthData } from "./authStorage";

const store = configureStore({
  reducer: {
    auth: authReducer,
    transport: transportReducer,
    unload: unloadReducer,
  },
});

export const loadPersistedAuth = async () => {
  try {
    const authState = await getAuthData();
    if (authState && authState.token) {
      store.dispatch(setUser(authState as any));
      if (authState.activeAssignment) {
        store.dispatch(setActiveAssignment(authState.activeAssignment));
      }
    }
  } catch (error) {
    console.error("Failed to load persisted auth state:", error);
  }
};

let previousToken: string | null = null;

store.subscribe(async () => {
  try {
    const state = store.getState();
    const currentToken = state.auth.token;

    if (!currentToken && previousToken) {
      // User logged out
      previousToken = null;
      await clearAuthData();
    } else if (currentToken && currentToken !== previousToken) {
      // User logged in or token updated
      previousToken = currentToken;
      const authState = {
        token: state.auth.token,
        jobRole: state.auth.jobRole,
        empId: state.auth.empId,
        id: state.auth.id,
        companyNameEnglish: state.auth.companyNameEnglish,
        companyNameSinhala: state.auth.companyNameSinhala,
        companyNameTamil: state.auth.companyNameTamil,
        tokenStoredTime: state.auth.tokenStoredTime,
        tokenExpirationTime: state.auth.tokenExpirationTime,
        activeAssignment: state.auth.activeAssignment,
      };
      await saveAuthData(authState);
    }
  } catch (error) {
    console.error("Failed to persist auth state:", error);
  }
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
