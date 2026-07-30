import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

export default function ConfirmRowAssign({ route, navigation }: { route: any; navigation: any }) {
  const { 
    selectedOrdersCount = 20, 
    selectedOrderIds = [], 
    group = { id: 1, timeSlotCode: "8-12", timeSlot: "08:00 AM - 12:00 PM" }, 
    selectedRow = { id: "10", name: "Row 1" } 
  } = route.params || {};

  const [timerRunning, setTimerRunning] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check if type is Retail or Wholesale from group details or context
  const isRetail = selectedOrdersCount <= 20;

  const handleConfirm = async () => {
    if (submitting) return;
    setTimerRunning(false);
    
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.post(
        `${environment.API_BASE_URL}api/packing/groups/assign`,
        {
          rowId: Number(selectedRow.id),
          timeSlotCode: group.timeSlotCode,
          orderIds: selectedOrderIds
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.success) {
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
      } else {
        Alert.alert("Error", response.data.message || "Failed to assign orders.");
        setTimerRunning(true);
      }
    } catch (error) {
      console.error("Error assigning orders to packing row:", error);
      Alert.alert("Error", "An error occurred while assigning orders.");
      setTimerRunning(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.navigate("SelectRowToAssign", route.params);
  };

  React.useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const backHandler = require("react-native").BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header */}
      <CustomHeader
        title="Confirm Action"
        navigation={navigation}
        onBackPress={handleBack}
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

          {/* Countdown Indicator */}
          <View className="justify-center items-center mb-6">
            <View className="w-36 h-36 rounded-full border-4 border-[#030E25] items-center justify-center bg-white shadow-sm">
              <Text className="text-3xl font-extrabold text-[#030E25]">00:30</Text>
            </View>
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
          disabled={submitting}
          className="w-full h-[50px] bg-black rounded-full flex-row items-center justify-center shadow gap-2"
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <FontAwesome name="check" size={16} color="white" />
              <Text className="text-white font-extrabold text-base">Confirm</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
