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
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import { useTranslation } from "react-i18next";
import DashboardSkeleton from "../skeletons/DashboardSkeleton";
import { FontAwesome6 } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

type DashboardNavigationProps = StackNavigationProp<
  RootStackParamList,
  "CollectionOfficerDashboard"
>;

interface CollectionOfficerDashboardProps {
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

const CollectionOfficerDashboard: React.FC<CollectionOfficerDashboardProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
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
          `${environment.API_BASE_URL}api/collection-officer/user-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error("❌ Failed to fetch user profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };



  useEffect(() => {
    fetchUserProfile();
    checkTokenExpiration();
    fetchSelectedLanguage();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
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



  // Show skeleton while loading profile
  if (isLoadingProfile || !profile) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Section - at the top */}
      <TouchableOpacity
        className="flex-row items-center p-5 "
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
            style={[
              { fontSize: 18, fontWeight: "bold" },
              getTextStyle(selectedLanguage),
            ]}
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

      <View className="w-full max-w-[500px] mx-auto">
        <View className="items-center justify-center my-6">
          <LottieView
            source={require("../../assets/lottie/coming-soon.json")}
            autoPlay
            loop
            style={{ width: 250, height: 250 }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-row px-4 pb-4 gap-4 justify-start">
          <TouchableOpacity
            className="bg-white p-4 rounded-3xl w-[48%] h-32 shadow-lg border border-[#980775] relative"
            onPress={() => navigation.navigate("SelectRow" as any)}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View className="absolute top-2 right-2">
              <FontAwesome6 name="box-open" size={24} color="#980775" />
            </View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-[#555464] text-lg absolute bottom-2 left-4"
            >
              Start Packing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white p-4 rounded-3xl w-[48%] h-32 shadow-lg border border-[#980775] relative"
            onPress={() => navigation.navigate("Group" as any)}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View className="absolute top-2 right-2">
              <FontAwesome6 name="users" size={24} color="#980775" />
            </View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-[#555464] text-lg absolute bottom-2 left-4"
            >
              Assign Groups
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default CollectionOfficerDashboard;