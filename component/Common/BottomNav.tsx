import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Image, Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { AppState } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../services/reducxStore";

const homeIcon = require("../../assets/images/common/nav-bar/navhome.webp");
const searchIcon = require("../../assets/images/common/nav-bar/navsearch.webp");
const qrIcon = require("../../assets/images/common/nav-bar/navtarget.webp");
const adminIcon = require("../../assets/images/common/nav-bar/navusers.webp");
const dataTransfer = require("../../assets/images/common/nav-bar/transfer.webp");

const BottomNav = ({ navigation, state }: { navigation: any; state: any }) => {
  const [token, setToken] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const dispatch = useDispatch();
  const [tabs, setTabs] = useState<any[]>([]);

  const userRole = useSelector((state: RootState) => state.auth.jobRole);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
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
        setToken(token ?? "");
        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/get-claim-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
      checkClaimStatus();
    }
    if (userRole === "Distribution Officer") {
      checkClaimStatus();
    }
  }, [userRole, setToken, navigation]);

  useEffect(() => {
    let tabs = [
      { name: "DailyTargetList", icon: qrIcon, focusedIcon: qrIcon },
      { name: "Dashboard", icon: homeIcon, focusedIcon: homeIcon },
      { name: "SearchPriceScreen", icon: searchIcon, focusedIcon: searchIcon },
    ];

    if (userRole === "Collection Centre Manager") {
      tabs = [
        { name: "ManagerDashboard", icon: homeIcon, focusedIcon: homeIcon },
        { name: "DailyTarget", icon: qrIcon, focusedIcon: qrIcon },
        {
          name: "CollectionOfficersList",
          icon: adminIcon,
          focusedIcon: adminIcon,
        },
        {
          name: "SearchPriceScreen",
          icon: searchIcon,
          focusedIcon: searchIcon,
        },
      ];
      setTabs(tabs);
    } else if (userRole === "Collection Officer") {
      tabs = [
        { name: "DailyTargetList", icon: qrIcon, focusedIcon: qrIcon },
        { name: "Dashboard", icon: homeIcon, focusedIcon: homeIcon },
        {
          name: "SearchPriceScreen",
          icon: searchIcon,
          focusedIcon: searchIcon,
        },
      ];
      setTabs(tabs);
    } else if (userRole === "Distribution Centre Manager") {
      tabs = [
        {
          name: "DistridutionaDashboard",
          icon: homeIcon,
          focusedIcon: homeIcon,
        },
        { name: "TargetOrderScreen", icon: qrIcon, focusedIcon: qrIcon },
        {
          name: "DistributionOfficersList",
          icon: adminIcon,
          focusedIcon: adminIcon,
        },
        {
          name: "ReplaceRequestsScreen",
          icon: dataTransfer,
          focusedIcon: dataTransfer,
        },
      ];
      setTabs(tabs);
    }
  }, [userRole]);

  let currentTabName = state.routes[state.index]?.name || "Dashboard";

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
  } else if (
    userRole === "Distribution Centre Manager" &&
    currentTabName === "Dashboard"
  ) {
    currentTabName = "DistridutionaDashboard";
    navigation.navigate("DistridutionaDashboard");
  } else if (currentTabName === "ClaimDistribution") {
    currentTabName = "DistributionOfficersList";
  }

  useEffect(() => {
    if (
      userRole === "Collection Centre Manager" &&
      currentTabName == "Dashboard"
    ) {
      navigation.navigate("ManagerDashboard");
    }
  }, [userRole, currentTabName, navigation]);

  useEffect(() => {
    if (userRole === "Distribution Officer" && currentTabName == "Dashboard") {
      navigation.navigate("DistridutionaDashboard");
    } else if (
      userRole === "Distribution Centre Manager" &&
      currentTabName === "Dashboard"
    ) {
      navigation.navigate("DistridutionaDashboard");
    }
  }, [userRole, currentTabName, navigation]);

  useEffect(() => {
    const onlineStatus = async () => {
      AppState.addEventListener("change", async (nextAppState) => {
        const storedEmpId = await AsyncStorage.getItem("empid");

        if (nextAppState === "background") {
          setTimeout(async () => {
            if (
              AppState.currentState === "background" ||
              AppState.currentState === "inactive"
            ) {
              try {
                await AsyncStorage.removeItem("token");
                await AsyncStorage.removeItem("empid");
                navigation.navigate("Login");
              } catch (error) {
                console.error(
                  "Error removing credentials or navigating:",
                  error,
                );
              }
            }
          }, 3000);
        }
      });
    };

    onlineStatus();
  }, [navigation]);

  if (isKeyboardVisible || userRole === "Distribution Officer") return null;

  return (
    <View
      className={` ${currentTabName === "QRScanner" ? "bg-black" : "bg-white"}`}
    >
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
              <Image
                source={isFocused ? tab.focusedIcon : tab.icon}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomNav;
