import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

interface OrderData {
  id: number;
  orderNumber: string;
  type: "R" | "W"; // R = Retail, W = Wholesale
  timeSlot: string;
  category: string;
}

export default function QRHandling({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
  const [hasData, setHasData] = useState<boolean>(true); // Mode switcher for demo

  // Sample data for "To Do" list (6 items)
  const todoOrders: OrderData[] = [
    {
      id: 1,
      orderNumber: "26050500001",
      type: "R",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Pickup Order",
    },
    {
      id: 2,
      orderNumber: "26050500002",
      type: "R",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Pickup Order",
    },
    {
      id: 3,
      orderNumber: "26050500003",
      type: "R",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Bambalapitiya",
    },
    {
      id: 4,
      orderNumber: "26050500004",
      type: "W",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Bambalapitiya",
    },
    {
      id: 5,
      orderNumber: "26050500005",
      type: "R",
      timeSlot: "12:00 PM - 04:00 PM",
      category: "Dehiwala",
    },
    {
      id: 6,
      orderNumber: "26050500006",
      type: "R",
      timeSlot: "04:00 PM - 09:00 PM",
      category: "Dehiwala",
    },
  ];

  // Sample data for "Done" list (2 items)
  const doneOrders: OrderData[] = [
    {
      id: 1,
      orderNumber: "26050500001",
      type: "R",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Pickup Order",
    },
    {
      id: 2,
      orderNumber: "26050400001",
      type: "R",
      timeSlot: "08:00 AM - 12:00 PM",
      category: "Pickup Order",
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header bar matching SelectRow design */}
      <View className="flex-row items-center justify-between px-5 pt-4 bg-white">
        {/* Back Button matching CustomHeader */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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

        {/* Subtle switcher to toggle empty state during manual review */}
        <TouchableOpacity
          onPress={() => setHasData(!hasData)}
          className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100"
          activeOpacity={0.7}
        >
          <Text className="text-[10px] font-bold text-slate-500">
            {hasData ? "Preview Empty State" : "Preview List State"}
          </Text>
        </TouchableOpacity>
      </View>

      {!hasData ? (
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
                source={require("../../../assets/lottie/no-data.json")}
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

          {/* Orders Scrollable List */}
          <ScrollView className="flex-1 bg-white px-6">
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
                          navigation.navigate("ReadyToPrint", {
                            orderNumber: `${order.orderNumber} (${order.type})`,
                            category: order.category,
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
