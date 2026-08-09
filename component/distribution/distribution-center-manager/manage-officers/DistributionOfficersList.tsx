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
  Modal,
  Alert,
  Linking,
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
import i18n from "@/i18n/i18n";
import Header from "@/component/components/header/Header";
import LoadingPage from "@/component/components/loading/LoadingPage";
import AddButton from "@/component/components/buttons/AddButton";
import NetInfo from "@react-native-community/netinfo";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";

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
  const [tabLoading, setTabLoading] = useState<boolean>(false);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState<boolean>(false);
  const [warningVisible, setWarningVisible] = useState<boolean>(false);

  const handleDisclaim = (collectionOfficerId: number) => {
    if (!collectionOfficerId) {
      Alert.alert(t("Error.error") || "Error", t("Error.Missing collectionOfficerId") || "Missing Officer ID");
      return;
    }
    setWarningVisible(true);
  };

  const executeDisclaim = async () => {
    if (!selectedOfficer) return;
    setWarningVisible(false);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(t("Error.error") || "Error", t("Error.No internet connection") || "No internet connection");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/disclaim-officer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            collectionOfficerId: selectedOfficer.collectionOfficerId,
            jobRole: "Distribution Officer",
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Disclaim failed:", errorData);
        Alert.alert(t("Error.error") || "Error", t("Error.Failed to disclaim officer.") || "Failed to disclaim staff.");
        return;
      }

      const data = await res.json();

      if (data.status === "success") {
        setDetailsModalVisible(false);
        setSelectedOfficer(null);
        Alert.alert(
          t("Error.Success") || "Success",
          t("DisclaimOfficer.Disclaim Staff Successful.") || "Disclaim Staff Successful."
        );
        fetchOfficers();
      } else {
        Alert.alert(
          t("Error.error") || "Error",
          t("DisclaimOfficer.Failed to disclaim officer.") || "Failed to disclaim staff."
        );
      }
    } catch (error) {
      console.error("Failed to disclaim:", error);
      Alert.alert(
        t("Error.error") || "Error",
        t("DisclaimOfficer.Failed to disclaim officer.") || "Failed to disclaim staff."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      setTabLoading(true);
      setActiveTab(tab);
      setTimeout(() => {
        setTabLoading(false);
      }, 500);
    }
  };

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
        navigation.navigate("Main", { screen: "DistridutionaDashboard" });
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
      className={`flex-row items-center p-4 mb-4 rounded-2xl border border-[#E1E7EE] mx-6 bg-gray-100`}
      onPress={() => {
        if (item.status !== "Not Approved") {
          setSelectedOfficer(item);
          setDetailsModalVisible(true);
        }
      }}
      disabled={item.status === "Not Approved"}
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
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

      {item.status !== "Not Approved" && (
        <Ionicons name="chevron-forward" size={scale(20)} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="w-full max-w-[600px] mx-auto flex-1 bg-white">
        <Header<ActiveTab>
          title={t("CollectionOfficersList.Manage Staff") || "Manage Staff"}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          tab1Value="Officers"
          tab1Label={t("DistributionOfficersList.Officers") || "Officers"}
          tab1Count={officersCount}
          tab2Value="Drivers"
          tab2Label={t("DistributionOfficersList.Drivers") || "Drivers"}
          tab2Count={driversCount}
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onClaimPress={() =>
            navigation.navigate("ClaimDistribution", { activeTab })
          }
          claimLabel={t("CollectionOfficersList.Claim Officer") || "Claim Officer"}
        />

        {/* Body */}
        <View className="flex-1 w-full bg-white">
          {loading || tabLoading ? (
            <LoadingPage fullScreen message={t("Loading...") || "Loading..."} />
          ) : errorMessage ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-500 text-lg">{errorMessage}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOfficers}
              keyExtractor={(item) => item.empId}
              renderItem={renderOfficer}
              ListHeaderComponent={
                <View className="mt-4 px-6">
                  <Text
                    style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                    className="font-bold text-[#21202B] mb-2"
                  >
                    {activeTab === "Officers"
                      ? t("CollectionOfficersList.Officers List") || "Officers List"
                      : t("CollectionOfficersList.Drivers List") || "Drivers List"}
                    {"  "}
                    <Text className="text-[#21202B] font-normal">
                      ({t("ManagerTransactions.All") || "All"}{" "}
                      {String(filteredOfficers.length).padStart(2, "0")})
                    </Text>
                  </Text>
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
                  tintColor="#ADADAD1A"
                  colors={["#ADADAD1A"]}
                />
              }
              showsVerticalScrollIndicator={true}
            />
          )}

          {/* FAB */}
          {activeTab === "Officers" && (
            <AddButton
              onPress={async () => {
                try {
                  await AsyncStorage.removeItem("officerFormData");
                  navigation.navigate("DistributionAddOfficer", {
                    jobRolle: "Distribution Officer",
                  });
                } catch (error) {
                  console.error("Error clearing form data:", error);
                }
              }}
            />
          )}
        </View>
      </View>

      {/* Details Modal */}
      {selectedOfficer && (
        <Modal
          visible={detailsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-[#00000060] px-6">
            <View className="bg-white rounded-3xl w-full max-w-[340px] p-6 items-center relative overflow-hidden shadow-2xl">
              
              {/* Close Button on Top Right */}
              <TouchableOpacity
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#54617D" />
              </TouchableOpacity>

              {/* Officer Profile Image */}
              <View className="w-24 h-24 rounded-full overflow-hidden justify-center items-center mb-4 border-4 border-gray-100 shadow-md">
                <Image
                  source={
                    selectedOfficer.image
                      ? { uri: selectedOfficer.image }
                      : require("../../../../assets/images/collection-manager/avetar.webp")
                  }
                  className="w-24 h-24 rounded-full"
                />
              </View>

              {/* Officer Name & ID */}
              <Text className="text-xl font-bold text-gray-900 text-center mb-1">
                {getOfficerName(selectedOfficer)}
              </Text>
              <Text className="text-sm text-gray-500 mb-6">
                {t("DistributionOfficersList.EMPID")} {selectedOfficer.empId}
              </Text>

              {/* Phone Numbers Section */}
              <View className="w-full gap-3 mb-6">
                {selectedOfficer.phoneNumber1 && (
                  <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="call-outline" size={18} color="#54617D" />
                      <Text className="text-sm font-semibold text-gray-800">
                        {selectedOfficer.phoneNumber1}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const phoneUrl = `tel:${selectedOfficer.phoneNumber1}`;
                        Linking.openURL(phoneUrl).catch((err) =>
                          console.error("Failed to open dial pad:", err)
                        );
                      }}
                      className="w-8 h-8 rounded-full bg-[#E9ECF1] items-center justify-center"
                    >
                      <Ionicons name="call" size={14} color="#030E25" />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedOfficer.phoneNumber2 && (
                  <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="call-outline" size={18} color="#54617D" />
                      <Text className="text-sm font-semibold text-gray-800">
                        {selectedOfficer.phoneNumber2}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const phoneUrl = `tel:${selectedOfficer.phoneNumber2}`;
                        Linking.openURL(phoneUrl).catch((err) =>
                          console.error("Failed to open dial pad:", err)
                        );
                      }}
                      className="w-8 h-8 rounded-full bg-[#E9ECF1] items-center justify-center"
                    >
                      <Ionicons name="call" size={14} color="#030E25" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={() => handleDisclaim(selectedOfficer.collectionOfficerId)}
                  className="w-full h-12 bg-red-600 rounded-full items-center justify-center shadow-md active:bg-red-700"
                >
                  <Text className="text-white font-extrabold text-sm">
                    {t("DisclaimOfficer.Disclaim") || "Disclaim"}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      )}

      {/* Warning Confirmation Modal */}
      <WarningConfirmation
        visible={warningVisible}
        message={t("DisclaimOfficer.Are you sure you want to disclaim this officer?") || "Are you sure you want to disclaim this officer?"}
        confirmText={t("DisclaimOfficer.Disclaim") || "Disclaim"}
        cancelText={t("ClaimOfficer.Cancel") || "Cancel"}
        onConfirm={executeDisclaim}
        onCancel={() => setWarningVisible(false)}
      />
    </View>
  );
};

export default DistributionOfficersList;
