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
import { RootStackParamList } from "../types/types";
import { useTranslation } from "react-i18next";
import TransportComponent from "../driver-screens/TransportComponent";

type ManagerDashboardNavigationProps = StackNavigationProp<
  RootStackParamList,
  "ManagerDashboard"
>;

interface ManagerDashboardProps {
  navigation: ManagerDashboardNavigationProps;
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
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Collection" | "Transport">(
    "Collection",
  );
  const [targetPercentage, setTargetPercentage] = useState<number | null>(null);
  const [isLoadingTarget, setIsLoadingTarget] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/user-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setProfile(response.data.data);
        setEmpId(response.data.data.empId);
        AsyncStorage.setItem("centerCode", response.data.data.regCode);
        console.log("User Profile:", response.data.data.regCode);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
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
        `${environment.API_BASE_URL}api/target/officer-task-summary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        const percentage = parseInt(
          response.data.completionPercentage.replace("%", ""),
          10,
        );
        setTargetPercentage(percentage);
      } else {
        setTargetPercentage(0);
      }
    } catch (error) {
      console.error("Failed to fetch target percentage:", error);
      setTargetPercentage(0);
    } finally {
      setIsLoadingTarget(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
      await fetchUserProfile();
      await fetchTargetPercentage();
    };
    fetchData();
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

  const checkTokenExpiration = async () => {
    try {
      const expirationTime = await AsyncStorage.getItem("tokenExpirationTime");
      const userToken = await AsyncStorage.getItem("token");

      if (expirationTime && userToken) {
        const currentTime = new Date();
        const tokenExpiry = new Date(expirationTime);

        if (currentTime < tokenExpiry) {
          console.log("Token is valid");
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
      console.error("Error checking token expiration:", error);
      navigation.navigate("Login");
    }
  };

  const renderTargetStatus = () => {
    if (isLoadingTarget) {
      return (
        <View className="bg-white rounded-3xl mt-3 p-4 mx-4 shadow-lg">
          <Text className="text-center text-gray-500">
            Loading target status...
          </Text>
        </View>
      );
    }

    if (targetPercentage !== null && targetPercentage < 100) {
      return (
        <View className="bg-white ml-[20px] w-[90%] rounded-[35px] mt-3 p-4 border-[1px] border-[#DF9301]">
          <Text className="text-center text-yellow-600 font-bold">
            🚀 {t("ManagerDashboard.Keep")}
          </Text>
          <Text className="text-center text-gray-500">
            {t("ManagerDashboard.Youhavenotachieved")}
          </Text>
        </View>
      );
    } else {
      return (
        <View className="bg-white ml-[20px] w-[90%] rounded-[35px] mt-3 p-4 border-[1px] border-[#2AAD7A]">
          <View className="flex-row justify-center items-center mb-2">
            <Image
              source={require("../../assets/images/dashboard/hand.webp")}
              className="w-8 h-8 mr-2"
            />
            <Text className="text-center text-[#2AAD7A] font-bold">
              {t("ManagerDashboard.Completed")}
            </Text>
          </View>
          <Text className="text-center text-gray-500">
            {t("ManagerDashboard.Youhaveachieved")}
          </Text>
        </View>
      );
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Section */}
      <TouchableOpacity
        className="flex-row items-center p-4 mt-10"
        onPress={() => navigation.navigate("SideMenu")}
      >
        <Image
          source={
            profile?.image
              ? { uri: profile.image }
              : require("../../assets/images/auth/my-profile.webp")
          }
          className="w-16 h-16 rounded-full mr-3"
        />

        <View>
          <Text
            style={[{ fontSize: 18, fontWeight: "bold" }, getTextStyle(selectedLanguage)]}
            className="text-black"
          >
            {getFullName()}
          </Text>
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-gray-500"
          >
            {getcompanyName()}
          </Text>
        </View>
      </TouchableOpacity>

      {activeTab === "Collection" ? (
        <>
          {renderTargetStatus()}

          {/* Target Progress */}
          <View className="flex-row items-center justify-center gap-4 mt-10 mb-10">
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-700 font-bold text-lg"
            >
              {t("ManagerDashboard.Yourtarget")}
            </Text>
            <View className="relative">
              <CircularProgress
                size={120}
                width={8}
                fill={targetPercentage !== null ? targetPercentage : 0}
                tintColor="#000000"
                backgroundColor="#EEEEEE"
              />
              <View
                className="absolute items-center justify-center"
                style={{ width: 120, height: 120 }}
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
          </View>

          {/* Action Buttons - Consistent Design */}
          <View className="flex-row px-4 pb-8 gap-4 justify-center">
            <TouchableOpacity
              className="bg-white p-4 rounded-3xl flex-1 h-32 shadow-lg relative border border-[#980775]"
              onPress={() => navigation.navigate("CenterTarget" as any)}
            >
              <Image
                source={require("../../assets/images/dashboard/center-target.webp")}
                className="w-8 h-8 absolute top-2 right-2"
              />
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-gray-700 text-lg absolute bottom-2 left-4"
              >
                {t("ManagerDashboard.CenterTarget")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white p-4 rounded-3xl flex-1 h-32 shadow-lg relative border border-[#FF7338]"
              onPress={() =>
                navigation.navigate("ManagerTransactions" as any, { empId })
              }
            >
              <Image
                source={require("../../assets/images/dashboard/collection.webp")}
                className="w-8 h-8 absolute top-2 right-2"
              />
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-gray-700 text-lg absolute bottom-2 left-4"
              >
                {t("ManagerDashboard.MyCollection")}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row px-4 pb-8 gap-4 justify-center">
            <TouchableOpacity
              className="bg-white p-4 rounded-3xl flex-1 h-32 shadow-lg relative border border-[#FFE300]"
              onPress={() => navigation.navigate("QRScanner" as any)}
            >
              <Image
                source={require("../../assets/images/dashboard/qr.webp")}
                className="w-8 h-8 absolute top-2 right-2"
              />
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-gray-700 text-lg absolute bottom-2 left-4"
              >
                {t("ManagerDashboard.Scan")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white p-4 rounded-3xl flex-1 h-32 shadow-lg relative border border-[#FF0086]"
              onPress={() => navigation.navigate("SearchFarmer" as any)}
            >
              <Image
                source={require("../../assets/images/dashboard/search-client.webp")}
                className="w-8 h-8 absolute top-2 right-2"
              />
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-gray-700 text-lg absolute bottom-2 left-4"
              >
                {t("ManagerDashboard.Search")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TransportComponent navigation={navigation} />
      )}
    </ScrollView>
  );
};

export default ManagerDashboard;