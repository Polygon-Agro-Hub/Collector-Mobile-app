import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import i18n from "@/i18n/i18n";

type TargetOrderScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "TargetOrderScreen"
>;

interface TargetOrderScreenProps {
  navigation: TargetOrderScreenNavigationProps;
}

interface TargetData {
  id: string;
  invoiceNo: string;
  varietyNameEnglish: string;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  grade: string;
  target: number;
  complete: number;
  todo: number;
  status: "Pending" | "Opened" | "Completed" | "In Progress";
  createdAt: string;
  updatedAt: string;
  completedTime?: string | null;
  selectedStatus: "Pending" | "Opened" | "Completed";
  additionalItemStatus: "Pending" | "Opened" | "Completed" | null;
  packageItemStatus: "Pending" | "Opened" | "Completed" | null;
  totalAdditionalItems: number;
  packedAdditionalItems: number;
  pendingAdditionalItems: number;
  totalPackageItems: number | null;
  packedPackageItems: number | null;
  packageIsLock: number;
  pendingPackageItems: number | null;
  isPackage: number;
  orderId: string;
  sheduleDate: string;
  sheduleTime: string;
}

interface ApiTargetData {
  distributedTargetId: string;
  companycenterId: string;
  userId: string;
  target: number;
  complete: number;
  targetCreatedAt: string;
  distributedTargetItemId: string;
  orderId: string;
  isComplete: boolean;
  completeTime: string | null;
  itemCreatedAt: string;
  processOrderId: string;
  invNo: string;
  transactionId: string;
  paymentMethod: string;
  isPaid: boolean;
  amount: number;
  status: string;
  orderCreatedAt: string;
  reportStatus: string;
  selectedStatus: "Pending" | "Opened" | "Completed";
  additionalItemStatus: "Pending" | "Opened" | "Completed" | null;
  packageItemStatus: "Pending" | "Opened" | "Completed" | null;
  totalAdditionalItems: number;
  packedAdditionalItems: number;
  pendingAdditionalItems: number;
  totalPackageItems: number | null;
  packedPackageItems: number | null;
  pendingPackageItems: number | null;
  isPackage: number;
  packageIsLock?: number;
  sheduleDate: string;
  sheduleTime: string;

  totalPackages?: number;
  lockedPackages?: number;

  packageData?: {
    totalPackages: number;
    lockedPackages: number;
    items: {
      total: number;
      packed: number;
      pending: number;
      status: string | null;
    };
  };

  additionalItems?: {
    total: number;
    packed: number;
    pending: number;
    status: string;
  };
}

const TargetOrderScreen: React.FC<TargetOrderScreenProps> = ({
  navigation,
}) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [centerCode, setcenterCode] = useState<string | null>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [jobRole, setJobeRole] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/distribution-manager/user-profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setJobeRole(response.data.data.jobRole);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  console.log("jobeJole-----------------", jobRole);

  useFocusEffect(
    useCallback(() => {
      fetchTargets();
      fetchUserProfile();

      const interval = setInterval(() => {
        fetchTargets();
      }, 30000);

      return () => {
        clearInterval(interval);
      };
    }, []),
  );

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const getGradePriority = (grade: string): number => {
    switch (grade) {
      case "A":
        return 1;
      case "B":
        return 2;
      case "C":
        return 3;
      default:
        return 4;
    }
  };

  const getVarietyNameForSort = (item: TargetData) => {
    switch (selectedLanguage) {
      case "si":
        return item.varietyNameSinhala || "";
      case "ta":
        return item.varietyNameTamil || "";
      default:
        return item.varietyNameEnglish || "";
    }
  };

  const sortByVarietyAndGrade = (data: TargetData[]) => {
    return [...data].sort((a, b) => {
      const nameA = getVarietyNameForSort(a);
      const nameB = getVarietyNameForSort(b);
      const nameComparison = nameA.localeCompare(nameB);

      if (nameComparison === 0) {
        return getGradePriority(a.grade) - getGradePriority(b.grade);
      }

      return nameComparison;
    });
  };

  const formatScheduleTime = (timeString: string): string => {
    if (!timeString) return "";

    return timeString.replace(/^Within\s*/i, "").trim();
  };

  const formatScheduleDate = (dateString: string): string => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${month}/${day}`;
    } catch (error) {
      console.error("Error formatting schedule date:", error);
      return "";
    }
  };

  const getScheduleDateColor = (dateString: string): string => {
    if (!dateString) return "#606060";

    try {
      const scheduleDate = new Date(dateString);
      scheduleDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduleDate.getTime() === today.getTime()) {
        return "#FF0000";
      } else if (scheduleDate < today) {
        return "#AC0003";
      } else {
        return "#606060";
      }
    } catch (error) {
      console.error("Error getting schedule date color:", error);
      return "#606060";
    }
  };

  const mapApiDataToTargetData = (apiData: ApiTargetData[]): TargetData[] => {
    return apiData.map((item, index) => ({
      id:
        item.distributedTargetItemId || `${item.distributedTargetId}_${index}`,
      invoiceNo: item.invNo,
      varietyNameEnglish: `Order ${item.invNo}`,
      varietyNameSinhala: `ඇණවුම ${item.invNo}`,
      varietyNameTamil: `ஆர்டர் ${item.invNo}`,
      grade: "A",
      target: item.target,
      complete: item.complete,
      todo: item.target - item.complete,
      status: mapSelectedStatusToStatus(item.selectedStatus, item.isComplete),
      createdAt: item.targetCreatedAt,
      updatedAt: item.itemCreatedAt,
      completedTime: item.completeTime,
      selectedStatus: item.selectedStatus,
      additionalItemStatus: item.additionalItemStatus,
      packageItemStatus: item.packageItemStatus,
      totalAdditionalItems: item.totalAdditionalItems || 0,
      packedAdditionalItems: item.packedAdditionalItems || 0,
      pendingAdditionalItems: item.pendingAdditionalItems || 0,
      totalPackageItems: item.totalPackageItems,
      packedPackageItems: item.packedPackageItems,
      pendingPackageItems: item.pendingPackageItems,
      isPackage: item.isPackage,
      orderId: item.orderId,
      sheduleDate: item.sheduleDate,
      sheduleTime: item.sheduleTime,

      packageIsLock: item.lockedPackages && item.lockedPackages > 0 ? 1 : 0,
    }));
  };

  const mapSelectedStatusToStatus = (
    selectedStatus: "Pending" | "Opened" | "Completed",
    isComplete: boolean,
  ): "Pending" | "Opened" | "Completed" | "In Progress" => {
    if (isComplete) {
      return "Completed";
    }

    switch (selectedStatus) {
      case "Pending":
        return "Pending";
      case "Opened":
        return "Opened";
      case "Completed":
        return "Completed";
      default:
        return "Pending";
    }
  };

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem("token");

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution/officer-target`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const apiData = response.data.data;

        if (apiData && apiData.length > 0) {
        }

        const mappedData = mapApiDataToTargetData(apiData);

        if (mappedData && mappedData.length > 0) {
          // console.log("First mapped item:", JSON.stringify(mappedData[0], null, 2));
          // console.log("Package lock in mapped item:", mappedData[0].packageIsLock);
        }

        // console.log("Mapped data:", mappedData);

        const todoItems = mappedData.filter((item: TargetData) =>
          ["Pending", "Opened"].includes(item.selectedStatus),
        );

        const completedItems = mappedData.filter(
          (item: TargetData) => item.selectedStatus === "Completed",
        );

        setTodoData(sortByVarietyAndGrade(todoItems));
        setCompletedData(sortByVarietyAndGrade(completedItems));
        setError(null);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);

      let errorMessage = t("Error.Failed to fetch data.");

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = "Bad request - please check your authentication";
      } else if (err.response?.status === 401) {
        errorMessage = "Unauthorized - please login again";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      setTodoData([]);
      setCompletedData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLanguage, t]);

  const handleRowPress = (item: TargetData) => {
    if (item.packageIsLock === 1 && jobRole === "Distribution Officer") {
      Alert.alert(
        t("Error.Locked Package"),
        t("Error.This package is locked and cannot be accessed"),
        [{ text: t("Error.Ok") }],
      );
      return;
    }

    const navigationParams = {
      item: item,
      centerCode: centerCode || "",
      status: item.selectedStatus,
      orderId: item.orderId,
      invoiceNo: item.invoiceNo,
      allData: selectedToggle === "ToDo" ? todoData : completedData,
    };

    console.log("=======================", item.selectedStatus);

    switch (item.selectedStatus) {
      case "Pending":
      case "Opened":
      case "Completed":
        navigation.navigate("PendingOrderScreen", navigationParams);
        break;
      default:
        navigation.navigate("PendingOrderScreen", navigationParams);
        break;
    }
  };


  const formatCompletionTime = (dateString: string | null): string | null => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${year}/${month}/${day} ${displayHours.toString().padStart(2, "0")}:${minutes}${ampm}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return null;
  }
};

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
      const centerCode = await AsyncStorage.getItem("centerCode");
      setcenterCode(centerCode);
      await fetchTargets();
    };
    fetchData();
  }, [fetchTargets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTargets();
  };

  const displayedData = selectedToggle === "ToDo" ? todoData : completedData;

  const getStatusText = (
    selectedStatus: "Pending" | "Opened" | "Completed",
  ) => {
    switch (selectedStatus) {
      case "Pending":
        return selectedLanguage === "si"
          ? "අපරිපූර්ණ"
          : selectedLanguage === "ta"
            ? "நிலுவையில்"
            : t("Status.Pending") || "Pending";
      case "Opened":
        return selectedLanguage === "si"
          ? "විවෘත කළ"
          : selectedLanguage === "ta"
            ? "திறக்கப்பட்டது"
            : t("Status.Opened") || "Opened";
      case "Completed":
        return selectedLanguage === "si"
          ? "සම්පූර්ණ කළ"
          : selectedLanguage === "ta"
            ? "முடிந்தது"
            : t("Status.Completed") || "Completed";
      default:
        return selectedStatus;
    }
  };

  const getStatusBackgroundColor = (
    selectedStatus: "Pending" | "Opened" | "Completed",
  ) => {
    switch (selectedStatus) {
      case "Pending":
        return "#FF070733";
      case "Opened":
        return "#FDFF99";
      case "Completed":
        return "#B7FFB9";
      default:
        return "#F3F4F6";
    }
  };

  const getStatusTextColor = (
    selectedStatus: "Pending" | "Opened" | "Completed",
  ) => {
    switch (selectedStatus) {
      case "Pending":
        return "#FF0700";
      case "Opened":
        return "#A8A100";
      case "Completed":
        return "#6AD16D";
      default:
        return "#374151";
    }
  };

  const getStatusBorderColor = (
    selectedStatus: "Pending" | "Opened" | "Completed",
  ) => {
    switch (selectedStatus) {
      case "Pending":
        return "#FF070733";
      case "Opened":
        return "#F8FFA6";
      case "Completed":
        return "#B7FFB9";
      default:
        return "#D1D5DB";
    }
  };

  return (
    <View className="flex-1 bg-[#282828]">
      <View className="bg-[#282828] px-4 py-6 flex-row justify-center items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute left-4 bg-white/10 rounded-full p-2"
        >
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">
          {t("TargetOrderScreen.My Daily Target")}
        </Text>
      </View>

      <View className="flex-row justify-center items-center py-4 bg-[#282828]">
        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "ToDo" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center justify-center ${
              selectedToggle === "ToDo" ? "bg-[#980775]" : "bg-white"
            }`}
            onPress={() => setSelectedToggle("ToDo")}
            style={{
              shadowColor:
                selectedToggle === "ToDo" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "ToDo" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "ToDo" ? 4 : 0,
            }}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "ToDo" ? "text-white" : "text-black"
              } ${selectedToggle === "ToDo" ? "mr-2" : ""}`}
              style={{
                opacity: selectedToggle === "ToDo" ? 1 : 0.7,
              }}
            >
              {t("DailyTarget.Todo")}
            </Animated.Text>

            {selectedToggle === "ToDo" && (
              <Animated.View
                className="bg-white rounded-full px-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-[#000000] font-bold text-xs">
                  {todoData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "Completed" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center ${
              selectedToggle === "Completed" ? "bg-[#980775]" : "bg-white"
            }`}
            onPress={() => setSelectedToggle("Completed")}
            style={{
              shadowColor:
                selectedToggle === "Completed" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "Completed" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "Completed" ? 4 : 0,
            }}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "Completed" ? "text-white" : "text-black"
              }`}
              style={{
                opacity: selectedToggle === "Completed" ? 1 : 0.7,
              }}
            >
              {t("DailyTarget.Completed")}
            </Animated.Text>

            {selectedToggle === "Completed" && (
              <Animated.View
                className="bg-white rounded-full px-2 ml-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-[#000000] font-bold text-xs">
                  {completedData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View className="flex-row bg-[#980775] py-3">
        <Text
          style={[
            i18n.language === "si"
              ? { fontSize: 12 }
              : i18n.language === "ta"
                ? { fontSize: 12 }
                : { fontSize: 15 },
          ]}
          className="flex-1 text-center text-white font-bold"
        >
          {selectedToggle === "ToDo" ? t("TargetOrderScreen.No") : ""}
        </Text>
        <Text
          style={[
            i18n.language === "si"
              ? { fontSize: 12 }
              : i18n.language === "ta"
                ? { fontSize: 12 }
                : { fontSize: 15 },
          ]}
          className="flex-[2] text-center text-white font-bold"
        >
          {t("TargetOrderScreen.Invoice No")}
        </Text>

        {selectedToggle === "ToDo" ? (
          <>
            <Text
              style={[
                i18n.language === "si"
                  ? { fontSize: 12 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
              className="flex-[2] text-center text-white font-bold "
            >
              {t("TargetOrderScreen.Date")}
            </Text>

            <Text
              style={[
                i18n.language === "si"
                  ? { fontSize: 12 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
              className="flex-[2] text-center text-white font-bold "
            >
              {t("TargetOrderScreen.Status")}
            </Text>
          </>
        ) : (
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {t("TargetOrderScreen.Completed Time")}
          </Text>
        )}
      </View>
      <ScrollView
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }} 
      >
        {error && (
          <View className="bg-red-100 border border-red-400 px-4 py-3 mx-4 mt-4 rounded">
            <Text className="text-red-700 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchTargets()}
              className="mt-2 bg-red-500 px-4 py-2 rounded"
            >
              <Text className="text-white text-center">
                {t("TargetOrderScreen.Retry")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/newLottie.json")}
              autoPlay
              loop
              style={{ width: 200, height: 200 }}
            />
          </View>
        ) : displayedData.length > 0 ? (
          displayedData.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              className={`flex-row py-4 border-b border-gray-200 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
              onPress={() => handleRowPress(item)}
            >
              <View className="flex-1 items-center justify-center relative">
                {selectedToggle === "ToDo" ? (
                  <Text className="text-center font-medium">
                    {(index + 1).toString().padStart(2, "0")}
                  </Text>
                ) : (
                  <Ionicons name="flag" size={20} color="#980775" />
                )}
              </View>

              <View className="flex-[2] items-center justify-center px-2">
                <Text className="text-center font-medium text-gray-800">
                  {item.invoiceNo ||
                    `INV${item.id || (index + 1).toString().padStart(6, "0")}`}
                </Text>
                {/* Red dot indicator for locked packages */}
                {item.packageIsLock === 1 &&
                  jobRole === "Distribution Officer" && (
                    <View className="absolute right-[-2] top-3 w-3 h-3 bg-red-500 rounded-full"></View>
                  )}
              </View>

              {selectedToggle === "ToDo" ? (
                <>
                  <View className="flex-[2] items-center justify-center px-2">
                    <Text
                      className="text-center font-medium text-xs"
                      style={{ color: getScheduleDateColor(item.sheduleDate) }}
                    >
                      {formatScheduleDate(item.sheduleDate)}{" "}
                      {formatScheduleTime(item.sheduleTime) || "N/A"}
                    </Text>
                  </View>

                  <View className="flex-[2] items-center justify-center px-2">
                    <View
                      style={{
                        backgroundColor: getStatusBackgroundColor(
                          item.selectedStatus,
                        ),
                        borderColor: getStatusBorderColor(item.selectedStatus),
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={[
                          {
                            color: getStatusTextColor(item.selectedStatus),
                            fontSize: 11,
                            fontWeight: "500",
                            textAlign: "center",
                          },
                          i18n.language === "si"
                            ? { fontSize: 12 }
                            : i18n.language === "ta"
                              ? { fontSize: 9 }
                              : { fontSize: 14 },
                        ]}
                      >
                        {getStatusText(item.selectedStatus)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View className="flex-[2] items-center justify-center px-2">
                  <Text className="text-center text-gray-600 text-sm">
                    {item.completedTime
                      ? formatCompletionTime(item.completedTime)
                      : "N/A"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/NoComplaints.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <Text className="text-gray-500 mt-4 text-center">
              {selectedToggle === "ToDo"
                ? t("DailyTarget.NoTodoItems") || "No items to do"
                : t("DailyTarget.noCompletedTargets") || "No completed items"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TargetOrderScreen;
