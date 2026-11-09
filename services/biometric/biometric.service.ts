import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BIOMETRIC_ENABLED_KEY = "isBiometricEnabled";
const SECURE_EMP_ID_KEY = "biometric_emp_id";
const SECURE_PASSWORD_KEY = "biometric_password";

// Remember Me keys
const REMEMBER_ME_KEY = "remember_me_enabled";
const REMEMBER_EMP_ID_KEY = "remember_emp_id";
const REMEMBER_PASSWORD_KEY = "remember_password";

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
}

export const checkBiometricAvailability = async (): Promise<BiometricAvailability> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return { hasHardware, isEnrolled, biometricTypes };
  } catch (error) {
    console.warn("Error checking biometric availability:", error);
    return { hasHardware: false, isEnrolled: false, biometricTypes: [] };
  }
};

export const getBiometricTypeLabel = async (): Promise<string> => {
  try {
    const { biometricTypes } = await checkBiometricAvailability();
    if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return "Face ID";
    }
    if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Fingerprint";
    }
    return "Biometrics";
  } catch {
    return "Biometrics";
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    if (enabled !== "true") return false;
    const empId = await SecureStore.getItemAsync(SECURE_EMP_ID_KEY);
    const password = await SecureStore.getItemAsync(SECURE_PASSWORD_KEY);
    return Boolean(empId && password);
  } catch (error) {
    console.warn("Error checking if biometric is enabled:", error);
    return false;
  }
};

export const saveBiometricCredentials = async (
  empId: string,
  password: string,
): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(SECURE_EMP_ID_KEY, empId.trim());
    await SecureStore.setItemAsync(SECURE_PASSWORD_KEY, password);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
    return true;
  } catch (error) {
    console.error("Error saving biometric credentials:", error);
    return false;
  }
};

export const getBiometricCredentials = async (): Promise<{
  empId: string;
  password: string;
} | null> => {
  try {
    const empId = await SecureStore.getItemAsync(SECURE_EMP_ID_KEY);
    const password = await SecureStore.getItemAsync(SECURE_PASSWORD_KEY);
    if (empId && password) {
      return { empId, password };
    }
    return null;
  } catch (error) {
    console.error("Error retrieving biometric credentials:", error);
    return null;
  }
};

export const clearBiometricCredentials = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_EMP_ID_KEY);
    await SecureStore.deleteItemAsync(SECURE_PASSWORD_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
  } catch (error) {
    console.warn("Error clearing biometric credentials:", error);
  }
};

export const authenticateWithBiometrics = async (
  promptMessage = "Verify your identity to sign in",
): Promise<boolean> => {
  try {
    const { hasHardware, isEnrolled } = await checkBiometricAvailability();
    if (!hasHardware || !isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error("Biometric authentication failed:", error);
    return false;
  }
};

// --- Remember Me helpers ---

export const saveRememberMeCredentials = async (
  empId: string,
  password: string,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMEMBER_ME_KEY, "true");
    await SecureStore.setItemAsync(REMEMBER_EMP_ID_KEY, empId.trim());
    await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, password);
  } catch (error) {
    console.error("Error saving remember me credentials:", error);
  }
};

export const getRememberMeCredentials = async (): Promise<{
  empId: string;
  password: string;
} | null> => {
  try {
    const isRemembered = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    if (isRemembered !== "true") return null;

    const empId = await SecureStore.getItemAsync(REMEMBER_EMP_ID_KEY);
    const password = await SecureStore.getItemAsync(REMEMBER_PASSWORD_KEY);
    if (empId && password) {
      return { empId, password };
    }
    return null;
  } catch (error) {
    console.error("Error retrieving remember me credentials:", error);
    return null;
  }
};

export const clearRememberMeCredentials = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    await SecureStore.deleteItemAsync(REMEMBER_EMP_ID_KEY);
    await SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY);
  } catch (error) {
    console.warn("Error clearing remember me credentials:", error);
  }
};

export default {
  checkBiometricAvailability,
  getBiometricTypeLabel,
  isBiometricEnabled,
  saveBiometricCredentials,
  getBiometricCredentials,
  clearBiometricCredentials,
  authenticateWithBiometrics,
  saveRememberMeCredentials,
  getRememberMeCredentials,
  clearRememberMeCredentials,
};
