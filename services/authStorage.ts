import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredAuthState {
  token: string | null;
  jobRole: string | null;
  empId: string | null;
  id?: number | string | null;
  companyNameEnglish?: string | null;
  companyNameSinhala?: string | null;
  companyNameTamil?: string | null;
  tokenStoredTime?: string | null;
  tokenExpirationTime?: string | null;
  activeAssignment?: any | null;
}

const AUTH_STORAGE_KEY = "@auth_state";

const LEGACY_KEYS = [
  "token",
  "jobRole",
  "empid",
  "companyNameEnglish",
  "companyNameSinhala",
  "companyNameTamil",
  "tokenStoredTime",
  "tokenExpirationTime",
];

/**
 * Persists user authentication data both in unified @auth_state
 * and in individual keys for backward-compatibility.
 */
export const saveAuthData = async (data: StoredAuthState): Promise<void> => {
  try {
    const timestamp = new Date();
    const expirationTime = new Date(timestamp.getTime() + 10 * 60 * 60 * 1000); // 10h matching JWT

    const fullData: StoredAuthState = {
      ...data,
      tokenStoredTime: data.tokenStoredTime || timestamp.toISOString(),
      tokenExpirationTime: data.tokenExpirationTime || expirationTime.toISOString(),
    };

    // 1. Unified state storage
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fullData));

    // 2. Backward-compatible individual key pairs
    const pairs: [string, string][] = [];
    if (fullData.token) pairs.push(["token", fullData.token]);
    if (fullData.jobRole) pairs.push(["jobRole", fullData.jobRole]);
    if (fullData.empId) pairs.push(["empid", fullData.empId.toString()]);
    if (fullData.companyNameEnglish) pairs.push(["companyNameEnglish", fullData.companyNameEnglish]);
    if (fullData.companyNameSinhala) pairs.push(["companyNameSinhala", fullData.companyNameSinhala]);
    if (fullData.companyNameTamil) pairs.push(["companyNameTamil", fullData.companyNameTamil]);
    if (fullData.tokenStoredTime) pairs.push(["tokenStoredTime", fullData.tokenStoredTime]);
    if (fullData.tokenExpirationTime) pairs.push(["tokenExpirationTime", fullData.tokenExpirationTime]);

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }
  } catch (error) {
    console.error("[AuthStorage] Error saving auth data:", error);
  }
};

/**
 * Retrieves persisted authentication data.
 */
export const getAuthData = async (): Promise<StoredAuthState | null> => {
  try {
    const json = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (parsed && parsed.token) {
        return parsed;
      }
    }

    // Fallback: check individual 'token' key if @auth_state is missing
    const fallbackToken = await AsyncStorage.getItem("token");
    if (fallbackToken) {
      const empId = await AsyncStorage.getItem("empid");
      const jobRole = await AsyncStorage.getItem("jobRole");
      return {
        token: fallbackToken,
        empId,
        jobRole,
      };
    }
  } catch (error) {
    console.error("[AuthStorage] Error reading auth data:", error);
  }
  return null;
};

/**
 * Clears all authentication data from persistent storage.
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.multiRemove(LEGACY_KEYS);
  } catch (error) {
    console.error("[AuthStorage] Error clearing auth data:", error);
  }
};
