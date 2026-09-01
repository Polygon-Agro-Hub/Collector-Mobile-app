import store from "@/services/reducxStore";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  BackHandler,
} from "react-native";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import environment from "@/environment/environment";
import { getSocket } from "@/services/socket";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { EndShiftHeaderRight, EndShiftModal } from "@/component/components/navigations/EndShiftModal";
import LoadingPage from "@/component/components/loading/LoadingPage";
import { useDispatch } from "react-redux";
import { clearActiveAssignment } from "../../../../../store/authSlice";
import { usePrinter } from "@/services/printer/usePrinter";
import { PrinterSelectModal } from "@/component/components/popup/PrinterSelectModal";
import {
  formatTimeSlot,
  getTimeSlotPriority,
} from "@/constants/packing/time-slots";

interface OrderData {
  id: number;
  orderNumber: string;
  type: "R" | "W"; // R = Retail, W = Wholesale
  timeSlot: string;
  category: string;
}

export default function QRHandling({ navigation }: { navigation: any }) {
  const dispatch = useDispatch();
  const [rowId, setRowId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
  const [todoOrders, setTodoOrders] = useState<OrderData[]>([]);
  const [doneOrders, setDoneOrders] = useState<OrderData[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [endShiftModalVisible, setEndShiftModalVisible] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);

  // Bluetooth Printer Hook
  const {
    discoveredDevices,
    connectedDevice,
    isScanning,
    isConnecting,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
  } = usePrinter();

  const handleOpenPrinterModal = () => {
    setIsPrinterModalOpen(true);
    startScan();
  };

  const handleSelectPrinter = async (device: any) => {
    const success = await connectToDevice(device);
    if (success) {
      setIsPrinterModalOpen(false);
      Alert.alert(
        "Printer Connected",
        `Connected to ${device.displayName || device.name}`
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };


  useEffect(() => {
    const loadAssignmentAndJoinRoom = async () => {
      try {
        const activeAssignmentStr = (store.getState().auth.activeAssignment ? JSON.stringify(store.getState().auth.activeAssignment) : null);
        if (activeAssignmentStr) {
          const activeAssignment = JSON.parse(activeAssignmentStr);
          if (activeAssignment.rowId) {
            const parsedRowId = Number(activeAssignment.rowId);
            setRowId(parsedRowId);
            const socket = getSocket();
            socket.emit("join_row", parsedRowId);
          }
        }
      } catch (err) {
        console.error("Error loading assignment in QRHandling:", err);
      }
    };

    loadAssignmentAndJoinRoom();
    fetchOrders();

    const socket = getSocket();
    const handleRealTimeUpdate = () => {
      fetchOrders();
    };

    socket.on("order_opened", handleRealTimeUpdate);
    socket.on("position_index_updated", handleRealTimeUpdate);
    socket.on("target_updated", handleRealTimeUpdate);

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

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => {
      socket.off("order_opened", handleRealTimeUpdate);
      socket.off("position_index_updated", handleRealTimeUpdate);
      socket.off("target_updated", handleRealTimeUpdate);
      socket.off("position_freed", handlePositionFreed);
      backHandler.remove();
    };
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
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
          timeSlot: formatTimeSlot(o.timeSlot),
          category: o.category,
          date: o.date,
          packagesCount: (o.packagesList && o.packagesList.length > 0) ? o.packagesList.length : (o.packagesCount || 0),
          alacarteCount: o.alacarteCount || 0,
          packagesList: o.packagesList || [],
          trackingRows: o.trackingRows || [],
        }));

        const todo = allOrders.filter((o: any) => {
          const raw = response.data.data.find((item: any) => item.id === o.id);
          const minPIndex = raw ? Number(raw.minPIndex || 0) : 0;
          return minPIndex === 0 && raw.orderStatus !== 'Completed';
        });

        // Sort To Do orders by time slot priority (8-12 AM first, 12-4 PM second, 4-9 PM third)
        todo.sort((a: any, b: any) => {
          const rawA = response.data.data.find((item: any) => item.id === a.id);
          const rawB = response.data.data.find((item: any) => item.id === b.id);
          const pA = getTimeSlotPriority(rawA?.timeSlot, a.timeSlot);
          const pB = getTimeSlotPriority(rawB?.timeSlot, b.timeSlot);
          if (pA !== pB) {
            return pA - pB;
          }
          return a.id - b.id;
        });

        const done = allOrders.filter((o: any) => {
          const raw = response.data.data.find((item: any) => item.id === o.id);
          const minPIndex = raw ? Number(raw.minPIndex || 0) : 0;
          return minPIndex > 0 || raw.orderStatus === 'Completed';
        }).reverse();

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
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
        rightComponent={<EndShiftHeaderRight onPress={() => setEndShiftModalVisible(true)} />}
      />

      {/* Bluetooth Thermal Printer Connect / Disconnect Status Banner */}
      <View
        style={{
          backgroundColor: connectedDevice ? "#F0FDF4" : "#FEF2F2",
          borderWidth: 1,
          borderColor: connectedDevice ? "#BBF7D0" : "#FECACA",
          borderRadius: 16,
          paddingVertical: 10,
          paddingHorizontal: 14,
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 8 }}>
          <MaterialCommunityIcons
            name={connectedDevice ? "printer-check" : "printer-off"}
            size={22}
            color={connectedDevice ? "#16A34A" : "#DC2626"}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: connectedDevice ? "#14532D" : "#991B1B",
              }}
              numberOfLines={1}
            >
              {connectedDevice ? (connectedDevice.displayName || connectedDevice.name) : "No Thermal Printer Connected"}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: connectedDevice ? "#166534" : "#B91C1C",
              }}
            >
              {connectedDevice ? "Bluetooth Ready (50x30mm TSPL)" : "Tap to connect Bluetooth printer"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleOpenPrinterModal}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: connectedDevice ? "#16A34A" : "#030E25",
            borderRadius: 14,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
            {connectedDevice ? "Change" : "Connect"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center bg-white">
          <LoadingPage message="Loading orders..." fullScreen />
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
                To Do ({todoOrders.length === 0 ? "0" : String(todoOrders.length).padStart(2, "0")})
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
                Done ({doneOrders.length === 0 ? "0" : String(doneOrders.length).padStart(2, "0")})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 bg-white px-6"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {activeTab === "todo" ? (
              todoOrders.length === 0 ? (
                <View
                  className="flex-1 justify-center items-center my-auto py-10"
                  style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 320 }}
                >
                  <View className="w-48 h-48 justify-center items-center">
                    <LottieView
                      source={require("../../../../../assets/lottie/no-data.json")}
                      autoPlay
                      loop
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                  <Text className="text-[#54617D] text-sm font-medium text-center mt-4">
                    No orders to print in To Do list.
                  </Text>
                </View>
              ) : (
                <View className="gap-4 pb-12">
                  {todoOrders.map((order, idx) => {
                    const isTop = idx === 0;
                    const formattedIndex = String(idx + 1).padStart(2, "0");

                    // Focused styling for top card, white card with #E1E7EE border without shadow for disabled cards
                    const cardBorderColor = isTop
                      ? "border-[#980775] border-2"
                      : "border-[#E1E7EE] border";
                    const indexBgColor = isTop
                      ? "bg-[#980775]"
                      : "bg-[#E9ECF1]";
                    const indexTextColor = isTop
                      ? "text-white"
                      : "text-[#54617D]";

                    return (
                      <TouchableOpacity
                        key={order.id}
                        disabled={!isTop}
                        onPress={() => {
                          if (isTop) {
                            const nextOrder = todoOrders[idx + 1];
                            navigation.navigate("ReadyToPrint", {
                              processOrderId: order.id,
                              orderNumber: `${order.orderNumber} (${order.type})`,
                              invoiceNumber: order.orderNumber,
                              timeSlot: order.timeSlot,
                              category: order.category,
                              date: (order as any).date,
                              packagesCount: (order as any).packagesCount || 0,
                              alacarteCount: (order as any).alacarteCount || 0,
                              packagesList: (order as any).packagesList || [],
                              rowId: rowId,
                              nextOrderNumber: nextOrder
                                ? `${nextOrder.orderNumber} (${nextOrder.type})`
                                : null,
                              nextTimeSlot: nextOrder
                                ? formatTimeSlot(nextOrder.timeSlot)
                                : null,
                              nextCategory: nextOrder
                                ? nextOrder.category
                                : null,
                            });
                          }
                        }}
                        className={`flex-row items-center bg-white rounded-2xl p-4 ${cardBorderColor}`}
                        style={{
                          backgroundColor: "#ffffff",
                          shadowColor: "#000000",
                          shadowOffset: { width: 0, height: isTop ? 4 : 0 },
                          shadowOpacity: isTop ? 0.15 : 0,
                          shadowRadius: isTop ? 6 : 0,
                          elevation: isTop ? 4 : 0,
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
                          <Text
                            className={`font-bold text-base text-[#030E25]`}
                          >
                            {order.orderNumber} ({order.type})
                          </Text>
                          <Text
                            className={`text-sm font-bold mt-0.5 text-[#030E25]`}
                          >
                            {order.timeSlot}
                          </Text>
                          <Text
                            className={`text-xs mt-0.5 "text-[#676771]`}
                          >
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
              )
            ) : (
              doneOrders.length === 0 ? (
                <View
                  className="flex-1 justify-center items-center my-auto py-10"
                  style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 320 }}
                >
                  <View className="w-48 h-48 justify-center items-center">
                    <LottieView
                      source={require("../../../../../assets/lottie/no-data.json")}
                      autoPlay
                      loop
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                  <Text className="text-[#54617D] text-sm font-medium text-center mt-4">
                    No completed orders in Done list yet.
                  </Text>
                </View>
              ) : (
                <View className="gap-4 pb-8">
                  {doneOrders.map((order, idx) => {
                    const formattedIndex = String(idx + 1).padStart(2, "0");

                    // Done list: all cards are highlighted with purple/magenta border and index circle
                    const cardBorderColor = "border-[#980775] border-2";
                    const indexBgColor = "bg-[#980775]";
                    const indexTextColor = "text-white";

                    return (
                      <TouchableOpacity
                        key={order.id}
                        onPress={() => {
                          navigation.navigate("ReadyToPrint", {
                            processOrderId: order.id,
                            orderNumber: `${order.orderNumber} (${order.type})`,
                            invoiceNumber: order.orderNumber,
                            timeSlot: order.timeSlot,
                            category: order.category,
                            date: (order as any).date,
                            packagesCount: (order as any).packagesCount || 0,
                            alacarteCount: (order as any).alacarteCount || 0,
                            packagesList: (order as any).packagesList || [],
                            isReprint: true,
                            buttonLabel: "Start Again",
                          });
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
              )
            )}
          </ScrollView>
        </View>
      )}

      <EndShiftModal
        visible={endShiftModalVisible}
        onClose={() => setEndShiftModalVisible(false)}
        navigation={navigation}
        positionText="QR Position"
      />

      {/* Bluetooth Printer Select / Connect / Disconnect Modal */}
      <PrinterSelectModal
        visible={isPrinterModalOpen}
        onClose={() => {
          setIsPrinterModalOpen(false);
          stopScan();
        }}
        devices={discoveredDevices}
        isScanning={isScanning}
        isConnecting={isConnecting}
        connectedDevice={connectedDevice}
        onStartScan={startScan}
        onSelectDevice={handleSelectPrinter}
        onDisconnect={disconnect}
      />
    </View>
  );
}
