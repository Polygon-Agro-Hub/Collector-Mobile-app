import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import { navigate } from "@/services/navigation/navigationService";
import { DCMNotificationItem } from "./notification.types";

const CHANNEL_ID = "dcm-otp-notifications";

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
    } catch (error) {
      console.warn("[PushNotificationService] Init error:", error);
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
