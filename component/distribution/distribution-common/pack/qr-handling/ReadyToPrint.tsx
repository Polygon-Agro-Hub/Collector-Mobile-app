import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import CustomHeader from "@/component/navigations/CustomHeader";

export default function ReadyToPrint({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  // Get order data passed from navigation parameters
  const {
    orderNumber = "2607300005 (R)",
    invoiceNumber = "2607300005",
    category = "Pickup Order",
    nextOrderNumber = "2607300006 (R)",
    nextTimeSlot = "08:00 AM - 12:00 PM",
    nextCategory = "Pickup Order",
    packagesCount = 3,
    alacarteCount = 3,
    packagesList = [],
  } = route.params || {};

  useEffect(() => {
    const onBackPress = () => {
      navigation.navigate("QRHandling");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => backHandler.remove();
  }, [navigation]);

  const actualPackagesCount =
    packagesList && packagesList.length > 0
      ? packagesList.length
      : packagesCount;
  const formattedPackages = String(actualPackagesCount).padStart(2, "0");
  const formattedAlacarte = String(alacarteCount).padStart(2, "0");
  const qrValue = invoiceNumber || orderNumber;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Standard Custom Header */}
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={() => navigation.navigate("QRHandling")}
      />

      <ScrollView className="flex-1 bg-white px-6">
        {/* Header Title section matching QRHandling design */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-slate-950">
            Ready to Print
          </Text>
        </View>

        {/* QR Code Card Frame (Black border, Not rounded) */}
        <View className="items-center justify-center bg-white border border-black p-6 mb-6">
          {/* Dynamically generated QR Code for invoice number */}
          <View className="p-4 bg-white mb-4">
            <QRCode
              value={qrValue}
              size={240}
              color="black"
              backgroundColor="white"
            />
          </View>
          {/* Invoice / Order ID & Type Info */}
          <Text className="text-lg font-extrabold text-slate-950 tracking-tight text-center">
            {orderNumber}
          </Text>
          <Text className="text-gray-400 text-xs mt-1 text-center font-medium">
            {category}
          </Text>
        </View>

        {/* Next Order Card (Highlighted in purple) */}
        {nextOrderNumber && (
          <View className="flex-row items-center bg-white border-2 border-[#980775] rounded-xl p-4 mb-6 shadow-sm">
            {/* Left Bag Icon Circle */}
            <View className="w-11 h-11 rounded-full bg-[#980775] items-center justify-center mr-4">
              <Feather name="shopping-bag" size={20} color="white" />
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="font-extrabold text-slate-950 text-base">
                {nextOrderNumber}
              </Text>
              <Text className="text-sm font-bold text-slate-900 mt-0.5">
                {nextTimeSlot}
              </Text>
              <Text className="text-xs text-[#54617D] mt-0.5">
                {nextCategory}
              </Text>
            </View>
          </View>
        )}

        {/* Order Summary Card */}
        <View
          className="bg-white border border-gray-100 rounded-xl p-5 mb-8 shadow-sm"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text className="text-slate-800 font-extrabold text-sm mb-4">
            Order Summary
          </Text>

          {/* Main Container Row — only shown when order has more than 1 physical box */}
          {/* {(actualPackagesCount + (alacarteCount > 0 ? 1 : 0)) > 1 && (
            <View className="flex-row justify-between items-center py-2.5 bg-[#F0F4FF] px-3 rounded-lg mb-2">
              <Text className="text-xs font-bold text-[#030E25]">Main Container</Text>
              <Text className="text-[#030E25] font-extrabold text-base">01</Text>
            </View>
          )} */}

          {/* Packages Row */}
          {actualPackagesCount > 0 && (
            <View className="flex-row justify-between items-center py-2.5 bg-[#FAFAFB] px-3 rounded-lg mb-2">
              <Text className="text-xs font-bold text-[#030E25]">Packages</Text>
              <Text className="text-[#980775] font-extrabold text-base">
                {formattedPackages}
              </Text>
            </View>
          )}

          {/* À la carte Row — shows distinct product count */}
          {alacarteCount > 0 && (
            <View className="flex-row justify-between items-center py-2.5 bg-[#FAFAFB] px-3 rounded-lg mb-2">
              <Text className="text-xs font-bold text-[#030E25]">
                À la carte Items
              </Text>
              <Text className="text-[#980775] font-extrabold text-base">
                {formattedAlacarte}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Start Button Pinned to Bottom */}
      <View className="px-6 pt-4 pb-8 bg-white">
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("PrintingConfirmation", {
              orderNumber: orderNumber,
              invoiceNumber: invoiceNumber,
              category: category,
              processOrderId: route.params?.processOrderId,
              packagesList: route.params?.packagesList || [],
              alacarteCount: alacarteCount,
              rowId: route.params?.rowId,
              isReprint: route.params?.isReprint || false,
              buttonLabel: route.params?.buttonLabel || "Start",
            });
          }}
          className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-white font-extrabold text-base">
            {route.params?.buttonLabel || "Start"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
