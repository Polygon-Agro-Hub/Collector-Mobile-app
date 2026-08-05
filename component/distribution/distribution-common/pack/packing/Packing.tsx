import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  BackHandler,
} from "react-native";
import { Feather, FontAwesome6, Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { getSocket } from "@/services/socket";
import AlertModal from "@/component/commons/AlertModal";

export const TIME_SLOTS = [
  { label: "08:00 AM - 12:00 PM", value: "08:00 AM - 12:00 PM" },
  { label: "12:00 PM - 04:00 PM", value: "12:00 PM - 04:00 PM" },
  { label: "04:00 PM - 09:00 PM", value: "04:00 PM - 09:00 PM" },
];

const timeSlotMap: { [key: string]: string } = {
  "8-12": "08:00 AM - 12:00 PM",
  "12-4": "12:00 PM - 04:00 PM",
  "4-9": "04:00 PM - 09:00 PM",
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

interface PackingItem {
  id: number;
  name: string;
  weight: string;
  packName?: string;
  categoryType?: "package" | "alacarte";
  image: string;
  checked: boolean;
}

type PackingStatus = "no_qr_yet" | "waiting" | "no_items" | "has_items";

export default function Packing({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const {
    orderNumber: initialOrderNumber,
    processOrderId: initialProcessOrderId,
    positionId,
    positionName = "Packing Position 1",
    rowId,
    positionCrops = [],
  } = route.params || {};

  const [activeProcessOrderId, setActiveProcessOrderId] = useState<
    number | null
  >(initialProcessOrderId || null);
  const [displayOrderTitle, setDisplayOrderTitle] = useState<string>(
    initialOrderNumber || "",
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    "08:00 AM - 12:00 PM",
  );

  const [activeOrderPackageId, setActiveOrderPackageId] = useState<number | null>(null);
  const [currentPIndex, setCurrentPIndex] = useState<number | null>(null);

  // Status state tracking: "no_qr_yet", "waiting", "no_items", or "has_items"
  const [status, setStatus] = useState<PackingStatus>("no_qr_yet");
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // Crop list items mapped ONLY from position-specific assigned crops
  const [items, setItems] = useState<PackingItem[]>(() => {
    if (positionCrops && positionCrops.length > 0) {
      const mapped = positionCrops.map((c: any) => ({
        id: c.id,
        name: c.name,
        weight: formatWeightDisplay(c.weight || "1.0 kg"),
        packName: c.packName || "Fruity Pack",
        categoryType: c.categoryType || "package",
        checked: false,
        image:
          c.image ||
          "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
      }));
      mapped.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      return mapped;
    }
    return [];
  });

  useEffect(() => {
    // If no crops passed, fetch assigned crops for position
    if (positionId && items.length === 0) {
      fetchPositionCrops();
    }

    fetchActiveOrderAndStatus();

    // Hardware Back Press Handler to avoid navigation loop
    const onBackPress = () => {
      navigation.navigate("SelectRow");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    // Socket.IO real-time event listener & room joining
    const socket = getSocket();
    if (rowId) {
      socket.emit("join_row", rowId);
    }

    const handleOrderUpdate = () => {
      fetchActiveOrderAndStatus();
    };

    socket.on("order_opened", handleOrderUpdate);
    socket.on("position_index_updated", handleOrderUpdate);

    return () => {
      backHandler.remove();
      socket.off("order_opened", handleOrderUpdate);
      socket.off("position_index_updated", handleOrderUpdate);
    };
  }, [positionId, rowId]);

  const fetchPositionCrops = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !positionId) return;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/packing/positions/${positionId}/crops`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data && response.data.success && response.data.data) {
        const fetched = response.data.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          weight: formatWeightDisplay(c.weight || "1.0 kg"),
          packName: c.packName || "Fruity Pack",
          categoryType: c.categoryType || "package",
          checked: false,
          image:
            c.image ||
            "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
        }));
        fetched.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setItems(fetched);
      }
    } catch (err) {
      console.error("Error fetching position crops:", err);
    }
  };

  const fetchActiveOrderAndStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // 1. Fetch active order details for officer
      const activeRes = await axios.get(
        `${environment.API_BASE_URL}api/packing/active-order`,
        { headers: { Authorization: `Bearer ${token}` } },
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
        if (activeData.timeSlot) {
          setScheduledTime(
            timeSlotMap[activeData.timeSlot] || activeData.timeSlot,
          );
        }

        const orderStatus = activeData.orderStatus;
        const pIndex =
          activeData.pIndex !== undefined ? Number(activeData.pIndex) : 0;
        setCurrentPIndex(pIndex);

        const officerPosIndex =
          activeData.officerPosIndex !== undefined
            ? Number(activeData.officerPosIndex)
            : 1;

        if (orderStatus === "Pending") {
          // No QR code printed yet!
          setStatus("no_qr_yet");
        } else if (pIndex > 0 && pIndex !== officerPosIndex) {
          // Package is currently at a different position step (waiting for box to arrive or already passed)
          setStatus("waiting");
        } else if (orderStatus === "Opened" || orderStatus === "Completed") {
          const orderItems = activeData.orderItems || [];
          if (orderItems.length > 0) {
            const mappedItems = orderItems.map((item: any) => {
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
            mappedItems.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
            setItems(mappedItems);
            setStatus("has_items");
          } else {
            setItems([]);
            setStatus("no_items");
          }
        }
      } else if (activeProcessOrderId) {
        // Fallback to checking specific orderStatus if active-order endpoint returns null
        const res = await axios.get(
          `${environment.API_BASE_URL}api/packing/order-status/${activeProcessOrderId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data && res.data.success && res.data.data) {
          const orderStatus = res.data.data.orderStatus;
          const pIndex =
            res.data.data.pIndex !== undefined
              ? Number(res.data.data.pIndex)
              : 0;
          setCurrentPIndex(pIndex);

          if (orderStatus === "Pending") {
            setStatus("no_qr_yet");
          } else if (pIndex > 0 && pIndex < 1) {
            setStatus("waiting");
          } else if (orderStatus === "Opened" || orderStatus === "Completed") {
            if (items.length > 0) {
              setStatus("has_items");
            } else {
              setStatus("no_items");
            }
          }
        } else {
          setStatus("no_qr_yet");
        }
      } else {
        setStatus("no_qr_yet");
      }
    } catch (err) {
      console.error("Error fetching active order tracking status:", err);
      setStatus("no_qr_yet");
    }
  };

  const handleToggleCheck = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const allItemsChecked =
    items.length > 0 && items.every((item) => item.checked);

  const handleAdvancePosition = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const targetOrderId =
        activeProcessOrderId || initialProcessOrderId || 3221;
      const payload = {
        orderId: targetOrderId,
        orderpackageId: activeOrderPackageId || null,
        currentPIndex: currentPIndex || 1,
        rowId: rowId,
      };

      const res = await axios.post(
        `${environment.API_BASE_URL}api/packing/advance-position`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data && res.data.success) {
        setAlertMessage(
          "Packing has been completed successfully. Move to the next position."
        );
        setAlertVisible(true);
        fetchActiveOrderAndStatus();
      } else if (res.data && !res.data.success) {
        Alert.alert("Station Busy", res.data.message || "The next station is currently busy.");
      }
    } catch (err) {
      console.error("Error advancing position index:", err);
      Alert.alert("Error", "Failed to advance position index.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header displaying REAL invoice number */}
      <CustomHeader
        title={status === "no_qr_yet" ? "" : displayOrderTitle}
        navigation={navigation}
        onBackPress={() => navigation.navigate("SelectRow")}
      />

      <ScrollView
        className="flex-1 bg-white px-6"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent:
            status === "has_items" || status === "no_qr_yet"
              ? "flex-start"
              : "center",
          paddingBottom: 130,
        }}
      >
        {/* Scheduled Time Section matching user screenshot design */}
        {status !== "no_qr_yet" && (
          <View className="flex-row items-center bg-white border border-[#E1E7EE] rounded-2xl px-5 py-4 mb-6 shadow-sm">
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

        {/* STATE 0: No QR printed yet for this target / row */}
        {status === "no_qr_yet" && (
          <View className="flex-1">
            {/* Text Section at Top */}
            <View className="items-center mt-4 mb-2">
              <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
                Welcome to {positionName}
              </Text>
              <Text className="text-[#54617D] text-sm text-center px-4 font-medium leading-5">
                Please wait and check again.{"\n"}This row doesn't have a daily
                target yet.
              </Text>
            </View>

            {/* No Data Icon Centered */}
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

        {/* STATE 1: Waiting for previous position */}
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

        {/* STATE 2: Opened, but No items at this position -> SHOW SKIP SCREEN */}
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

        {/* STATE 3: Has items assigned to this position */}
        {status === "has_items" && (
          <View className="pt-1">
            {items.map((item, index) => {
              const isAlacarte =
                item.categoryType === "alacarte" ||
                item.packName === "À la carte";
              const packColor = isAlacarte
                ? "text-[#AC7F5E]"
                : "text-[#980775]";

              return (
                <TouchableOpacity
                  key={`${item.id}_${index}`}
                  onPress={() => handleToggleCheck(item.id)}
                  className="flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 mb-4 shadow-sm"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    {/* Product Image */}
                    <View className="w-16 h-16 rounded-full overflow-hidden items-center justify-center mr-4">
                      <Image
                        source={{ uri: item.image }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>

                    {/* Details */}
                    <View className="flex-1">
                      <Text className="text-[#030E25] font-bold text-base leading-5 mb-0.5">
                        {item.name}
                      </Text>
                      <Text className="text-[#030E25] font-extrabold text-base mb-1">
                        {item.weight}
                      </Text>
                      <Text className={`font-semibold text-xs ${packColor}`}>
                        {item.packName ||
                          (isAlacarte ? "À la carte" : "Fruity Pack")}
                      </Text>
                    </View>
                  </View>

                  {/* Checkbox */}
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
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Skip Button pinned to bottom when position has no items */}
      {status === "no_items" && (
        <View className="px-6 pt-3 pb-10 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={handleAdvancePosition}
            className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-base">Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Complete Button pinned to bottom when all items checked */}
      {status === "has_items" && allItemsChecked && (
        <View className="px-6 pt-3 pb-10 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={handleAdvancePosition}
            className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-base">
              Complete
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AlertModal Success Popup */}
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
