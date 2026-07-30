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
import { Feather, Ionicons } from "@expo/vector-icons";
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

interface PackingItem {
  id: number;
  name: string;
  weight: string;
  packType?: string;
  image: string;
  checked: boolean;
}

type PackingStatus = "waiting" | "no_items" | "has_items";

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
    rowId,
    positionCrops = [],
  } = route.params || {};

  const [activeProcessOrderId, setActiveProcessOrderId] = useState<number | null>(
    initialProcessOrderId || null
  );
  const [displayOrderTitle, setDisplayOrderTitle] = useState<string>(
    initialOrderNumber || ""
  );
  const [scheduledTime, setScheduledTime] = useState<string>("08:00 AM - 12:00 PM");

  // Status state tracking: "waiting", "no_items", or "has_items"
  const [status, setStatus] = useState<PackingStatus>("waiting");
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // Crop list items mapped ONLY from position-specific assigned crops
  const [items, setItems] = useState<PackingItem[]>(() => {
    if (positionCrops && positionCrops.length > 0) {
      return positionCrops.map((c: any) => ({
        id: c.id,
        name: c.name,
        weight: c.weight || "1.0 kg",
        checked: false,
        image:
          c.image ||
          "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
      }));
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
      onBackPress
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.success && response.data.data) {
        const fetched = response.data.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          weight: c.weight || "1.0 kg",
          checked: false,
          image:
            c.image ||
            "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
        }));
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
        if (activeData.timeSlot) {
          setScheduledTime(timeSlotMap[activeData.timeSlot] || activeData.timeSlot);
        }

        const orderStatus = activeData.orderStatus;
        const pIndex = activeData.pIndex !== undefined ? Number(activeData.pIndex) : 0;
        const officerPosIndex = activeData.officerPosIndex !== undefined ? Number(activeData.officerPosIndex) : 1;

        if (orderStatus === "Pending" || pIndex < officerPosIndex) {
          setStatus("waiting");
        } else if (orderStatus === "Opened" || orderStatus === "Completed") {
          if (items.length > 0) {
            setStatus("has_items");
          } else {
            setStatus("no_items");
          }
        }
      } else if (activeProcessOrderId) {
        // Fallback to checking specific orderStatus if active-order endpoint returns null
        const res = await axios.get(
          `${environment.API_BASE_URL}api/packing/order-status/${activeProcessOrderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && res.data.success && res.data.data) {
          const orderStatus = res.data.data.orderStatus;
          const pIndex = res.data.data.pIndex !== undefined ? Number(res.data.data.pIndex) : 0;
          if (orderStatus === "Pending" || pIndex < 1) {
            setStatus("waiting");
          } else if (orderStatus === "Opened" || orderStatus === "Completed") {
            if (items.length > 0) {
              setStatus("has_items");
            } else {
              setStatus("no_items");
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching active order tracking status:", err);
    }
  };

  const handleToggleCheck = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allItemsChecked = items.length > 0 && items.every((item) => item.checked);

  const handleAdvancePosition = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const targetOrderId = activeProcessOrderId || initialProcessOrderId || 3221;
      const res = await axios.post(
        `${environment.API_BASE_URL}api/packing/advance-position`,
        { orderId: targetOrderId, rowId: rowId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        setAlertMessage(
          res.data.message || "Position advanced to next packer successfully."
        );
        setAlertVisible(true);
      }
    } catch (err) {
      console.error("Error advancing position index:", err);
      Alert.alert("Error", "Failed to advance position index.");
    }
  };

  // Helper toggle for manual testing
  const handleHeaderBadgePress = () => {
    if (status === "waiting") {
      setStatus("no_items");
    } else if (status === "no_items") {
      setStatus(items.length > 0 ? "has_items" : "waiting");
    } else {
      setStatus("waiting");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header displaying REAL invoice number */}
      <CustomHeader
        title={displayOrderTitle}
        navigation={navigation}
        onBackPress={() => navigation.navigate("SelectRow")}
        rightComponent={
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleHeaderBadgePress}
              className="px-2 py-1 rounded bg-slate-100"
              activeOpacity={0.7}
            >
              <Text className="text-[9px] font-bold text-slate-500 uppercase">
                {status === "waiting"
                  ? "Prev Pos"
                  : status === "no_items"
                  ? "No Items"
                  : "Has Items"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        className="flex-1 bg-white px-6"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: status === "has_items" ? "flex-start" : "center",
          paddingBottom: 100,
        }}
      >
        {/* Scheduled Time Section matching previous UI design */}
        <View className="mb-4 pt-2">
          <Text className="text-[#54617D] text-xs font-semibold uppercase tracking-wider mb-1">
            Scheduled Time
          </Text>
          <View className="flex-row items-center bg-[#FAFAFB] border border-[#E1E7EE] rounded-2xl px-4 py-3">
            <Feather name="clock" size={18} color="#030E25" style={{ marginRight: 10 }} />
            <Text className="text-[#030E25] font-extrabold text-sm">
              {scheduledTime}
            </Text>
          </View>
        </View>

        {/* STATE 1: Waiting for previous position */}
        {status === "waiting" && (
          <View className="items-center justify-center py-10">
            <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
              Please Wait
            </Text>
            <Text className="text-[#54617D] text-sm text-center mb-8 px-6 font-medium leading-5">
              This order is still with the{"\n"}previous position
            </Text>
            <View className="w-56 h-56 justify-center items-center">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}

        {/* STATE 2: Opened, but No items at this position -> SHOW SKIP SCREEN */}
        {status === "no_items" && (
          <View className="items-center justify-center py-10">
            <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
              No Items to Pack
            </Text>
            <Text className="text-[#54617D] text-sm text-center mb-8 px-6 font-medium leading-5">
              No items to pack for this order{"\n"}at your position
            </Text>
            <View className="w-56 h-56 justify-center items-center">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}

        {/* STATE 3: Has items assigned to this position */}
        {status === "has_items" && (
          <View className="pt-4">
            <Text className="text-[#54617D] text-xs font-semibold mb-4 uppercase tracking-wider">
              Items to pack
            </Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleToggleCheck(item.id)}
                className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm mb-4"
                activeOpacity={0.8}
              >
                {/* Product Image */}
                <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                  <Image
                    source={{ uri: item.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>

                {/* Details */}
                <View className="flex-1">
                  <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                    {item.name}
                  </Text>
                  <Text className="text-gray-900 font-bold text-sm mt-0.5">
                    {item.weight}
                  </Text>
                </View>

                {/* Checkbox */}
                <View
                  className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                    item.checked
                      ? "bg-[#980775] border-[#980775]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {item.checked && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Skip Button pinned to bottom when position has no items */}
      {status === "no_items" && (
        <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
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
        <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
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
          navigation.navigate("SelectRow");
        }}
      />
    </View>
  );
}
