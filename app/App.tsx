import React, { useEffect, useState , useCallback} from "react";
import { Alert, BackHandler, Text, View, TextInput,Dimensions, StatusBar  } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from "react-i18next";
import { navigationRef } from "../navigationRef"; 





import Splash from "../component/Splash";
import Lanuage from "../component/Lanuage";
import Login from "@/component/Login";
import { useFocusEffect } from '@react-navigation/native';


import { NativeWindStyleSheet } from "nativewind";
import { LanguageProvider } from "@/context/LanguageContext";

import { LogBox } from 'react-native';

import NavigationBar from "@/component/BottomNav";

import ChangePassword from "@/component/ChangePassword";
import Registeredfarmer from "@/component/Registeredfarmer";
import Ufarmercropdetails from "@/component/Ufarmercropdetails";
import Dashboard from "@/component/Dashboard";
import QRScanner from "@/component/QRScanner";
import FormScreen from "@/component/FormScreen";
import EngProfile from "@/component/EngProfile";
import UnregisteredFarmerDetails from "@/component/UnregisteredFarmerDetails";
import UnregisteredCropDetails from "@/component/UnregisteredCropDetails";
import SearchFarmer from "@/component/SearchFarmer";
import FarmerQr from "@/component/FarmerQr";
import ComplainPage from "@/component/ComplainPage";
import OfficerQr from "@/component/OfficerQr";
import Profile from "@/component/Profile";
import ReportPage from "@/component/ReportPage";
import SearchPriceScreen from "@/component/SearchPriceScreen";
import PriceChart from "@/component/PriceChart";
import PriceChartManager from "@/component/ManagerScreens/PriceChartManager";

import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNav from "@/component/BottomNav";
import CollectionOfficersList from "@/component/ManagerScreens/CollectionOfficersList";
import OfficerSummary from "@/component/ManagerScreens/OfficerSummary";
import ReportGenerator from "@/component/ManagerScreens/ReportGenerator";
import ComplainHistory from "@/component/ComplainHistory";
import DailyTargetList from "@/component/DailyTargetList";
import AddOfficerBasicDetails from "@/component/ManagerScreens/AddOfficerBasicDetails";
import AddOfficerAddressDetails from "@/component/ManagerScreens/AddOfficerAddressDetails";
import ClaimOfficer from "@/component/ManagerScreens/ClaimOfficer";
import TransactionList from "@/component/ManagerScreens/TransactionList";
import FarmerReport from "@/component/ManagerScreens/FarmerReport";
import SetTargetScreen from "@/component/ManagerScreens/SetTargetScreen";
import DailyTarget from "@/component/ManagerScreens/DailyTarget";
import TargetValidPeriod from "@/component/ManagerScreens/TargetValidPeriod";
import NoCollectionCenterScreen from "@/component/NoCollectionCenterScreen ";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import EditTargetScreen from "@/component/ManagerScreens/EditTargetScreen";
import PassTargetScreen from "@/component/ManagerScreens/PassTargetScreen";
import RecieveTargetScreen from "@/component/ManagerScreens/RecieveTargetScreen";
import DailyTargetListForOfficers from "@/component/ManagerScreens/DailyTargetListForOfficers";
import EditTargetManager from "@/component/ManagerScreens/EditTargetManager";
import RecieveTargetBetweenOfficers from "@/component/ManagerScreens/RecieveTargetBetweenOfficers";
import PassTargetBetweenOfficers from "@/component/ManagerScreens/PassTargetBetweenOfficers";
import OTPE from "@/component/Otpverification";
import { AppState } from "react-native";

import ManagerDashboard from "@/component/ManagerScreens/ManagerDashboard";
import CenterTarget from "@/component/ManagerScreens/CenterTarget";
import ManagerTransactions from "@/component/ManagerScreens/ManagerTransactions";
import { environment } from "../environment/environment";
import RegisterDriver from "@/component/Driver screens/RegisterDriver";
import AddDriverAddressDetails from "@/component/Driver screens/AddDriverAddressDetails";
import AddVehicleDetails from "@/component/Driver screens/AddVehicleDetails";

import SearchFarmerScreen from "@/component/Driver screens/Searchfarmer";
import RegisterFarmer from "@/component/Driver screens/Register Farmer";
import OTPverification from "@/component/Driver screens/OTPverification";
import CollectionRequestForm from "@/component/Driver screens/CollectionRequestForm";
import CollectionRequests from "@/component/Driver screens/CollectionRequests";
import ViewScreen from "@/component/Driver screens/ViewScreen";
import Cancelreson from "@/component/Driver screens/Cancelreson"
import NewReport from "@/component/NewReport";
import TransactionReport from "@/component/ManagerScreens/TransactionReport";

import UpdateFarmerBankDetails from "@/component/UpdateFarmerBankDetails";
import otpBankDetailsupdate from "@/component/otpBankDetailsupdate"
import PrivacyPolicy from "@/component/PrivacyPolicy";

import DistridutionaDashboard from "@/component/DistributionofficerScreens/DistridutionaDashboard"
import TargetOrderScreen from "@/component/DistributionofficerScreens/TargetOrderScreen"

import PendingOrderScreen from "@/component/DistributionofficerScreens/PendingOrderScreen"

import Timer from "@/component/DistributionofficerScreens/TimerContainer "
import TimerContainer from "@/component/DistributionofficerScreens/TimerContainer "
import CenterTargetScreen from "@/component/DisributionManger/CenterTargetScreen"

import DistributionOfficersList from "@/component/DisributionManger/DistributionOfficersList";
import ClaimDistribution from "@/component/DisributionManger/ClaimDistribution";
import DistributionOfficerSummary from "@/component/DisributionManger/DistributionOfficerSummary"
import ReplaceRequestsScreen from '@/component/DisributionManger/ReplaceRequestsScreen';
import DailyTargetListOfficerDistribution from '@/component/DisributionManger/DailyTargetListOfficerDistribution';
import PassTarget from '@/component/DisributionManger/PassTarget'

import { Provider } from 'react-redux';
import  store from "@/services/reducxStore";

import { useSelector } from 'react-redux';
import { RootState } from '../services/reducxStore';

import ReplaceRequestsApprove from '@/component/DisributionManger/ReplaceRequestsApprove';
import DistributionOfficerReport from '@/component/DisributionManger/DistributionOfficerReport';
import  ReadytoPickupOrders  from '@/component/DisributionManger/ReadytoPickupOrders';
import ViewPickupOrders from '@/component/DisributionManger/ViewPickupOrders';
import qrcode from '@/component/DisributionManger/qrcode';
import DigitalSignature from '@/component/DisributionManger/DigitalSignature';
import ReceivedCash from '@/component/DisributionManger/ReceivedCash';
import ReceivedCashOfficer from '@/component/DistributionofficerScreens/ReceivedCashOfficer';
import ReceivedCashQrCode from '@/component/DistributionofficerScreens/ReceivedCashQrCode';


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
const windowDimensions = Dimensions.get("window");

// Example Screens
function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-100">
      <Text className="text-2xl font-bold text-blue-800">Home Screen</Text>
    </View>
  );
}

function MainTabNavigator() {

      const [initialTab, setInitialTab] = useState('Dashboard');
  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

  useEffect(() => {
    // Set the first tab based on user role
    if (jobRole === 'Distribution Officer' || jobRole === 'Distribution Centre Manager') {
      setInitialTab('DistridutionaDashboard'); // Set the first tab for Distribution Manager/Officer
    } else if (jobRole === 'Collection Officer') {
      setInitialTab('Dashboard'); // Set the first tab for Collection Officer
    } else {
      setInitialTab('ManagerDashboard'); // Set the first tab for other roles like Manager
    }
  }, [jobRole]);
    useFocusEffect(
    useCallback(() => {
      console.log("Job roll hgi");

      return () => {
        // optional: when leaving the screen
      };
    }, [])
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
      <Tab.Screen name="DistridutionaDashboard" component={DistridutionaDashboard as any} />
      <Tab.Screen name="ManagerDashboard" component={ManagerDashboard as any} />
      <Tab.Screen name="SearchPriceScreen" component={SearchPriceScreen} />
      <Tab.Screen name="QRScanner" component={QRScanner} />
      <Tab.Screen name="PriceChart" component={PriceChart as any} />
       <Tab.Screen name="PriceChartManager" component={PriceChartManager as any} />
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
      <Tab.Screen
        name="PassTargetScreen"
        component={PassTargetScreen as any}
      />
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
      <Tab.Screen name="ReadytoPickupOrders" component={ReadytoPickupOrders as any} />
      <Tab.Screen name="OfficerSummary" component={OfficerSummary as any} />
       <Tab.Screen name="ViewPickupOrders" component={ViewPickupOrders as any} />
       <Tab.Screen name="ReceivedCash" component={ReceivedCash as any} />
       <Tab.Screen name="ReceivedCashOfficer" component={ReceivedCashOfficer as any} />
     {/* <Stack.Screen name="RegisterDriver" component={RegisterDriver as any} /> */}
      {/* <Stack.Screen name="AddDriverAddressDetails" component={AddDriverAddressDetails as any} /> */}
      {/* <Stack.Screen name="AddVehicleDetails" component={AddVehicleDetails as any} /> */}

                   <Tab.Screen name="TargetOrderScreen" component={TargetOrderScreen as any} /> 
                     {/* <Tab.Screen name="EngProfile" component={EngProfile} /> */}
                       <Tab.Screen
            name="ReportGenerator"
            component={ReportGenerator as any}
          />

         <Tab.Screen
        name="DistributionOfficersList"
        component={DistributionOfficersList}
      />
                         <Tab.Screen name="ClaimDistribution" component={ClaimDistribution as any} /> 
                         <Tab.Screen name="DistributionOfficerSummary" component={DistributionOfficerSummary as any} />
                         <Tab.Screen name="ReplaceRequestsScreen" component={ReplaceRequestsScreen as any} />
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
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
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
          ]
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
            Authorization: `Bearer ${token}`, // Add token in Authorization header
          },
          body: JSON.stringify({
            empId: empId, // Use the passed empId
            status: status, // Use the passed status
          }),
        }
      );
    } catch (error) {
      console.error("Online status error:", error);
    }
  };
// useEffect(() => {
//   const backAction = () => {
//     if (!navigationRef.isReady()) {
//       // Navigation not ready yet, let default system back handle it
//       return false;
//     }

//     const currentRouteName = navigationRef.getCurrentRoute()?.name ?? "";

//     if (currentRouteName === "Dashboard") {
//       BackHandler.exitApp();
//       return true;
//     } else if (navigationRef.canGoBack()) {
//       navigationRef.goBack();
//       return true;
//     }
//     return false;
//   };

//   const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
//   return () => backHandler.remove();
// }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: "#fff" }}
        edges={["top", "right", "left"]}
      >
        <StatusBar barStyle="dark-content" />
        <NavigationContainer   ref={navigationRef}>
         <Stack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: false, // Disable swipe gestures globally
          }}
        >
           <Stack.Screen name="Splash" component={Splash} />
            <Stack.Screen name="Login" component={Login} />
         
        
          <Stack.Screen
            name="ChangePassword"
            component={ChangePassword as any}
          />
          <Stack.Screen name="Registeredfarmer" component={Registeredfarmer} />
          <Stack.Screen
            name="Ufarmercropdetails"
            component={Ufarmercropdetails}
          />
          {/* <Stack.Screen name="Dashboard" component={Dashboard} /> */}
          {/* <Stack.Screen name="QRScanner" component={QRScanner} /> */}
          <Stack.Screen name="FormScreen" component={FormScreen} />
          {/* <Stack.Screen name="EngProfile" component={EngProfile} /> */}
          <Stack.Screen
            name="UnregisteredFarmerDetails"
            component={UnregisteredFarmerDetails}
          />
          {/* <Stack.Screen name="UnregisteredCropDetails" component={UnregisteredCropDetails as any} /> */}

         <Stack.Screen name="Lanuage" component={Lanuage} /> 



          {/* <Stack.Screen name="SearchFarmer" component={SearchFarmer} /> */}
          <Stack.Screen name="FarmerQr" component={FarmerQr} />
          <Stack.Screen name="OfficerQr" component={OfficerQr} />
          <Stack.Screen name="ComplainPage" component={ComplainPage} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="ReportPage" component={ReportPage} />
          {/* <Stack.Screen name="SearchPriceScreen" component={SearchPriceScreen} />  */}
          {/* <Stack.Screen name="PriceChart" component={PriceChart as any}/> */}
          {/* <Stack.Screen name="CollectionOfficersList" component={CollectionOfficersList }/> */}
          {/* <Stack.Screen name="OfficerSummary" component={OfficerSummary as any} /> */}
          {/* <Stack.Screen
            name="ReportGenerator"
            component={ReportGenerator as any}
          /> */}
          {/* <Stack.Screen name="DailyTargetList" component={DailyTargetList} /> */}
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
          {/* <Stack.Screen name="TransactionList" component={TransactionList as any} /> */}
          <Stack.Screen name="OTPE" component={OTPE} />
          <Stack.Screen name="FarmerReport" component={FarmerReport as any} />
          <Stack.Screen name="ReceivedCashQrCode" component={ReceivedCashQrCode as any} />
          <Stack.Screen
            name="EditTargetScreen"
            component={EditTargetScreen as any}
          />
          {/* <Stack.Screen name="DailyTarget" component={DailyTarget as any} /> */}
          {/* <Stack.Screen name="PassTargetScreen" component={PassTargetScreen as any} />  */}
          <Stack.Screen
            name="NoCollectionCenterScreen"
            component={NoCollectionCenterScreen}
          />
          {/* <Stack.Screen name="RecieveTargetScreen" component={RecieveTargetScreen as any} /> */}
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
            <Stack.Screen
            name="Cancelreson"
            component={Cancelreson as any}
          />
          <Stack.Screen name="TransactionReport" component={TransactionReport as any} />
                <Stack.Screen name="UpdateFarmerBankDetails" component={UpdateFarmerBankDetails as any} />
                {/* <Stack.Screen name="ReviewCollectionRequests" component={ReviewCollectionRequests as any} /> */}
                <Stack.Screen name="RegisterDriver" component={RegisterDriver as any} />
      <Stack.Screen name="AddDriverAddressDetails" component={AddDriverAddressDetails as any} />
      <Stack.Screen name="AddVehicleDetails" component={AddVehicleDetails as any} />
      <Stack.Screen name="NewReport" component={NewReport as any} />
       <Stack.Screen name="qrcode" component={qrcode as any} />
        <Stack.Screen name="DigitalSignature" component={DigitalSignature as any} />
      <Stack.Screen name="otpBankDetailsupdate" component={otpBankDetailsupdate as any} /> 
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} /> 

             {/* <Stack.Screen name="DistridutionaDashboard" component={DistridutionaDashboard as any} />  */}
             {/* <Stack.Screen name="TargetOrderScreen" component={TargetOrderScreen as any} />  */}

<Stack.Screen name="PendingOrderScreen" component={PendingOrderScreen as any} /> 

   <Stack.Screen name="Timer" component={Timer as any} />    
   <Stack.Screen name="TimerContainer" component={TimerContainer as any} />  
<Stack.Screen name="CenterTargetScreen" component={CenterTargetScreen as any} /> 
<Stack.Screen name="ReplaceRequestsApprove" component={ReplaceRequestsApprove as any} />    
<Stack.Screen name="DailyTargetListOfficerDistribution" component={DailyTargetListOfficerDistribution as any} />
<Stack.Screen name="PassTarget" component={PassTarget as any} />
<Stack.Screen name="DistributionOfficerReport" component={DistributionOfficerReport as any} />
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