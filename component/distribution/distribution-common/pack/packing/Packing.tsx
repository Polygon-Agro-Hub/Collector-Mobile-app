import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { EndShiftHeaderRight, EndShiftModal } from "@/component/components/navigations/EndShiftModal";
import LottieView from "lottie-react-native";
import axios from "axios";
import environment from "@/environment/environment";
import { getSocket } from "@/services/socket";
import AlertModal from "@/component/components/popup/AlertModal";
import LoadingPage from "@/component/components/loading/LoadingPage";
import { useDispatch } from "react-redux";
import { clearActiveAssignment } from "../../../../../store/authSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  TIME_SLOTS,
  formatTimeSlot,
} from "@/constants/packing/time-slots";
import { PACKING_ERROR_CODES } from "@/constants/packing/error-codes";
import { PackingStatus } from "@/constants/packing/status-types";

const formatWeightDisplay = (weightStr: string) => {
  if (!weightStr) return weightStr;
  const match = weightStr.trim().match(/^([\d.]+)\s*(.*)$/);
  if (!match) return weightStr;
  const numVal = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(numVal)) return weightStr;
  return `${numVal} ${unit}`.trim();
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

export default function Packing({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const dispatch = useDispatch();
  const {
    orderNumber: initialOrderNumber,
    processOrderId: initialProcessOrderId,
    positionId,
    positionName = "Packing Position 1",
    rowId,
  } = route.params || {};
  const insets = useSafeAreaInsets();

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
  const [activeTrackingId, setActiveTrackingId] = useState<number | null>(null);

  const [status, setStatus] = useState<PackingStatus>("no_target");
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [endShiftModalVisible, setEndShiftModalVisible] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setItems([]);
    await fetchActiveOrderAndStatus(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchActiveOrderAndStatus(true);

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    const socket = getSocket();
    if (rowId) {
      socket.emit("join_row", rowId);
    }

    const handleOrderUpdate = () => {
      fetchActiveOrderAndStatus(false);
    };

    socket.on("order_opened", handleOrderUpdate);
    socket.on("position_index_updated", handleOrderUpdate);
    socket.on("order_completed", handleOrderUpdate);

    const handlePositionFreed = async (payload: { positionId: number }) => {
      try {
        const activeAssignmentStr = (store.getState().auth.activeAssignment ? JSON.stringify(store.getState().auth.activeAssignment) : null);
        if (activeAssignmentStr) {
          const activeAssignment = JSON.parse(activeAssignmentStr);
          if (Number(activeAssignment.positionId) === Number(payload.positionId)) {
            store.dispatch(clearActiveAssignment());
            dispatch(clearActiveAssignment());
            Alert.alert("Position Released", "Your position has been released by the manager.");
            navigation.reset({ index: 0, routes: [{ name: "SelectRow" }] });
          }
        }
      } catch (err) {
        console.error("Error handling position freed:", err);
      }
    };
    socket.on("position_freed", handlePositionFreed);

    return () => {
      backHandler.remove();
      socket.off("order_opened", handleOrderUpdate);
      socket.off("position_index_updated", handleOrderUpdate);
      socket.off("order_completed", handleOrderUpdate);
      socket.off("position_freed", handlePositionFreed);
    };
  }, [positionId, rowId]);

  const fetchActiveOrderAndStatus = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = store.getState().auth.token;
      if (!token) return;

      const activeRes = await axios.get(
        `${environment.API_BASE_URL}api/packing/packer/active-order`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (activeRes.data && activeRes.data.success && activeRes.data.data) {
        const activeData = activeRes.data.data;

        if (activeData.hasActiveBox === false) {
          if (activeData.rowStatus === "WAITING_PREVIOUS" || activeData.processOrderId) {
            if (activeData.formattedOrderNumber) {
              setDisplayOrderTitle(activeData.formattedOrderNumber);
            }
            if (activeData.processOrderId) {
              setActiveProcessOrderId(activeData.processOrderId);
            }
            setStatus("waiting");
            setItems([]);
          } else {
            setStatus("no_target");
            setItems([]);
            setActiveProcessOrderId(null);
            setDisplayOrderTitle("");
          }
        } else {
          if (activeData.formattedOrderNumber) {
            setDisplayOrderTitle(activeData.formattedOrderNumber);
          }
          if (activeData.processOrderId) {
            setActiveProcessOrderId(activeData.processOrderId);
          }
          setActiveOrderPackageId(activeData.activeOrderPackageId || null);
          setActiveTrackingId(activeData.trackingId ? Number(activeData.trackingId) : null);
          if (activeData.timeSlot) {
            setScheduledTime(formatTimeSlot(activeData.timeSlot));
          }

          const orderStatus = activeData.orderStatus;
          const pIndex = activeData.pIndex !== undefined ? Number(activeData.pIndex) : 0;
          setCurrentPIndex(pIndex);

          const officerPosIndex = activeData.officerPosIndex !== undefined ? Number(activeData.officerPosIndex) : 1;

          if (orderStatus === "Pending") {
            setStatus("waiting");
            setItems([]);
          } else if (pIndex > 0 && pIndex !== officerPosIndex) {
            setStatus("waiting");
            setItems([]);
          } else if (orderStatus === "Opened" || orderStatus === "Completed") {
            const isMainContainerBox = activeData.isMainContainerBox === true || Number(activeData.activeOrderPackageId) === -1;
            if (isMainContainerBox) {
              setItems([]);
              setStatus("main_container");
            } else {
              const orderItems = activeData.orderItems || [];
              if (orderItems.length > 0) {
                const mappedItems = orderItems.map((item: any) => {
                  const resolvedPackName = item.packName && item.packName !== "À la carte" ? item.packName : (item.categoryType === "alacarte" ? "À la carte" : "Daily Veggie Pack");
                  const isAlacarte = resolvedPackName === "À la carte";
                  return {
                    id: item.id,
                    name: item.name,
                    weight: formatWeightDisplay(item.weight || "1.0 kg"),
                    packName: resolvedPackName,
                    categoryType: isAlacarte ? "alacarte" : "package",
                    checked: false,
                    image: item.image || "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
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
          }
        }
      } else {
        setStatus("no_target");
        setItems([]);
        setActiveProcessOrderId(null);
        setDisplayOrderTitle("");
      }
    } catch (err) {
      console.error("Error fetching active order tracking status:", err);
      setStatus("no_target");
      setItems([]);
      setDisplayOrderTitle("");
    } finally {
      if (showLoading) setLoading(false);
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
    if (isAdvancing) return;
    setIsAdvancing(true);
    try {
      const token = store.getState().auth.token;
      const targetOrderId = activeProcessOrderId || initialProcessOrderId || 3221;
      const payload = {
        orderId: targetOrderId,
        orderpackageId: activeOrderPackageId || null,
        currentPIndex: currentPIndex || 1,
        rowId: rowId,
        trackingId: activeTrackingId || null,
      };

      const res = await axios.post(
        `${environment.API_BASE_URL}api/packing/advance-position`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data && res.data.success) {
        setAlertMessage("Packing has been completed successfully. Move to the next position.");
        setAlertVisible(true);
      } else if (res.data && !res.data.success) {
        Alert.alert("Station Busy", res.data.message || "The next station is currently busy.");
        setIsAdvancing(false);
      } else {
        setIsAdvancing(false);
      }
    } catch (err) {
      console.error("Error advancing position index:", err);
      Alert.alert("Error", "Failed to advance position index.");
      setIsAdvancing(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={status !== "no_target" ? displayOrderTitle : ""}
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
        rightComponent={<EndShiftHeaderRight onPress={() => setEndShiftModalVisible(true)} />}
      />

      {loading ? (
        <View className="flex-1 bg-white">
          <LoadingPage />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1 bg-white px-6"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent:
                status === "has_items" || status === "main_container"
                  ? "flex-start"
                  : "center",
              paddingBottom: 130,
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
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

            {/* STATE 1: No Target Available */}
            {status === "no_target" && (
              <View className="flex-1">
                <View className="items-center mt-4 mb-2">
                  <Text className="text-[#030E25] font-extrabold text-xl text-center mb-2">
                    Welcome to {positionName || "Packing Position 1"}
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

            {/* STATE 2: Waiting for previous position / QR scan */}
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

            {(status === "no_items" || status === "main_container") && (
              <View className="flex-1">
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

            {status === "has_items" && (
              <View className="pt-1">
                {items.map((item, index) => {
                  const isAlacarte = item.categoryType === "alacarte" || item.packName === "À la carte";
                  const packColor = isAlacarte ? "text-[#AC7F5E]" : "text-[#980775]";

                  return (
                    <TouchableOpacity
                      key={`${item.id}_${index}`}
                      onPress={() => handleToggleCheck(item.id)}
                      activeOpacity={0.8}
                      className="flex-row items-center justify-between bg-white border border-[#E9ECF1] rounded-2xl p-4 mb-3.5 shadow-sm"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.02,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <View className="w-16 h-16 rounded-xl items-center justify-center mr-3.5 overflow-hidden">
                        <Image
                          source={{ uri: item.image }}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text className="text-[#030E25] font-semibold text-base leading-5">
                          {item.name}
                        </Text>
                        <Text className="text-[#030E25] font-semibold text-lg mt-0.5">
                          {item.weight}
                        </Text>
                        <Text className={`text-xs font-bold ${packColor} mb-0.5`}>
                          {item.packName || ""}
                        </Text>
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
                  );
                })}
              </View>
            )}
          </ScrollView>

          {(status === "no_items" || status === "main_container") && (
            <View className="px-6 pt-3 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16 }}>
              <TouchableOpacity
                onPress={handleAdvancePosition}
                disabled={isAdvancing || loading}
                className={`w-full h-[50px] rounded-full items-center justify-center ${isAdvancing || loading ? "bg-gray-400" : "bg-black"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                }}
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

          {status === "has_items" && allItemsChecked && (
            <View className="px-6 pt-3 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16 }}>
              <TouchableOpacity
                onPress={handleAdvancePosition}
                disabled={isAdvancing || loading}
                className={`w-full h-[50px] rounded-full items-center justify-center ${isAdvancing || loading ? "bg-gray-400" : "bg-black"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                }}
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
        </>
      )}

      <EndShiftModal
        visible={endShiftModalVisible}
        onClose={() => setEndShiftModalVisible(false)}
        navigation={navigation}
        positionText={positionName}
        rowText={rowId ? `Row ${rowId}` : undefined}
      />

      <AlertModal
        visible={alertVisible}
        type="success"
        title="Success"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          setIsAdvancing(false);
          setItems([]);
          fetchActiveOrderAndStatus(true);
        }}
      />
    </View>
  );
}
