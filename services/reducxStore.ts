import { configureStore } from "@reduxjs/toolkit";
import authReducer, { setUser, setActiveAssignment } from "../store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export const loadPersistedAuth = async () => {
  try {
    const authStateStr = await AsyncStorage.getItem("@auth_state");
    if (authStateStr) {
      const authState = JSON.parse(authStateStr);
      if (authState && authState.token) {
        store.dispatch(setUser(authState));
        if (authState.activeAssignment) {
          store.dispatch(setActiveAssignment(authState.activeAssignment));
        }
      }
    }
  } catch (error) {
    console.error("Failed to load persisted auth state:", error);
  }
};

store.subscribe(async () => {
  try {
    const state = store.getState();
    if (!state.auth.token) {
      await AsyncStorage.removeItem("@auth_state");
    } else {
      const authState = {
        token: state.auth.token,
        jobRole: state.auth.jobRole,
        empId: state.auth.empId,
        companyNameEnglish: state.auth.companyNameEnglish,
        companyNameSinhala: state.auth.companyNameSinhala,
        companyNameTamil: state.auth.companyNameTamil,
        tokenStoredTime: state.auth.tokenStoredTime,
        tokenExpirationTime: state.auth.tokenExpirationTime,
        activeAssignment: state.auth.activeAssignment,
      };
      await AsyncStorage.setItem("@auth_state", JSON.stringify(authState));
    }
  } catch (error) {
    console.error("Failed to persist auth state:", error);
  }
});

export default store;
export type RootState = ReturnType<typeof store.getState>;

