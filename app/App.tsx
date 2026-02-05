import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Text,
  View,
  TextInput,
  Dimensions,
  StatusBar,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { navigationRef } from "../navigationRef";
import Splash from "../component/common/Splash";
import Lanuage from "../component/common/Lanuage";
import Login from "@/component/auth/Login";
import { useFocusEffect } from "@react-navigation/native";
import { NativeWindStyleSheet } from "nativewind";
import { LanguageProvider } from "@/context/LanguageContext";
import { LogBox } from "react-native";
import NavigationBar from "@/component/common/BottomNav";
import ChangePassword from "@/component/auth/ChangePassword";
import Registeredfarmer from "@/component/collection-common/Registeredfarmer";
import Ufarmercropdetails from "@/component/collection-common/Ufarmercropdetails";
import Dashboard from "@/component/collection-officer/Dashboard";
import QRScanner from "@/component/collection-common/QRScanner";
import FormScreen from "@/component/collection-common/FormScreen";
import EngProfile from "@/component/common/EngProfile";
import UnregisteredFarmerDetails from "@/component/collection-common/UnregisteredFarmerDetails";
import UnregisteredCropDetails from "@/component/collection-common/UnregisteredCropDetails";
import SearchFarmer from "@/component/collection-common/SearchFarmer";
import FarmerQr from "@/component/collection-common/FarmerQr";
import ComplainPage from "@/component/complain/ComplainPage";
import OfficerQr from "@/component/common/OfficerQr";
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
import AddOfficerBasicDetails from "@/component/collection-manager/AddOfficerBasicDetails";
import AddOfficerAddressDetails from "@/component/collection-manager/AddOfficerAddressDetails";
import ClaimOfficer from "@/component/collection-manager/ClaimOfficer";
import TransactionList from "@/component/collection-manager/TransactionList";
import FarmerReport from "@/component/collection-manager/FarmerReport";
import DailyTarget from "@/component/collection-manager/DailyTarget";
import NoCollectionCenterScreen from "@/component/collection-common/NoCollectionCenterScreen ";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EditTargetScreen from "@/component/collection-manager/EditTargetScreen";
import PassTargetScreen from "@/component/collection-manager/PassTargetScreen";
import RecieveTargetScreen from "@/component/collection-manager/RecieveTargetScreen";
import DailyTargetListForOfficers from "@/component/collection-manager/DailyTargetListForOfficers";
import EditTargetManager from "@/component/collection-manager/EditTargetManager";
import RecieveTargetBetweenOfficers from "@/component/collection-manager/RecieveTargetBetweenOfficers";
import PassTargetBetweenOfficers from "@/component/collection-manager/PassTargetBetweenOfficers";
import OTPE from "@/component/collection-common/Otpverification";
import { AppState } from "react-native";
import ManagerDashboard from "@/component/collection-manager/ManagerDashboard";
import CenterTarget from "@/component/collection-manager/CenterTarget";
import ManagerTransactions from "@/component/collection-manager/ManagerTransactions";
import { environment } from "../environment/environment";
import RegisterDriver from "@/component/driver-screens/RegisterDriver";
import AddDriverAddressDetails from "@/component/driver-screens/AddDriverAddressDetails";
import AddVehicleDetails from "@/component/driver-screens/AddVehicleDetails";
import SearchFarmerScreen from "@/component/driver-screens/Searchfarmer";
import RegisterFarmer from "@/component/driver-screens/Register Farmer";
import OTPverification from "@/component/driver-screens/OTPverification";
import CollectionRequestForm from "@/component/driver-screens/CollectionRequestForm";
import CollectionRequests from "@/component/driver-screens/CollectionRequests";
import ViewScreen from "@/component/driver-screens/ViewScreen";
import Cancelreson from "@/component/driver-screens/Cancelreson";
import NewReport from "@/component/collection-common/NewReport";
import TransactionReport from "@/component/collection-manager/TransactionReport";
import UpdateFarmerBankDetails from "@/component/collection-common/UpdateFarmerBankDetails";
import otpBankDetailsupdate from "@/component/collection-common/otpBankDetailsupdate";
import PrivacyPolicy from "@/component/common/PrivacyPolicy";
import DistridutionaDashboard from "@/component/distribution-officer/DistridutionaDashboard";
import TargetOrderScreen from "@/component/distribution-common/TargetOrderScreen";
import PendingOrderScreen from "@/component/distribution-common/PendingOrderScreen";
import Timer from "@/component/distribution-common/TimerContainer ";
import TimerContainer from "@/component/distribution-common/TimerContainer ";
import CenterTargetScreen from "@/component/disribution-manger/CenterTargetScreen";
import DistributionOfficersList from "@/component/disribution-manger/DistributionOfficersList";
import ClaimDistribution from "@/component/disribution-manger/ClaimDistribution";
import DistributionOfficerSummary from "@/component/disribution-manger/DistributionOfficerSummary";
import ReplaceRequestsScreen from "@/component/disribution-manger/ReplaceRequestsScreen";
import DailyTargetListOfficerDistribution from "@/component/disribution-manger/DailyTargetListOfficerDistribution";
import PassTarget from "@/component/disribution-manger/PassTarget";
import { Provider } from "react-redux";
import store from "@/services/reducxStore";
import { useSelector } from "react-redux";
import { RootState } from "../services/reducxStore";
import ReplaceRequestsApprove from "@/component/disribution-manger/ReplaceRequestsApprove";
import DistributionOfficerReport from "@/component/disribution-manger/DistributionOfficerReport";
import ReadytoPickupOrders from "@/component/distribution-common/ReadytoPickupOrders";
import ViewPickupOrders from "@/component/disribution-manger/ViewPickupOrders";
import qrcode from "@/component/disribution-manger/qrcode";
import DigitalSignature from "@/component/disribution-manger/DigitalSignature";
import ReceivedCash from "@/component/disribution-manger/ReceivedCash";
import ReceivedCashOfficer from "@/component/distribution-officer/ReceivedCashOfficer";
import ReceivedCashQrCode from "@/component/distribution-officer/ReceivedCashQrCode";
import GoviPensionForm from "@/component/govi-pension/GoviPensionForm";
import GoviPensionStatus from "@/component/govi-pension/GoviPensionStatus";

LogBox.ignoreAllLogs(true);
NativeWindStyleSheet.setOutput({
  default: "native",
});

(Text as any).defaultProps = {
  ...(Text as any).defaultProps,
  allowFontScaling: false,
};

(TextInput as any).defaultProps = {
  ...(TextInput as any).defaultProps,
  allowFontScaling: false,
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const [initialTab, setInitialTab] = useState("Dashboard");
  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

  useEffect(() => {
    // Set the first tab based on user role
    if (
      jobRole === "Distribution Officer" ||
      jobRole === "Distribution Centre Manager"
    ) {
      setInitialTab("DistridutionaDashboard"); // Set the first tab for Distribution Manager/Officer
    } else if (jobRole === "Collection Officer") {
      setInitialTab("Dashboard"); // Set the first tab for Collection Officer
    } else {
      setInitialTab("ManagerDashboard"); // Set the first tab for other roles like Manager
    }
  }, [jobRole]);

  useFocusEffect(
    useCallback(() => {
      console.log("Job roll hgi");
      return () => {};
    }, []),
  );

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarStyle: { position: "absolute", backgroundColor: "#fff" },
      })}
      tabBar={(props) => <NavigationBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen
        name="DistridutionaDashboard"
        component={DistridutionaDashboard as any}
      />
      <Tab.Screen name="ManagerDashboard" component={ManagerDashboard as any} />
      <Tab.Screen name="SearchPriceScreen" component={SearchPriceScreen} />
      <Tab.Screen name="QRScanner" component={QRScanner} />
      <Tab.Screen name="PriceChart" component={PriceChart as any} />
      <Tab.Screen
        name="PriceChartManager"
        component={PriceChartManager as any}
      />
      <Tab.Screen
        name="UnregisteredCropDetails"
        component={UnregisteredCropDetails as any}
      />
      <Tab.Screen name="SearchFarmer" component={SearchFarmer} />

      {/* changed here stack to tab */}
      <Tab.Screen name="DailyTargetList" component={DailyTargetList} />
      <Tab.Screen
        name="CollectionOfficersList"
        component={CollectionOfficersList}
      />
      <Tab.Screen name="DailyTarget" component={DailyTarget as any} />
      <Tab.Screen name="PassTargetScreen" component={PassTargetScreen as any} />
      <Tab.Screen
        name="RecieveTargetScreen"
        component={RecieveTargetScreen as any}
      />
      <Tab.Screen name="ComplainHistory" component={ComplainHistory} />
      <Tab.Screen
        name="EditTargetManager"
        component={EditTargetManager as any}
      />

      <Tab.Screen name="TransactionList" component={TransactionList as any} />
      <Tab.Screen
        name="ReadytoPickupOrders"
        component={ReadytoPickupOrders as any}
      />
      <Tab.Screen name="OfficerSummary" component={OfficerSummary as any} />
      <Tab.Screen name="ViewPickupOrders" component={ViewPickupOrders as any} />
      <Tab.Screen name="ReceivedCash" component={ReceivedCash as any} />
      <Tab.Screen
        name="ReceivedCashOfficer"
        component={ReceivedCashOfficer as any}
      />
      <Tab.Screen
        name="TargetOrderScreen"
        component={TargetOrderScreen as any}
      />
      <Tab.Screen name="ReportGenerator" component={ReportGenerator as any} />
      <Tab.Screen
        name="DistributionOfficersList"
        component={DistributionOfficersList}
      />
      <Tab.Screen
        name="ClaimDistribution"
        component={ClaimDistribution as any}
      />
      <Tab.Screen
        name="DistributionOfficerSummary"
        component={DistributionOfficerSummary as any}
      />
      <Tab.Screen
        name="ReplaceRequestsScreen"
        component={ReplaceRequestsScreen as any}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [isOfflineAlertShown, setIsOfflineAlertShown] = useState(false);
  useEffect(() => {
    onlineStatus();
  }, []);
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (!state.isConnected && !isOfflineAlertShown) {
        setIsOfflineAlertShown(true); // mark that alert is shown
        Alert.alert(
          t("Main.No Internet Connection"),
          t("Main.Please turn on mobile data or Wi-Fi to continue."),
          [
            {
              text: "OK",
              onPress: () => {
                // Reset flag after user presses OK
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
      console.log("App state changed toooolllllll:", nextAppState);
      const storedEmpId = await AsyncStorage.getItem("empid");

      if (nextAppState === "active") {
        if (storedEmpId) {
          await status(storedEmpId, true);
        }
      } else if (nextAppState === "background") {
        console.log("App went to background, disconnecting socketssssss");
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

      const response = await fetch(
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
          paddingBottom: insets.bottom,
          backgroundColor: "#fff",
        }}
        edges={["top", "right", "left"]}
      >
        <StatusBar barStyle="dark-content" />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="Splash" component={Splash} />
            <Stack.Screen name="Login" component={Login} />
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
            <Stack.Screen name="FormScreen" component={FormScreen} />
            <Stack.Screen
              name="UnregisteredFarmerDetails"
              component={UnregisteredFarmerDetails}
            />
            <Stack.Screen name="Lanuage" component={Lanuage} />
            <Stack.Screen name="FarmerQr" component={FarmerQr} />
            <Stack.Screen name="OfficerQr" component={OfficerQr} />
            <Stack.Screen name="ComplainPage" component={ComplainPage} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="ReportPage" component={ReportPage} />
            <Stack.Screen
              name="AddOfficerBasicDetails"
              component={AddOfficerBasicDetails as any}
            />
            <Stack.Screen
              name="AddOfficerAddressDetails"
              component={AddOfficerAddressDetails}
            />
            <Stack.Screen name="EngProfile" component={EngProfile} />
            <Stack.Screen name="ClaimOfficer" component={ClaimOfficer} />
            <Stack.Screen name="OTPE" component={OTPE} />
            <Stack.Screen name="FarmerReport" component={FarmerReport as any} />
            <Stack.Screen
              name="ReceivedCashQrCode"
              component={ReceivedCashQrCode as any}
            />
            <Stack.Screen
              name="EditTargetScreen"
              component={EditTargetScreen as any}
            />
            <Stack.Screen
              name="NoCollectionCenterScreen"
              component={NoCollectionCenterScreen}
            />
            <Stack.Screen
              name="DailyTargetListForOfficers"
              component={DailyTargetListForOfficers as any}
            />
            <Stack.Screen
              name="PassTargetBetweenOfficers"
              component={PassTargetBetweenOfficers as any}
            />
            <Stack.Screen
              name="RecieveTargetBetweenOfficers"
              component={RecieveTargetBetweenOfficers as any}
            />
            <Stack.Screen name="CenterTarget" component={CenterTarget as any} />
            <Stack.Screen
              name="ManagerTransactions"
              component={ManagerTransactions as any}
            />
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SearchFarmerScreen"
              component={SearchFarmerScreen as any}
            />
            <Stack.Screen
              name="RegisterFarmer"
              component={RegisterFarmer as any}
            />
            <Stack.Screen
              name="OTPverification"
              component={OTPverification as any}
            />
            <Stack.Screen
              name="CollectionRequestForm"
              component={CollectionRequestForm as any}
            />
            <Stack.Screen
              name="CollectionRequests"
              component={CollectionRequests as any}
            />
            <Stack.Screen name="ViewScreen" component={ViewScreen as any} />
            <Stack.Screen name="Cancelreson" component={Cancelreson as any} />
            <Stack.Screen
              name="TransactionReport"
              component={TransactionReport as any}
            />
            <Stack.Screen
              name="UpdateFarmerBankDetails"
              component={UpdateFarmerBankDetails as any}
            />
            <Stack.Screen
              name="RegisterDriver"
              component={RegisterDriver as any}
            />
            <Stack.Screen
              name="AddDriverAddressDetails"
              component={AddDriverAddressDetails as any}
            />
            <Stack.Screen
              name="AddVehicleDetails"
              component={AddVehicleDetails as any}
            />
            <Stack.Screen name="NewReport" component={NewReport as any} />
            <Stack.Screen name="qrcode" component={qrcode as any} />
            <Stack.Screen
              name="DigitalSignature"
              component={DigitalSignature as any}
            />
            <Stack.Screen
              name="otpBankDetailsupdate"
              component={otpBankDetailsupdate as any}
            />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
            <Stack.Screen
              name="PendingOrderScreen"
              component={PendingOrderScreen as any}
            />

            <Stack.Screen name="Timer" component={Timer as any} />
            <Stack.Screen
              name="TimerContainer"
              component={TimerContainer as any}
            />
            <Stack.Screen
              name="CenterTargetScreen"
              component={CenterTargetScreen as any}
            />
            <Stack.Screen
              name="ReplaceRequestsApprove"
              component={ReplaceRequestsApprove as any}
            />
            <Stack.Screen
              name="DailyTargetListOfficerDistribution"
              component={DailyTargetListOfficerDistribution as any}
            />
            <Stack.Screen name="PassTarget" component={PassTarget as any} />
            <Stack.Screen
              name="DistributionOfficerReport"
              component={DistributionOfficerReport as any}
            />
            <Stack.Screen
              name="GoviPensionForm"
              component={GoviPensionForm as any}
            />
            <Stack.Screen
              name="GoviPensionStatus"
              component={GoviPensionStatus as any}
            />
          </Stack.Navigator>
        </NavigationContainer>
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
