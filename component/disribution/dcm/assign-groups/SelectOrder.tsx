import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

interface OrderItem {
  id: string;
  orderId: string;
  type: "pickup" | "delivery";
  subtitle: string; // "Pickup Order" or location name
  checked: boolean;
}

export default function SelectOrder({ route, navigation }: { route: any; navigation: any }) {
  const { group, type = "Retail" } = route.params || {
    group: { id: 1, timeSlot: "08:00 AM - 12:00 PM", ordersLeft: 20 },
    type: "Retail",
  };

  const isRetail = type.toLowerCase() === "retail";
  const totalCount = group.ordersLeft;

  // Initialize mockup lists based on Retail (20 orders: 4 pickup, 16 delivery) or Wholesale (100 orders: 20 pickup, 80 delivery)
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchOrders();
  }, [group.timeSlotCode, type]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/packing/groups/orders?timeSlotCode=${group.timeSlotCode}&type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.success) {
        const list = response.data.data.map((item: any) => ({
          id: String(item.id),
          orderId: item.orderId,
          type: item.type,
          subtitle: item.subtitle,
          checked: false
        }));
        setOrders(list);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch orders.");
      }
    } catch (error) {
      console.error("Error fetching unassigned orders:", error);
      Alert.alert("Error", "An error occurred while fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  const pickupCount = orders.filter((o) => o.type === "pickup").length;
  const deliveryCount = orders.filter((o) => o.type === "delivery").length;

  const checkedCount = orders.filter((o) => o.checked).length;
  const allChecked = orders.length > 0 && orders.every((o) => o.checked);

  // Group helpers
  const pickupOrders = orders.filter((o) => o.type === "pickup");
  const deliveryOrders = orders.filter((o) => o.type === "delivery");

  const allPickupChecked = pickupOrders.length > 0 && pickupOrders.every((o) => o.checked);
  const allDeliveryChecked = deliveryOrders.length > 0 && deliveryOrders.every((o) => o.checked);

  // Toggle handlers
  const handleToggleAll = () => {
    const targetState = !allChecked;
    setOrders(orders.map((o) => ({ ...o, checked: targetState })));
  };

  const handleTogglePickupAll = () => {
    const targetState = !allPickupChecked;
    setOrders(
      orders.map((o) => (o.type === "pickup" ? { ...o, checked: targetState } : o))
    );
  };

  const handleToggleDeliveryAll = () => {
    const targetState = !allDeliveryChecked;
    setOrders(
      orders.map((o) => (o.type === "delivery" ? { ...o, checked: targetState } : o))
    );
  };

  const handleToggleItem = (id: string) => {
    setOrders(orders.map((o) => (o.id === id ? { ...o, checked: !o.checked } : o)));
  };

  const handleDeselectAll = () => {
    setOrders(orders.map((o) => ({ ...o, checked: false })));
  };

  const handleContinue = () => {
    const selectedOrderIds = orders.filter((o) => o.checked).map((o) => Number(o.id));
    if (selectedOrderIds.length === 0) return;
    navigation.navigate("SelectRowToAssign", {
      selectedOrdersCount: selectedOrderIds.length,
      selectedOrderIds: selectedOrderIds,
      group: group,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header with absolutely centered titles */}
      <CustomHeader
        title={group.timeSlot}
        navigation={navigation}
      />

      {/* Order count positioned after custom header */}
      <View className="items-center -mt-6 pb-2 bg-white">
        <Text className="text-xs text-[#980775]">
          <Text className="font-bold">{isRetail ? "Retail" : "Wholesale"} {totalCount} </Text>
          <Text className="font-normal">Orders</Text>
        </Text>
      </View>

      {loading ? (
        <View className="flex-grow justify-center items-center py-20" style={{ flex: 1 }}>
          <ActivityIndicator size="large" color="#980775" />
          <Text className="text-[#54617D] text-sm mt-3 font-semibold">Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
        {/* Master Checkbox Section */}
        <TouchableOpacity
          onPress={handleToggleAll}
          activeOpacity={0.8}
          className="flex-row items-center px-6 py-3"
        >
          <View
            className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-3 ${
              allChecked ? "bg-[#980775] border-[#980775]" : "border-[#000000] bg-white"
            }`}
          >
            {allChecked && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text className="text-[#030E25] font-extrabold text-base">
            All {totalCount} Orders
          </Text>
        </TouchableOpacity>

        {/* Section 1: Pickup Orders */}
        {pickupCount > 0 && (
          <>
            {/* Full width border line before All Pickup Orders */}
            <View style={{ height: 1, backgroundColor: allPickupChecked ? "#980775" : "#2868FE" }} />

            <View className="mt-4 px-6">
              <TouchableOpacity
                onPress={handleTogglePickupAll}
                activeOpacity={0.8}
                className="flex-row items-center py-2 mb-2"
              >
                <View
                  className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-3 ${
                    allPickupChecked ? "bg-[#980775] border-[#980775]" : "border-[#000000] bg-white"
                  }`}
                >
                  {allPickupChecked && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text className="text-[#030E25] font-bold text-base">
                  All Pickup Orders ({String(pickupCount).padStart(2, "0")})
                </Text>
              </TouchableOpacity>

              <View className="gap-3 mt-1">
                {pickupOrders.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleToggleItem(item.id)}
                    activeOpacity={0.8}
                    className="flex-row items-center bg-white border border-[#E1E7EE] rounded-2xl p-4 shadow-sm"
                  >
                    <View
                      className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-4 ${
                        item.checked ? "bg-[#980775] border-[#980775]" : "border-[#000000] bg-white"
                      }`}
                    >
                      {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <View>
                      <Text className="text-[#030E25] font-extrabold text-base">{item.orderId}</Text>
                      <Text className="text-[#676771] text-xs mt-0.5">{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Section 2: Delivery Orders */}
        {deliveryCount > 0 && (
          <>
            {/* Full width border line before All Delivery Orders */}
            <View className="mt-6 mb-4" style={{ height: 1, backgroundColor: allDeliveryChecked ? "#980775" : "#ACB5BE" }} />

            <View className="px-6">
              <TouchableOpacity
                onPress={handleToggleDeliveryAll}
                activeOpacity={0.8}
                className="flex-row items-center py-2 mb-2"
              >
                <View
                  className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-3 ${
                    allDeliveryChecked ? "bg-[#980775] border-[#980775]" : "border-[#000000] bg-white"
                  }`}
                >
                  {allDeliveryChecked && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text className="text-[#030E25] font-bold text-base">
                  All Delivery Orders ({String(deliveryCount).padStart(2, "0")})
                </Text>
              </TouchableOpacity>

              <View className="gap-3 mt-1">
                {deliveryOrders.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleToggleItem(item.id)}
                    activeOpacity={0.8}
                    className="flex-row items-center bg-white border border-[#E1E7EE] rounded-2xl p-4 shadow-sm"
                  >
                    <View
                      className={`w-6 h-6 rounded-md items-center justify-center border-2 mr-4 ${
                        item.checked ? "bg-[#980775] border-[#980775]" : "border-[#000000] bg-white"
                      }`}
                    >
                      {item.checked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <View>
                      <Text className="text-[#030E25] font-extrabold text-base">{item.orderId}</Text>
                      <Text className="text-[#676771] text-xs mt-0.5">{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      )}

      {/* Sticky Bottom Action Bar when any items are checked */}
      {checkedCount > 0 && (
        <View className="px-6 pt-4 pb-8 bg-white border-t border-[#E1E7EE] absolute bottom-0 left-0 right-0 gap-4">
          {/* Deselect All Button */}
          <TouchableOpacity
            onPress={handleDeselectAll}
            className="w-full h-[50px] bg-[#FF5A5F] rounded-full flex-row items-center justify-center shadow gap-2"
            activeOpacity={0.8}
          >
            <FontAwesome name="minus" size={18} color="white" />
            <Text className="text-white font-extrabold text-base">Deselect All</Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            className="w-full h-[50px] bg-black rounded-full flex-row items-center justify-center shadow gap-2"
            activeOpacity={0.8}
          >
            <FontAwesome name="check" size={18} color="white" />
            <Text className="text-white font-extrabold text-base">Continue ({checkedCount})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
