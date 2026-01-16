import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
  Image,
  BackHandler,
} from "react-native";
import {
  FontAwesome5,
  FontAwesome6,
  Foundation,
  Ionicons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";

type ViewPickupOrdersNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ViewPickupOrders"
>;

interface ViewPickupOrdersProps {
  navigation: ViewPickupOrdersNavigationProp;
  route: RouteProp<RootStackParamList, "ViewPickupOrders">;
}

const ViewPickupOrders: React.FC<ViewPickupOrdersProps> = ({
  route,
  navigation,
}) => {
  const { order } = route.params;
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Format customer name
  const customerName = `${order.firstName} ${order.lastName}`;

  // Format phone numbers
  const formatPhoneNumber = (code: string, number: string) => {
    return `${code} ${number}`;
  };

  const phone1 = formatPhoneNumber(order.phoneCode, order.phoneNumber);
  const phone2 =
    order.phoneCode2 && order.phoneNumber2
      ? formatPhoneNumber(order.phoneCode2, order.phoneNumber2)
      : null;

  const phoneNumbers = phone2 ? [phone1, phone2] : [phone1];

  // Format scheduled time in exact format: 2025/01/02 (8:00AM - 2:00PM)
  const formatScheduleDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    } catch (error) {
      return dateString;
    }
  };

  // Remove "Within" from schedule time and format to add :00 for minutes
  const formatScheduleTime = (timeString: string) => {
    if (!timeString) return "";

    // Remove "Within" and any extra spaces
    const cleanTime = timeString.replace(/within\s*/i, "").trim();

    // Function to format time to include :00 for minutes
    const formatTimeWithMinutes = (timePart: string) => {
      // Remove any spaces and convert to uppercase for consistent formatting
      timePart = timePart.trim().toUpperCase();

      // Check if time already has minutes (contains :)
      if (timePart.includes(":")) {
        return timePart;
      }

      // Extract hour and AM/PM
      const match = timePart.match(/^(\d{1,2})\s*(AM|PM)$/i);
      if (match) {
        const hour = match[1];
        const period = match[2].toUpperCase();
        return `${hour}:00 ${period}`;
      }

      // Check for time range like "8AM - 2PM"
      const rangeMatch = timePart.match(
        /^(\d{1,2})(AM|PM)\s*-\s*(\d{1,2})(AM|PM)$/i
      );
      if (rangeMatch) {
        const startHour = rangeMatch[1];
        const startPeriod = rangeMatch[2].toUpperCase();
        const endHour = rangeMatch[3];
        const endPeriod = rangeMatch[4].toUpperCase();
        return `${startHour}:00 ${startPeriod} - ${endHour}:00 ${endPeriod}`;
      }

      // If no match, return original
      return timePart;
    };

    return formatTimeWithMinutes(cleanTime);
  };

  const scheduledDate = formatScheduleDate(order.sheduleDate);
  const formattedTime = formatScheduleTime(order.sheduleTime);
  const timeSlot = `${scheduledDate} (${formattedTime})`;

  // Format ready time - Keep original structure
  const readyDate = new Date(order.createdAt);
  const readyTime = `At ${readyDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })} on ${readyDate.toLocaleDateString("en-US")}`;

  // Determine payment status
  const isPaid = order.isPaid;
  const cashAmount = order.fullTotal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const makePhoneCall = (phoneNumber: string) => {
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");

    const url = `tel:${cleanedNumber}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        t("Error.Error") || "Error",
        t("Error.Phone call is not supported on this device") ||
          "Phone call is not supported on this device"
      );
    });
  };

  const handleScanOrder = () => {
    console.log("invoice number--------------", order.invNo);
    navigation.navigate("qrcode", {
      expectedOrderId: order.invNo,
      fromScreen: "ViewPickupOrders",
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("ReadytoPickupOrders");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [navigation])
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="px-4 py-3 mt-2">
        <View className="flex-row items-center justify-center relative">
          <TouchableOpacity
            className="absolute left-0 bg-[#F6F6F680] rounded-full p-2 z-50"
            onPress={() => navigation.navigate("ReadytoPickupOrders")}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">
            ID : #{order.invNo}
          </Text>
        </View>

        {/* Ready Time Badge - Keep original structure */}
        <View className="flex-row items-center justify-center">
          <View className="px-3 py-1.5 rounded-full flex-row items-center">
            <Text className="text-[#565559] mr-2">
              {t("ViewPickupOrders.Ready") || "Ready"}
            </Text>
            <Text className="font-semibold text-[#000000]">{readyTime}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4">
          {/* Customer Info */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="items-center mb-4">
              <Image
                source={require("../../assets/images/New/ProfileCustomer.webp")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />
              <Text className="text-lg font-bold text-gray-800 mt-2">
                {customerName}
              </Text>
            </View>

            {/* Payment Status */}
            <View className="bg-[#F7F7F7] rounded-xl p-4 items-center mb-4">
              <View className="mb-2">
                {isPaid ? (
                  <MaterialIcons
                    name="check-circle"
                    size={28}
                    color="#000000"
                  />
                ) : (
                  <FontAwesome5 name="coins" size={28} color="#000000" />
                )}
              </View>
              {isPaid ? (
                <Text className="font-bold text-[#980775]">
                  {t("ViewPickupOrders.Already Paid") || "Already Paid!"}
                </Text>
              ) : (
                <Text className="font-bold text-[#980775]">
                  {t("ViewPickupOrders.Rs")}. {cashAmount}
                </Text>
              )}
            </View>

            {/* Time Slot - Format: 2025/01/02 (8:00AM - 2:00PM) */}
            <View className="bg-[#F7F7F7] rounded-xl p-4 items-center">
              <Octicons name="clock-fill" size={28} color="black" />
              <Text className="text-sm font-semibold text-gray-800 mt-2">
                {timeSlot}
              </Text>
            </View>
          </View>

          {/* Phone Call Buttons - Dynamic based on number of phone numbers */}
          <View
            className={`px-4 ${
              phoneNumbers.length === 1 ? "mb-[68px]" : "mb-4"
            }`}
          >
            {phoneNumbers.map((phoneNumber, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => makePhoneCall(phoneNumber)}
                className={`relative flex-row items-center bg-white border-2 border-[#980775] rounded-full py-1 pl-6 pr-1 ${
                  index < phoneNumbers.length - 1 ? "mb-3" : ""
                }`}
                activeOpacity={0.7}
              >
                {/* CENTER TEXT */}
                <View className="absolute left-0 right-0 items-center">
                  <Text className="text-base font-semibold text-black">
                    {`${
                      t("ViewPickupOrders.Make Phone Call") || "Make Phone Call"
                    } - ${index + 1}`}
                  </Text>
                </View>

                {/* RIGHT ICON */}
                <View className="ml-auto bg-[#980775] rounded-full py-2 px-3">
                  <Foundation name="telephone" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scan Order Button */}
          <TouchableOpacity
            onPress={handleScanOrder}
            className="bg-[#980775] rounded-full py-3 px-7 mx-4 mb-20 shadow-md"
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <View className="flex-row items-center justify-center">
              <FontAwesome6 name="qrcode" size={24} color="white" />
              <Text className="text-white text-base font-bold ml-3">
                {t("ViewPickupOrders.Scan Order") || "Scan Order"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ViewPickupOrders;
