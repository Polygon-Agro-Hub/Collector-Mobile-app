const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Custom Expo config plugin — withRemoveScreenOrientation
 *
 * Problem:
 *   When app.json has "orientation": "portrait", Expo automatically adds
 *   android:screenOrientation="portrait" to the MainActivity <activity> tag.
 *   Even if android.hardware.screen.portrait is marked as android:required="false"
 *   in <uses-feature>, Google Play Console still reads the Activity-level
 *   screenOrientation attribute and flags ~19,500 devices (tablets, foldables,
 *   Chromebooks, Android XR) as unsupported.
 *
 * Fix:
 *   Remove android:screenOrientation from the MainActivity activity tag entirely.
 *   This lets the OS handle orientation naturally and removes the Play Store
 *   device exclusion without affecting runtime portrait behaviour
 *   (which is enforced by configChanges and the React Native layout system).
 */
function withRemoveScreenOrientation(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    if (!Array.isArray(androidManifest.application)) {
      return config;
    }

    for (const application of androidManifest.application) {
      if (!Array.isArray(application.activity)) continue;

      for (const activity of application.activity) {
        const activityName = activity?.$?.["android:name"];

        // Target only the MainActivity
        if (activityName === ".MainActivity" || activityName?.includes("MainActivity")) {
          if (activity.$ && activity.$["android:screenOrientation"]) {
            delete activity.$["android:screenOrientation"];
            console.log(
              "[withRemoveScreenOrientation] Removed android:screenOrientation from MainActivity"
            );
          }
        }
      }
    }

    return config;
  });
}

module.exports = withRemoveScreenOrientation;
