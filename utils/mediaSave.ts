import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

/**
 * Safely saves an image or file to the device gallery or shares it.
 * Works seamlessly in both Expo Go and native builds without requiring top-level native modules.
 */
export async function saveImageToGallery(sourceUri: string, filenamePrefix: string = "QRCode"): Promise<boolean> {
  try {
    const fileUri = `${(FileSystem as any).documentDirectory}${filenamePrefix}_${Date.now()}.png`;
    let localUri = sourceUri;

    if (sourceUri.startsWith("http://") || sourceUri.startsWith("https://")) {
      const response = await FileSystem.downloadAsync(sourceUri, fileUri);
      localUri = response.uri;
    }

    // Attempt MediaLibrary dynamically if supported by native client
    try {
      const MediaLibrary = require("expo-media-library");
      if (MediaLibrary && typeof MediaLibrary.requestPermissionsAsync === "function") {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status === "granted") {
          const asset = await MediaLibrary.createAssetAsync(localUri);
          await MediaLibrary.createAlbumAsync("Download", asset, false);
          return true;
        }
      }
    } catch (_) {
      // Fallback for Expo Go or when ExpoMediaLibraryNext is not present
    }

    // Fallback to Sharing (Works 100% cleanly in Expo Go)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
      return true;
    }

    return false;
  } catch (error) {
    console.error("saveImageToGallery error:", error);
    return false;
  }
}
