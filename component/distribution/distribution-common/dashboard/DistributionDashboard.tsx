import { logoutUser } from "@/store/authSlice";
import store from "@/services/reducxStore";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  BackHandler,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import environment from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import DashboardSkeleton from "@/component/components/skeletons/DashboardSkeleton";

import { LanguageContext } from "@/context/LanguageContext";
import { useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ROLES } from "@/constants/user-roles";
import socketService from "@/services/socket/socket.service";


type DistributionDashboardNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DistridutionaDashboard"
>;

interface DistributionDashboardProps {
  navigation: DistributionDashboardNavigationProps;
}

interface ProfileData {
  firstNameEnglish: string;
  lastNameEnglish: string;
  companyName: string;
  image: string;
  firstNameSinhala: string;
  lastNameSinhala: string;
  firstNameTamil: string;
  lastNameTamil: string;
  companyNameSinhala: string;
  companyNameEnglish: string;
  companyNameTamil: string;
  jobRole: string;
  centerId: number;
}

const READ_NOTIFS_STORAGE_KEY = "@dcm_read_notifications";

const DistributionDashboard: React.FC<DistributionDashboardProps> = ({
  navigation,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jobRole, setJobeRole] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTarget, setIsLoadingTarget] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();
  const { language } = useContext(LanguageContext);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const currentUserId = store.getState().auth.id;
  const currentUserRole = store.getState().auth.jobRole;
  const isDCM = currentUserRole === ROLES.DISTRIBUTION_MANAGER;

  const fetchUnreadNotifications = async () => {
    if (!isDCM) return;
    try {
      const token = store.getState().auth.token;
      if (!token) return;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/notifications`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        const notifs = response.data.data;
        const storageKey = `${READ_NOTIFS_STORAGE_KEY}_${currentUserId || "default"}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const readSet = new Set(stored ? JSON.parse(stored) : []);
        const unread = notifs.filter((n: any) => !readSet.has(n.id)).length;
        setUnreadNotificationsCount(unread);
      }
    } catch (e) {
      console.error("Error fetching unread notification count:", e);
    }
  };

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || i18n.language || language || "en");
    } catch (error) {
      console.error("❌ Error fetching language preference:", error);
    }
  };

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const token = store.getState().auth.token;
      if (token) {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/distribution-manager/user-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setProfile(response.data.data);
        setJobeRole(response.data.data.jobRole);
        setCenterId(response.data.data.centerId);
      }
    } catch (error) {
      console.error("❌ Failed to fetch user profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchTargetPercentage = async () => {
    setIsLoadingTarget(true);
    try {
      const token = store.getState().auth.token;
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.User not authenticated."));
        setIsLoadingTarget(false);
        return;
      }
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution/get-distribution-target`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const targets = response.data.data;
        const firstTarget = targets[0];
        const percentage = parseInt(
          firstTarget.completionPercentage.replace("%", ""),
          10,
        );
        setTargetPercentage(percentage);
      } else {
        setTargetPercentage(0);
      }
    } catch (error) {
      console.error("❌ Failed to fetch target percentage:", error);
      setTargetPercentage(0);
    } finally {
      setIsLoadingTarget(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchTargetPercentage();
    fetchSelectedLanguage();
    fetchUnreadNotifications();

    if (isDCM) {
      // Ensure socket is connected (service handles duplicate calls safely)
      socketService.connect();

      // Listen for incoming notifications → refresh badge count
      const unsubscribe = socketService.onNewNotification(() => {
        fetchUnreadNotifications();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [currentUserId, isDCM]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    await fetchTargetPercentage();
    await fetchSelectedLanguage();
    await fetchUnreadNotifications();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSelectedLanguage();
      fetchUnreadNotifications();
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  const getCurrentLanguage = (): string => {
    return (i18n.language || language || selectedLanguage || "en")
      .toLowerCase()
      .substring(0, 2);
  };

  const getFullName = () => {
    if (!profile) return t("ManagerTransactions.Loading");
    const currentLang = getCurrentLanguage();
    switch (currentLang) {
      case "si":
        return `${profile.firstNameSinhala || profile.firstNameEnglish || ""} ${profile.lastNameSinhala || profile.lastNameEnglish || ""}`.trim();
      case "ta":
        return `${profile.firstNameTamil || profile.firstNameEnglish || ""} ${profile.lastNameTamil || profile.lastNameEnglish || ""}`.trim();
      default:
        return `${profile.firstNameEnglish || ""} ${profile.lastNameEnglish || ""}`.trim();
    }
  };

  const getcompanyName = () => {
    if (!profile) return t("ManagerTransactions.Loading");
    const currentLang = getCurrentLanguage();
    switch (currentLang) {
      case "si":
        return `${profile.companyNameSinhala || profile.companyNameEnglish || ""}`;
      case "ta":
        return `${profile.companyNameTamil || profile.companyNameEnglish || ""}`;
      default:
        return `${profile.companyNameEnglish || ""}`;
    }
  };

  const getTextStyle = (lang?: string) => {
    const activeLang = lang || getCurrentLanguage();
    if (activeLang === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
  };

  const handleStartPacking = async () => {
    try {
      const token = store.getState().auth.token;
      if (token) {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/packing/active-assignment`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data && response.data.success && response.data.data) {
          const assignment = response.data.data;
          const type = assignment.type || assignment.pType || assignment.positionType;
          if (type === "NOR") {
            navigation.navigate("WelcomeToPacking" as any, {
              positionId: assignment.positionId,
              positionName: assignment.name || assignment.positionName,
            });
          } else if (type === "QC") {
            navigation.navigate("WelcomeToQC" as any, {
              positionName: assignment.name || assignment.positionName,
            });
          } else {
            navigation.navigate("QRHandling" as any);
          }
          return;
        }
      }
    } catch (error) {
      console.error("Error checking active position on Start Packing:", error);
    }
    navigation.navigate("SelectRow" as any);
  };

  const getDashboardItems = () => {
    const items = [];

    // 1. Start Packing (SelectRow or active position)
    items.push({
      key: "start_packing",
      title: t("DistridutionaDashboard.Start Packing"),
      icon: (
        <Image
          source={require("../../../../assets/images/dashboard/center-target.webp")}
          style={{ width: 32, height: 32 }}
          className="w-8 h-8 absolute top-2 right-2"
          resizeMode="contain"
        />
      ),
      onPress: handleStartPacking,
    });

    // 2. Assign Groups (DCM only)
    if (jobRole === "Distribution Centre Manager") {
      items.push({
        key: "assign_groups",
        title: t("DistridutionaDashboard.Assign Groups"),
        icon: (
          <View className="absolute top-2 right-2">
            <FontAwesome6 name="users" size={24} color="#980775" />
          </View>
        ),
        onPress: () => navigation.navigate("Group" as any),
      });
    }

    // 3. Pickup Order Scan
    items.push({
      key: "pickup_order_scan",
      title: t("DistridutionaDashboard.Pickup Order Scan"),
      icon: (
        <View className="absolute top-2 right-2">
          <FontAwesome6 name="qrcode" size={24} color="#980775" />
        </View>
      ),
      onPress: () => navigation.navigate("ReadytoPickupOrders" as any),
    });

    // 4. Received Cash
    items.push({
      key: "received_cash",
      title: t("DistridutionaDashboard.Received Cash"),
      icon: (
        <View className="absolute top-2 right-2">
          <FontAwesome6 name="hand-holding-hand" size={24} color="#980775" />
        </View>
      ),
      onPress: () => {
        if (jobRole === "Distribution Centre Manager") {
          navigation.navigate("ReceivedCash" as any);
        } else if (jobRole === "Distribution Officer") {
          navigation.navigate("ReceivedCashOfficer" as any);
        } else {
          navigation.navigate("ReceivedCash" as any);
        }
      },
    });

    // 5. Purchase Shortage (New)
    items.push({
      key: "purchase_shortage",
      title: t("DistridutionaDashboard.Purchase Shortage"),
      icon: (
        <View className="absolute top-2 right-2">
          <Feather name="shopping-bag" size={24} color="#980775" />
        </View>
      ),
      onPress: () => navigation.navigate("PurchaseShortage" as any),
    });

    // 6. Receive Products
    items.push({
      key: "receive_products",
      title: t("DistridutionaDashboard.ReceiveProducts", "Receive Products"),
      icon: (
        <Image
          source={require("../../../../assets/images/distribution-common/dashboard/receive-products.webp")}
          style={{ width: 32, height: 32 }}
          className="w-8 h-8 absolute top-2 right-2"
          resizeMode="contain"
        />
      ),
      onPress: () => navigation.navigate("ReceivedProductsToday" as any),
    });

    return items;
  };

  if ((isLoadingProfile || isLoadingTarget) && !refreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white px-6 py-3"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="w-full max-w-[600px] mx-auto flex-1">
        <View className="flex-row items-center justify-between py-4">
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-3"
            onPress={() => navigation.navigate("SideMenu")}
            activeOpacity={0.8}
          >
            <Image
              source={
                profile?.image
                  ? { uri: profile.image }
                  : require("../../../../assets/images/auth/my-profile.webp")
              }
              style={{ width: 64, height: 64, borderRadius: 32 }}
              className="w-16 h-16 rounded-full mr-3"
              resizeMode="cover"
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-lg font-bold"
              >
                {getFullName()}
              </Text>

              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-gray-500"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getcompanyName()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Notification Button (Right side of profile section for DCM) */}
          {isDCM && (
            <TouchableOpacity
              onPress={() => navigation.navigate("MyNotifications")}
              className="relative w-12 h-12 rounded-full bg-[#F1F3F6] items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="notifications" size={24} color="#000000" />
              {unreadNotificationsCount > 0 && (
                <View
                  className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#980775]"
                  style={{
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                  }}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row flex-wrap justify-between pb-12 mt-4">
          {getDashboardItems().map((item) => (
            <TouchableOpacity
              key={item.key}
              className="bg-white p-4 rounded-3xl w-[48%] h-40 shadow-lg border border-[#980775] relative mb-4"
              onPress={item.onPress}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {item.icon}
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-[#555464] text-lg absolute bottom-2 left-4"
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default DistributionDashboard;
