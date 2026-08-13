import store from "@/services/reducxStore";
import { useState, useEffect, useMemo } from "react";
import { View, TouchableOpacity, Keyboard } from "react-native";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useSelector } from "react-redux";
import type { RootState } from "@/services/reducxStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROLES } from "@/constants/user-roles";
import { useTranslation } from "react-i18next";
import { Octicons, Feather, Fontisto } from "@expo/vector-icons";
import { Target } from "lucide-react-native";

const BottomNav = ({ navigation, state }: { navigation: any; state: any }) => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const userRole = useSelector((state: RootState) => state.auth.jobRole);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Keyboard handling
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Role-based tabs (stable)
  const tabs = useMemo(() => {
    switch (userRole) {
      case ROLES.COLLECTION_MANAGER:
        return [
          {
            name: "CollectionDashboard",
            label: t("BottomNav.Home") || "Home",
            iconType: "Octicons",
            iconName: "home",
          },
          {
            name: "DailyTarget",
            label: t("BottomNav.Target") || "Target",
            iconType: "Lucide",
            iconName: "target",
          },
          {
            name: "CollectionOfficersList",
            label: t("BottomNav.Staff") || "Staff",
            iconType: "Feather",
            iconName: "users",
          },
          {
            name: "SearchPriceScreen",
            label: t("BottomNav.Search") || "Search",
            iconType: "Fontisto",
            iconName: "search",
          },
        ];

      case ROLES.COLLECTION_OFFICER:
        return [
          {
            name: "DailyTargetList",
            label: t("BottomNav.Target") || "Target",
            iconType: "Lucide",
            iconName: "target",
          },
          {
            name: "CollectionDashboard",
            label: t("BottomNav.Home") || "Home",
            iconType: "Octicons",
            iconName: "home",
          },
          {
            name: "SearchPriceScreen",
            label: t("BottomNav.Search") || "Search",
            iconType: "Fontisto",
            iconName: "search",
          },
        ];

      case ROLES.DISTRIBUTION_MANAGER:
      case ROLES.DISTRIBUTION_OFFICER:
        return [
          {
            name: "DistridutionaDashboard",
            label: t("BottomNav.Home") || "Home",
            iconType: "Octicons",
            iconName: "home",
          },
          {
            name: "DistributionCenterTarget",
            label: t("BottomNav.Target") || "Target",
            iconType: "Lucide",
            iconName: "target",
          },
          {
            name: "DistributionOfficersList",
            label: t("BottomNav.Staff") || "Staff",
            iconType: "Feather",
            iconName: "users",
          },
        ];

      default:
        return [
          {
            name: "CollectionDashboard",
            label: t("BottomNav.Home") || "Home",
            iconType: "Octicons",
            iconName: "home",
          },
          {
            name: "SearchPriceScreen",
            label: t("BottomNav.Search") || "Search",
            iconType: "Fontisto",
            iconName: "search",
          },
        ];
    }
  }, [userRole, t]);

  let currentTabName = state?.routes?.[state.index]?.name;

  if (["PriceChart", "PriceChange"].includes(currentTabName)) {
    currentTabName = "SearchPriceScreen";
  }
  if (
    ["EditTargetManager", "PassTargetScreen", "RecieveTargetScreen"].includes(
      currentTabName,
    )
  ) {
    currentTabName = "DailyTarget";
  }
  if (["TransactionList", "OfficerSummary"].includes(currentTabName)) {
    currentTabName = "CollectionOfficersList";
  }
  if (currentTabName === "ClaimDistribution") {
    currentTabName = "DistributionOfficersList";
  }

  // Claim status check
  useEffect(() => {
    const checkClaimStatus = async () => {
      try {
        const token = store.getState().auth.token;

        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/get-claim-status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.claimStatus === 0) {
          navigation?.navigate?.("NoCollectionCenterScreen");
        }
      } catch (error) {
        navigation?.navigate?.("Login");
      }
    };

    if (
      userRole === ROLES.COLLECTION_MANAGER ||
      userRole === ROLES.DISTRIBUTION_OFFICER
    ) {
      checkClaimStatus();
    }
  }, [userRole]);

  // Hide conditions
  if (
    isKeyboardVisible ||
    userRole === ROLES.DISTRIBUTION_OFFICER ||
    ["PurchaseProduct", "PurchaseShortage"].includes(currentTabName)
  )
    return null;

  const renderTabIcon = (
    iconType: string,
    iconName: string,
    color: string,
    size: number = 22,
  ) => {
    switch (iconType) {
      case "Octicons":
        return <Octicons name={iconName as any} size={size} color={color} />;
      case "Feather":
        return <Feather name={iconName as any} size={size} color={color} />;
      case "Fontisto":
        return <Fontisto name={iconName as any} size={size} color={color} />;
      case "Lucide":
        if (iconName === "target") {
          return <Target size={size} color={color} strokeWidth={2.5} />;
        }
        return null;
      default:
        return null;
    }
  };

  // UI
  return (
    <View className="bg-white">
      <View
        className="flex-row justify-between items-center bg-white px-6 rounded-t-3xl w-full border-t border-r border-l border-[#00000040] shadow-md"
        style={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {tabs.map((tab, index) => {
          const isFocused = currentTabName === tab.name;
          const activeColor = "#000000";
          const inactiveColor = "#8E8E93";

          return (
            <TouchableOpacity
              key={index}
              onPress={() => navigation?.navigate?.(tab.name)}
              className={isFocused ? "bg-[#FAE432] p-3 rounded-full" : "p-3"}
              style={{
                backgroundColor: isFocused ? "#FAE432" : "transparent",
                borderRadius: 50,
              }}
            >
              {renderTabIcon(tab.iconType, tab.iconName, "#000000")}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default BottomNav;
