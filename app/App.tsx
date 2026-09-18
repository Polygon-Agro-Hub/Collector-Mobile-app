import { useEffect, useState } from "react";
import { Alert, AppState, StatusBar, Platform, LogBox } from "react-native";

LogBox.ignoreLogs([
  "InteractionManager has been deprecated",
  "setBackgroundColorAsync is not supported with edge-to-edge enabled",
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "expo-notifications: Android Push notifications",
]);
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import environment from "../environment/environment";
import { LanguageProvider } from "@/context/LanguageContext";
import axios from "axios";
import { logoutUser } from "../store/authSlice";
import { AlertModal, setGlobalAlertListener } from "@/component/components/popup/AlertModal";
import { verifyOfficerStatus, setupGlobalApiInterceptors } from "@/services/apiInterceptor";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { navigationRef } from "../navigationRef";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import store from "@/services/reducxStore";
import RootStackNavigator from "../routes/Routes";
import * as Notifications from "expo-notifications";
import socketService from "@/services/socket/socket.service";
import pushNotificationService from "@/services/notification/pushNotification.service";
import { ROLES } from "@/constants/user-roles";


// Global notifications handler (guarded for Expo Go & standalone)
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
} catch (handlerErr) {
  console.warn("Notifications.setNotificationHandler skipped in Expo Go:", handlerErr);
}

function AppContent() {
  const { t } = useTranslation();

  const [isOfflineAlertShown, setIsOfflineAlertShown] = useState(false);
  const [alertState, setAlertState] = useState({
    visible: false,
    title: "",
    message: "" as string | React.ReactNode,
    type: "error" as "success" | "error",
    onClose: (() => {}) as () => void,
    autoClose: true,
    showOkButton: undefined as boolean | undefined,
  });

  useEffect(() => {
    // Initialize push notification service (requests permissions on iOS/Android, creates Android channel)
    pushNotificationService.init();

    // Auto-connect socket whenever token is available (on startup or after login/loadPersistedAuth)
    const checkAndConnect = () => {
      const token = store.getState().auth.token;
      if (token) {
        socketService.connect();
      }
    };
    checkAndConnect();
    const unsubscribeStore = store.subscribe(checkAndConnect);

    // When a new notification arrives (via socket OR polling), show a system notification
    const unsubscribeNotif = socketService.onNewNotification((item) => {
      console.log("📲 [App.tsx] onNewNotification received:", item?.id, item?.invNo, item?.otpCode);
      const currentRole = store.getState().auth.jobRole;
      const isDCM = currentRole === ROLES.DISTRIBUTION_MANAGER;
      // Allow if DCM or if role is still loading
      if (currentRole && !isDCM) return;

      const invoiceNumber = item?.invNo || item?.invoiceNo || "";
      const otp = item?.otpCode || item?.otp || "";
      const bodyText = invoiceNumber
        ? `Please use the following OTP code, "${otp}", to receive the order from the driver at the centre.`
        : "New handover return order OTP notification received.";

      pushNotificationService.displayLocalNotification(item, bodyText);
    });

    return () => {
      unsubscribeStore();
      unsubscribeNotif();
    };
  }, []);

  useEffect(() => {
    setGlobalAlertListener((title, message, type, onClose, autoClose, showOkButton) => {
      setAlertState({
        visible: true,
        title,
        message,
        type,
        onClose: () => {
          setAlertState((prev) => ({ ...prev, visible: false }));
          if (onClose) {
            onClose();
          }
        },
        autoClose,
        showOkButton,
      });
    });
  }, []);

  useEffect(() => {
    setupGlobalApiInterceptors();

    // Periodically verify officer status (every 10 seconds) when app is active and user is logged in
    const interval = setInterval(() => {
      const token = store.getState().auth?.token;
      if (token && AppState.currentState === "active") {
        verifyOfficerStatus();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    onlineStatus();
    // Hide splash screen when app is ready
    SplashScreen.hideAsync().catch((err) => {
      console.warn("Failed to hide splash screen:", err);
    });
  }, []);
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (!state.isConnected && !isOfflineAlertShown) {
        setIsOfflineAlertShown(true);
        Alert.alert(
          t("Main.No Internet Connection"),
          t("Main.Please turn on mobile data or Wi-Fi to continue."),
          [
            {
              text: "OK",
              onPress: () => {
                setIsOfflineAlertShown(false);
              },
            },
          ],
        );
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [isOfflineAlertShown]);

  // Handle online/offline status updates
  const onlineStatus = async () => {
    AppState.addEventListener("change", async (nextAppState) => {
      const storedEmpId = store.getState().auth.empId;

      if (nextAppState === "active") {
        if (storedEmpId) {
          await status(storedEmpId, true);
        }
        await verifyOfficerStatus(true);
      } else if (nextAppState === "background") {
        if (storedEmpId) {
          await status(storedEmpId, false);
        }
      }
    });
  };

  const status = async (empId: string, status: boolean) => {
    try {
      const token = store.getState().auth.token;
      if (!token) {
        console.error("Token not found");
        return;
      }

      await fetch(
        `${environment.API_BASE_URL}api/collection-officer/online-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empId: empId,
            status: status,
          }),
        },
      );
    } catch (error) {
      console.error("Online status error:", error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
        }}
        edges={["top", "right", "left"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <NavigationContainer
          ref={navigationRef}
          onStateChange={async () => {
            const token = store.getState().auth?.token;
            if (token) {
              await verifyOfficerStatus();
            }
          }}
        >
          <RootStackNavigator />
        </NavigationContainer>
        <AlertModal
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          onClose={alertState.onClose}
          autoClose={alertState.autoClose}
          showOkButton={alertState.showOkButton}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
