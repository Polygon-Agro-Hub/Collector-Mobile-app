import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Entypo, Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/navigations/CustomHeader";

type GroupPageState = "empty" | "active";

interface TimeSlotGroup {
  id: number;
  timeSlot: string;
  ordersLeft: number;
  status: "active" | "no_orders" | "assigned";
}

export default function Group({ route, navigation }: { route: any; navigation: any }) {
  const [pageState, setPageState] = useState<GroupPageState>("active");

  // Retail Groups slots state
  const [retailGroups, setRetailGroups] = useState<TimeSlotGroup[]>([
    { id: 1, timeSlot: "08:00 AM - 12:00 PM", ordersLeft: 20, status: "active" },
    { id: 2, timeSlot: "12:00 PM - 04:00 PM", ordersLeft: 30, status: "active" },
    { id: 3, timeSlot: "04:00 PM - 09:00 PM", ordersLeft: 1, status: "active" },
  ]);

  // Wholesale Groups slots state
  const [wholesaleGroups, setWholesaleGroups] = useState<TimeSlotGroup[]>([
    { id: 4, timeSlot: "08:00 AM - 12:00 PM", ordersLeft: 100, status: "active" },
    { id: 5, timeSlot: "12:00 PM - 04:00 PM", ordersLeft: 50, status: "active" },
    { id: 6, timeSlot: "04:00 PM - 09:00 PM", ordersLeft: 0, status: "no_orders" },
  ]);

  // Listen for selection callbacks from SelectOrder
  useEffect(() => {
    if (route.params?.assignedGroupId) {
      const gid = route.params.assignedGroupId;
      setRetailGroups((prev) =>
        prev.map((g) => (g.id === gid ? { ...g, ordersLeft: 0, status: "assigned" } : g))
      );
      setWholesaleGroups((prev) =>
        prev.map((g) => (g.id === gid ? { ...g, ordersLeft: 0, status: "assigned" } : g))
      );
    }
  }, [route.params?.assignedGroupId]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAssignGroup = (group: TimeSlotGroup, type: "retail" | "wholesale") => {
    if (group.status === "no_orders") return;
    if (group.status === "assigned") {
      Alert.alert("Already Assigned", "This time slot group is already fully assigned.");
      return;
    }
    // Navigate to SelectOrder passing the slot details
    navigation.navigate("SelectOrder", { group, type });
  };

  const togglePageState = () => {
    setPageState(pageState === "empty" ? "active" : "empty");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title="Groups"
        navigation={navigation}
        rightComponent={
          <TouchableOpacity
            onPress={togglePageState}
            className="px-3 py-1.5 rounded-full bg-[#E9ECF1]"
            activeOpacity={0.7}
          >
            <Text className="text-[10px] font-extrabold text-[#030E25] uppercase tracking-wide">
              {pageState === "empty" ? "Show Groups" : "Show Empty"}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Empty State Layout */}
      {pageState === "empty" && (
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-56 h-56 justify-center items-center mb-8">
            <LottieView
              source={require("../../../../assets/lottie/no-data.json")}
              autoPlay
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <Text className="text-xs font-semibold text-[#676771] text-center italic px-6 leading-5">
            - No groups found. Please check again after{"\n"}12:00 AM tomorrow. -
          </Text>
        </View>
      )}

      {/* Active Groups List Layout */}
      {pageState === "active" && (
        <ScrollView className="flex-1 bg-white px-6">
          {/* Retail Groups Section */}
          <View className="mb-6">
            <Text className="text-base font-extrabold text-[#030E25] mb-4">Retail Groups</Text>

            <View className="gap-4">
              {retailGroups.map((group) => {
                const isAssigned = group.status === "assigned";
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => handleAssignGroup(group, "retail")}
                    activeOpacity={isAssigned ? 1 : 0.8}
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 ${
                      isAssigned ? "" : "shadow-sm"
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isAssigned ? "text-gray-400" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      <Text
                        className={`text-xs font-bold mt-1 ${
                          isAssigned ? "text-gray-400" : "text-[#2868FE]"
                        }`}
                      >
                        {group.ordersLeft} Orders Left to Assign
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAssignGroup(group, "retail")}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isAssigned ? "bg-[#E9ECF1]" : "bg-black"
                      }`}
                      activeOpacity={isAssigned ? 1 : 0.8}
                    >
                      <Feather
                        name="plus"
                        size={18}
                        color={isAssigned ? "#94A3B8" : "white"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Full-bleed separator border */}
          <View style={{ height: 1, backgroundColor: "#ACB5BE", marginHorizontal: -24 }} className="mt-4 mb-6" />

          {/* Wholesale Groups Section */}
          <View className="mt-2">
            <Text className="text-base font-extrabold text-[#030E25] mb-4">Wholesale Groups</Text>

            <View className="gap-4">
              {wholesaleGroups.map((group) => {
                const isAssigned = group.status === "assigned";
                const isNoOrders = group.status === "no_orders";
                const isDisabled = isAssigned || isNoOrders;

                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => handleAssignGroup(group, "wholesale")}
                    activeOpacity={isDisabled ? 1 : 0.8}
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 ${
                      isDisabled ? "" : "shadow-sm"
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isDisabled ? "text-gray-400" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      {isNoOrders ? (
                        <Text className="text-xs font-bold text-[#FF0000] mt-1">
                          No orders for today
                        </Text>
                      ) : (
                        <Text
                          className={`text-xs font-bold mt-1 ${
                            isAssigned ? "text-gray-400" : "text-[#2868FE]"
                          }`}
                        >
                          {group.ordersLeft} Orders Left to Assign
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAssignGroup(group, "wholesale")}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isDisabled ? "bg-[#E9ECF1]" : "bg-black"
                      }`}
                      activeOpacity={isDisabled ? 1 : 0.8}
                    >
                      <Feather
                        name="plus"
                        size={18}
                        color={isDisabled ? "#94A3B8" : "white"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
