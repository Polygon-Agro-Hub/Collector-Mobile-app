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

const QUICK_ACCESS_KEY = "@quick_access_scale_enabled";
type QuickAccessListener = (enabled: boolean) => void;
const quickAccessListeners = new Set<QuickAccessListener>();

/**
 * Check if Quick Access to Scale floating button is enabled (default: true)
 */
export async function isQuickAccessScaleEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(QUICK_ACCESS_KEY);
    if (val === null) return true; // Default to enabled
    return val === "true";
  } catch {
    return true;
  }
}

/**
 * Set Quick Access to Scale floating button enabled state
 */
export async function setQuickAccessScaleEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(QUICK_ACCESS_KEY, enabled ? "true" : "false");
    quickAccessListeners.forEach((listener) => {
      try {
        listener(enabled);
      } catch (err) {
        console.error("Error in quick access listener:", err);
      }
    });
  } catch (err) {
    console.error("Failed to set quick access scale enabled:", err);
  }
}

/**
 * Subscribe to changes in the Quick Access to Scale setting
 */
export function subscribeQuickAccessScale(listener: QuickAccessListener): () => void {
  quickAccessListeners.add(listener);
  return () => {
    quickAccessListeners.delete(listener);
  };
}
