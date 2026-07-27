import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";

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
  const pickupCount = isRetail ? 4 : 20;
  const deliveryCount = isRetail ? 16 : 80;

  const [orders, setOrders] = useState<OrderItem[]>([]);

  useEffect(() => {
    const list: OrderItem[] = [];
    // Generate Pickup Orders
    for (let i = 1; i <= pickupCount; i++) {
      list.push({
        id: `p-${i}`,
        orderId: i <= 2 ? `2605050000${i}` : `2603010000${i - 2}`,
        type: "pickup",
        subtitle: "Pickup Order",
        checked: false,
      });
    }
    // Generate Delivery Orders
    const locations = ["Bambalapitiya", "Dehiwala", "Wellawatte", "Colombo"];
    for (let i = 1; i <= deliveryCount; i++) {
      list.push({
        id: `d-${i}`,
        orderId: i <= 2 ? `2605050000${i}` : `2603010000${i - 2}`,
        type: "delivery",
        subtitle: locations[(i - 1) % locations.length],
        checked: false,
      });
    }
    setOrders(list);
  }, [pickupCount, deliveryCount]);

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
    if (checkedCount === 0) return;
    navigation.navigate("SelectRowToAssign", {
      selectedOrdersCount: checkedCount,
      group: group,
    });
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

      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        {/* Master Checkbox Section */}
        <TouchableOpacity
          onPress={handleToggleAll}
          activeOpacity={0.8}
          className="flex-row items-center px-6 py-3 border-b border-[#E1E7EE]"
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

        {/* Full width border line before All Pickup Orders */}
        <View style={{ height: 1, backgroundColor: allPickupChecked ? "#980775" : "#2868FE" }} />

        {/* Section 1: Pickup Orders */}
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

        {/* Full width border line before All Delivery Orders */}
        <View className="mt-6 mb-4" style={{ height: 1, backgroundColor: allDeliveryChecked ? "#980775" : "#ACB5BE" }} />

        {/* Section 2: Delivery Orders */}
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
      </ScrollView>

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
