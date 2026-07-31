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
import { CircularProgress } from "react-native-circular-progress";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../../types/types";
import { useTranslation } from "react-i18next";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import DashboardSkeleton from "./DashboardSkeleton";

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

const DistributionDashboard: React.FC<DistributionDashboardProps> = ({
  navigation,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jobRole, setJobeRole] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTarget, setIsLoadingTarget] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("❌ Error fetching language preference:", error);
    }
  };

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const token = await AsyncStorage.getItem("token");
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
      const token = await AsyncStorage.getItem("token");
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
    checkTokenExpiration();
    fetchSelectedLanguage();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    await fetchTargetPercentage();
    await checkTokenExpiration();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  const checkTokenExpiration = async () => {
    try {
      const expirationTime = await AsyncStorage.getItem("tokenExpirationTime");
      const userToken = await AsyncStorage.getItem("token");

      if (expirationTime && userToken) {
        const currentTime = new Date();
        const tokenExpiry = new Date(expirationTime);

        if (currentTime < tokenExpiry) {
          // Token is valid
        } else {
          await AsyncStorage.multiRemove([
            "token",
            "tokenStoredTime",
            "tokenExpirationTime",
          ]);
          navigation.navigate("Login");
        }
      }
    } catch (error) {
      console.error("❌ Error checking token expiration:", error);
      navigation.navigate("Login");
    }
  };

  const getFullName = () => {
    if (!profile) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profile.firstNameSinhala} ${profile.lastNameSinhala}`;
      case "ta":
        return `${profile.firstNameTamil} ${profile.lastNameTamil}`;
      default:
        return `${profile.firstNameEnglish} ${profile.lastNameEnglish}`;
    }
  };

  const getcompanyName = () => {
    if (!profile) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profile.companyNameSinhala}`;
      case "ta":
        return `${profile.companyNameTamil}`;
      default:
        return `${profile.companyNameEnglish} `;
    }
  };

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
  };

  const renderTargetStatus = () => {
    if (isLoadingTarget) {
      return (
        <View
          className="bg-white mx-auto w-[90%] max-w-[500px] rounded-[35px] mt-4 mb-8 p-4"
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Text className="text-center text-gray-500">
            Loading target status...
          </Text>
        </View>
      );
    }

    if (targetPercentage !== null && targetPercentage < 100) {
      return (
        <View className="bg-white mx-auto w-[90%] max-w-[500px] rounded-[35px] mt-3 mb-5 p-4 border-[1px] border-[#DF9301]">
          <Text className="text-center text-yellow-600 font-bold">
            🚀{t("DistridutionaDashboard.Keep")}
          </Text>
          <Text className="text-center text-gray-500">
            {t("DistridutionaDashboard.Youhavenotachieved")}
          </Text>
        </View>
      );
    } else {
      return (
        <View className="bg-white mx-auto w-[90%] max-w-[500px] rounded-[35px] mt-3 p-4 border-[1px] border-[#2AAD7A]">
          <View className="flex-row justify-center items-center mb-2">
            <Image
              source={require("../../../../assets/images/dashboard/Applause.webp")}
              style={{ width: 32, height: 32 }}
              className="w-8 h-8 mr-2"
              resizeMode="contain"
            />
            <Text className="text-center text-[#2AAD7A] font-bold">
              {t("DistridutionaDashboard.Completed")}
            </Text>
          </View>
          <Text className="text-center text-gray-500">
            {t("DistridutionaDashboard.Youhaveachieved")}
          </Text>
        </View>
      );
    }
  };

  const getDashboardItems = () => {
    const items = [];

    // 1. Start Packing (SelectRow)
    items.push({
      key: "start_packing",
      title: "Start Packing",
      icon: (
        <Image
          source={require("../../../../assets/images/dashboard/center-target.webp")}
          style={{ width: 32, height: 32 }}
          className="w-8 h-8 absolute top-2 right-2"
          resizeMode="contain"
        />
      ),
      onPress: () => navigation.navigate("SelectRow" as any),
    });

    // 2. Assign Groups (DCM only)
    if (jobRole === "Distribution Centre Manager") {
      items.push({
        key: "assign_groups",
        title: "Assign Groups",
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
      title: "Purchase Shortage",
      icon: (
        <View className="absolute top-2 right-2">
          <Feather name="shopping-bag" size={24} color="#980775" />
        </View>
      ),
      onPress: () => navigation.navigate("PurchaseShortage" as any),
    });

    return items;
  };

  if ((isLoadingProfile || isLoadingTarget) && !refreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white p-3"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="w-full max-w-[600px] mx-auto flex-1">
        <TouchableOpacity
          className="flex-row items-center p-4"
          onPress={() => navigation.navigate("SideMenu")}
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

        {renderTargetStatus()}

        <View className="flex items-center justify-center mt-10">
          <View style={{ width: 100, height: 100 }}>
            <CircularProgress
              size={100}
              width={8}
              fill={targetPercentage !== null ? targetPercentage : 0}
              tintColor="#000000"
              backgroundColor="#E5E7EB"
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text className="text-2xl font-bold">
                {isLoadingTarget
                  ? "..."
                  : targetPercentage !== null
                    ? `${targetPercentage}%`
                    : "0%"}
              </Text>
            </View>
          </View>
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-gray-700 font-bold text-lg mt-2"
          >
            {t("DistridutionaDashboard.Yourtarget")}{" "}
          </Text>
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-gray-700 font-bold text-lg "
          >
            {" "}
            {t("DistridutionaDashboard.Progress")}
          </Text>
        </View>

        <View className="flex-row flex-wrap px-2 pb-12 gap-4 justify-start mt-8">
          {getDashboardItems().map((item) => (
            <TouchableOpacity
              key={item.key}
              className="bg-white p-4 rounded-3xl w-[47%] h-32 shadow-lg border border-[#980775] relative mb-2"
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
