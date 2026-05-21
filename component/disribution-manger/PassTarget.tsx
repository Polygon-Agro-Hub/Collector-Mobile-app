import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "@/component/commons/GlobalSearchModal";
import SuccessModal from "../commons/SuccessModal";

interface PassTargetProps {
  navigation: any;
  route: {
    params: {
      collectionOfficerId?: number;
      officerId: string;
      selectedItems: number[];
      invoiceNumbers: string[];
      processOrderId: string[];
    };
  };
}

interface TargetItem {
  id: number;
  invoiceNumber: string;
  status: "Pending" | "Opened" | "Completed";
  processOrderId: number;
  distributedTargetItemId: number;
}

interface Officer {
  id: number;
  empId: string;
  firstNameEnglish: string;
  firstNameSinhala: string;
  firstNameTamil: string;
  lastNameEnglish: string;
  lastNameSinhala: string;
  lastNameTamil: string;
  jobRole: string;
}

const PassTarget: React.FC<PassTargetProps> = ({ navigation, route }) => {
  const {
    selectedItems: passedSelectedItems = [],
    invoiceNumbers = [],
    processOrderId = [],
    officerId,
    collectionOfficerId,
  } = route.params;

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [targetItems, setTargetItems] = useState<TargetItem[]>([]);
  const [officers, setOfficers] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [loadingOfficers, setLoadingOfficers] = useState<boolean>(false);
  const [officerModalVisible, setOfficerModalVisible] = useState(false);
  const { t, i18n } = useTranslation();
  const [successVisible, setSuccessVisible] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("DailyTargetListOfficerDistribution", {
          officerId,
          collectionOfficerId,
        });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const getOfficerName = useCallback(
    (officer: Officer) => {
      const currentLanguage = i18n.language;
      let firstName = "";
      let lastName = "";

      switch (currentLanguage) {
        case "si":
        case "sinhala":
          firstName = officer.firstNameSinhala || officer.firstNameEnglish;
          lastName = officer.lastNameSinhala || officer.lastNameEnglish;
          break;
        case "ta":
        case "tamil":
          firstName = officer.firstNameTamil || officer.firstNameEnglish;
          lastName = officer.lastNameTamil || officer.lastNameEnglish;
          break;
        case "en":
        case "english":
        default:
          firstName = officer.firstNameEnglish;
          lastName = officer.lastNameEnglish;
          break;
      }

      return `${firstName} ${lastName} (${officer.empId})`;
    },
    [i18n.language],
  );

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (
      [
        "completed",
        "සම්පූර්ණ",
        "සම්පූර්ණයි",
        "முடிக்கப்பட்டது",
        "நிறைவு",
      ].includes(s)
    )
      return "bg-[#BBFFC6]";
    if (["opened", "විවෘත", "විවෘතයි", "திறக்கப்பட்டது", "திறந்த"].includes(s))
      return "bg-[#F8FFA6]";
    if (
      [
        "pending",
        "අපේක්ෂිත",
        "පොරොත්තුවේ",
        "நிலுவையில்",
        "காத்திருக்கும்",
      ].includes(s)
    )
      return "bg-[#FF070733]";
    return "bg-gray-100";
  };

  const getStatusTextColor = (status: string) => {
    const s = status?.toLowerCase();
    if (
      [
        "completed",
        "සම්පූර්ණ",
        "සම්පූර්ණයි",
        "முடிக்கப்பட்டது",
        "நிறைவு",
      ].includes(s)
    )
      return "text-[#6AD16D]";
    if (["opened", "විවෘත", "විවෘතයි", "திறக்கப்பட்டது", "திறந்த"].includes(s))
      return "text-[#A8A100]";
    if (
      ["pending", "අපේක්ෂිත", "பொரொ", "நிலுவையில்", "காத்திருக்கும்"].includes(
        s,
      )
    )
      return "text-[#FF0700]";
    return "text-gray-600";
  };

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "completed":
      case "සම්පූර්ණ":
      case "සම්පූර්ණයි":
      case "முடிக்கப்பட்டது":
      case "நிறைவு":
        return t("Status.Completed");
      case "opened":
      case "විවෘත":
      case "විවෘතයි":
      case "திறக்கப்பட்டது":
      case "திறந்த":
        return t("Status.Opened");
      case "pending":
      case "අපේක්ෂිත":
      case "පොරොත්තුවේ":
      case "நிலுவையில்":
      case "காத்திருக்கும்":
        return t("Status.Pending");
      default:
        return t("Status.Unknown");
    }
  };

  const fetchOfficers = useCallback(async () => {
    setLoadingOfficers(true);
    try {
      const authToken = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/get-all-distributionOfficer`,
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      if (response.data.success && response.data.data) {
        const officerDropdownData = response.data.data
          .filter((officer: Officer) => {
            const isCurrentById =
              officer.id?.toString() === officerId?.toString();
            const isCurrentByEmpId =
              officer.empId?.toString() === officerId?.toString();
            const isDistributionOfficer =
              officer.jobRole === "Distribution Officer";
            return !isCurrentById && !isCurrentByEmpId && isDistributionOfficer;
          })
          .map((officer: Officer) => ({
            label: getOfficerName(officer),
            value: officer.id.toString(),
          }));

        setOfficers(officerDropdownData);
      } else {
        setError(t("Error.Failed to load officers."));
      }
    } catch (error) {
      console.error("Error fetching officers:", error);
      setError(t("Error.Failed to load officers."));
    } finally {
      setLoadingOfficers(false);
    }
  }, [t, officerId, getOfficerName]);

  const prepareTargetItems = useCallback(() => {
    if (passedSelectedItems && passedSelectedItems.length > 0) {
      const items: TargetItem[] = passedSelectedItems.map((itemId, index) => ({
        id: index + 1,
        invoiceNumber:
          invoiceNumbers[index] || `INV${itemId.toString().padStart(6, "0")}`,
        status: "Pending",
        processOrderId: itemId,
        distributedTargetItemId: itemId,
      }));
      setTargetItems(items);
    }
  }, [passedSelectedItems, invoiceNumbers]);

  useFocusEffect(
    useCallback(() => {
      prepareTargetItems();
      fetchOfficers();
      setSelectedAssignee("");
    }, [prepareTargetItems, fetchOfficers]),
  );

  useEffect(() => {
    fetchOfficers();
    setSelectedAssignee("");
  }, [i18n.language, fetchOfficers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    prepareTargetItems();
    fetchOfficers();
    setRefreshing(false);
  }, [prepareTargetItems, fetchOfficers]);

  const handleSave = async () => {
    if (!selectedAssignee) {
      setError(t("Error.Please select an assignee."));
      return;
    }

    setLoading(true);
    setError(null);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      const authToken = await AsyncStorage.getItem("token");

      const saveData = {
        assigneeOfficerId: selectedAssignee,
        targetItems: passedSelectedItems,
        invoiceNumbers,
        processOrderId,
      };

      const response = await axios.post(
        `${environment.API_BASE_URL}api/distribution-manager/target-pass/${officerId}`,
        saveData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setSuccessVisible(true);
      } else {
        setError(response.data.message || t("Error.Failed to save data."));
      }
    } catch (error) {
      console.error("Error saving data:", error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            `Server error: ${error.response.status}`;
          setError(errorMessage);
        } else if (error.request) {
          setError(t("Error.Network error. Please check your connection."));
        } else {
          setError(error.message || t("Error.Failed to save data."));
        }
      } else if (error instanceof Error) {
        setError(error.message || t("Error.Failed to save data."));
      } else {
        setError(t("Error.Failed to save data."));
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedOfficerLabel =
    officers.find((o) => o.value === selectedAssignee)?.label || null;

  return (
    <>
      <View className="flex-1 bg-white">
        <CustomHeader
          title={`${t("PassTarget.EMP ID")} : ${officerId}`}
          showBackButton={true}
          navigation={navigation}
          onBackPress={() =>
            navigation.navigate("DailyTargetListOfficerDistribution", {
              officerId,
              collectionOfficerId,
            })
          }
          textColor="white"
          bgColor="#282828"
          iconBgColor="#FFFFFF1A"
        />

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Assignee Selection */}
          <View className="bg-white mx-4 my-2 p-4 ">
            <View className="flex-row items-center mb-3">
              <Text className="text-[#475A6A] font-semibold flex-1">
                {selectedAssignee
                  ? t("PassTarget.Short Stock Assignee")
                  : t("PassTarget.Select Assignee")}
              </Text>
            </View>

            {loadingOfficers ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#282828" />
                <Text className="ml-2 text-gray-600">
                  {t("PassTarget.Loading officers")}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setOfficerModalVisible(true)}
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: 25,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: selectedOfficerLabel ? "#374151" : "#9CA3AF",
                    fontSize: 16,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {selectedOfficerLabel ||
                    t("PassTargetBetweenOfficers.Select an officer")}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Targets */}
          <View className="bg-white my-2 rounded-lg mb-20">
            <View className="items-center justify-center">
              <Text
                style={{
                  fontStyle: "italic",
                  color: "#2d3748",
                  marginBottom: 12,
                }}
              >
                --{t("PassTarget.Selected Targets")}--
              </Text>
            </View>

            <View className="border border-gray-300 rounded-md">
              {targetItems.map((item: TargetItem) => (
                <View
                  key={item.distributedTargetItemId}
                  className="flex-row border-b border-gray-300 px-[-19]"
                >
                  <View className="w-16 items-center justify-center border-r border-gray-300 py-3">
                    <Text className="text-[#606060] font-medium">
                      {String(item.id).padStart(2, "0")}
                    </Text>
                  </View>
                  <View className="flex-1 items-center justify-center border-r border-gray-300 py-3">
                    <Text className="text-[#000000] font-medium">
                      {item.invoiceNumber}
                    </Text>
                  </View>
                  <View className="w-36 items-center justify-center py-3">
                    <View
                      className={`px-8 py-3 rounded-full ${getStatusColor(item.status)}`}
                    >
                      <Text
                        className={`text-base font-medium ${getStatusTextColor(item.status)}`}
                      >
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !selectedAssignee || loadingOfficers}
          className={`absolute left-4 right-4 py-3 h-[50px] rounded-full items-center justify-center mr-6 ml-6 ${
            loading || !selectedAssignee || loadingOfficers
              ? "bg-[#C0C0C0]"
              : "bg-[#980775]"
          }`}
          style={{
            bottom: 100,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {t("PassTarget.Save")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View className="absolute top-20 left-4 right-4 bg-red-100 border border-red-400 px-4 py-3 rounded">
            <Text className="text-red-700 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => setError(null)}
              className="mt-2 self-center"
            >
              <Text className="text-red-600 font-medium">
                {t("PassTarget.Dismiss")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <SuccessModal
        visible={successVisible}
        title={t("PassTarget.Success")}
        message={t("PassTarget.Target passed successfully.")}
        autoClose={true}
        duration={3000}
        onClose={() => {
          setSuccessVisible(false);
          navigation.navigate("DailyTargetListOfficerDistribution", {
            officerId,
            collectionOfficerId,
          });
        }}
      />

      {/* Officer Modal */}
      <GlobalSearchModal
        visible={officerModalVisible}
        onClose={() => setOfficerModalVisible(false)}
        title={t("PassTarget.Select Assignee")}
        data={officers}
        selectedItems={selectedAssignee ? [selectedAssignee] : []}
        onSelect={(items) => setSelectedAssignee(items[0] ?? "")}
        searchPlaceholder={t("PassTarget.Search officers")}
        multiSelect={false}
        noResultsText={t("PassTargetBetweenOfficers.No Officers Found")}
      />
    </>
  );
};

export default PassTarget;
