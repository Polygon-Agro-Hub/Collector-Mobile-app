/**
 * Screens that should bleed edge-to-edge without SafeAreaView padding/insets.
 * - Splash: Full screen branding
 * - Permission Screens: CameraAccess, LocationAccess, NotificationAccess (dark theme edge-to-edge)
 */
export const BLEED_SCREENS = [
  "Splash",
  "CameraAccess",
  "LocationAccess",
  "NotificationAccess",
] as const;

export type BleedScreenName = typeof BLEED_SCREENS[number];

export const isBleedScreen = (routeName?: string): boolean => {
  if (!routeName) return false;
  return (BLEED_SCREENS as readonly string[]).includes(routeName);
};

export const getScreenBackgroundColor = (routeName?: string): string => {
  if (
    routeName === "CameraAccess" ||
    routeName === "LocationAccess" ||
    routeName === "NotificationAccess"
  ) {
    return "#121212";
  }
  return "#ffffff";
};

export const getScreenStatusBarStyle = (
  routeName?: string
): "light-content" | "dark-content" => {
  if (
    routeName === "CameraAccess" ||
    routeName === "LocationAccess" ||
    routeName === "NotificationAccess"
  ) {
    return "light-content";
  }
  return "dark-content";
};
