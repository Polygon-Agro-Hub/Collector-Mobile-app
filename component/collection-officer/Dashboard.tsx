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
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import DashboardSkeleton from "../skeleton/DashboardSkeleton";

type DashboardNavigationProps = StackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;

interface DashboardProps {
  navigation: DashboardNavigationProps;
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

const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number | null>(null);
  const [isLoadingTarget, setIsLoadingTarget] = useState(true); // Add loading state
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
          }
        );
        setProfile(response.data.data);
        setEmpId(response.data.data.empId);
    //    console.log("data:", response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const fetchTargetPercentage = async () => {
    setIsLoadingTarget(true); // Set loading to true when starting fetch
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
        }
      );
     console.log("response for percentage target", response.data);
      if (response.data.success) {
        const percentage = parseInt(
          response.data.completionPercentage.replace("%", ""),
          10
        );
        setTargetPercentage(percentage);
      } else {
        setTargetPercentage(0);
      }
    } catch (error) {
      console.error("Failed to fetch target percentage:", error);
      setTargetPercentage(0);
    } finally {
      setIsLoadingTarget(false); // Set loading to false when done
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
   const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

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
          console.log("Token expired, clearing storage.");
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

  // Function to render target status
  const renderTargetStatus = () => {
    // Show loading state while fetching
    if (isLoadingTarget) {
      return (
        <View 
          className="bg-white ml-[20px] w-[90%] rounded-[15px] mt-3 p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-center text-gray-500">
            Loading target status...
          </Text>
        </View>
      );
    }

    // Show appropriate status based on target percentage
    if (targetPercentage !== null && targetPercentage < 100) {
      return (
        <View 
          className="bg-white ml-[20px] w-[90%] rounded-[15px] mt-3 p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-center text-yellow-600 font-bold">
            🚀{t("DashBoard.Keep")}
          </Text>
          <Text className="text-center text-gray-500">
            {t("DashBoard.Youhavenotachieved")}
          </Text>
        </View>
      );
    } else {
      return (
        <View 
          className="bg-white ml-[20px] w-[90%] rounded-[15px] mt-3 p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View className="flex-row justify-center items-center mb-2">
            <Image
              source={require("../../assets/images/hand.webp")}
              className="w-8 h-8 mr-2"
            />
            <Text className="text-center text-[#2AAD7A] font-bold">
              {t("DashBoard.Completed")}
            </Text>
          </View>
          <Text className="text-center text-gray-500">
            {t("DashBoard.Youhaveachieved")}
          </Text>
        </View>
      );
    }
  };

  if (!profile) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white p-3"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Section */}
      <TouchableOpacity
        className="flex-row items-center mb-4 p-4"
        onPress={() => navigation.navigate("EngProfile")}
      >
        <Image
          source={
            profile?.image
              ? { uri: profile.image }
              : require("../../assets/images/mprofile.webp")
          }
          className="w-16 h-16 rounded-full mr-3"
          onError={() => console.log("Failed to load image")}
        />

        <View>
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-lg font-bold"
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

      {/* Render target status using the new function */}
      {renderTargetStatus()}

      <View className="flex items-center justify-center my-6 mt-[13%]">
        <View className="relative">
          <CircularProgress
            size={100}
            width={8}
            fill={targetPercentage !== null ? targetPercentage : 0}
            tintColor="#000000"
            backgroundColor="#E5E7EB"
          />
          <View className="absolute items-center justify-center h-24 w-24">
            <Text className="text-2xl font-bold">
              {isLoadingTarget ? "..." : (targetPercentage !== null ? `${targetPercentage}%` : "0%")}
            </Text>
          </View>
        </View>
        <Text
          style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
          className="text-gray-700 font-bold text-lg mt-2"
        >
          {t("DashBoard.Yourtarget")}{" "}
        </Text>
        <Text
          style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
          className="text-gray-700 font-bold text-lg "
        >
          {" "}
          {t("DashBoard.Progress")}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row flex-wrap justify-between p-6 mt-[-5%]">
        <TouchableOpacity
          className="bg-white p-4 rounded-lg w-[45%] h-28 mt-4 shadow-lg shadow-gray-500 relative border border-[#FFE300]"
          onPress={() => navigation.navigate("QRScanner" as any)}
        >
           <Image
                          source={require("../../assets/images/New/qr.png")}
                          className="w-8 h-8 absolute top-2 right-2"
                        />
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-gray-700 text-lg absolute bottom-2 left-2"
          >
            {t("DashBoard.Scan")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white p-4 rounded-lg w-[45%] h-28 mt-4 shadow-lg shadow-gray-500 relative mb-5 border border-[#FF0086]"
          onPress={() => navigation.navigate("SearchFarmer" as any)}
        >
          <Image
                         source={require("../../assets/images/New/searchclient.png")}
                         className="w-8 h-8 absolute top-2 right-2"
                       />
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-gray-700 text-lg absolute bottom-2 left-2"
          >
            {t("DashBoard.Search")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Dashboard;