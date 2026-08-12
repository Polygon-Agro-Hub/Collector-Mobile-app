import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  BackHandler,
} from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import { environment } from "@/environment/environment";
import { getSocket } from "@/services/socket";
import CustomHeader from "@/component/components/navigations/CustomHeader";

interface TargetOrder {
  id: number;
  orderNumber: string;
  type: "R" | "W";
  formattedOrderNumber: string;
  timeSlot: string;
  timeSlotLabel: string;
  category: string;
  rowName: string;
  status: "Pending" | "Opened" | "Out";
  statusLabel: string;
  hasNotification?: boolean;
}

const timeSlotMap: { [key: string]: string } = {
  "8-12": "08:00 AM - 12:00 PM",
  "12-16": "12:00 PM - 04:00 PM",
  "16-20": "04:00 PM - 08:00 PM",
  "4-9": "04:00 PM - 09:00 PM",
  "8-4": "08:00 AM - 04:00 PM",
  "12-4": "12:00 PM - 04:00 PM",
  "4-8": "04:00 PM - 08:00 PM",
};

export default function DistributionCenterTarget({
  navigation,
}: {
  navigation: any;
}) {
  const [activeTab, setActiveTab] = useState<"todo" | "out">("todo");
  const [todoOrders, setTodoOrders] = useState<TargetOrder[]>([]);
  const [outOrders, setOutOrders] = useState<TargetOrder[]>([]);
  const [hasData, setHasData] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCenterTargets();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCenterTargets();

    const socket = getSocket();
    const handleRealTimeUpdate = () => {
      fetchCenterTargets();
    };

    socket.on("target_updated", handleRealTimeUpdate);
    socket.on("order_opened", handleRealTimeUpdate);
    socket.on("position_index_updated", handleRealTimeUpdate);

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => {
      socket.off("target_updated", handleRealTimeUpdate);
      socket.off("order_opened", handleRealTimeUpdate);
      socket.off("position_index_updated", handleRealTimeUpdate);
      backHandler.remove();
    };
  }, [navigation]);

  const fetchCenterTargets = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
      if (!token) {
        setTodoOrders([]);
        setOutOrders([]);
        setHasData(false);
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/packing/center-target`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ).catch(() => null);

      if (
        response &&
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        const allOrders: TargetOrder[] = response.data.data.map((o: any) => {
          const slotLabel = timeSlotMap[o.timeSlot] || o.timeSlot;
          const isOutStatus = o.orderStatus === "Completed" || Number(o.minPIndex) >= 4;
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            type: o.type,
            formattedOrderNumber: o.formattedOrderNumber || `${o.orderNumber} (${o.type})`,
            timeSlot: o.timeSlot,
            timeSlotLabel: slotLabel,
            category: o.category || "Pickup Order",
            rowName: o.rowName || "Row 1",
            status: isOutStatus ? "Out" : o.orderStatus === "Opened" ? "Opened" : "Pending",
            statusLabel: isOutStatus
              ? `(${o.rowName || "Row 1"}) Out`
              : o.orderStatus === "Opened"
              ? `(${o.rowName || "Row 1"}) Opened`
              : `(${o.rowName || "Row 1"}) Pending`,
            hasNotification: o.hasNotification || false,
          };
        });

        const todo = allOrders.filter((o) => o.status !== "Out");
        const out = allOrders.filter((o) => o.status === "Out");

        setTodoOrders(todo);
        setOutOrders(out);
        setHasData(todo.length > 0 || out.length > 0);
      } else {
        setTodoOrders([]);
        setOutOrders([]);
        setHasData(false);
      }
    } catch (error) {
      console.error("Error fetching center targets:", error);
      setTodoOrders([]);
      setOutOrders([]);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate("Main", { screen: "DistridutionaDashboard" });
  };

  // Group orders by time slot label
  const groupOrdersByTimeSlot = (ordersList: TargetOrder[]) => {
    const groups: { [key: string]: TargetOrder[] } = {};
    ordersList.forEach((order) => {
      const key = order.timeSlotLabel;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });
    return groups;
  };

  const currentList = activeTab === "todo" ? todoOrders : outOrders;
  const groupedOrders = groupOrdersByTimeSlot(currentList);

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title="Centre Target"
        navigation={navigation}
        onBackPress={handleBack}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#980775" />
          <Text className="text-[#54617D] text-sm font-semibold mt-3">
            Loading targets...
          </Text>
        </View>
      ) : !hasData ? (
        /* Empty State Screen */
        <View className="flex-1 bg-white">
          <View className="items-center mt-6 mb-6 px-4">
            <Text className="text-sm font-medium text-[#54617D] text-center leading-relaxed">
              Please wait and check again.{"\n"}Your centre doesn't have a daily target yet.
            </Text>
          </View>

          <View className="flex-1 justify-center items-center my-auto pb-12">
            <View className="w-56 h-56 justify-center items-center">
              <LottieView
                source={require("../../../../assets/lottie/no-data.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Content List State */
        <View className="flex-1 bg-white">
          <View className="w-full max-w-[600px] mx-auto flex-1">
            {/* Pill Tabs Selector */}
            <View className="flex-row mx-6 gap-4 my-4">
              {/* To Do Tab */}
              <TouchableOpacity
                onPress={() => setActiveTab("todo")}
                className={`flex-1 h-[50px] rounded-full items-center justify-center ${
                  activeTab === "todo" ? "bg-[#030E25]" : "bg-[#E9ECF1]"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-extrabold text-sm ${
                    activeTab === "todo" ? "text-white" : "text-[#54617D]"
                  }`}
                >
                  To Do ({String(todoOrders.length).padStart(2, "0")})
                </Text>
              </TouchableOpacity>

              {/* Out Tab */}
              <TouchableOpacity
                onPress={() => setActiveTab("out")}
                className={`flex-1 h-[50px] rounded-full items-center justify-center ${
                  activeTab === "out" ? "bg-[#030E25]" : "bg-[#E9ECF1]"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-extrabold text-sm ${
                    activeTab === "out" ? "text-white" : "text-[#54617D]"
                  }`}
                >
                  Out ({String(outOrders.length).padStart(2, "0")})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {Object.keys(groupedOrders).length === 0 ? (
                <View
                  className="flex-1 justify-center items-center my-auto py-10"
                  style={{ minHeight: 300 }}
                >
                  <View className="w-48 h-48 justify-center items-center">
                    <LottieView
                      source={require("../../../../assets/lottie/no-data.json")}
                      autoPlay
                      loop
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                  <Text className="text-[#54617D] text-sm font-medium text-center mt-4">
                    {activeTab === "todo"
                      ? "No targets in To Do list."
                      : "No targets in Out list yet."}
                  </Text>
                </View>
              ) : (
                Object.entries(groupedOrders).map(([slotHeader, ordersGroup], groupIdx) => (
                  <View key={slotHeader} className="mb-6">
                    {/* Border line #ACB5BE extending to sides of screen before each time slot */}
                    <View className="h-[1px] bg-[#ACB5BE] -mx-6 mb-4" />

                    {/* Time Slot Section Header */}
                    <Text className="text-base font-extrabold text-slate-950 mb-3 tracking-tight">
                      {slotHeader} ({String(ordersGroup.length).padStart(2, "0")})
                    </Text>

                    {/* Order Cards */}
                    <View className="gap-3">
                      {ordersGroup.map((order, idx) => {
                        const formattedIndex = String(idx + 1).padStart(2, "0");
                        const isOut = activeTab === "out";

                        // Card Border & Status Color mapping
                        const cardBorderStyle = isOut
                          ? "border-[#980775] border-2"
                          : "border-gray-200 border";

                        const statusTextColor = isOut
                          ? "text-[#980775]"
                          : order.status === "Opened"
                          ? "text-[#F59E0B]"
                          : "text-[#FF5B5B]";

                        return (
                          <TouchableOpacity
                            key={`${order.id}-${idx}`}
                            onPress={() => {
                              if (isOut) {
                                navigation.navigate("OrderDetails", {
                                  orderId: order.id,
                                  orderNumber: order.orderNumber,
                                  formattedOrderNumber: order.formattedOrderNumber,
                                  timeSlotLabel: order.timeSlotLabel,
                                  category: order.category,
                                  statusLabel: order.statusLabel,
                                });
                              }
                            }}
                            activeOpacity={isOut ? 0.8 : 1}
                            className={`relative bg-white rounded-2xl p-4 shadow-sm flex-row items-center ${cardBorderStyle}`}
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >

                            {/* Left Circle Index Indicator */}
                            <View className="w-12 h-12 rounded-full bg-[#F3F4F6] items-center justify-center mr-4">
                              <Text className="font-extrabold text-base text-[#54617D]">
                                {formattedIndex}
                              </Text>
                            </View>

                            {/* Order Details */}
                            <View className="flex-1">
                              <Text className="font-extrabold text-slate-950 text-base">
                                {order.formattedOrderNumber}
                              </Text>
                              <Text className="text-sm font-bold text-slate-900 mt-0.5">
                                {order.timeSlotLabel}
                              </Text>
                              <Text className="text-xs text-[#54617D] mt-0.5 font-medium">
                                {order.category}
                              </Text>
                              <Text
                                className={`text-xs font-extrabold mt-0.5 ${statusTextColor}`}
                              >
                                {order.statusLabel}
                              </Text>
                            </View>

                            {/* Right Chevron for Out tab */}
                            {isOut && (
                              <Ionicons
                                name="chevron-forward"
                                size={20}
                                color="black"
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}
