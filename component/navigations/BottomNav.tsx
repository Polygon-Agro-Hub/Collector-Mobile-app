import { useState, useEffect, useMemo, useCallback } from "react";
import { View, TouchableOpacity, Image, Keyboard, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useSelector } from "react-redux";
import type { RootState } from "../../services/reducxStore";

const homeIcon = require("../../assets/images/common/nav-bar/navhome.webp");
const searchIcon = require("../../assets/images/common/nav-bar/navsearch.webp");
const qrIcon = require("../../assets/images/common/nav-bar/navtarget.webp");
const adminIcon = require("../../assets/images/common/nav-bar/navusers.webp");
const dataTransfer = require("../../assets/images/common/nav-bar/transfer.webp");

const BottomNav = ({ navigation, state }: { navigation: any; state: any }) => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const userRole = useSelector((state: RootState) => state.auth.jobRole);

  // Keyboard handling
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);


  // Role-based tabs (stable)
  const tabs = useMemo(() => {
    switch (userRole) {
      case "Collection Centre Manager":
        return [
          { name: "ManagerDashboard", icon: homeIcon },
          { name: "DailyTarget", icon: qrIcon },
          { name: "CollectionOfficersList", icon: adminIcon },
          { name: "SearchPriceScreen", icon: searchIcon },
        ];

      case "Collection Officer":
        return [
          { name: "DailyTargetList", icon: qrIcon },
          { name: "CollectionOfficerDashboard", icon: homeIcon },
          { name: "SearchPriceScreen", icon: searchIcon },
        ];

      case "Distribution Centre Manager":
        return [
          { name: "DistridutionaDashboard", icon: homeIcon },
          { name: "TargetOrderScreen", icon: qrIcon },
          { name: "DistributionOfficersList", icon: adminIcon },
          { name: "ReplaceRequestsScreen", icon: dataTransfer },
        ];

      default:
        return [
          { name: "CollectionOfficerDashboard", icon: homeIcon },
          { name: "SearchPriceScreen", icon: searchIcon },
        ];
    }
  }, [userRole]);

  // current tab normalization
  let currentTabName = state?.routes?.[state.index]?.name;

  if (currentTabName === "PriceChart") currentTabName = "SearchPriceScreen";
  if (
    ["EditTargetManager", "PassTargetScreen", "RecieveTargetScreen"].includes(currentTabName)
  ) {
    currentTabName = "DailyTarget";
  }
  if (
    ["TransactionList", "OfficerSummary"].includes(currentTabName)
  ) {
    currentTabName = "CollectionOfficersList";
  }
  if (currentTabName === "ClaimDistribution") {
    currentTabName = "DistributionOfficersList";
  }

  // Claim status check 
  useEffect(() => {
    const checkClaimStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/get-claim-status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.claimStatus === 0) {
          navigation?.navigate?.("NoCollectionCenterScreen");
        }
      } catch (error) {
        navigation?.navigate?.("Login");
      }
    };

    if (
      userRole === "Collection Centre Manager" ||
      userRole === "Distribution Officer"
    ) {
      checkClaimStatus();
    }
  }, [userRole]);
  -
    // AppState handling 
    useEffect(() => {
      const subscription = AppState.addEventListener("change", async (nextAppState) => {
        if (nextAppState === "background") {
          setTimeout(async () => {
            try {
              const currentState = AppState.currentState;

              if (currentState === "background" || currentState === "inactive") {
                await AsyncStorage.removeItem("token");
                await AsyncStorage.removeItem("empid");
                navigation?.navigate?.("Login");
              }
            } catch (error) {
              console.log("AppState error:", error);
            }
          }, 3000);
        }
      });

      return () => subscription.remove();
    }, []);

  // Hide conditions
  if (isKeyboardVisible || userRole === "Distribution Officer") return null;

  // UI
  return (
    <View className="bg-white">
      <View className="absolute bottom-0 flex-row justify-between items-center bg-white py-3 px-6 rounded-t-3xl w-full border-t border-r border-l border-[#00000040] shadow-md">

        {tabs.map((tab, index) => {
          const isFocused = currentTabName === tab.name;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => navigation?.navigate?.(tab.name)}
              className={isFocused ? "bg-[#FAE432] p-3 rounded-full" : ""}
              style={{
                backgroundColor: isFocused ? "#FAE432" : "white",
                padding: isFocused ? 8 : 6,
                borderRadius: 50,
              }}
            >
              <Image
                source={tab.icon}
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