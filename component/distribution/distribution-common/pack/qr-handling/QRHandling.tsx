import { useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

interface OrderData {
  id: number;
  orderNumber: string;
  type: "R" | "W"; // R = Retail, W = Wholesale
  timeSlot: string;
  category: string;
}

export default function QRHandling({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
  const [todoOrders, setTodoOrders] = useState<OrderData[]>([]);
  const [doneOrders, setDoneOrders] = useState<OrderData[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  // Time slot code mapping helpers
  const timeSlotMap: { [key: string]: string } = {
    "8-12": "08:00 AM - 12:00 PM",
    "12-4": "12:00 PM - 04:00 PM",
    "4-9": "04:00 PM - 09:00 PM"
  };

  useEffect(() => {
    fetchOrders();

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(`${environment.API_BASE_URL}api/packing/qr-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const allOrders = response.data.data.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          type: o.type,
          timeSlot: timeSlotMap[o.timeSlot] || o.timeSlot,
          category: o.category,
          packagesCount: (o.packagesList && o.packagesList.length > 0) ? o.packagesList.length : (o.packagesCount || 0),
          alacarteCount: o.alacarteCount || 0,
          packagesList: o.packagesList || [],
        }));

        const todo = allOrders.filter((o: any) => {
          const raw = response.data.data.find((item: any) => item.id === o.id);
          return raw.orderStatus !== 'Completed';
        });

        const done = allOrders.filter((o: any) => {
          const raw = response.data.data.find((item: any) => item.id === o.id);
          return raw.orderStatus === 'Completed';
        });

        setTodoOrders(todo);
        setDoneOrders(done);
        setHasData(todo.length > 0 || done.length > 0);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch orders.");
      }
    } catch (error) {
      console.error("Error fetching QR orders:", error);
      Alert.alert("Error", "An error occurred while fetching QR orders.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header bar matching SelectRow design */}
      <View className="flex-row items-center justify-between px-5 pt-4 bg-white">
        {/* Back Button matching CustomHeader */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
          style={{ alignItems: "flex-start" }}
          activeOpacity={0.7}
        >
          <Entypo
            name="chevron-left"
            size={25}
            color="black"
            style={{
              borderRadius: 50,
              padding: 12,
              backgroundColor: "#F6F6F680",
            }}
          />
        </TouchableOpacity>

      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#980775" />
          <Text className="text-[#54617D] text-sm font-semibold mt-3">Loading orders...</Text>
        </View>
      ) : !hasData ? (
        /* SCREEN 1: No Data State */
        <View className="flex-1 bg-white">
          {/* Header Title section */}
          <View className="items-center mt-5 mb-5 px-4">
            <Text className="text-xl font-bold text-slate-950 text-center">
              Welcome to QR Handling
            </Text>
            <Text className="text-[#54617D] text-sm text-center mt-1">
              Please wait and check again.{"\n"}This row doesn't have a daily
              target yet.
            </Text>
          </View>

          {/* Lottie animation container centered in the remaining space */}
          <View className="flex-1 justify-center items-center">
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
      ) : (
        /* SCREEN 2 & 3: List State */
        <View className="flex-1 bg-white">
          {/* Header Title section */}
          <View className="items-center mt-5 mb-5 px-4">
            <Text className="text-xl font-bold text-slate-950">
              Welcome to QR Handling
            </Text>
            <Text className="text-[#54617D] text-sm mt-1">
              Tap the order to print it.
            </Text>
          </View>

          {/* Pill Tabs Selector */}
          <View className="flex-row mx-4 gap-4 mb-6">
            {/* To Do Tab */}
            <TouchableOpacity
              onPress={() => setActiveTab("todo")}
              className={`flex-1 h-[50px] rounded-full items-center justify-center ${
                activeTab === "todo" ? "bg-black" : "bg-[#E9ECF1]"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-bold text-sm ${
                  activeTab === "todo" ? "text-white" : "text-[#54617D]"
                }`}
              >
                To Do ({String(todoOrders.length).padStart(2, "0")})
              </Text>
            </TouchableOpacity>

            {/* Done Tab */}
            <TouchableOpacity
              onPress={() => setActiveTab("done")}
              className={`flex-1 h-[50px] rounded-full items-center justify-center ${
                activeTab === "done" ? "bg-black" : "bg-[#E9ECF1]"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-bold text-sm ${
                  activeTab === "done" ? "text-white" : "text-[#54617D]"
                }`}
              >
                Done ({String(doneOrders.length).padStart(2, "0")})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 bg-white px-6"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {activeTab === "todo" ? (
              <View className="gap-4">
                {todoOrders.map((order, idx) => {
                  const isTop = idx === 0;
                  const formattedIndex = String(idx + 1).padStart(2, "0");

                  // Focused styling for top card, default styling for others
                  const cardBorderColor = isTop
                    ? "border-[#980775] border-2"
                    : "border-gray-100 border";
                  const indexBgColor = isTop
                    ? "bg-[#980775]"
                    : "bg-slate-50 border-gray-100 border";
                  const indexTextColor = isTop
                    ? "text-white"
                    : "text-slate-800";

                  return (
                    <TouchableOpacity
                      key={order.id}
                      onPress={() => {
                        if (isTop) {
                          const nextOrder = todoOrders[idx + 1];
                          navigation.navigate("ReadyToPrint", {
                            processOrderId: order.id,
                            orderNumber: `${order.orderNumber} (${order.type})`,
                            invoiceNumber: order.orderNumber,
                            category: order.category,
                            packagesCount: (order as any).packagesCount || 0,
                            alacarteCount: (order as any).alacarteCount || 0,
                            packagesList: (order as any).packagesList || [],
                            nextOrderNumber: nextOrder
                              ? `${nextOrder.orderNumber} (${nextOrder.type})`
                              : null,
                            nextTimeSlot: nextOrder
                              ? timeSlotMap[nextOrder.timeSlot] || nextOrder.timeSlot
                              : null,
                            nextCategory: nextOrder
                              ? nextOrder.category
                              : null,
                          });
                        }
                      }}
                      className={`flex-row items-center bg-white rounded-2xl p-4 shadow-sm ${cardBorderColor}`}
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                      activeOpacity={0.8}
                    >
                      {/* Circle Indicator */}
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${indexBgColor}`}
                      >
                        <Text
                          className={`font-bold text-base ${indexTextColor}`}
                        >
                          {formattedIndex}
                        </Text>
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <Text className="font-bold text-slate-950 text-base">
                          {order.orderNumber} ({order.type})
                        </Text>
                        <Text className="text-sm font-bold text-slate-900 mt-0.5">
                          {order.timeSlot}
                        </Text>
                        <Text className="text-xs text-[#54617D] mt-0.5">
                          {order.category}
                        </Text>
                      </View>

                      {/* Chevron Right */}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="black"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="gap-4">
                {doneOrders.map((order, idx) => {
                  const formattedIndex = String(idx + 1).padStart(2, "0");

                  // Done list: all cards are highlighted with purple/magenta border and index circle
                  const cardBorderColor = "border-[#980775] border-2";
                  const indexBgColor = "bg-[#980775]";
                  const indexTextColor = "text-white";

                  return (
                    <TouchableOpacity
                      key={order.id}
                      className={`flex-row items-center bg-white rounded-2xl p-4 shadow-sm ${cardBorderColor}`}
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                      activeOpacity={0.8}
                    >
                      {/* Circle Indicator */}
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${indexBgColor}`}
                      >
                        <Text
                          className={`font-bold text-base ${indexTextColor}`}
                        >
                          {formattedIndex}
                        </Text>
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <Text className="font-bold text-slate-950 text-base">
                          {order.orderNumber} ({order.type})
                        </Text>
                        <Text className="text-sm font-bold text-slate-900 mt-0.5">
                          {order.timeSlot}
                        </Text>
                        <Text className="text-xs text-[#54617D] mt-0.5">
                          {order.category}
                        </Text>
                      </View>

                      {/* Chevron Right */}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="black"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
