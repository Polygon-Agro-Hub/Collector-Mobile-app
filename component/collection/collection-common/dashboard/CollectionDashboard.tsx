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
import { CircularProgress } from "react-native-circular-progress";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import DashboardSkeleton from "@/component/components/skeletons/DashboardSkeleton";
import { useSelector } from "react-redux";
import { RootState } from "@/services/reducxStore";
import { ROLES } from "@/constants/user-roles";

type CollectionDashboardNavigationProps = StackNavigationProp<
  RootStackParamList,
  "CollectionDashboard"
>;

interface CollectionDashboardProps {
  navigation: CollectionDashboardNavigationProps;
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
  empId?: string;
  regCode?: string;
}

const CollectionDashboard: React.FC<CollectionDashboardProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [targetPercentage, setTargetPercentage] = useState<number | null>(null);
  const [isLoadingTarget, setIsLoadingTarget] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

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
      const token = store.getState().auth.token;
      if (token) {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-officer/user-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = response.data.data;
        setProfile(data);
        if (data.empId) {
          setEmpId(data.empId);
        }
        if (data.regCode) {
          await AsyncStorage.setItem("centerCode", data.regCode);
          console.log("User Profile regCode:", data.regCode);
        }
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
      console.error("❌ Failed to fetch target percentage:", error);
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
      await checkTokenExpiration();
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

  const checkTokenExpiration = async () => {
    try {
      const expirationTime = store.getState().auth.tokenExpirationTime;
      const userToken = store.getState().auth.token;

      if (expirationTime && userToken) {
        const currentTime = new Date();
        const tokenExpiry = new Date(expirationTime);

        if (currentTime < tokenExpiry) {
          // Token is valid
        } else {
          store.dispatch(logoutUser());
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

  const getTranslationPrefix = () => {
    return jobRole === ROLES.COLLECTION_MANAGER
      ? "ManagerDashboard"
      : "CollectionOfficerDashboard";
  };

  const renderTargetStatus = () => {
    const prefix = getTranslationPrefix();
    if (isLoadingTarget) {
      return (
        <View className="bg-white rounded-3xl mt-3 p-4 shadow-lg">
          <Text className="text-center text-gray-500">
            Loading target status...
          </Text>
        </View>
      );
    }

    if (targetPercentage !== null && targetPercentage < 100) {
      return (
        <View className="bg-white w-full rounded-[35px] mt-3 p-4 border-[1px] border-[#DF9301] shadow-lg">
          <Text className="text-center text-yellow-600 font-bold">
            🚀 {t(`${prefix}.Keep`)}
          </Text>
          <Text className="text-center text-gray-500">
            {t(`${prefix}.Youhavenotachieved`)}
          </Text>
        </View>
      );
    } else {
      return (
        <View className="bg-white w-full rounded-[35px] mt-3 p-4 border-[1px] border-[#2AAD7A] shadow-lg">
          <View className="flex-row justify-center items-center mb-2">
            <Image
              source={require("../../../../assets/images/dashboard/hand.webp")}
              className="w-8 h-8 mr-2"
            />
            <Text className="text-center text-[#2AAD7A] font-bold">
              {t(`${prefix}.Completed`)}
            </Text>
          </View>
          <Text className="text-center text-gray-500">
            {t(`${prefix}.Youhaveachieved`)}
          </Text>
        </View>
      );
    }
  };

  const getDashboardItems = () => {
    const items = [];

    if (jobRole === ROLES.COLLECTION_MANAGER) {
      items.push({
        key: "center_target",
        title: t("ManagerDashboard.CenterTarget"),
        borderColor: "#980775",
        icon: (
          <Image
            source={require("../../../../assets/images/dashboard/center-target.webp")}
            className="w-8 h-8 absolute top-2 right-2"
          />
        ),
        onPress: () => navigation.navigate("CenterTarget" as any),
      });

      items.push({
        key: "my_collection",
        title: t("ManagerDashboard.MyCollection"),
        borderColor: "#FF7338",
        icon: (
          <Image
            source={require("../../../../assets/images/dashboard/collection.webp")}
            className="w-8 h-8 absolute top-2 right-2"
          />
        ),
        onPress: () => navigation.navigate("ManagerTransactions" as any, { empId }),
      });
    }

    const prefix = getTranslationPrefix();
    items.push({
      key: "scan",
      title: t(`${prefix}.Scan`),
      borderColor: "#FFE300",
      icon: (
        <Image
          source={require("../../../../assets/images/dashboard/qr.webp")}
          className="w-8 h-8 absolute top-2 right-2"
        />
      ),
      onPress: () => navigation.navigate("QRScanner" as any),
    });

    items.push({
      key: "search",
      title: t(`${prefix}.Search`),
      borderColor: "#FF0086",
      icon: (
        <Image
          source={require("../../../../assets/images/dashboard/search-client.webp")}
          className="w-8 h-8 absolute top-2 right-2"
        />
      ),
      onPress: () => navigation.navigate("SearchFarmer" as any),
    });

    return items;
  };

  // Show skeleton while loading profile
  if (isLoadingProfile || !profile) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white px-6 py-3"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full max-w-[600px] mx-auto flex-1">
        {/* Profile Section */}
        <TouchableOpacity
          className="flex-row items-center py-4"
          onPress={() => navigation.navigate("SideMenu")}
        >
          <Image
            source={
              profile?.image
                ? { uri: profile.image }
                : require("../../../../assets/images/auth/my-profile.webp")
            }
            className="w-16 h-16 rounded-full mr-3"
          />

          <View style={{ flex: 1 }}>
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
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {getcompanyName()}
            </Text>
          </View>
        </TouchableOpacity>

        {renderTargetStatus()}

        {/* Target Progress Section */}
        {jobRole === ROLES.COLLECTION_MANAGER ? (
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
        ) : (
          <View className="items-center justify-center mt-10 mb-10">
            <View className="relative">
              <CircularProgress
                size={120}
                width={8}
                fill={targetPercentage !== null ? targetPercentage : 0}
                tintColor="#000000"
                backgroundColor="#E5E7EB"
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
            <Text
              style={[
                { fontSize: 18, fontWeight: "bold" },
                getTextStyle(selectedLanguage),
              ]}
              className="text-gray-700 mt-2"
            >
              {t("CollectionOfficerDashboard.Yourtarget")}
            </Text>
            <Text
              style={[
                { fontSize: 18, fontWeight: "bold" },
                getTextStyle(selectedLanguage),
              ]}
              className="text-gray-700"
            >
              {t("CollectionOfficerDashboard.Progress")}
            </Text>
          </View>
        )}

        {/* Action Buttons - dynamic layout */}
        <View className="flex-row flex-wrap justify-between pb-12 mt-4">
          {getDashboardItems().map((item) => (
            <TouchableOpacity
              key={item.key}
              className="bg-white p-4 rounded-3xl w-[48%] h-40 shadow-lg relative mb-4"
              onPress={item.onPress}
              style={{
                borderColor: item.borderColor,
                borderWidth: 1,
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
                className="text-gray-700 text-lg absolute bottom-2 left-4"
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

export default CollectionDashboard;
