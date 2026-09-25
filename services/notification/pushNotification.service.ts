import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import { navigate } from "@/services/navigation/navigationService";
import { DCMNotificationItem } from "./notification.types";

const CHANNEL_ID = "dcm-otp-notifications";
const AUTH_STORAGE_KEY = "@auth_state";

// Configure how notifications appear when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Silent fallback for Expo Go
}

class PushNotificationService {
  private isInitialized = false;
  private responseSubscription: any = null;
  private registeredTokens = new Set<string>();
  private isRegisteringToken = false;
  private lastUserId: string | number | null = null;

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Request / verify notification permission (Crucial for iOS and Android 13+)
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }
        console.log("📱 [PushNotificationService] Notification permission status:", finalStatus);
      } catch (permErr) {
        console.warn("[PushNotificationService] Permission check error:", permErr);
      }

      // Create the Android notification channel
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: "Return Order OTP Notifications",
            importance: Notifications.AndroidImportance.MAX,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
            enableVibrate: true,
            showBadge: true,
          });
        } catch (_) {
          // Channel creation not supported in this runtime
        }
      }

      // Handle user tapping on a system notification
      try {
        this.responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response?.notification?.request?.content?.data;
            console.log("[PushNotificationService] User tapped notification:", data);
            // Navigate to MyNotifications screen when notification is tapped
            navigate("MyNotifications");
          });
      } catch (_) {
        // Listener not available in Expo Go
      }
      // Register push token with backend if device & permissions are ready
      this.registerPushToken().catch((e) =>
        console.warn("[PushNotificationService] Initial token registration deferred:", e?.message)
      );
    } catch (error) {
      console.warn("[PushNotificationService] Init error:", error);
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) return parsed.token;
      }
    } catch (_) {}
    return store.getState()?.auth?.token || null;
  }

  /**
   * Registers push token(s) (native FCM and/or Expo) with the backend database
   */
  async registerPushToken(): Promise<void> {
    if (this.isRegisteringToken) return;
    this.isRegisteringToken = true;

    try {
      const authToken = await this.getAuthToken();
      if (!authToken) {
        return;
      }

      const currentUserId = store.getState()?.auth?.id;
      if (currentUserId && this.lastUserId !== currentUserId) {
        this.registeredTokens.clear();
        this.lastUserId = currentUserId;
      }

      if (!Device.isDevice) {
        console.log("ℹ️ [PushNotificationService] Push notifications require a physical device.");
        return;
      }

      // Check/request permission
      let finalStatus = "undetermined";
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }
      } catch (permErr: any) {
        console.warn("[PushNotificationService] Permission check error:", permErr?.message);
      }

      if (finalStatus !== "granted") {
        console.warn("⚠️ [PushNotificationService] Notification permission not granted:", finalStatus);
        return;
      }

      // 1. Native Device Push Token (FCM on Android, APNs on iOS)
      try {
        const devTokenObj = await Notifications.getDevicePushTokenAsync();
        if (devTokenObj?.data) {
          console.log(`📱 [PushNotificationService] Obtained native device token (${devTokenObj.type}):`, devTokenObj.data.slice(0, 20) + "...");
          await this.sendTokenToBackend(
            authToken,
            devTokenObj.data,
            devTokenObj.type || (Platform.OS === "android" ? "fcm" : "apns")
          );
        }
      } catch (devErr: any) {
        console.warn("⚠️ [PushNotificationService] Native device token not available:", devErr?.message);
      }

      // 2. Expo Push Token (secondary fallback)
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
        const expoTokenObj = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (expoTokenObj?.data) {
          console.log("📱 [PushNotificationService] Obtained Expo push token:", expoTokenObj.data.slice(0, 25) + "...");
          await this.sendTokenToBackend(authToken, expoTokenObj.data, "expo");
        }
      } catch (expoErr: any) {
        console.log("ℹ️ [PushNotificationService] Expo push token not obtained (normal in pure FCM build):", expoErr?.message);
      }
    } catch (err: any) {
      console.warn("❌ [PushNotificationService] registerPushToken error:", err?.message);
    } finally {
      this.isRegisteringToken = false;
    }
  }

  private async sendTokenToBackend(authToken: string, pushToken: string, tokenType: string): Promise<void> {
    const cacheKey = `${pushToken}_${tokenType}`;
    if (this.registeredTokens.has(cacheKey)) return;

    try {
      const url = `${environment.API_BASE_URL}api/distribution-manager/save-push-token`;
      const response = await axios.post(
        url,
        {
          pushToken,
          tokenType: tokenType.toLowerCase() === "expo" ? "expo" : "fcm",
          deviceType: Platform.OS,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data?.success) {
        console.log(`✅ [PushNotificationService] Push token registered on backend (${tokenType})`);
        this.registeredTokens.add(cacheKey);
      }
    } catch (apiErr: any) {
      console.error("❌ [PushNotificationService] Failed to send push token to backend:", apiErr?.response?.data || apiErr?.message);
    }
  }

  /**
   * Displays an OS-level system notification in the status bar & lock screen.
   * Works when app is in foreground, background, or locked.
   */
  async displayLocalNotification(item: DCMNotificationItem, bodyText: string) {
    if (!bodyText) return;

    try {
      // Ensure Android channel is ready with high priority
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: "Return Order OTP Notifications",
            importance: Notifications.AndroidImportance.MAX,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
            enableVibrate: true,
            showBadge: true,
          });
        } catch (_) {
          // Continue even if channel recreation fails
        }
      }

      const title = "Return Order OTP";
      const invoiceNumber = item?.invNo || item?.invoiceNo || "";
      const displayBody = invoiceNumber ? `Order #${invoiceNumber}: ${bodyText}` : bodyText;

      console.log("🔔 [PushNotificationService] Scheduling local notification:", title, displayBody);

      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: displayBody,
            data: { ...item },
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            color: "#980775",
          },
          trigger:
            Platform.OS === "android"
              ? ({ channelId: CHANNEL_ID } as any)
              : null,
        });
        console.log("✅ [PushNotificationService] Notification scheduled successfully with ID:", notifId);
      } catch (err) {
        console.warn("⚠️ [PushNotificationService] Failed with channelId, attempting fallback trigger: null:", err);
        // Fallback without channelId trigger
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: displayBody,
            data: { ...item },
            sound: "default",
            color: "#980775",
          },
          trigger: null,
        });
        console.log("✅ [PushNotificationService] Fallback notification scheduled with ID:", notifId);
      }
    } catch (error) {
      console.warn(
        "[PushNotificationService] Failed to display system notification:",
        error
      );
    }
  }

  destroy() {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    this.isInitialized = false;
  }
}

export default new PushNotificationService();
