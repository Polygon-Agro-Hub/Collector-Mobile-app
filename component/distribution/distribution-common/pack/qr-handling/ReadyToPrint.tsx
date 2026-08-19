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
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { EndShiftHeaderRight, EndShiftModal } from "@/component/components/navigations/EndShiftModal";
import { formatTimeSlot } from "@/constants/packing/time-slots";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function ReadyToPrint({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  // Get order data passed from navigation parameters
  const {
    orderNumber,
    invoiceNumber,
    timeSlot,
    category,
    packagesCount = 0,
    alacarteCount = 0,
    packagesList = [],
  } = route.params || {};

  const insets = useSafeAreaInsets();
  const [endShiftModalVisible, setEndShiftModalVisible] = React.useState<boolean>(false);



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

  const rawType = String(route.params?.type || "").toUpperCase();
  const isWholesale = rawType === "W" || rawType === "WHOLESALE" || String(orderNumber).includes("(W)") || String(orderNumber).includes("(Wholesale)") || String(orderNumber).includes("Wholesale");
  const cleanInvoiceNumber = invoiceNumber || (orderNumber ? orderNumber.replace(/\s*\([^\)]*\)/g, "").trim() : "");
  const displayOrderNumber = isWholesale ? `${cleanInvoiceNumber} (W)` : `${cleanInvoiceNumber} (R)`;
  const qrValue = cleanInvoiceNumber;

  const actualPackagesCount =
    packagesList && packagesList.length > 0
      ? packagesList.reduce((acc: number, pkg: any) => {
          const qty = Number(pkg.qty || 1);
          return acc + (isNaN(qty) || qty <= 0 ? 1 : qty);
        }, 0)
      : Number(packagesCount || 0);

  const numPackages = Number(actualPackagesCount);
  const numAlacarte = Number(alacarteCount || 0);

  const formattedPackages =
    numPackages === 0 ? "0" : String(numPackages).padStart(2, "0");
  const formattedAlacarte =
    numAlacarte === 0 ? "0" : String(numAlacarte).padStart(2, "0");

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Standard Custom Header */}
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={() => navigation.navigate("QRHandling")}
        rightComponent={<EndShiftHeaderRight onPress={() => setEndShiftModalVisible(true)} />}
      />

      <ScrollView className="flex-1 bg-white px-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
            {displayOrderNumber}
          </Text>
          <Text className="text-gray-400 text-xs mt-1 text-center font-medium">
            {category}
          </Text>
        </View>

        {/* Current Order Card (Highlighted in purple) */}
        {orderNumber && (
          <View className="flex-row items-center bg-white border-2 border-[#980775] rounded-xl p-4 mb-6 shadow-sm">
            {/* Left Bag Icon Circle */}
            <View className="w-11 h-11 rounded-full bg-[#980775] items-center justify-center mr-4">
              <Feather name="shopping-bag" size={20} color="white" />
            </View>

            {/* Content */}
            <View className="flex-1">
              <Text className="font-extrabold text-slate-950 text-base">
                {displayOrderNumber}
              </Text>
              <Text className="text-sm font-bold text-slate-900 mt-0.5">
                {formatTimeSlot(timeSlot)}
              </Text>
              <Text className="text-xs text-[#54617D] mt-0.5">
                {category}
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

          {/* Packages Row */}
          <View className="flex-row justify-between items-center py-2.5 bg-[#FAFAFB] px-3 rounded-lg mb-2">
            <Text className="text-xs font-bold text-[#030E25]">Packages</Text>
            <Text className="text-[#980775] font-extrabold text-base">
              {formattedPackages}
            </Text>
          </View>

          {/* À la carte Row — shows distinct product count */}
          <View className="flex-row justify-between items-center py-2.5 bg-[#FAFAFB] px-3 rounded-lg mb-2">
            <Text className="text-xs font-bold text-[#030E25]">
              À la carte Items
            </Text>
            <Text className="text-[#980775] font-extrabold text-base">
              {formattedAlacarte}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button Pinned to Bottom */}
      <View className="px-6 pt-4 bg-white" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("PrintingConfirmation", {
              ...route.params,
              orderNumber: displayOrderNumber,
              invoiceNumber: cleanInvoiceNumber,
              type: isWholesale ? "W" : "R",
              category: category,
              packagesList: route.params?.packagesList || [],
              alacarteCount: alacarteCount,
              trackingRows: route.params?.trackingRows || [],
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
            marginBottom: 10,
          }}
        >
          <Text
            className="text-white font-extrabold text-base"
            style={{
              color: "#ffffff",
              fontSize: 16,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {route.params?.buttonLabel || "Start"}
          </Text>
        </TouchableOpacity>
      </View>

      <EndShiftModal
        visible={endShiftModalVisible}
        onClose={() => setEndShiftModalVisible(false)}
        navigation={navigation}
        positionText="QR Position"
      />
    </View>
  );
}
