import { useEffect, useState, useCallback } from "react";
import { Alert, Text, TextInput, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppState } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../services/reducxStore";
import { Provider } from "react-redux";
import { environment } from "../environment/environment";
import { LanguageProvider } from "@/context/LanguageContext";
import { LogBox } from "react-native";
import axios from "axios";
import { logoutUser } from "../store/authSlice";
import { AlertModal, setGlobalAlertListener } from "@/component/commons/AlertModal";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { navigationRef } from "../navigationRef";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import Login from "@/component/auth/Login";
import BannedScreen from "@/component/auth/BannedScreen";
import ChangePassword from "@/component/auth/ChangePassword";
import Registeredfarmer from "@/component/collection-common/Registeredfarmer";
import Ufarmercropdetails from "@/component/collection-common/Ufarmercropdetails";
import CollectionOfficerDashboard from "@/component/collection-officer/CollectionOfficerDashboard";
import QRScanner from "@/component/collection-common/QRScanner";
import FormScreen from "@/component/collection-common/FormScreen";
import UnregisteredFarmerDetails from "@/component/farmer/UnregisteredFarmerForm";
import UnregisteredCropDetails from "@/component/collection-common/UnregisteredCropDetails";
import SearchFarmer from "@/component/farmer/SearchFarmer";
import FarmerQr from "@/component/farmer/FarmerQr";
import ComplainPage from "@/component/complain/ComplainPage";
import Profile from "@/component/auth/Profile";
import ReportPage from "@/component/collection-common/ReportPage";
import SearchPriceScreen from "@/component/collection-common/SearchPriceScreen";
import PriceChart from "@/component/collection-common/PriceChart";
import PriceChartManager from "@/component/collection-manager/PriceChartManager";
import CollectionOfficersList from "@/component/collection-manager/CollectionOfficersList";
import OfficerSummary from "@/component/collection-manager/OfficerSummary";
import ReportGenerator from "@/component/collection-manager/ReportGenerator";
import ComplainHistory from "@/component/complain/ComplainHistory";
import DailyTargetList from "@/component/collection-common/DailyTargetList";
import AddOfficer from "@/component/collection-manager/AddOfficer";
import ClaimOfficer from "@/component/collection-manager/ClaimOfficer";
import TransactionList from "@/component/collection-manager/TransactionList";
import FarmerReport from "@/component/collection-manager/FarmerReport";
import DailyTarget from "@/component/collection-manager/DailyTarget";
import NoCollectionCenterScreen from "@/component/collection-common/NoCollectionCenterScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EditTargetScreen from "@/component/collection-manager/EditTargetScreen";
import PassTargetScreen from "@/component/collection-manager/PassTargetScreen";
import RecieveTargetScreen from "@/component/collection-manager/RecieveTargetScreen";
import DailyTargetListForOfficers from "@/component/collection-manager/DailyTargetListForOfficers";
import EditTargetManager from "@/component/collection-manager/EditTargetManager";
import RecieveTargetBetweenOfficers from "@/component/collection-manager/RecieveTargetBetweenOfficers";
import PassTargetBetweenOfficers from "@/component/collection-manager/PassTargetBetweenOfficers";
import OTPE from "@/component/farmer/FarmerOTPVerification";
import ManagerDashboard from "@/component/collection-manager/ManagerDashboard";
import CenterTarget from "@/component/collection-manager/CenterTarget";
import ManagerTransactions from "@/component/collection-manager/ManagerTransactions";
import NewReport from "@/component/collection-common/NewReport";
import TransactionReport from "@/component/collection-manager/TransactionReport";
import UpdateFarmerBankDetails from "@/component/collection-common/UpdateFarmerBankDetails";
import otpBankDetailsupdate from "@/component/collection-common/otpBankDetailsupdate";
import DistridutionaDashboard from "@/component/distribution-common/DistridutionaDashboard";
import PurchaseShortage from "@/component/disribution/dcm/purchase-shortage/PurchaseShortage";
import PurchaseProduct from "@/component/disribution/dcm/purchase-shortage/PurchaseProduct";
import TargetOrderScreen from "@/component/distribution-common/TargetOrderScreen";
import Timer from "@/component/distribution-common/TimerContainer";
import TimerContainer from "@/component/distribution-common/TimerContainer";
import CenterTargetScreen from "@/component/disribution-manger/CenterTargetScreen";
import DistributionOfficersList from "@/component/disribution-manger/DistributionOfficersList";
import ClaimDistribution from "@/component/disribution-manger/ClaimDistribution";
import DistributionOfficerSummary from "@/component/disribution-manger/DistributionOfficerSummary";
import DailyTargetListOfficerDistribution from "@/component/disribution-manger/DailyTargetListOfficerDistribution";
import PassTarget from "@/component/disribution-manger/PassTarget";
import store from "@/services/reducxStore";
import DistributionOfficerReport from "@/component/disribution-manger/DistributionOfficerReport";
import ReadytoPickupOrders from "@/component/distribution-common/ReadytoPickupOrders";
import ViewPickupOrders from "@/component/distribution-common/ViewPickupOrders";
import Qrcode from "@/component/disribution-manger/qrcode";
import DigitalSignature from "@/component/disribution-manger/DigitalSignature";
import ReceivedCash from "@/component/disribution-manger/ReceivedCash";
import ReceivedCashOfficer from "@/component/distribution-officer/ReceivedCashOfficer";
import ReceivedCashQrCode from "@/component/distribution-officer/ReceivedCashQrCode";
import GoviPensionForm from "@/component/govi-pension/GoviPensionForm";
import GoviPensionStatus from "@/component/govi-pension/GoviPensionStatus";
import NotEligibleScreen from "@/component/govi-pension/NotEligibleScreen";
import Splash from "@/component/auth/Splash";
import Lanuage from "@/component/commons/Lanuage";
import OfficerQr from "@/component/auth/OfficerQrCode";
import SideMenu from "@/component/navigations/SideMenu";
import PrivacyPolicy from "@/component/commons/PrivacyPolicy";
import BottomNav from "@/component/navigations/BottomNav";
import LoadingPage from "@/component/commons/LoadingPage";
import DistributionAddOfficer from "@/component/disribution-manger/DistributionAddOfficer";
import SelectRow from "@/component/pack/SelectRow";
import QRHandling from "@/component/pack/qr-handling/QRHandling";
import ReadyToPrint from "@/component/pack/qr-handling/ReadyToPrint";
import PrintingConfirmation from "@/component/pack/qr-handling/PrintingConfirmation";
import WelcomeToPacking from "@/component/pack/packing/WelcomeToPacking";
import Packing from "@/component/pack/packing/Packing";
import WelcomeToQC from "@/component/pack/qc-position/WelcomeToQC";
import Group from "@/component/disribution/dcm/assign-groups/Group";
import SelectOrder from "@/component/disribution/dcm/assign-groups/SelectOrder";
import SelectRowToAssign from "@/component/disribution/dcm/assign-groups/SelectRowToAssign";
import ConfirmRowAssign from "@/component/disribution/dcm/assign-groups/ConfirmRowAssign";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const [initialTab, setInitialTab] = useState("CollectionOfficerDashboard");
  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

  useEffect(() => {
    if (
      jobRole === "Distribution Officer" ||
      jobRole === "Distribution Centre Manager"
    ) {
      setInitialTab("DistridutionaDashboard");
    } else if (jobRole === "Collection Officer") {
      setInitialTab("CollectionOfficerDashboard");
    } else {
      setInitialTab("ManagerDashboard");
    }
  }, [jobRole]);

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarStyle: { position: "absolute", backgroundColor: "#ffffff" },
      })}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen name="ManagerDashboard" component={ManagerDashboard as any} />
      <Tab.Screen name="SearchPriceScreen" component={SearchPriceScreen} />

      <Tab.Screen name="PriceChart" component={PriceChart as any} />
      <Tab.Screen name="SearchFarmer" component={SearchFarmer} />
      <Tab.Screen name="DailyTargetList" component={DailyTargetList} />
      <Tab.Screen name="DailyTarget" component={DailyTarget as any} />
      <Tab.Screen name="PassTargetScreen" component={PassTargetScreen as any} />
      <Tab.Screen name="ComplainHistory" component={ComplainHistory} />
      <Tab.Screen name="TransactionList" component={TransactionList as any} />
      <Tab.Screen name="OfficerSummary" component={OfficerSummary as any} />
      <Tab.Screen name="ViewPickupOrders" component={ViewPickupOrders as any} />
      <Tab.Screen name="ReceivedCash" component={ReceivedCash as any} />
      <Tab.Screen name="ReportGenerator" component={ReportGenerator as any} />
      <Tab.Screen name="PassTarget" component={PassTarget as any} />
      <Tab.Screen
        name="CollectionOfficerDashboard"
        component={CollectionOfficerDashboard}
      />
      <Tab.Screen
        name="UpdateFarmerBankDetails"
        component={UpdateFarmerBankDetails as any}
      />
      <Tab.Screen
        name="DistridutionaDashboard"
        component={DistridutionaDashboard as any}
      />
      <Tab.Screen
        name="PurchaseShortage"
        component={PurchaseShortage as any}
      />
      <Tab.Screen
        name="PurchaseProduct"
        component={PurchaseProduct as any}
        options={{ tabBarStyle: { display: "none" } }}
      />
      <Tab.Screen
        name="PriceChartManager"
        component={PriceChartManager as any}
      />
      <Tab.Screen
        name="UnregisteredCropDetails"
        component={UnregisteredCropDetails as any}
      />
      <Tab.Screen
        name="otpBankDetailsupdate"
        component={otpBankDetailsupdate as any}
      />
      <Tab.Screen
        name="CollectionOfficersList"
        component={CollectionOfficersList}
      />
      <Tab.Screen
        name="RecieveTargetScreen"
        component={RecieveTargetScreen as any}
      />
      <Tab.Screen
        name="EditTargetManager"
        component={EditTargetManager as any}
      />
      <Tab.Screen
        name="ReadytoPickupOrders"
        component={ReadytoPickupOrders as any}
      />
      <Tab.Screen
        name="ReceivedCashOfficer"
        component={ReceivedCashOfficer as any}
      />
      <Tab.Screen
        name="TargetOrderScreen"
        component={TargetOrderScreen as any}
      />
      <Tab.Screen
        name="UnregisteredFarmerDetails"
        component={UnregisteredFarmerDetails}
      />
      <Tab.Screen
        name="ManagerTransactions"
        component={ManagerTransactions as any}
      />
      <Tab.Screen
        name="DailyTargetListForOfficers"
        component={DailyTargetListForOfficers as any}
      />
      <Tab.Screen
        name="DistributionOfficersList"
        component={DistributionOfficersList}
      />
      <Tab.Screen name="ClaimOfficer" component={ClaimOfficer} />
      <Tab.Screen
        name="ClaimDistribution"
        component={ClaimDistribution as any}
      />
      <Tab.Screen
        name="DistributionOfficerSummary"
        component={DistributionOfficerSummary as any}
      />
      <Tab.Screen name="OTPE" component={OTPE} />
      <Tab.Screen
        name="DailyTargetListOfficerDistribution"
        component={DailyTargetListOfficerDistribution as any}
      />
      <Tab.Screen
        name="DistributionAddOfficer"
        component={DistributionAddOfficer as any}
      />
      <Tab.Screen name="EditTargetScreen" component={EditTargetScreen as any} />
      <Tab.Screen
        name="PassTargetBetweenOfficers"
        component={PassTargetBetweenOfficers as any}
      />
      <Tab.Screen name="SideMenu" component={SideMenu} />
      <Tab.Screen name="OfficerQr" component={OfficerQr} />
      <Tab.Screen
        name="AddOfficer"
        component={AddOfficer as any}
      />
      <Tab.Screen
        name="CenterTargetScreen"
        component={CenterTargetScreen as any}
      />
      <Tab.Screen name="FarmerQr" component={FarmerQr} />
      <Tab.Screen name="CenterTarget" component={CenterTarget as any} />
      <Tab.Screen
        name="DistributionOfficerReport"
        component={DistributionOfficerReport as any}
      />
      <Tab.Screen name="ComplainPage" component={ComplainPage} />
      <Tab.Screen
        name="RecieveTargetBetweenOfficers"
        component={RecieveTargetBetweenOfficers as any}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
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
    // Axios response interceptor
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const errorResponse = error.response;
        if (
          errorResponse &&
          (errorResponse.status === 401 || errorResponse.status === 403) &&
          (errorResponse.data?.accountStatus === "Not Approved" ||
            errorResponse.data?.accountStatus === "Rejected" ||
            errorResponse.data?.message === "This EMP ID is not approved." ||
            errorResponse.data?.message === "This EMP ID is Rejected" ||
            errorResponse.data?.message === "This account is not approved or has been rejected." ||
            (errorResponse.data?.message && errorResponse.data?.message.toLowerCase().includes("not approved")) ||
            (errorResponse.data?.message && errorResponse.data?.message.toLowerCase().includes("rejected")))
        ) {
          let currentRouteName = "";
          if (navigationRef.isReady()) {
            const route = navigationRef.getCurrentRoute() as any;
            currentRouteName = route?.name || "";
          }

          if (
            currentRouteName !== "Login" &&
            currentRouteName !== "Splash" &&
            currentRouteName !== "BannedScreen"
          ) {
            try {
              // Clear stored credentials
              await AsyncStorage.multiRemove([
                "token",
                "tokenStoredTime",
                "tokenExpirationTime",
                "jobRole",
                "empid",
                "companyNameEnglish",
                "companyNameSinhala",
                "companyNameTamil",
              ]);

              // Dispatch logout
              store.dispatch(logoutUser());

              if (navigationRef.isReady()) {
                const statusType =
                  errorResponse.data?.accountStatus === "Rejected" ||
                  (errorResponse.data?.message && errorResponse.data?.message.toLowerCase().includes("rejected"))
                    ? "rejected"
                    : "not_approved";

                navigationRef.reset({
                  index: 0,
                  routes: [
                    {
                      name: "BannedScreen",
                      params: {
                        statusType,
                        message: errorResponse.data?.message,
                      },
                    },
                  ],
                });
              }
            } catch (e) {
              console.error("Failed to perform force logout in Axios interceptor:", e);
            }

            return new Promise(() => {});
          }
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

          if (
            data.accountStatus === "Not Approved" ||
            data.accountStatus === "Rejected" ||
            data.message === "This EMP ID is not approved." ||
            data.message === "This EMP ID is Rejected" ||
            data.message === "This account is not approved or has been rejected." ||
            (data.message && data.message.toLowerCase().includes("not approved")) ||
            (data.message && data.message.toLowerCase().includes("rejected"))
          ) {
            let currentRouteName = "";
            if (navigationRef.isReady()) {
              const route = navigationRef.getCurrentRoute() as any;
              currentRouteName = route?.name || "";
            }

            if (
              currentRouteName !== "Login" &&
              currentRouteName !== "Splash" &&
              currentRouteName !== "BannedScreen"
            ) {
              // Clear stored credentials
              await AsyncStorage.multiRemove([
                "token",
                "tokenStoredTime",
                "tokenExpirationTime",
                "jobRole",
                "empid",
                "companyNameEnglish",
                "companyNameSinhala",
                "companyNameTamil",
              ]);

              // Dispatch logout
              store.dispatch(logoutUser());

              if (navigationRef.isReady()) {
                const statusType =
                  data.accountStatus === "Rejected" ||
                  (data.message && data.message.toLowerCase().includes("rejected"))
                    ? "rejected"
                    : "not_approved";

                navigationRef.reset({
                  index: 0,
                  routes: [
                    {
                      name: "BannedScreen",
                      params: {
                        statusType,
                        message: data.message,
                      },
                    },
                  ],
                });
              }
            }
          }
        } catch (e) {
          // Ignore json parsing / handling error
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
      const storedEmpId = await AsyncStorage.getItem("empid");

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
      const token = await AsyncStorage.getItem("token");
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
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="Splash" component={Splash} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="BannedScreen" component={BannedScreen as any} />
            <Stack.Screen name="FormScreen" component={FormScreen} />
            <Stack.Screen name="Lanuage" component={Lanuage} />

            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="ReportPage" component={ReportPage} />

            <Stack.Screen name="FarmerReport" component={FarmerReport as any} />

            <Stack.Screen name="NewReport" component={NewReport as any} />
            <Stack.Screen name="qrcode" component={Qrcode as any} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
            <Stack.Screen name="Timer" component={Timer as any} />

            <Stack.Screen name="QRScanner" component={QRScanner} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePassword as any}
            />
            <Stack.Screen
              name="Registeredfarmer"
              component={Registeredfarmer}
            />
            <Stack.Screen
              name="Ufarmercropdetails"
              component={Ufarmercropdetails}
            />

            <Stack.Screen
              name="ReceivedCashQrCode"
              component={ReceivedCashQrCode as any}
            />

            <Stack.Screen
              name="NoCollectionCenterScreen"
              component={NoCollectionCenterScreen}
            />

            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="TransactionReport"
              component={TransactionReport as any}
            />

            <Stack.Screen
              name="SelectRow"
              component={SelectRow as any}
            />

            <Stack.Screen
              name="QRHandling"
              component={QRHandling as any}
            />

            <Stack.Screen
              name="ReadyToPrint"
              component={ReadyToPrint as any}
            />

            <Stack.Screen
              name="PrintingConfirmation"
              component={PrintingConfirmation as any}
            />

            <Stack.Screen
              name="WelcomeToPacking"
              component={WelcomeToPacking as any}
            />

            <Stack.Screen
              name="Packing"
              component={Packing as any}
            />

            <Stack.Screen
              name="WelcomeToQC"
              component={WelcomeToQC as any}
            />

            <Stack.Screen
              name="Group"
              component={Group as any}
            />

            <Stack.Screen
              name="SelectOrder"
              component={SelectOrder as any}
            />

            <Stack.Screen
              name="SelectRowToAssign"
              component={SelectRowToAssign as any}
            />

            <Stack.Screen
              name="ConfirmRowAssign"
              component={ConfirmRowAssign as any}
            />

            <Stack.Screen
              name="DigitalSignature"
              component={DigitalSignature as any}
            />


            <Stack.Screen
              name="TimerContainer"
              component={TimerContainer as any}
            />


            <Stack.Screen
              name="DailyTargetListOfficerDistribution"
              component={DailyTargetListOfficerDistribution as any}
            />

            <Stack.Screen
              name="GoviPensionForm"
              component={GoviPensionForm as any}
            />
            <Stack.Screen
              name="GoviPensionStatus"
              component={GoviPensionStatus as any}
            />
            <Stack.Screen
              name="NotEligibleScreen"
              component={NotEligibleScreen as any}
            />
            <Stack.Screen name="LoadingPage" component={LoadingPage as any} />
          </Stack.Navigator>
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
