import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedPrinter {
  name: string;
  url?: string;
  type: "bluetooth";
}

const PRINTER_STORAGE_KEY = "@saved_packing_printer";

/**
 * Save selected printer to local storage
 */
export async function saveSelectedPrinter(printer: SavedPrinter): Promise<void> {
  try {
    await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
  } catch (err) {
    console.error("Failed to save printer:", err);
  }
}

/**
 * Retrieve saved printer from local storage
 */
export async function getSavedPrinter(): Promise<SavedPrinter | null> {
  try {
    const json = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error("Failed to load saved printer:", err);
    return null;
  }
}

/**
 * Clear saved printer
 */
export async function clearSavedPrinter(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear saved printer:", err);
  }
}
