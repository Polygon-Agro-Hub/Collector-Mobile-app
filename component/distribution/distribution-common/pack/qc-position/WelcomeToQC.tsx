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
} from "react-native";
import { Entypo, Feather, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import AlertModal from "@/component/commons/AlertModal";
import { getSocket } from "@/services/socket";

type QCStatus = "no_target" | "waiting" | "step1_no_items" | "step2_spices" | "step3_alacarte";

interface QCItem {
  id: number;
  name: string;
  weight: string;
  checked: boolean;
  image: string;
}

export default function WelcomeToQC({ route, navigation }: { route: any; navigation: any }) {
  const {
    orderNumber: initialOrderNumber,
    processOrderId: initialProcessOrderId,
    rowId,
  } = route.params || {};

  const [activeProcessOrderId, setActiveProcessOrderId] = useState<number | null>(
    initialProcessOrderId || null
  );
  const [displayOrderTitle, setDisplayOrderTitle] = useState<string>(
    initialOrderNumber || ""
  );

  // QC Page states: "no_target" | "waiting" | "step1_no_items" | "step2_spices" | "step3_alacarte"
  const [status, setStatus] = useState<QCStatus>("no_target");
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // Step 2 checklist state (Spices Pack)
  const [spicesItems, setSpicesItems] = useState<QCItem[]>([
    {
      id: 1,
      name: "Sri Lankan Yellow Lemon",
      weight: "0.5 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      name: "Turmeric",
      weight: "0.1 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
    },
  ]);

  // Step 3 checklist state (À la carte)
  const [alacarteItems, setAlacarteItems] = useState<QCItem[]>([
    {
      id: 3,
      name: "Sweet Potato",
      weight: "0.5 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1596003906949-67221c37965c?w=200&auto=format&fit=crop&q=80",
    },
  ]);

  useEffect(() => {
    fetchActiveOrderAndStatus();

    const onBackPress = () => {
      handleBack();
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

        const orderStatus = activeData.orderStatus;
        if (orderStatus === "Pending") {
          setStatus("waiting");
        } else if (orderStatus === "Opened") {
          setStatus("step1_no_items");
        } else if (orderStatus === "Completed") {
          setStatus("no_target");
        }
      }
    } catch (err) {
      console.error("Error fetching active order status in QC:", err);
    }
  };

  const handleToggleSpiceCheck = (id: number) => {
    setSpicesItems(
      spicesItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleToggleAlacarteCheck = (id: number) => {
    setAlacarteItems(
      alacarteItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allSpicesChecked = spicesItems.every((item) => item.checked);
  const allAlacarteChecked = alacarteItems.every((item) => item.checked);

  const handleBack = () => {
    if (status === "step3_alacarte") {
      setStatus("step2_spices");
    } else if (status === "step2_spices") {
      setStatus("step1_no_items");
    } else if (status === "step1_no_items") {
      setStatus("waiting");
    } else if (status === "waiting") {
      setStatus("no_target");
    } else {
      navigation.navigate("SelectRow");
    }
  };

  // Switcher to cycle states sequentially for mock/testing
  const handleCycleStatus = () => {
    if (status === "no_target") {
      setStatus("waiting");
    } else if (status === "waiting") {
      setStatus("step1_no_items");
    } else if (status === "step1_no_items") {
      setStatus("step2_spices");
    } else if (status === "step2_spices") {
      setStatus("step3_alacarte");
    } else {
      setStatus("no_target");
    }
  };

  const handleQCComplete = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const targetOrderId = activeProcessOrderId || initialProcessOrderId || 3221;
      const res = await axios.post(
        `${environment.API_BASE_URL}api/packing/qc-completed`,
        { orderId: targetOrderId, rowId: rowId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        setAlertMessage(
          res.data.message || "Order QC verified and marked as Completed successfully!"
        );
        setAlertVisible(true);
      }
    } catch (err) {
      console.error("Error completing QC order:", err);
      Alert.alert("Error", "Failed to mark order as completed.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Standard Custom Header */}
      <CustomHeader
        title={status !== "no_target" ? displayOrderTitle : ""}
        navigation={navigation}
        onBackPress={handleBack}
        rightComponent={
          <TouchableOpacity
            onPress={handleCycleStatus}
            className="px-3 py-1.5 rounded-full bg-[#E9ECF1]"
            activeOpacity={0.7}
          >
            <Text className="text-[10px] font-bold text-[#54617D] uppercase">
              {status}
            </Text>
          </TouchableOpacity>
        }
      />

      <View className="flex-1 px-6">
        {/* STATE 1: No Target Available */}
        {status === "no_target" && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
              Welcome to QC Position
            </Text>
            <Text className="text-[#54617D] text-sm text-center px-4 font-medium leading-5">
              Please wait and check again.{"\n"}This row doesn't have a daily target yet.
            </Text>
            <View className="w-64 h-64 justify-center items-center my-4">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}

        {/* STATE 2: Waiting for Previous Position */}
        {status === "waiting" && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
              Please Wait
            </Text>
            <Text className="text-[#54617D] text-sm text-center px-4 font-medium leading-5">
              This order is still with the{"\n"}previous position
            </Text>
            <View className="w-64 h-64 justify-center items-center my-4">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}

        {/* STATE 3: Step 1 - No items to pack */}
        {status === "step1_no_items" && (
          <View className="flex-1 justify-between py-6">
            <View className="items-center justify-center flex-1">
              <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
                No Items to Pack
              </Text>
              <Text className="text-[#54617D] text-sm text-center px-4 font-medium leading-5 mb-6">
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

            <TouchableOpacity
              onPress={() => setStatus("step2_spices")}
              className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg mb-4"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-base">Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATE 4: Step 2 - Spices Pack Items Checklist */}
        {status === "step2_spices" && (
          <View className="flex-1 justify-between py-4">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <Text className="text-[#54617D] text-xs font-semibold mb-4 uppercase tracking-wider">
                Items to pack (Spices Pack)
              </Text>
              {spicesItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleToggleSpiceCheck(item.id)}
                  className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm mb-4"
                  activeOpacity={0.8}
                >
                  <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                    <Image
                      source={{ uri: item.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                      {item.name}
                    </Text>
                    <Text className="text-gray-900 font-bold text-sm mt-0.5">
                      {item.weight}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                      item.checked
                        ? "bg-[#980775] border-[#980775]"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {allSpicesChecked && (
              <TouchableOpacity
                onPress={() => setStatus("step3_alacarte")}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg my-4"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* STATE 5: Step 3 - À la carte Items Checklist */}
        {status === "step3_alacarte" && (
          <View className="flex-1 justify-between py-4">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <Text className="text-[#54617D] text-xs font-semibold mb-4 uppercase tracking-wider">
                Items to pack (À la carte)
              </Text>
              {alacarteItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleToggleAlacarteCheck(item.id)}
                  className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm mb-4"
                  activeOpacity={0.8}
                >
                  <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                    <Image
                      source={{ uri: item.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                      {item.name}
                    </Text>
                    <Text className="text-gray-900 font-bold text-sm mt-0.5">
                      {item.weight}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                      item.checked
                        ? "bg-[#980775] border-[#980775]"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {allAlacarteChecked && (
              <TouchableOpacity
                onPress={handleQCComplete}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg my-4"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* AlertModal Success Popup */}
      <AlertModal
        visible={alertVisible}
        type="success"
        title="Success"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          navigation.navigate("Main", { screen: "DistridutionaDashboard" });
        }}
      />
    </View>
  );
}
