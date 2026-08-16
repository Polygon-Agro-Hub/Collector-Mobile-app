import { useEffect, useState } from "react";
import { Alert, AppState, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { environment } from "../environment/environment";
import { LanguageProvider } from "@/context/LanguageContext";
import axios from "axios";
import { logoutUser } from "../store/authSlice";
import { AlertModal, setGlobalAlertListener } from "@/component/components/popup/AlertModal";
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
    let alertShown = false;

    const handleAuthError = (status: number, data: any) => {
      let currentRouteName = "";
      if (navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute() as any;
        currentRouteName = route?.name || "";
      }

      const userToken = store.getState().auth.token;
      if (
        !userToken ||
        currentRouteName === "Login" ||
        currentRouteName === "Splash" ||
        currentRouteName === "BannedScreen" ||
        currentRouteName === "Logout"
      ) {
        return;
      }

      const msg = (data?.message || "").toLowerCase();
      const accStatus = (data?.accountStatus || "").toLowerCase();

      const isAccountBanOrRejection =
        accStatus === "not approved" ||
        accStatus === "rejected" ||
        msg.includes("not approved") ||
        msg.includes("rejected") ||
        msg.includes("emp id is not approved") ||
        msg.includes("emp id is rejected");

      try {
        store.dispatch(logoutUser());
      } catch (e) {
        console.error("Error dispatching logout:", e);
      }

      if (isAccountBanOrRejection) {
        if (navigationRef.isReady()) {
          const statusType =
            accStatus === "rejected" || msg.includes("rejected")
              ? "rejected"
              : "not_approved";

          navigationRef.reset({
            index: 0,
            routes: [
              {
                name: "BannedScreen",
                params: {
                  statusType,
                  message: data?.message,
                },
              },
            ],
          });
        }
      } else {
        // Token expired / session expired
        if (!alertShown) {
          alertShown = true;
          Alert.alert(
            "Session Expired",
            "Your token has expired. Please log in again.",
            [
              {
                text: "OK",
                onPress: () => {
                  alertShown = false;
                  if (navigationRef.isReady()) {
                    navigationRef.reset({
                      index: 0,
                      routes: [{ name: "Login" }],
                    });
                  }
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          }
        }
      }
    };

    // Axios response interceptor
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const errorResponse = error.response;
        if (errorResponse && (errorResponse.status === 401 || errorResponse.status === 403)) {
          handleAuthError(errorResponse.status, errorResponse.data);
          return new Promise(() => {});
        }
        return Promise.reject(error);
      }
    );

    // Global fetch interceptor (monkeypatch)
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = async (...args: any[]) => {
      const response = await originalFetch(...args);

      if (response.status === 401 || response.status === 403) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          handleAuthError(response.status, data);
        } catch (e) {
          handleAuthError(response.status, {});
        }
      }

      return response;
    };

    return () => {
      axios.interceptors.response.eject(interceptor);
      (globalThis as any).fetch = originalFetch;
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

  const onlineStatus = async () => {
    AppState.addEventListener("change", async (nextAppState) => {
      const storedEmpId = store.getState().auth.empId;

      if (nextAppState === "active") {
        if (storedEmpId) {
          await status(storedEmpId, true);
        }
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
        <NavigationContainer ref={navigationRef}>
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