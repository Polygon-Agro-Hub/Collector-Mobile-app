import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useState } from "react";
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
import { RootStackParamList } from "@/types/types";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";
import AddButton from "@/component/components/buttons/AddButton";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";

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

  // Zero-pads a count to at least 2 digits, e.g. 6 -> "06", 12 -> "12"
  const formatCount = (count: number) => count.toString().padStart(2, "0");

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

  useFocusEffect(
      useCallback(() => {
        const handleBackPress = () => {
          navigation.navigate("Main", { screen: "CollectionDashboard" });
          return true;
        };
  
        const subscription = BackHandler.addEventListener(
          "hardwareBackPress",
          handleBackPress,
        );
  
        return () => subscription.remove();
      }, [navigation]),
    );

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
    return {};
  };

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = store.getState().auth.token;
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/collection-officerslist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

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

  const renderOfficer = ({ item }: { item: Officer & { status?: string } }) => {
    const isNotApproved = item.status === "Not Approved";
    return (
      <TouchableOpacity
        className="flex-row items-center p-4 mb-4 rounded-2xl mx-6 bg-gray-100"
        onPress={() => {
          if (!isNotApproved) {
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
        disabled={isNotApproved}
        style={{
          borderWidth: 1,
          borderColor: isNotApproved ? "#FF3434" : "#E1E7EE",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: isNotApproved ? 0 : 3 },
          shadowOpacity: isNotApproved ? 0 : 0.1,
          shadowRadius: isNotApproved ? 0 : 6,
          elevation: isNotApproved ? 0 : 3,
          opacity: 1,
        }}
      >
        <View className="w-14 h-14 rounded-full overflow-hidden justify-center items-center mr-4 shadow-md">
          <Image
            source={
              item.image
                ? { uri: item.image }
                : require("../../../../assets/images/collection-manager/avetar.webp")
            }
            className="w-16 h-16 rounded-full mr-3"
          />
        </View>

        <View className="flex-1">
          <Text
            className="font-semibold text-gray-900"
            style={[
              selectedLanguage === "si"
                ? { fontSize: 16 }
                : selectedLanguage === "ta"
                  ? { fontSize: 14 }
                  : { fontSize: 17 },
            ]}
          >
            {getOfficerName(item)}
          </Text>
          <Text className="text-sm text-gray-500">
            EMP ID : {item.empId}
          </Text>
        </View>

        {isNotApproved && (
          <Text
            className="text-[#FF3434] font-semibold"
            style={[
              {
                position: "absolute",
                top: 10,
                right: 14,
              },
              selectedLanguage === "si"
                ? { fontSize: 12 }
                : selectedLanguage === "ta"
                  ? { fontSize: 9 }
                  : { fontSize: 12 },
            ]}
          >
            {t("CollectionOfficersList.Not Approved")}
          </Text>
        )}

        {!isNotApproved && (
          <Ionicons name="chevron-forward" size={scale(20)} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Full-width dark header container */}
      <View style={{ backgroundColor: "#313131", width: "100%" }}>
        <View
          style={{
            backgroundColor: "#313131",
            paddingVertical: 24,
            paddingHorizontal: 16,
            position: "relative",
            width: "100%",
            alignSelf: "center",
          }}
        >
          {showFilter && (
            <View
              style={{
                position: "absolute",
                zIndex: 40,
                flexDirection: "column",
                top: 56,
                left: 24,
                backgroundColor: "white",
                borderRadius: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor:
                    selectedJobRole === "Driver" ? "#F3F4F6" : "white",
                  borderRadius: 8,
                }}
                onPress={() => {
                  setSelectedJobRole("Driver");
                  setShowFilter(false);
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>
                  {t("CollectionOfficersList.Drivers")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor:
                    selectedJobRole === "Collection Officer"
                      ? "#F3F4F6"
                      : "white",
                  borderRadius: 8,
                }}
                onPress={() => {
                  setSelectedJobRole("Collection Officer");
                  setShowFilter(false);
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>
                  {t("CollectionOfficersList.Collection Officers")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text
            style={{
              fontSize: 18,
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {t("CollectionOfficersList.Collection Officers")}
          </Text>

          <TouchableOpacity
            style={{ position: "absolute", top: 24, right: 16 }}
            onPress={() => {
              setShowMenu((prev) => !prev);
              setShowFilter(false);
            }}
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
                onPress={() => navigation.navigate("ClaimOfficer")}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>
                  {t("ClaimOfficer.Claim Staff")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View
        style={{
          flex: 1,
          marginTop: 12,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          backgroundColor: "white",
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          {selectedJobRole === "Collection Officer" ? (
            <Text
              style={[
                { fontSize: scale(16) },
                getTextStyle(selectedLanguage),
                { fontWeight: "bold", color: "#21202B", marginBottom: 8 },
              ]}
            >
              {t("CollectionOfficersList.Officers List")}
              <Text style={{ color: "#21202B", fontWeight: "600" }}>
                ({formatCount(filteredOfficers.length)})
              </Text>
            </Text>
          ) : selectedJobRole === "Driver" ? (
            <Text
              style={{
                fontSize: scale(16),
                fontWeight: "bold",
                color: "#21202B",
                marginBottom: 8,
              }}
            >
              {t("CollectionOfficersList.Drivers List")}
              <Text style={{ color: "#21202B", fontWeight: "600" }}>
                ({formatCount(filteredOfficers.length)})
              </Text>
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#21202B",
                marginBottom: 8,
              }}
            >
              {t("CollectionOfficersList.Officers / Drivers List")}
              <Text style={{ color: "#21202B", fontWeight: "normal" }}>
                ({t("ManagerTransactions.All")} {formatCount(officers.length)})
              </Text>
            </Text>
          )}
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <LottieView
              source={require("../../../../assets/lottie/loading.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
          </View>
        ) : errorMessage ? (
          <View style={{ flex: 1, height: scale(300), justifyContent: "center" }}>
            <NoDataScreen message={t("DistributionOfficersList.No officers found")} />
          </View>
        ) : (
          <FlatList
            data={filteredOfficers}
            keyExtractor={(item) => item.empId}
            renderItem={renderOfficer}
            ListEmptyComponent={
              <View style={{ flex: 1, height: scale(300), justifyContent: "center" }}>
                <NoDataScreen
                  message={
                    selectedJobRole === "Collection Officer"
                      ? t("CollectionOfficersList.No officers found") || "- No Officers Found -"
                      : selectedJobRole === "Driver"
                      ? t("CollectionOfficersList.No drivers found") || "- No Drivers Found -"
                      : t("CollectionOfficersList.No officers found") || "- No Officers Found -"
                  }
                />
              </View>
            }
            contentContainerStyle={{
              paddingBottom: scale(80),
              paddingTop: scale(10),
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ADADAD"
                colors={["#ADADAD"]}
              />
            }
            showsVerticalScrollIndicator={true}
          />
        )}

        <AddButton
          onPress={async () => {
            try {
              await AsyncStorage.removeItem("officerFormData");
              navigation.navigate("AddOfficer", {
                jobRolle: "Collection Officer",
              });
            } catch (error) {
              console.error("Error clearing form data:", error);
            }
          }}
        />
      </View>
    </View>
  );
};

export default CollectionOfficersList;