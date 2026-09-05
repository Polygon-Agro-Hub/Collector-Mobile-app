import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedScale {
  id: string;
  name: string;
  type: "wifi" | "bluetooth";
  ip?: string;
  port?: number;
  macAddress?: string;
  connected: boolean;
  lastWeight?: number;
}

const SCALE_STORAGE_KEY = "@saved_collection_scale";

/**
 * Save selected scale configuration to local storage
 */
export async function saveSelectedScale(scale: SavedScale): Promise<void> {
  try {
    await AsyncStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify(scale));
  } catch (err) {
    console.error("Failed to save scale:", err);
  }
}

/**
 * Retrieve saved scale from local storage
 */
export async function getSavedScale(): Promise<SavedScale | null> {
  try {
    const json = await AsyncStorage.getItem(SCALE_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error("Failed to load saved scale:", err);
    return null;
  }
}

/**
 * Clear saved scale
 */
export async function clearSavedScale(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SCALE_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear saved scale:", err);
  }
}
