const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Helper to sanitize and enforce permissions on an AndroidManifest object
 */
function processManifest(androidManifest) {
  if (!androidManifest) return;

  if (!androidManifest.$) {
    androidManifest.$ = {};
  }
  if (!androidManifest.$["xmlns:tools"]) {
    androidManifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
  }

  const blocked = [
    "com.google.android.gms.permission.AD_ID",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
    "android.permission.READ_MEDIA_AUDIO",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
    "android.permission.ACCESS_MEDIA_LOCATION",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.CALL_PHONE",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
    "android.permission.WAKE_LOCK",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.CHANGE_WIFI_STATE",
    "android.permission.CHANGE_NETWORK_STATE",
  ];

  if (!Array.isArray(androidManifest["uses-permission"])) {
    androidManifest["uses-permission"] = [];
  }

  // 1. Strip any active uses-permission matching the blocked list
  androidManifest["uses-permission"] = androidManifest["uses-permission"].filter(
    (perm) => {
      const name = perm?.$?.["android:name"];
      const isBlocked = blocked.includes(name);
      const isRemoveNode = perm?.$?.["tools:node"] === "remove";
      // Keep only if it's not in blocked list, or if it already has tools:node="remove"
      return !isBlocked || isRemoveNode;
    }
  );

  // 2. Ensure each blocked permission is explicitly marked with tools:node="remove"
  for (const permName of blocked) {
    const alreadyHasRemove = androidManifest["uses-permission"].some(
      (p) => p?.$?.["android:name"] === permName && p?.$?.["tools:node"] === "remove"
    );
    if (!alreadyHasRemove) {
      androidManifest["uses-permission"].push({
        $: {
          "android:name": permName,
          "tools:node": "remove",
        },
      });
    }
  }

  // 3. Explicitly remove android:requestLegacyExternalStorage from <application>
  if (Array.isArray(androidManifest.application)) {
    androidManifest.application.forEach((app) => {
      if (app && app.$) {
        delete app.$["android:requestLegacyExternalStorage"];
      }
    });
  }

  // 4. Ensure BLUETOOTH_SCAN has neverForLocation flag
  const btScan = androidManifest["uses-permission"].find(
    (p) => p?.$?.["android:name"] === "android.permission.BLUETOOTH_SCAN"
  );
  if (btScan && btScan.$) {
    btScan.$["android:usesPermissionFlags"] = "neverForLocation";
    btScan.$["tools:targetApi"] = "31";
  }

  // 5. Clean up conflicting uses-permission-sdk-23 entries (injected by react-native-ble-plx)
  if (Array.isArray(androidManifest["uses-permission-sdk-23"])) {
    androidManifest["uses-permission-sdk-23"] = androidManifest["uses-permission-sdk-23"].filter(
      (perm) => {
        const name = perm?.$?.["android:name"];
        return (
          name !== "android.permission.ACCESS_COARSE_LOCATION" &&
          name !== "android.permission.ACCESS_FINE_LOCATION"
        );
      }
    );
    if (androidManifest["uses-permission-sdk-23"].length === 0) {
      delete androidManifest["uses-permission-sdk-23"];
    }
  }

  // 6. Ensure location permissions do not have maxSdkVersion and instruct manifest merger to strip maxSdkVersion
  const locationPermissions = [
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
  ];

  for (const locPerm of locationPermissions) {
    let perm = androidManifest["uses-permission"].find(
      (p) => p?.$?.["android:name"] === locPerm
    );
    if (!perm) {
      perm = {
        $: {
          "android:name": locPerm,
        },
      };
      androidManifest["uses-permission"].push(perm);
    }
    if (perm && perm.$) {
      delete perm.$["android:maxSdkVersion"];
      perm.$["tools:remove"] = "android:maxSdkVersion";
    }
  }
}

/**
 * Expo config plugin to explicitly block and remove unwanted permissions,
 * resolve maxSdkVersion location conflicts from BLE libraries, and protect the manifest.
 */
function withCustomAndroidPermissions(config) {
  config = withAndroidManifest(config, async (config) => {
    processManifest(config.modResults.manifest);
    return config;
  });

  // Guarantee post-processing by wrapping the final mod runner
  if (config.mods?.android?.manifest) {
    const originalMod = config.mods.android.manifest;
    config.mods.android.manifest = async (props) => {
      const result = await originalMod(props);
      if (result?.modResults?.manifest) {
        processManifest(result.modResults.manifest);
      }
      return result;
    };
  }

  return config;
}

module.exports = withCustomAndroidPermissions;
