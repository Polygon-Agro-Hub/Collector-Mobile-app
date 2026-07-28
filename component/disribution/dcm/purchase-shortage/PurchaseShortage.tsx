import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";

export default function PurchaseShortage({ navigation }: { navigation: any }) {
  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title="Purchase Shortage"
        navigation={navigation}
      />
      <View className="flex-1 justify-center items-center px-6">
        <View className="w-20 h-20 rounded-full bg-[#FDF0F5] justify-center items-center mb-6">
          <Ionicons name="cart-outline" size={40} color="#980775" />
        </View>
        <Text className="text-xl font-bold text-[#030E25] text-center mb-2">
          Purchase Shortage
        </Text>
        <Text className="text-sm text-[#54617D] text-center leading-relaxed px-4">
          This feature is under development. Soon you will be able to manage purchase shortages directly from this screen.
        </Text>
      </View>
    </View>
  );
}
