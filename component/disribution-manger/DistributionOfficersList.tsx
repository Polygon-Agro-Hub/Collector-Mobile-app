import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";

const { width } = Dimensions.get("window");
const scale = (size: number) => (width / 375) * size;

type CollectionOfficersListNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DistributionOfficersList"
>;

interface CollectionOfficersListProps {
  navigation: CollectionOfficersListNavigationProps;
}

interface Officer {
  empId: string;
  fullNameEnglish: string;
  phoneNumber1: string;
  phoneNumber2: string;
  collectionOfficerId: number;
  status: string;
  image: string;
  fullNameSinhala: string;
  fullNameTamil: string;
  jobRole: string;
}

type ActiveTab = "Officers" | "Drivers";

const DistributionOfficersList: React.FC<CollectionOfficersListProps> = ({
  navigation,
}) => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [activeTab, setActiveTab] = useState<ActiveTab>("Officers");
  const [filteredOfficers, setFilteredOfficers] = useState<Officer[]>([]);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setShowMenu(false);
    }, []),
  );

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return { fontSize: 14, lineHeight: 20 };
    }
  };

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/collection-officerslist`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.status === "success") {
        const approvedOfficers = response.data.data.filter(
          (officer: Officer) => officer.status === "Approved",
        );
        const notApprovedOfficers = response.data.data.filter(
          (officer: Officer) => officer.status === "Not Approved",
        );

        const sortedApproved = approvedOfficers.sort((a: Officer, b: Officer) =>
          getOfficerName(a).localeCompare(getOfficerName(b)),
        );
        const sortedNotApproved = notApprovedOfficers.sort(
          (a: Officer, b: Officer) =>
            getOfficerName(a).localeCompare(getOfficerName(b)),
        );

        setOfficers([...sortedApproved, ...sortedNotApproved]);
      } else {
        setErrorMessage(t("Error.Failed to fetch officers."));
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setErrorMessage(t("Error.No officers available."));
      } else {
        setErrorMessage(t("Error.An error occurred while fetching officers."));
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOfficers();
      setActiveTab("Officers");
    }, []),
  );

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const getOfficerName = (officer: Officer) => {
    switch (selectedLanguage) {
      case "si":
        return officer.fullNameSinhala;
      case "ta":
        return officer.fullNameTamil;
      default:
        return officer.fullNameEnglish;
    }
  };

  const officersList = officers.filter(
    (o) =>
      o.jobRole === "Collection Officer" ||
      o.jobRole === "Distribution Officer",
  );
  const driversList = officers.filter((o) => o.jobRole === "Driver");

  const officersCount = officersList.length || officers.length;
  const driversCount = driversList.length;

  useEffect(() => {
    if (activeTab === "Officers") {
      setFilteredOfficers(officersList.length > 0 ? officersList : officers);
    } else {
      setFilteredOfficers(driversList);
    }
  }, [activeTab, officers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOfficers();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("DistridutionaDashboard");
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  const renderOfficer = ({ item }: { item: Officer }) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 mb-4 rounded-[35px] shadow-sm mx-4 bg-gray-100`}
      onPress={() => {
        if (item.status !== "Not Approved" && item.jobRole !== "Driver") {
          navigation.navigate("DistributionOfficerSummary" as any, {
            officerId: item.empId,
            officerName: getOfficerName(item),
            phoneNumber1: item.phoneNumber1,
            phoneNumber2: item.phoneNumber2,
            collectionOfficerId: item.collectionOfficerId,
            image: item.image,
          });
        }
      }}
      disabled={item.status === "Not Approved" || item.jobRole === "Driver"}
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
        opacity: item.jobRole === "Driver" ? 1 : 1,
      }}
    >
      <View className="w-14 h-14 rounded-full overflow-hidden justify-center items-center mr-4 shadow-md">
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../assets/images/collection-manager/avetar.webp")
          }
          className="w-16 h-16 rounded-full mr-3"
        />
      </View>

      <View className="flex-1">
        {item.status === "Not Approved" && (
          <Text
            className="text-red-500 text-xs font-semibold mr-2 self-end"
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 9 }
                  : { fontSize: 12 },
            ]}
          >
            {t("CollectionOfficersList.Not Approved")}
          </Text>
        )}
        <Text
          className="font-semibold text-gray-900"
          style={[
            i18n.language === "si"
              ? { fontSize: 16 }
              : i18n.language === "ta"
                ? { fontSize: 14 }
                : { fontSize: 17 },
          ]}
        >
          {getOfficerName(item)}
        </Text>
        <Text className="text-sm text-gray-500">
          {t("DistributionOfficersList.EMPID")} {item.empId}
        </Text>
      </View>

      {item.status !== "Not Approved" && item.jobRole !== "Driver" && (
        <Ionicons name="chevron-forward" size={scale(20)} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#313131]">
      {/* Header */}
      <View className="bg-[#313131] pt-6 pb-3 px-4">
        <Text
          style={{ fontSize: 18 }}
          className="text-white text-center font-bold mb-3"
        >
          {t("CollectionOfficersList.Collection Officers")}
        </Text>

        {/* Tabs */}
        <View className="flex-row justify-center items-center gap-2 mt-1">
          {/* Officers Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab("Officers")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor:
                activeTab === "Officers" ? "#980775" : "transparent",
              borderWidth: activeTab === "Officers" ? 0 : 1,
              borderColor: "#ffffff50",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
                fontSize: 13,
                marginRight: officersCount > 0 ? 6 : 0,
              }}
            >
              {t("DistributionOfficersList.Officers") || "Officers"}
            </Text>
            {activeTab === "Officers" && officersCount > 0 && (
              <View
                style={{
                  backgroundColor:
                    activeTab === "Officers" ? "#FFFFFF" : "#ffffff20",
                  borderRadius: 999,
                  minWidth: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 5,
                }}
              >
                <Text
                  style={{ color: "#000000", fontSize: 11, fontWeight: "700" }}
                >
                  {String(officersCount).padStart(2, "0")}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Drivers Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab("Drivers")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor:
                activeTab === "Drivers" ? "#980775" : "transparent",
              borderWidth: activeTab === "Drivers" ? 0 : 1,
              borderColor: "#ffffff50",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
                fontSize: 13,
                marginRight: driversCount > 0 ? 6 : 0,
              }}
            >
              {t("DistributionOfficersList.Drivers") || "Drivers"}
            </Text>
            {activeTab === "Drivers" && driversCount > 0 && (
              <View
                style={{
                  backgroundColor:
                    activeTab === "Drivers" ? "#FFFFFF" : "#ffffff20",
                  borderRadius: 999,
                  minWidth: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 5,
                }}
              >
                <Text
                  style={{ color: "#000000", fontSize: 11, fontWeight: "700" }}
                >
                  {String(driversCount).padStart(2, "0")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 3-dot menu */}
        <TouchableOpacity
          className="absolute top-6 right-4"
          onPress={() => setShowMenu((prev) => !prev)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>

        {showMenu && (
          <View
            style={{
              position: "absolute",
              top: 56,
              right: 16,
              backgroundColor: "white",
              zIndex: 50,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#00000040",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: "white",
                borderRadius: 8,
              }}
              onPress={() =>
                navigation.navigate("ClaimDistribution", { activeTab })
              }
            >
              <Text className="text-gray-700 font-semibold">
                {t("CollectionOfficersList.Claim Officer")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Body */}
      <View
        className="flex-1 w-full max-w-[500px] mx-auto bg-white "
        style={{
          marginTop: 0,
          borderRadius: 25,
        }}
      >
        {/* List title */}
        <View className="mt-4 px-4">
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="font-bold text-[#21202B] mb-2"
          >
            {activeTab === "Officers"
              ? t("CollectionOfficersList.Officers List") || "Officers List"
              : t("CollectionOfficersList.Drivers List") || "Drivers List"}
            {"  "}
            <Text className="text-[#21202B] font-normal">
              ({t("ManagerTransactions.All") || "All"} {filteredOfficers.length}
              )
            </Text>
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center -mt-[25%]">
            <LottieView
              source={require("../../assets/lottie/loading.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
          </View>
        ) : errorMessage ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg">{errorMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOfficers}
            keyExtractor={(item) => item.empId}
            renderItem={renderOfficer}
            contentContainerStyle={{
              paddingBottom: scale(80),
              paddingTop: scale(10),
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ADADAD1A"
                colors={["#ADADAD1A"]}
              />
            }
            showsVerticalScrollIndicator={true}
          />
        )}

        {/* FAB */}
        {activeTab === "Officers" && (
          <TouchableOpacity
            onPress={async () => {
              try {
                await AsyncStorage.removeItem("officerFormData");
                navigation.navigate("DistributionAddOfficerBasicDetails", {
                  jobRolle: "Distribution Officer",
                });
              } catch (error) {
                console.error("Error clearing form data:", error);
              }
            }}
            className="absolute bottom-20 right-5 bg-black w-14 h-14 rounded-full justify-center items-center shadow-lg"
          >
            <Ionicons name="add" size={scale(24)} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default DistributionOfficersList;
