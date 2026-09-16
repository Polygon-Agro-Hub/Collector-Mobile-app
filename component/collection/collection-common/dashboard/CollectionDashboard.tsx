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
import environment from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import CollectionDashboardSkeleton from "@/component/components/skeletons/CollectionDashboardSkeleton";
import { useSelector } from "react-redux";
import { RootState } from "@/services/reducxStore";
import { ROLES } from "@/constants/user-roles";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";

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

  const [activeTab, setActiveTab] = useState<"collection" | "transport">("collection");

  // Device Connection State (Wi-Fi Scale BUDRY MFD-300)
  const [isScaleModalVisible, setIsScaleModalVisible] = useState<boolean>(false);
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      setIsWifiEnabled(state.isConnected !== false && state.type !== "none");
    });
    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, []);

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
    };
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    await fetchTargetPercentage();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSelectedLanguage();
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
    if (!profile) return t("ManagerTransactions.Loading");
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
    if (!profile) return t("ManagerTransactions.Loading");
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
        <View className="bg-white rounded-[28px] mt-3 p-4 shadow-lg">
          <Text className="text-center text-gray-500">
            {t("CollectionOfficerDashboard.LoadingTargetStatus")}
          </Text>
        </View>
      );
    }

    if (targetPercentage !== null && targetPercentage < 100) {
      return (
        <View className="bg-white w-full rounded-[28px] mt-3 p-4 border-[1px] border-[#DF9301] shadow-lg">
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
        <View className="bg-white w-full rounded-[28px] mt-3 p-4 border-[1px] border-[#2AAD7A] shadow-lg">
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

  const renderScaleSection = () => {
    if (!isWifiEnabled) {
      return (
        /* State 3: Mobile Wi-Fi Off - #FDF0F1 background, #E91233 text/icon */
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsScaleModalVisible(true)}
          style={{
            marginTop: 10,
            backgroundColor: "#FDF0F1",
            borderRadius: 28,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="wifi" size={24} color="#E91233" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#E91233",
                letterSpacing: -0.2,
              }}
            >
              {t("ScaleSelectModal.WifiOffTitle")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#0F172A",
                fontWeight: "500",
                marginTop: 1,
                lineHeight: 16,
              }}
            >
              {t("ScaleSelectModal.WifiOffMessage")}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (scaleStatus.connected && scaleStatus.scale) {
      return (
        /* State 2: Connected State - #FAE432 background, black text/icon */
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsScaleModalVisible(true)}
          style={{
            marginTop: 10,
            backgroundColor: "#FAE432",
            borderRadius: 28,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#000000",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name="wifi" size={24} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "bold",
                color: "#000000",
                letterSpacing: -0.3,
              }}
            >
              {t("ScaleSelectModal.ScaleConnected")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: "#000000",
                marginTop: 1,
              }}
            >
              {scaleStatus.scale.name || "Wi-Fi Scale Pro"}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={26} color="#000000" />
        </TouchableOpacity>
      );
    }

    return (
      /* State 1: Not Connected - #1266FD background, white text/icon */
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setIsScaleModalVisible(true)}
        style={{
          marginTop: 10,
          backgroundColor: "#1266FD",
          borderRadius: 28,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="wifi" size={24} color="#1266FD" />
        </View>

        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: "bold",
            color: "#FFFFFF",
            letterSpacing: -0.2,
          }}
        >
          {t("ScaleSelectModal.ConnectScale")}
        </Text>

        <MaterialIcons name="chevron-right" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    );
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

  // Show skeleton while loading full dashboard data (profile, target)
  if (isLoadingProfile || isLoadingTarget || !profile) {
    return <CollectionDashboardSkeleton />;
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

        {/* Navigation Tabs: Collection & Transport */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
            marginHorizontal: -24,
          }}
        >
          {/* Collection Tab */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab("collection")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              gap: 8,
              position: "relative",
            }}
          >
            <Image
              source={require("../../../../assets/images/collection-common/dashboard/collection-colored.webp")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
            <Text
              style={[
                {
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#000000",
                },
                getTextStyle(selectedLanguage),
              ]}
            >
              {t(`${getTranslationPrefix()}.Collection`)}
            </Text>
            {activeTab === "collection" && (
              <View
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: "#000000",
                }}
              />
            )}
          </TouchableOpacity>

          {/* Transport Tab */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab("transport")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              gap: 8,
              position: "relative",
            }}
          >
            <Image
              source={require("../../../../assets/images/collection-common/dashboard/lorry-colored.webp")}
              style={{ width: 28, height: 24 }}
              resizeMode="contain"
            />
            <Text
              style={[
                {
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#000000",
                },
                getTextStyle(selectedLanguage),
              ]}
            >
              {t(`${getTranslationPrefix()}.Transport`)}
            </Text>
            {activeTab === "transport" && (
              <View
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: "#000000",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        {activeTab === "collection" ? (
          <>
            {/* Wi-Fi Scale Section */}
            {renderScaleSection()}

            {/* Keep Going Section - Placed Below Devices Section */}
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
          </>
        ) : (
          /* Transport Tab Content */
          <>
            {/* Wi-Fi Scale Section */}
            {renderScaleSection()}

            {/* Transport Action Buttons (Accessible to both CCM and COO) */}
            <View className="flex-row flex-wrap justify-between pb-12 mt-6">
              <TouchableOpacity
                className="bg-white p-4 rounded-3xl w-[48%] h-40 shadow-lg relative mb-4"
                onPress={() => navigation.navigate("SentProductsToday")}
                style={{
                  borderColor: "#980775",
                  borderWidth: 1,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <Image
                  source={require("../../../../assets/images/collection-common/dashboard/lorry.webp")}
                  className="w-10 h-10 absolute top-2 right-2"
                  resizeMode="contain"
                />
                <Text
                  style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                  className="text-gray-700 text-lg absolute bottom-2 left-4"
                >
                  {t(`${getTranslationPrefix()}.ReadyToTransport`)}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ScaleSelectModal
        visible={isScaleModalVisible}
        onClose={() => setIsScaleModalVisible(false)}
      />
    </ScrollView>
  );
};

export default CollectionDashboard;
