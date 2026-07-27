import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import Timer from "@/component/distribution-common/TimerContainer";

export default function ConfirmRowAssign({ route, navigation }: { route: any; navigation: any }) {
  const { selectedOrdersCount = 20, group = { id: 1, timeSlot: "08:00 AM - 12:00 PM" }, selectedRow = { name: "Row 1" } } = route.params || {};

  const [timerRunning, setTimerRunning] = useState(true);

  // Check if type is Retail or Wholesale from group details or context
  const isRetail = selectedOrdersCount <= 20;

  const handleConfirm = () => {
    setTimerRunning(false);
    Alert.alert(
      "Success",
      `Successfully assigned ${selectedOrdersCount} orders to ${selectedRow.name} for the ${group.timeSlot} slot.`,
      [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("Group", { assignedGroupId: group.id });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header */}
      <CustomHeader
        title="Confirm Action"
        navigation={navigation}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mt-4">
          {/* Top description text */}
          <Text className="text-sm text-center px-12 text-[#676771] mb-6 leading-relaxed">
            Marking as completed in 30 seconds.{"\n"}
            Tap on back button make changes.
          </Text>

          {/* Countdown Timer */}
          <View className="justify-center items-center mb-6">
            <Timer
              size={180}
              fontSize={28}
              minutes={0.5}
              fillColor="#000000"
              bgColor="#FFFFFF"
              backgroundColor="#E5E7EB"
              showMs={false}
              onComplete={handleConfirm}
              running={timerRunning}
              strokeWidth={6}
            />
          </View>

          {/* Flow Cards */}
          <View className="w-full items-center mt-4">
            {/* Card 1: Selected Section */}
            <View className="w-full flex-row items-center bg-white border-2 border-[#980775] rounded-2xl p-5">
              <View className="w-10 h-10 rounded-full bg-[#FAFAFB] items-center justify-center mr-4 border border-[#E1E7EE]">
                <FontAwesome name="archive" size={18} color="#030E25" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#676771] font-medium">Selected Section</Text>
                <Text className="text-sm font-extrabold text-[#030E25] mt-1">
                  {group.timeSlot} ({isRetail ? "Retail" : "Wholesale"})
                </Text>
                <Text className="text-xl font-extrabold text-[#030E25] mt-1">{selectedOrdersCount}</Text>
              </View>
            </View>

            {/* Vertical arrow pointer */}
            <View className="my-3">
              <Ionicons name="arrow-down" size={30} color="black" />
            </View>

            {/* Card 2: Assigning to Row */}
            <View className="w-full flex-row items-center bg-white border-2 border-[#980775] rounded-2xl p-5">
              <View className="w-10 h-10 rounded-full bg-[#FAFAFB] items-center justify-center mr-4 border border-[#E1E7EE]">
                <Ionicons name="git-commit-outline" size={20} color="#030E25" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#676771] font-medium">Assigning to Row</Text>
                <Text className="text-base font-extrabold text-[#030E25] mt-1">
                  {selectedRow.name}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom confirm action button */}
      <View
        style={{ borderTopColor: "#79747E33", borderTopWidth: 1 }}
        className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0"
      >
        <TouchableOpacity
          onPress={handleConfirm}
          className="w-full h-[50px] bg-black rounded-full flex-row items-center justify-center shadow gap-2"
          activeOpacity={0.8}
        >
          <FontAwesome name="check" size={16} color="white" />
          <Text className="text-white font-extrabold text-base">Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
