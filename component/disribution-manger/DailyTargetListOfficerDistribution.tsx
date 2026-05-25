import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  BackHandler,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";
import CustomHeader from "../navigations/CustomHeader";

type DailyTargetListOfficerDistributiontNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DailyTargetListOfficerDistribution"
>;

interface DailyTargetListOfficerDistributionProps {
  navigation: DailyTargetListOfficerDistributiontNavigationProps;
  route: {
    params: {
      collectionOfficerId: number;
      officerId: string;
      officerName: string;
      phoneNumber1: string;
      phoneNumber2: string;
      image: string;
    };
  };
}

interface OrderData {
  distributedTargetId: number;
  distributedTargetItemId: number;
  orderId: number;
  processOrderId: number;
  invNo: string;
  amount: string;
  paymentMethod: string;
  isPaid: number;
  status: string;
  selectedStatus: string;
  sheduleDate: string;
  sheduleTime: string;
  sheduleType: string;
  buildingType: string;
  orderApp: string;
  isPackage: number;
  packageId: number | null;
  packageIsLock: number | null;
  packageItemStatus: string | null;
  additionalItemStatus: string | null;
  totalAdditionalItems: number;
  totalPackageItems: number;
  packedAdditionalItems: number;
  packedPackageItems: number;
  pendingAdditionalItems: number;
  pendingPackageItems: number;
  complete: number;
  isComplete: number | null;
  completeTime: string | null;
  target: number;
  targetCreatedAt: string;
  orderCreatedAt: string;
  itemCreatedAt: string;
  reportStatus: string | null;
}

const DailyTargetListOfficerDistribution: React.FC<
  DailyTargetListOfficerDistributionProps
> = ({ navigation, route }) => {
  const [todoData, setTodoData] = useState<OrderData[]>([]);
  const [completedData, setCompletedData] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const {
    collectionOfficerId,
    officerId,
    officerName,
    phoneNumber1,
    phoneNumber2,
    image,
  } = route.params;

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("Main" as any, {
          screen: "DistributionOfficerSummary",
          params: {
            officerId,
            officerName,
            phoneNumber1,
            phoneNumber2,
            collectionOfficerId,
            image,
          },
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

  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === "completed") {
      return "bg-[#BBFFC6] border-[#BBFFC6] text-[#6AD16D]";
    }
    if (normalizedStatus === "opened") {
      return "bg-[#F8FFA6] border-[#F8FFA6] text-[#A8A100]";
    }
    if (normalizedStatus === "pending") {
      return "bg-[#FFB9B7] border-[#FFB9B7] text-[#D16D6A]";
    }

    if (normalizedStatus === "සම්පූර්ණ" || normalizedStatus === "සම්පූර්ණයි") {
      return "bg-[#BBFFC6] border-[#BBFFC6] text-[#6AD16D]";
    }
    if (normalizedStatus === "විවෘත" || normalizedStatus === "විවෘතයි") {
      return "bg-[#F8FFA6] border-[#F8FFA6] text-[#A8A100]";
    }
    if (normalizedStatus === "අපේක්ෂිත" || normalizedStatus === "පොරොත්තුවේ") {
      return "bg-[#FFB9B7] border-[#FFB9B7] text-[#D16D6A]";
    }

    if (
      normalizedStatus === "முடிக்கப்பட்டது" ||
      normalizedStatus === "நிறைவு"
    ) {
      return "bg-[#BBFFC6] border-[#BBFFC6] text-[#6AD16D]";
    }
    if (
      normalizedStatus === "திறக்கப்பட்டது" ||
      normalizedStatus === "திறந்த"
    ) {
      return "bg-[#F8FFA6] border-[#F8FFA6] text-[#A8A100]";
    }
    if (
      normalizedStatus === "நிலுவையில்" ||
      normalizedStatus === "காத்திருக்கும்"
    ) {
      return "bg-[#FFB9B7] border-[#FFB9B7] text-[#D16D6A]";
    }

    return "bg-gray-100 border-gray-200";
  };

  const getStatusText = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
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

  const formatCompletionTime = (timeString: string) => {
    if (!timeString) return "N/A";
    const date = new Date(timeString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canSelectItem = (item: OrderData) => {
    if (selectedToggle !== "ToDo") return false;

    if (item.selectedStatus?.toLowerCase() !== "pending") return false;

    if (item.isPackage === 1) {
      if (item.totalAdditionalItems > 0 && item.totalPackageItems > 0) {
        const additionalIsPending =
          item.additionalItemStatus?.toLowerCase() === "pending";
        const packageIsPending =
          item.packageItemStatus?.toLowerCase() === "pending";
        return additionalIsPending && packageIsPending;
      }

      if (item.totalPackageItems > 0 && item.totalAdditionalItems === 0) {
        return item.packageItemStatus?.toLowerCase() === "pending";
      }

      if (item.totalAdditionalItems > 0 && item.totalPackageItems === 0) {
        return item.additionalItemStatus?.toLowerCase() === "pending";
      }

      return false;
    } else {
      if (item.totalAdditionalItems > 0) {
        return item.additionalItemStatus?.toLowerCase() === "pending";
      }

      return false;
    }
  };

  const handleItemSelect = (item: OrderData) => {
    if (!canSelectItem(item)) return;

    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(item.distributedTargetItemId)) {
      newSelectedItems.delete(item.distributedTargetItemId);
    } else {
      newSelectedItems.add(item.distributedTargetItemId);
    }
    setSelectedItems(newSelectedItems);

    if (newSelectedItems.size > 0) {
      setIsSelectionMode(true);
    } else {
      setIsSelectionMode(false);
    }
  };

  const toggleSelectAllPending = () => {
    const pendingItems = todoData.filter((item) => canSelectItem(item));
    const allPendingIds = pendingItems.map(
      (item) => item.distributedTargetItemId,
    );

    const allSelected = allPendingIds.every((id) => selectedItems.has(id));

    if (allSelected && selectedItems.size > 0) {
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedItems(new Set(allPendingIds));
      setIsSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handlePassButtonPress = () => {
    if (selectedItems.size === 0) {
      Alert.alert(
        t("Error.No Selection"),
        t("Error.Please select at least one pending item"),
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPass = () => {
    setShowConfirmModal(false);

    const selectedItemsArray = Array.from(selectedItems);

    const selectedItemsWithInvoices = todoData.filter((item) =>
      selectedItems.has(item.distributedTargetItemId),
    );

    const invoiceNumbers = selectedItemsWithInvoices.map((item) => item.invNo);
    const processOrderId = selectedItemsWithInvoices.map(
      (item) => item.processOrderId,
    );

    navigation.navigate("Main" as any, {
      screen: "PassTarget",
      params: {
        officerId: officerId,
        selectedItems: selectedItemsArray,
        collectionOfficerId: collectionOfficerId,
        invoiceNumbers: invoiceNumbers,
        processOrderId: processOrderId,
      },
    });

    clearSelection();
  };

  const handleCancelPass = () => {
    setShowConfirmModal(false);
  };

  const handleSelectedItemsAction = () => {
    handlePassButtonPress();
  };

  const fetchTargets = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const authToken = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/distribution-officer/${collectionOfficerId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const allData = response.data.data;

      const todoItems = allData.filter(
        (item: OrderData) =>
          item.selectedStatus !== "Completed" &&
          (item.isComplete === null || item.isComplete === 0),
      );

      const completedItems = allData.filter(
        (item: OrderData) =>
          item.selectedStatus === "Completed" && item.isComplete === 1,
      );

      setTodoData(todoItems);
      setCompletedData(completedItems);

      setError(null);
    } catch (err) {
      console.error("Error fetching targets:", err);
      setError(t("Error.Failed to fetch data."));
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 3000 - elapsedTime;
      setTimeout(
        () => setLoading(false),
        remainingTime > 0 ? remainingTime : 0,
      );
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTargets();

      clearSelection();
    }, [collectionOfficerId]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTargets();
    clearSelection();
    setRefreshing(false);
  }, [collectionOfficerId]);

  const handleToggleChange = (toggle: string) => {
    setSelectedToggle(toggle);
    clearSelection();
  };

  const displayedData = selectedToggle === "ToDo" ? todoData : completedData;
  const pendingItemsCount = todoData.filter((item) =>
    canSelectItem(item),
  ).length;

  const getStatusTextColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-[#FF0700]";
      case "opened":
        return "text-[#A8A100]";
      case "completed":
        return "text-green-800";
      default:
        return "text-gray-800";
    }
  };

  return (
    <View className="flex-1 bg-[#282828]">
      {/* Header */}

      <CustomHeader
        title={officerId}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, {
            screen: "DistributionOfficerSummary",
            params: {
              officerId,
              officerName,
              phoneNumber1,
              phoneNumber2,
              collectionOfficerId,
              image,
            },
          })
        }
        textColor="white"
        bgColor="#282828"
        iconBgColor="#FFFFFF1A"
        rightComponent={
          isSelectionMode ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={clearSelection}
                style={{ padding: 8, marginRight: 4 }}
              >
                <MaterialIcons name="clear" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSelectedItemsAction}
                style={{ padding: 8 }}
              >
                <MaterialIcons name="check" size={22} color="white" />
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPass}
      >
        <View className="flex-1 justify-center items-center bg-[#00000040] ">
          <View className="bg-white mx-10 h-[200px] rounded-lg p-6 shadow-lg">
            {/* Warning Icon */}
            <View className="items-center mb-4">
              <View className="w-10 h-10 bg-[#F6F7F9] rounded-lg items-center justify-center">
                <MaterialIcons name="warning" size={24} color="#808080" />
              </View>
            </View>

            {/* Message */}
            <Text className="text-center text-gray-800 text-base mb-6 leading-5">
              {t("DailyTargetListOfficerDistribution.Are you sure")}
            </Text>

            {/* Buttons */}
            <View className="flex-row justify-center space-x-4">
              <TouchableOpacity
                onPress={handleCancelPass}
                className="flex-1 mr-2 h-[50px] px-8 bg-[#F6F7F9] items-center justify-center border border-[#95A1AC] rounded-lg"
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text
                  className="text-center text-gray-700 font-medium"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 12 }
                        : { fontSize: 14 },
                  ]}
                >
                  {" "}
                  {t("DailyTargetListOfficerDistribution.Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmPass}
                className="flex-1  h-[50px]  px-8 bg-[#980775] border border-[#980775] rounded-lg items-center justify-center"
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text
                  className="text-center text-white font-medium"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 12 }
                        : { fontSize: 14 },
                  ]}
                >
                  {" "}
                  {t("DailyTargetListOfficerDistribution.Pass")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toggle Buttons */}
      <View className="flex-row justify-center items-center py-4 bg-[#282828] px-4">
        <TouchableOpacity
          className={`flex-1 mx-2 py-3 rounded-full flex-row items-center justify-center ${
            selectedToggle === "ToDo" ? "bg-[#980775]" : "bg-white"
          }`}
          onPress={() => handleToggleChange("ToDo")}
        >
          <Text
            className={`font-bold ${selectedToggle === "ToDo" ? "text-white mr-2" : "text-black"}`}
          >
            {t("TargetOrderScreen.Todo")}
          </Text>
          {selectedToggle === "ToDo" && (
            <View className="rounded-full px-2 py-1 bg-white">
              <Text className="font-bold text-xs text-[#980775]">
                {todoData.length.toString().padStart(2, "0")}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 mx-2 py-3 rounded-full flex-row items-center justify-center ${
            selectedToggle === "Completed" ? "bg-[#980775]" : "bg-white"
          }`}
          onPress={() => handleToggleChange("Completed")}
        >
          <Text
            className={`font-bold ${selectedToggle === "Completed" ? "text-white mr-2" : "text-black"}`}
          >
            {t("TargetOrderScreen.Completed")}
          </Text>
          {selectedToggle === "Completed" && (
            <View className="rounded-full px-2 py-1 bg-white">
              <Text className="font-bold text-xs text-[#980775]">
                {completedData.length.toString().padStart(2, "0")}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Table Header */}
        <View className="flex-row bg-[#980775] py-3">
          {selectedToggle === "ToDo" && (
            <TouchableOpacity
              className="w-12 items-center justify-center"
              onPress={toggleSelectAllPending}
              disabled={pendingItemsCount === 0}
            >
              <MaterialIcons
                name={
                  pendingItemsCount > 0 &&
                  todoData
                    .filter((item) => canSelectItem(item))
                    .every((item) =>
                      selectedItems.has(item.distributedTargetItemId),
                    ) &&
                  selectedItems.size > 0
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={20}
                color="white"
              />
            </TouchableOpacity>
          )}

          {selectedToggle === "ToDo" ? (
            <Text className="flex-1 text-center text-white font-bold">
              {t("TargetOrderScreen.No")}
            </Text>
          ) : (
            <Text className="flex-1 text-center text-white font-bold">
              {t("TargetOrderScreen.No")}
            </Text>
          )}
          <Text className="flex-[2] text-center text-white font-bold">
            {t("TargetOrderScreen.Invoice No")}
          </Text>

          {selectedToggle === "ToDo" ? (
            <Text className="flex-[2] text-center text-white font-bold">
              {t("TargetOrderScreen.Status")}
            </Text>
          ) : (
            <Text className="flex-[2] text-center text-white font-bold">
              {t("DailyTargetListOfficerDistribution.Completed Time")}
            </Text>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-red-100 border border-red-400 px-4 py-3 mx-4 mt-4 rounded">
            <Text className="text-red-700 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchTargets()}
              className="mt-2 bg-red-500 px-4 py-2 rounded"
            >
              <Text className="text-white text-center">
                {t("DailyTargetListOfficerDistribution.Retry")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/loading.json")}
              autoPlay
              loop
              style={{ width: 200, height: 200 }}
            />
          </View>
        ) : displayedData.length > 0 ? (
          displayedData.map((item, index) => (
            <View
              key={`${item.distributedTargetItemId}-${index}`}
              className={`flex-row py-4 border-b border-gray-200 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              } ${
                selectedItems.has(item.distributedTargetItemId)
                  ? "bg-blue-50"
                  : ""
              }`}
            >
              {/* Checkbox for ToDo items */}
              {selectedToggle === "ToDo" && (
                <View className="w-12 items-center justify-center">
                  {canSelectItem(item) ? (
                    <TouchableOpacity
                      onPress={() => handleItemSelect(item)}
                      className="p-2"
                    >
                      <MaterialIcons
                        name={
                          selectedItems.has(item.distributedTargetItemId)
                            ? "check-box"
                            : "check-box-outline-blank"
                        }
                        size={20}
                        color={
                          selectedItems.has(item.distributedTargetItemId)
                            ? "black"
                            : "#000000"
                        }
                      />
                    </TouchableOpacity>
                  ) : (
                    <View className="w-5 h-5 bg-white border border-[#E2E8F0] rounded opacity-50" />
                  )}
                </View>
              )}

              {/* Row Number */}
              <View className="flex-1 items-center justify-center relative">
                {selectedToggle === "ToDo" ? (
                  <Text className="text-center font-medium">
                    {(index + 1).toString().padStart(2, "0")}
                  </Text>
                ) : (
                  <Text className="text-center font-medium">
                    {(index + 1).toString().padStart(2, "0")}
                  </Text>
                )}
              </View>

              {/* Invoice Number */}
              <View className="flex-[2] items-center justify-center px-2">
                <Text className="text-center font-medium text-gray-800">
                  {item.invNo ||
                    `INV${item.processOrderId.toString().padStart(6, "0")}`}
                </Text>
              </View>

              {selectedToggle === "ToDo" ? (
                <View className="flex-[2] items-center justify-center px-2">
                  <View
                    className={`px-7 py-2 rounded-full border ${getStatusColor(item.selectedStatus)}`}
                  >
                    <Text
                      className={`text-base font-medium text-center ${getStatusTextColor(item.selectedStatus)}`}
                    >
                      {getStatusText(item.selectedStatus)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="flex-[2] items-center justify-center px-2">
                  <Text className="text-center text-gray-600 text-sm">
                    {item.completeTime
                      ? formatCompletionTime(item.completeTime)
                      : "N/A"}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/no-data.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <Text className="text-gray-500 mt-[-5%] text-center">
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

export default DailyTargetListOfficerDistribution;
