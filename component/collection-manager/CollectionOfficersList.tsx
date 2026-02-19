import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const scale = (size: number) => (width / 375) * size;

type CollectionOfficersListNavigationProps = StackNavigationProp<
  RootStackParamList,
  "CollectionOfficersList"
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

const CollectionOfficersList: React.FC<CollectionOfficersListProps> = ({
  navigation,
}) => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [selectedJobRole, setSelectedJobRole] = useState<string | null>(null);
  const [filteredOfficers, setFilteredOfficers] = useState<Officer[]>(officers);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language"); // Get stored language
      setSelectedLanguage(lang || "en"); // Default to English if not set
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
      return {
        fontSize: 14, // Smaller text size for Sinhala
        lineHeight: 20, // Space between lines
      };
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log("data", response.data);

      if (response.data.status === "success") {
        const approvedOfficers = response.data.data.filter(
          (officer: Officer) => officer.status === "Approved",
        );
        const notApprovedOfficers = response.data.data.filter(
          (officer: Officer) => officer.status === "Not Approved",
        );

        const sortedApprovedOfficers = approvedOfficers.sort(
          (a: Officer, b: Officer) =>
            getOfficerName(a).localeCompare(getOfficerName(b)),
        );

        const sortedNotApprovedOfficers = notApprovedOfficers.sort(
          (a: Officer, b: Officer) =>
            getOfficerName(a).localeCompare(getOfficerName(b)),
        );

        setOfficers([...sortedApprovedOfficers, ...sortedNotApprovedOfficers]);
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

  const onRefresh = async () => {
    setSelectedJobRole(null);
    setShowFilter(false);
    setRefreshing(true);
    await fetchOfficers();
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOfficers();
      setSelectedJobRole(null);
      setShowFilter(false);
    }, []),
  );

  useEffect(() => {
    if (selectedJobRole) {
      const filtered = officers.filter(
        (officer) => officer.jobRole === selectedJobRole,
      );
      setFilteredOfficers(filtered);
    } else {
      setFilteredOfficers(officers);
    }
  }, [selectedJobRole, officers]);

  const renderOfficer = ({ item }: { item: Officer & { status?: string } }) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 mb-4 rounded-[35px] shadow-sm mx-4 bg-[#ADADAD1A] ${
        item.status === "Not Approved"
          ? "border border-[#FF9797]"
          : "border border-[#ADADAD1A]"
      }`}
      onPress={() => {
        if (item.status !== "Not Approved") {
          navigation.navigate("OfficerSummary" as any, {
            officerId: item.empId,
            officerName: getOfficerName(item),
            phoneNumber1: item.phoneNumber1,
            phoneNumber2: item.phoneNumber2,
            collectionOfficerId: item.collectionOfficerId,
            image: item.image,
          });
        }
      }}
      disabled={item.status === "Not Approved"}
    >
      <View className="w-14 h-14 rounded-full overflow-hidden justify-center items-center mr-4 shadow-md">
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../assets/images/ava.webp")
          }
          className="w-16 h-16 rounded-full mr-3"
        />
      </View>

      <View className="flex-1">
        <Text className="text-[18px] font-semibold text-gray-900">
          {getOfficerName(item)}
        </Text>
        <Text className="text-sm text-gray-500">EMP ID : {item.empId}</Text>
      </View>

      {item.status === "Not Approved" && (
        <Text className="text-red-500 text-xs font-semibold mr-2 mt-[-12%]">
          {t("CollectionOfficersList.Not Approved")}
        </Text>
      )}

      {item.status !== "Not Approved" && (
        <Ionicons name="chevron-forward" size={scale(20)} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  <TouchableOpacity
    onPress={async () => {
      try {
        await AsyncStorage.removeItem("officerFormData"); // Clear stored data
        navigation.navigate("AddOfficerBasicDetails" as any);
      } catch (error) {
        console.error("Error clearing form data:", error);
      }
    }}
    className="absolute bottom-5 right-5 bg-black w-14 h-14 rounded-full justify-center items-center shadow-lg"
  >
    <Ionicons name="add" size={scale(24)} color="#fff" />
  </TouchableOpacity>;

  return (
    <View className="flex-1 bg-[#313131]">
      <View className="bg-[#313131] py-6 px-4  relative">
        {showFilter && (
          <View className="absolute z-40 flex-col top-14 left-6 bg-white shadow-lg rounded-lg">
            <TouchableOpacity
              className={`px-4 py-2 bg-white rounded-lg  ${
                selectedJobRole === "Driver" ? "bg-gray-200" : ""
              }`}
              onPress={() => {
                setSelectedJobRole("Driver");
                setShowFilter(false); // Close the filter
              }}
            >
              <Text className="text-gray-700 font-semibold">
                {t("CollectionOfficersList.Drivers")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-4 py-2 bg-white rounded-lg  ${
                selectedJobRole === "Collection Officer" ? "bg-gray-200" : ""
              }`}
              onPress={() => {
                setSelectedJobRole("Collection Officer");
                setShowFilter(false); // Close the filter
              }}
            >
              <Text className="text-gray-700 font-semibold">
                {t("CollectionOfficersList.Collection Officers")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text
          style={{ fontSize: 18 }}
          className="text-white text-center font-bold"
        >
          {t("CollectionOfficersList.Collection Officers")}
        </Text>

        <TouchableOpacity
          className="absolute top-6 right-4"
          onPress={() => {
            setShowMenu((prev) => !prev);
            setShowFilter(false);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>

        {showMenu && (
          <View 
            className="absolute top-14 right-4 bg-white z-50 rounded-lg border border-[#00000040]"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              className="px-4 py-2 bg-white rounded-lg"
              onPress={() => navigation.navigate("ClaimOfficer")}
            >
              <Text className="text-gray-700 font-semibold">
                {t("CollectionOfficersList.Claim Officer")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="flex-1 z-2 mt-3 rounded-t-2xl bg-white">
        <View className="mt-4 px-4">
          {selectedJobRole === "Collection Officer" ? (
            <>
              <Text
                style={[
                  { fontSize: scale(16) },
                  getTextStyle(selectedLanguage),
                ]}
                className="font-bold text-[#21202B] mb-2"
              >
                {t("CollectionOfficersList.Officers List")}
                <Text className="text-[#21202B] font-semibold">
                  ({filteredOfficers.length})
                </Text>
              </Text>
            </>
          ) : selectedJobRole === "Driver" ? (
            <>
              <Text
                style={{ fontSize: scale(16) }}
                className="font-bold text-[#21202B] mb-2"
              >
                {t("CollectionOfficersList.Drivers List")}
                <Text className="text-[#21202B] font-semibold">
                  ({filteredOfficers.length})
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{ fontSize: 16 }}
                className="font-bold text-[#21202B] mb-2"
              >
                {t("CollectionOfficersList.Officers / Drivers List")}
                <Text className="text-[#21202B] font-normal">
                  ({t("ManagerTransactions.All")} {officers.length})
                </Text>
              </Text>
            </>
          )}
        </View>

        {loading ? (
          // Lottie Loader for 4 seconds
          <View className="flex-1 justify-center items-center -mt-[25%]">
            <LottieView
              source={require("../../assets/lottie/newLottie.json")} // Ensure JSON file is correct
              autoPlay
              loop
              style={{ width: 350, height: 350 }}
            />
          </View>
        ) : errorMessage ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg">{errorMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOfficers.length > 0 ? filteredOfficers : officers}
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

        <TouchableOpacity
          onPress={async () => {
            try {
              await AsyncStorage.removeItem("officerFormData"); // Clear stored data
              // navigation.navigate("AddOfficerBasicDetails" as any);
              navigation.navigate("AddOfficerBasicDetails", {
                jobRolle: "Collection Officer",
              });
            } catch (error) {
              console.error("Error clearing form data:", error);
            }
          }}
          className="absolute bottom-20 right-5 bg-black w-14 h-14 rounded-full justify-center items-center shadow-lg"
        >
          <Ionicons name="add" size={scale(24)} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CollectionOfficersList;