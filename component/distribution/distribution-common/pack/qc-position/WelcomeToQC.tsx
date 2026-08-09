import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather, FontAwesome6 } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import AlertModal from "@/component/components/popup/AlertModal";
import { getSocket } from "@/services/socket";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type QCStatus = "no_target" | "waiting" | "no_items" | "qc_checklist";

interface QCItem {
  id: number;
  name: string;
  weight: string;
  packName: string;
  categoryType: string;
  checked: boolean;
  image: string;
}

const timeSlotMap: { [key: string]: string } = {
  "8-12": "08:00 AM - 12:00 PM",
  "12-16": "12:00 PM - 04:00 PM",
  "16-20": "04:00 PM - 08:00 PM",
  "8-4": "08:00 AM - 04:00 PM",
  "12-4": "12:00 PM - 04:00 PM",
  "4-8": "04:00 PM - 08:00 PM",
  "4-9": "04:00 PM - 09:00 PM",
  "16-21": "04:00 PM - 09:00 PM",
};

const formatWeightDisplay = (weightStr: string) => {
  if (!weightStr) return weightStr;
  const match = weightStr.trim().match(/^([\d.]+)\s*(.*)$/);
  if (!match) return weightStr;
  const numVal = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(numVal)) return weightStr;
  const numStr = numVal % 1 === 0 ? numVal.toFixed(0) : numVal.toFixed(2);
  return `${numStr} ${unit}`.trim();
};

export default function WelcomeToQC({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const {
    orderNumber: initialOrderNumber,
    processOrderId: initialProcessOrderId,
    rowId,
  } = route.params || {};
  const insets = useSafeAreaInsets();

  const [activeProcessOrderId, setActiveProcessOrderId] = useState<
    number | null
  >(initialProcessOrderId || null);
  const [activeOrderPackageId, setActiveOrderPackageId] = useState<
    number | null
  >(null);
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [alacarteCount, setAlacarteCount] = useState<number>(0);
  const [isAlacarteActive, setIsAlacarteActive] = useState<boolean>(false);
  const [displayOrderTitle, setDisplayOrderTitle] = useState<string>(
    initialOrderNumber || ""
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    "08:00 AM - 12:00 PM"
  );

  const [status, setStatus] = useState<QCStatus>("no_target");
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  const [qcItems, setQcItems] = useState<QCItem[]>([]);
  const [currentPackName, setCurrentPackName] = useState<string>("Daily Veggie Pack");
  const [officerPosIndex, setOfficerPosIndex] = useState<number>(3);

  useEffect(() => {
    fetchActiveOrderAndStatus();

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    const socket = getSocket();
    if (rowId) {
      socket.emit("join_row", rowId);
    }

    const handleOrderUpdate = () => {
      fetchActiveOrderAndStatus();
    };

    socket.on("order_opened", handleOrderUpdate);
    socket.on("position_index_updated", handleOrderUpdate);
    socket.on("order_completed", handleOrderUpdate);

    return () => {
      backHandler.remove();
      socket.off("order_opened", handleOrderUpdate);
      socket.off("position_index_updated", handleOrderUpdate);
      socket.off("order_completed", handleOrderUpdate);
    };
  }, [rowId]);

  const fetchActiveOrderAndStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const activeRes = await axios.get(
        `${environment.API_BASE_URL}api/packing/active-order`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (activeRes.data && activeRes.data.success && activeRes.data.data) {
        const activeData = activeRes.data.data;

        if (activeData.formattedOrderNumber) {
          setDisplayOrderTitle(activeData.formattedOrderNumber);
        }
        if (activeData.processOrderId) {
          setActiveProcessOrderId(activeData.processOrderId);
        }
        setActiveOrderPackageId(activeData.activeOrderPackageId || null);
        setPackagesList(activeData.packagesList || []);
        setAlacarteCount(activeData.alacarteCount || 0);
        setIsAlacarteActive(!!activeData.isAlacarteActive);
        if (activeData.timeSlot) {
          setScheduledTime(
            timeSlotMap[activeData.timeSlot] || activeData.timeSlot
          );
        }

        const orderStatus = activeData.orderStatus;
        const pIndex =
          activeData.pIndex !== undefined ? Number(activeData.pIndex) : 0;
        const resolvedOfficerPosIndex =
          activeData.officerPosIndex !== undefined
            ? Number(activeData.officerPosIndex)
            : 3;
        setOfficerPosIndex(resolvedOfficerPosIndex);

        if (orderStatus === "Pending" || orderStatus === "Completed" || pIndex < resolvedOfficerPosIndex || pIndex > resolvedOfficerPosIndex) {
          // Box has not reached QC station yet (pIndex < officerPosIndex) or box/order is already completed (pIndex > officerPosIndex)
          setStatus("waiting");
        } else if (orderStatus === "Opened" && pIndex === resolvedOfficerPosIndex) {
          const orderItems = activeData.orderItems || [];

          if (orderItems.length > 0) {
            const mappedItems: QCItem[] = orderItems.map((item: any) => {
              const resolvedPackName =
                item.packName && item.packName !== "À la carte"
                  ? item.packName
                  : item.categoryType === "alacarte"
                    ? "À la carte"
                    : "Daily Veggie Pack";
              const isAlacarte = resolvedPackName === "À la carte";
              return {
                id: item.id,
                name: item.name,
                weight: formatWeightDisplay(item.weight || "1.0 kg"),
                packName: resolvedPackName,
                categoryType: isAlacarte ? "alacarte" : "package",
                checked: false,
                image:
                  item.image ||
                  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
              };
            });

            setQcItems(mappedItems);
            setCurrentPackName(mappedItems[0]?.packName || "Daily Veggie Pack");
            setStatus("qc_checklist");
          } else {
            // Box arrived at QC but has 0 items assigned to QC
            setQcItems([]);
            setStatus("no_items");
          }
        }
      } else {
        setStatus("no_target");
      }
    } catch (err) {
      console.error("Error fetching active order status in QC:", err);
      setStatus("no_target");
    }
  };

  const handleToggleCheck = (itemId: number) => {
    setQcItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allItemsChecked =
    qcItems.length > 0 && qcItems.every((item) => item.checked);

  const handleAdvanceQCBox = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const targetOrderId =
        activeProcessOrderId || initialProcessOrderId || 3221;

      // 1. Advance position index for this package box at QC (pIndex = officerPosIndex → officerPosIndex + 1)
      const advanceRes = await axios.post(
        `${environment.API_BASE_URL}api/packing/advance-position`,
        {
          orderId: targetOrderId,
          orderpackageId: activeOrderPackageId || null,
          currentPIndex: officerPosIndex,
          rowId: rowId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (advanceRes.data && advanceRes.data.success) {
        // 2. Check if all packages for this order are completed
        await axios.post(
          `${environment.API_BASE_URL}api/packing/qc-completed`,
          { orderId: targetOrderId, rowId: rowId },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});

        setStatus("waiting");
        setAlertMessage("Packing has been completed successfully.");
        setAlertVisible(true);
      } else if (advanceRes.data && !advanceRes.data.success) {
        Alert.alert("Station Busy", advanceRes.data.message || "The next station is currently busy.");
      }
    } catch (err) {
      console.error("Error advancing QC box:", err);
      Alert.alert("Error", "Failed to advance QC position.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // Build dynamic QC progress steps
  const steps: any[] = [];
  const totalBoxes = packagesList.length + (alacarteCount > 0 ? 1 : 0);

  if (totalBoxes > 1) {
    steps.push({
      id: 1,
      type: "main",
      label: "Main Container",
    });
  }

  packagesList.forEach((pkg) => {
    steps.push({
      id: steps.length + 1,
      type: "package",
      label: pkg.name,
      packageId: pkg.id,
    });
  });

  if (alacarteCount > 0) {
    steps.push({
      id: steps.length + 1,
      type: "alacarte",
      label: "À la carte",
      packageId: null,
    });
  }

  let currentStep = 1;
  if (activeOrderPackageId === -1) {
    const matchedIdx = steps.findIndex((s) => s.type === "main");
    if (matchedIdx !== -1) {
      currentStep = matchedIdx + 1;
    }
  } else if (activeOrderPackageId) {
    const matchedIdx = steps.findIndex(
      (s) => s.type === "package" && s.packageId === activeOrderPackageId
    );
    if (matchedIdx !== -1) {
      currentStep = matchedIdx + 1;
    }
  } else if (
    isAlacarteActive ||
    (qcItems.length > 0 && qcItems[0].categoryType === "alacarte")
  ) {
    const matchedIdx = steps.findIndex((s) => s.type === "alacarte");
    if (matchedIdx !== -1) {
      currentStep = matchedIdx + 1;
    }
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <CustomHeader
        title={status === "no_target" ? "" : displayOrderTitle}
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
      />

      <View className="flex-1 px-6 pt-2">
        {/* Scheduled Time Section */}
        {status !== "no_target" && (
          <View className="w-full flex-row items-center bg-white border border-[#E1E7EE] rounded-2xl px-5 py-4 mb-6 shadow-sm">
            <View className="w-11 h-11 rounded-full bg-[#E9ECF1] items-center justify-center mr-4">
              <FontAwesome6 name="bag-shopping" size={24} color="black" />
            </View>
            <View>
              <Text className="text-[#54617D] text-xs font-semibold mb-0.5">
                Scheduled Time :
              </Text>
              <Text className="text-[#030E25] font-extrabold text-base">
                {scheduledTime}
              </Text>
            </View>
          </View>
        )}

        {/* Dynamic Progress step segments */}
        {status !== "no_target" && steps.length > 1 && (
          <View className="flex-row justify-between items-center gap-2 px-2 mb-8 w-full">
            {steps.map((s, idx) => {
              const stepNum = idx + 1;
              const isFilled = stepNum <= currentStep;
              return (
                <View key={s.id} className="flex-1 items-center">
                  <View
                    className={`w-full h-1.5 rounded-full mb-1 ${
                      isFilled ? "bg-[#030E25]" : "bg-gray-200"
                    }`}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* STATE 1: No Target Available */}
        {status === "no_target" && (
          <View className="flex-1">
            <View className="items-center mt-4 mb-2">
              <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
                Welcome to QC Position
              </Text>
              <Text className="text-[#54617D] text-sm text-center px-4 font-medium leading-5">
                Please wait and check again.{"\n"}This row doesn't have a daily
                target yet.
              </Text>
            </View>

            <View className="flex-1 justify-center items-center py-6">
              <View className="w-56 h-56 justify-center items-center">
                <LottieView
                  source={require("../../../../../assets/lottie/no-data.json")}
                  autoPlay
                  loop
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            </View>
          </View>
        )}

        {/* STATE 2: Waiting Screen (Box still at previous position) */}
        {status === "waiting" && (
          <View className="flex-1 items-center py-6">
            <View className="w-56 h-56 justify-center items-center mb-6">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
            <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2 leading-7 px-4">
              This order is still with the{"\n"}previous position
            </Text>
            <Text className="text-[#54617D] text-sm text-center px-6 font-medium leading-5">
              Please try reloading the page in a few seconds.
            </Text>
          </View>
        )}

        {/* STATE 3: No items to pack for this box at QC -> SHOW SKIP SCREEN */}
        {status === "no_items" && (
          <View className="flex-1">
            {/* Lottie Animation Centered in middle (arrow-forward.json) */}
            <View className="flex justify-center items-center py-6">
              <View className="w-56 h-56 justify-center items-center">
                <LottieView
                  source={require("../../../../../assets/lottie/packing/arrow-forward.json")}
                  autoPlay
                  loop
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            </View>
            <View className="items-center mt-4 mb-2">
              <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2 leading-7 px-4">
                No items to pack for this order{"\n"}at your position
              </Text>
              <Text className="text-[#54617D] text-sm text-center px-6 font-medium leading-5">
                There are no items assigned to the position{"\n"}in the current
                packing sequence.
              </Text>
            </View>
          </View>
        )}

        {/* STATE 4: QC Active Package Checklist View */}
        {status === "qc_checklist" && qcItems.length > 0 && (
          <View className="flex-1">
            {/* Package Title */}
            <Text
              className={`font-extrabold text-sm mb-4 ${
                currentPackName === "À la carte"
                  ? "text-[#AC7F5E]"
                  : "text-[#980775]"
              }`}
            >
              {currentPackName} ({String(qcItems.length).padStart(2, "0")})
            </Text>

            {/* Items contained in active package box */}
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {qcItems.map((item, index) => (
                <TouchableOpacity
                  key={`${item.id}_${index}`}
                  onPress={() => handleToggleCheck(item.id)}
                  className="flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 mb-3 shadow-sm"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center mr-4">
                      <Image
                        source={{ uri: item.image }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[#030E25] font-bold text-sm leading-5 mb-0.5">
                        {item.name}
                      </Text>
                      <Text className="text-[#54617D] font-extrabold text-xs">
                        {item.weight}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                      item.checked
                        ? "bg-[#980775] border-[#980775]"
                        : "border-[#030E25] bg-white"
                    }`}
                  >
                    {item.checked && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Skip Button pinned to bottom when position has no items */}
      {status === "no_items" && (
        <View className="px-6 pt-3 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16 }}>
          <TouchableOpacity
            onPress={handleAdvanceQCBox}
            disabled={isAdvancing}
            className={`w-full h-[50px] rounded-full items-center justify-center shadow-lg ${isAdvancing ? "bg-gray-400" : "bg-black"}`}
            activeOpacity={0.8}
          >
            {isAdvancing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-extrabold text-base">Skip</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Complete Button pinned to bottom when all items checked */}
      {status === "qc_checklist" && allItemsChecked && (
        <View className="px-6 pt-3 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16 }}>
          <TouchableOpacity
            onPress={handleAdvanceQCBox}
            disabled={isAdvancing}
            className={`w-full h-[50px] rounded-full items-center justify-center shadow-lg ${isAdvancing ? "bg-gray-400" : "bg-black"}`}
            activeOpacity={0.8}
          >
            {isAdvancing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-extrabold text-base">
                Complete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <AlertModal
        visible={alertVisible}
        type="success"
        title="Success"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          fetchActiveOrderAndStatus();
        }}
      />
    </View>
  );
}
