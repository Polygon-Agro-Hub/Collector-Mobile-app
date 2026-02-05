import React, { useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { AppState, AppStateStatus } from "react-native";
import useUserStore from "@/store/userStore";  // Import the global store
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../services/reducxStore";

const homeIcon = require("../../assets/images/New/navhome.png");
const searchIcon = require("../../assets/images/New/navsearch.png");
const qrIcon = require("../../assets/images/New/navtarget.png");
const adminIcon = require("../../assets/images/New/navusers.png");
const dataTransfer = require("../../assets/images/New/transfer.png")

const BottomNav = ({ navigation, state }: { navigation: any; state: any }) => {
  // const { userRole, setUserRole, setToken, setEmpId } = useUserStore();
  const [token, setToken] = useState('')
  const [isKeyboardVisible, setKeyboardVisible] = useState<boolean>(false);
const [showBottomNav, setShowBottomNav] = useState(true);
 const dispatch = useDispatch();
const [tabs, setTabs] = useState<any[]>([]);

   const userRole = useSelector(
    (state: RootState) => state.auth.jobRole
  );
console.log('user rolllllllll', userRole)
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);


  useEffect(() => {
    const checkClaimStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setToken(token ?? "");  // Store token globally, fallback to empty string if null
        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/get-claim-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.claimStatus === 0) {
          navigation.navigate("NoCollectionCenterScreen");
        }
      } catch (error) {
        console.error("Error checking claim status:", error);
        navigation.navigate("Login");
      }
    };

    if (userRole === "Collection Centre Manager") {
      checkClaimStatus(); // Call only if the user role is Collection Center Manager
    }
     if (userRole === "Distribution Officer") {
      checkClaimStatus(); // Call only if the user role is Distribution Officer
    }
  }, [userRole, setToken, navigation]);

  // Determine the current tab

useEffect(() => {

  // Define tabs based on userRole
  let tabs = [
    { name: "DailyTargetList", icon: qrIcon, focusedIcon: qrIcon },
    { name: "Dashboard", icon: homeIcon, focusedIcon: homeIcon },
    { name: "SearchPriceScreen", icon: searchIcon, focusedIcon: searchIcon },
  ];

  if (userRole === "Collection Centre Manager") {
    tabs = [
      { name: "ManagerDashboard", icon: homeIcon, focusedIcon: homeIcon },
      { name: "DailyTarget", icon: qrIcon, focusedIcon: qrIcon },
      { name: "CollectionOfficersList", icon: adminIcon, focusedIcon: adminIcon },
      { name: "SearchPriceScreen", icon: searchIcon, focusedIcon: searchIcon },
    ];
    setTabs(tabs); 
  } else if (userRole === "Collection Officer") {
    tabs = [
         { name: "DailyTargetList", icon: qrIcon, focusedIcon: qrIcon },
    { name: "Dashboard", icon: homeIcon, focusedIcon: homeIcon },
    { name: "SearchPriceScreen", icon: searchIcon, focusedIcon: searchIcon },
    ];
    setTabs(tabs); 
  }else if (userRole === "Distribution Centre Manager") {
     tabs = [
        { name: "DistridutionaDashboard", icon: homeIcon, focusedIcon: homeIcon },
           { name: "TargetOrderScreen", icon: qrIcon, focusedIcon: qrIcon },
      { name: "DistributionOfficersList", icon: adminIcon, focusedIcon: adminIcon },
        { name: "ReplaceRequestsScreen", icon: dataTransfer, focusedIcon: dataTransfer },

      ];
    setTabs(tabs); 
  }
  }, [userRole]); // Re-run this effect when userRole changes

  let currentTabName = state.routes[state.index]?.name || "Dashboard";
//  console.log("Current tab:", currentTabName);
  
 if (currentTabName === "PriceChart") {
    currentTabName = "SearchPriceScreen";
  } else if (
    currentTabName === "EditTargetManager" ||
    currentTabName === "PassTargetScreen" ||
    currentTabName === "RecieveTargetScreen"
  ) {
    currentTabName = "DailyTarget";
  } else if (
    currentTabName === "TransactionList" ||
    currentTabName === "OfficerSummary" 
  ) {
    currentTabName = "CollectionOfficersList";
  } else if (userRole === "Distribution Centre Manager"  && currentTabName === "Dashboard"  ) {
    currentTabName = "DistridutionaDashboard"; 
    navigation.navigate("DistridutionaDashboard");
  } else if(currentTabName === "ClaimDistribution"){
   currentTabName ="DistributionOfficersList"
  }

  useEffect(() => {
    if (userRole === "Collection Centre Manager" && currentTabName == "Dashboard") {
      navigation.navigate("ManagerDashboard");
    }
  }, [userRole, currentTabName, navigation]);

  useEffect(() => {
    if (userRole === "Distribution Officer" && currentTabName == "Dashboard") {
      navigation.navigate("DistridutionaDashboard");
    }else if (userRole === "Distribution Centre Manager" && currentTabName === "Dashboard"){
      console.log("hittt")
      navigation.navigate("DistridutionaDashboard");
    }
  }, [userRole, currentTabName, navigation]);

  useEffect(() => {
    const onlineStatus = async () => {
      AppState.addEventListener("change", async (nextAppState) => {
        const storedEmpId = await AsyncStorage.getItem("empid");
        // setEmpId(storedEmpId ?? "");  // Store empId globally, fallback to empty string if null

        if (nextAppState === "background") {
          setTimeout(async () => {
            if (AppState.currentState === "background" || AppState.currentState === "inactive") {
              try {
                await AsyncStorage.removeItem("token");
                await AsyncStorage.removeItem("empid");
                navigation.navigate("Login");
              } catch (error) {
                console.error("Error removing credentials or navigating:", error);
              }
            }
          }, 3000);
        }
      });
    };

    onlineStatus();
  }, [ navigation]);



  if (isKeyboardVisible || userRole==="Distribution Officer") return null;

  // if (isKeyboardVisible) return null;

  return (
    <View className={` ${currentTabName === "QRScanner" ? "bg-black" : "bg-white"}`}>
      <View className="absolute bottom-0 flex-row  justify-between items-center bg-white py-3 px-6 rounded-t-3xl w-full border-t border-r border-l border-[#00000040] shadow-md">
        {tabs.map((tab, index) => {
          const isFocused = currentTabName === tab.name;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => navigation.navigate(tab.name)}
              className={`${isFocused ? "bg-[#FAE432] p-3 rounded-full border border-[#FAE432] shadow-md" : "items-center justify-center"}`}
              style={{
                backgroundColor: isFocused ? "#FAE432" : "white",
                padding: isFocused ? 8 : 6,
                borderRadius: 50,
              }}
            >
              <Image source={isFocused ? tab.focusedIcon : tab.icon} style={{ width: 24, height: 24, resizeMode: "contain" }} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomNav;
