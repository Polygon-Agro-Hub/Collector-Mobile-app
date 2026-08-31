import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { EndShiftHeaderRight, EndShiftModal } from "@/component/components/navigations/EndShiftModal";
import AlertModal from "@/component/components/popup/AlertModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrinter } from "@/services/printer/usePrinter";
import {
  LabelThemeData,
  buildTheme1TSPL,
} from "@/services/printer/Tspllabelbuilder";
import { PrinterSelectModal } from "@/component/components/popup/PrinterSelectModal";
import {
  generatePrintSteps,
  PrintStep,
} from "@/utils/packing/packing-helpers";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "@/environment/environment";
import { PACKING_ERROR_CODES } from "@/constants/packing/error-codes";

export default function PrintingConfirmation({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const {
    orderNumber,
    invoiceNumber,
    category,
    packagesList = [],
    alacarteCount = 0,
    processOrderId: routeProcessOrderId,
    orderId: routeOrderId,
  } = route.params || {};

  const processOrderId = routeProcessOrderId || routeOrderId;
  const insets = useSafeAreaInsets();
  const [endShiftModalVisible, setEndShiftModalVisible] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);

  // Bluetooth Printer Hook matching Expo57-QR-Printer
  const {
    discoveredDevices,
    connectedDevice,
    isScanning,
    isConnecting,
    isPrinting,
    startScan,
    stopScan,
    connectToDevice,
    printTSPL,
    disconnect,
  } = usePrinter();

  const rawType = String(route.params?.type || "").toUpperCase();
  const isWholesale = rawType === "W" || rawType === "WHOLESALE" || String(orderNumber).includes("(W)") || String(orderNumber).includes("(Wholesale)") || String(orderNumber).includes("Wholesale");
  const cleanInv = String(invoiceNumber || orderNumber).replace(/\s*\([^\)]*\)/g, "").trim();

  // Build dynamic print steps using packing helper utility
  const steps: PrintStep[] = generatePrintSteps(packagesList, alacarteCount);

  // Match each step against trackingRows to determine if it is already printed
  const trackingRows: any[] = route.params?.trackingRows || [];
  const isMain = (row: any) => Number(row.isMainContainer) === 1 || row.isMainContainer === true;
  const mainTrackingRows = trackingRows.filter((row) => isMain(row));
  const pkgTrackingRows = trackingRows.filter((row) => !isMain(row) && row.orderpackageId);
  const alacarteTrackingRows = trackingRows.filter((row) => !isMain(row) && !row.orderpackageId);

  let mainMatchedCount = 0;
  const pkgMatchedCounts = new Map<number, number>();
  let alacarteMatchedCount = 0;

  steps.forEach((step: any) => {
    let matchedRow: any = null;

    if (step.type === "main") {
      matchedRow = mainTrackingRows[mainMatchedCount];
      mainMatchedCount++;
    } else if (step.type === "package") {
      const matchedPkgRows = pkgTrackingRows.filter((row) => Number(row.orderpackageId) === Number(step.packageId));
      const currentMatched = pkgMatchedCounts.get(step.packageId) || 0;
      matchedRow = matchedPkgRows[currentMatched];
      pkgMatchedCounts.set(step.packageId, currentMatched + 1);
    } else if (step.type === "alacarte") {
      matchedRow = alacarteTrackingRows[alacarteMatchedCount];
      alacarteMatchedCount++;
    }

    step.isPrinted = matchedRow ? Number(matchedRow.pIndex || 0) > 0 : false;
  });

  // Start at the first unprinted box (or the last step if all are printed)
  const firstUnprintedIndex = steps.findIndex((s: any) => !s.isPrinted);
  const initialStep = firstUnprintedIndex !== -1 ? firstUnprintedIndex + 1 : (steps.length > 0 ? steps.length : 1);

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState<string>("Success");

  const activeStep = steps[currentStep - 1] || steps[0];
  const qrValue = cleanInv || invoiceNumber || orderNumber;

  const activeCategory = category || "Moragahahena";
  const activeDate = route.params?.date || "2026/08/25";
  const activeTimeSlot = route.params?.timeSlot || "08:00AM - 12:00PM";
  const activeStepLabel = activeStep?.label || "à la carte";
  const activeStepIndex = `Step ${currentStep}/${steps.length}`;

  useEffect(() => {
    const onBackPress = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        return true;
      }
      navigation.navigate("ReadyToPrint", route.params);
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => backHandler.remove();
  }, [currentStep, navigation, route.params]);

  const handleOpenPrinterModal = () => {
    setIsPrinterModalOpen(true);
    startScan();
  };

  const handleSelectPrinter = async (device: any) => {
    const success = await connectToDevice(device);
    if (success) {
      setIsPrinterModalOpen(false);
      setAlertType("success");
      setAlertTitle("Printer Connected");
      setAlertMessage(`Connected to ${device.displayName || device.name}`);
      setAlertVisible(true);
    }
  };

  // Print Order Label: Validate Backend Tracking First, Then Print Physical Label
  const handlePrintPress = async () => {
    // 1. Validate Bluetooth Printer is connected
    if (!connectedDevice) {
      handleOpenPrinterModal();
      setAlertType("error");
      setAlertTitle("Printer Required");
      setAlertMessage("Please connect to a Bluetooth thermal printer first before printing.");
      setAlertVisible(true);
      return;
    }

    if (isPrinting) return;

    try {
      // 2. Validate with backend first (Check next station busy / position assigned)
      const token = (await AsyncStorage.getItem("@access_token")) || store.getState().auth.token;

      if (activeStep.type === "main") {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            isMainContainer: true,
            rowId: route.params?.rowId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data && response.data.success === false) {
          const code = response.data.code;
          const msg = response.data.message || "An error occurred.";
          setAlertType("error");
          if (code === PACKING_ERROR_CODES.STATION_OCCUPIED) {
            setAlertTitle("Position Busy");
          } else if (code === PACKING_ERROR_CODES.NO_OFFICER_ASSIGNED) {
            setAlertTitle("Position Empty");
          } else {
            setAlertTitle("Error");
          }
          setAlertMessage(msg);
          setAlertVisible(true);
          return; // Stop here! Do NOT print sticker
        }
      } else {
        const isPackageStep = activeStep.type === "package";
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            orderpackageId: activeStep.packageId || null,
            isPackage: isPackageStep ? 1 : 0,
            packageIndex: isPackageStep ? (activeStep.packageBoxSubIndex ?? 0) : 0,
            packageBoxSubIndex: isPackageStep ? (activeStep.packageBoxSubIndex ?? 0) : 0,
            rowId: route.params?.rowId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data && response.data.success === false) {
          const code = response.data.code;
          const msg = response.data.message || "An error occurred.";
          setAlertType("error");
          if (code === PACKING_ERROR_CODES.STATION_OCCUPIED) {
            setAlertTitle("Position Busy");
          } else if (code === PACKING_ERROR_CODES.NO_OFFICER_ASSIGNED) {
            setAlertTitle("Position Empty");
          } else {
            setAlertTitle("Error");
          }
          setAlertMessage(msg);
          setAlertVisible(true);
          return; // Stop here! Do NOT print sticker
        }
      }

      // 3. Backend validated successfully — now print the physical TSPL sticker (27x27mm QR on 50x30mm sheet)
      const labelData: LabelThemeData = {
        qrValue: qrValue,
        orderNumber: cleanInv,
        category: activeCategory,
        orderType: isWholesale ? "Wholesale" : "Retail",
        date: activeDate,
        timeSlot: activeTimeSlot,
        stepLabel: activeStepLabel,
        stepIndex: activeStepIndex,
      };

      const tspl = buildTheme1TSPL(labelData);
      await printTSPL(tspl);

      const printerName = connectedDevice.displayName || connectedDevice.name;
      setAlertType("success");
      setAlertTitle("Print Successful");
      if (currentStep < steps.length) {
        const stepName = steps[currentStep - 1]?.label || "Package";
        setAlertMessage(`${stepName} QR label printed on ${printerName}!`);
      } else {
        setAlertMessage(
          `All packages for order ${orderNumber} printed on ${printerName}!`,
        );
      }
      setAlertVisible(true);
    } catch (err: any) {
      console.error("Error updating order status on QR print:", err);
      const msg = err.response?.data?.message || err.message || "Failed to communicate with packing server. Please try again.";
      const code = err.response?.data?.code;

      setAlertType("error");
      if (code === PACKING_ERROR_CODES.STATION_OCCUPIED) {
        setAlertTitle("Position Busy");
      } else if (code === PACKING_ERROR_CODES.NO_OFFICER_ASSIGNED) {
        setAlertTitle("Position Empty");
      } else {
        setAlertTitle("Print Error");
      }
      setAlertMessage(msg);
      setAlertVisible(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.navigate("ReadyToPrint", route.params);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={handleBack}
        rightComponent={<EndShiftHeaderRight onPress={() => setEndShiftModalVisible(true)} />}
      />

      {/* Main Scrollable Content Area */}
      <ScrollView className="flex-1 bg-white px-6">
        {/* Header Title */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-slate-950">
            Printing Confirmation
          </Text>
        </View>

        {/* Dynamic Progress step segments at top */}
        {steps.length > 1 && (
          <View className="flex-row justify-between items-center gap-2 px-2 mb-8">
            {steps.map((s, idx) => {
              const stepNum = idx + 1;
              const isFilled = (s as any).isPrinted || stepNum < currentStep;
              return (
                <View key={s.id} className="flex-1 items-center">
                  <View
                    className={`w-full h-1.5 rounded-full mb-1 ${
                      isFilled ? "bg-[#030E25]" : "bg-gray-200"
                    }`}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Dynamic Step Active Pill Badge */}
        <View className="items-center mb-6 w-full px-2">
          <View className="px-4 py-2.5 rounded-full flex-row items-center justify-center gap-2.5 bg-white border border-slate-200 max-w-full shadow-sm">
            {/* Index Badge */}
            <View className="bg-[#E9ECF1] px-3 py-1.5 rounded-full items-center justify-center">
              <Text
                className="font-extrabold text-xs text-[#030E25]"
                style={{
                  color: "#030E25",
                  fontSize: 13,
                  fontWeight: "800",
                }}
              >
                {activeStep?.formattedIndex}
              </Text>
            </View>

            {/* Label Text */}
            <Text
              className="font-extrabold text-base text-center"
              style={{
                color: activeStep?.textColor || "#000000",
                fontSize: 16,
                fontWeight: "800",
                textAlign: "center",
                flexShrink: 1,
              }}
            >
              {activeStep?.label}
            </Text>
          </View>
        </View>

        {/* Printer Connectivity Status Banner matching Expo57-QR-Printer */}
        <View
          style={{
            backgroundColor: connectedDevice ? "#f0fdf4" : "#fef2f2",
            borderWidth: 1,
            borderColor: connectedDevice ? "#bbf7d0" : "#fecaca",
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 8 }}>
            <MaterialCommunityIcons
              name={connectedDevice ? "bluetooth-connect" : "bluetooth-off"}
              size={24}
              color={connectedDevice ? "#16a34a" : "#dc2626"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: connectedDevice ? "#14532d" : "#991b1b",
                }}
                numberOfLines={1}
              >
                {connectedDevice ? connectedDevice.displayName || connectedDevice.name : "No Printer Connected"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: connectedDevice ? "#166534" : "#b91c1c",
                }}
              >
                {connectedDevice ? "Bluetooth Ready (50x30mm TSPL)" : "Tap to scan & connect printer"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenPrinterModal}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: connectedDevice ? "#16a34a" : "#030E25",
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }}>
              {connectedDevice ? "Change" : "Connect"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 50mm x 30mm Sticker Label Preview Card */}
        <View className="bg-white border border-slate-300 p-3.5 mb-6 rounded-lg flex-row justify-between items-center shadow-sm">
          {/* Left Column Details with 2mm left gap */}
          <View className="w-[46%] justify-between py-0.5 pl-1">
            <View>
              <Text className="text-[#000000] font-black text-xl leading-tight tracking-tight">
                {cleanInv}
              </Text>
              <Text className="text-[#0B192C] font-bold text-sm leading-tight mt-1">
                {activeCategory}
              </Text>
              <Text className="text-[#0B192C] font-normal text-xs leading-tight mt-0.5">
                {isWholesale ? "Wholesale" : "Retail"}
              </Text>
            </View>

            <View className="mt-2">
              <Text className="text-[#0B192C] font-bold text-xs leading-tight">
                {activeDate}
              </Text>
              <Text className="text-[#0B192C] font-bold text-xs leading-tight mt-0.5">
                {activeTimeSlot}
              </Text>
            </View>

            {/* Horizontal Divider Line */}
            <View className="h-[1px] bg-slate-400 my-1.5 w-full" />

            <View>
              <Text className="text-[#0B192C] font-normal text-xs leading-tight">
                {activeStepLabel}
              </Text>
              <Text className="text-[#0B192C] font-normal text-xs leading-tight mt-0.5">
                {activeStepIndex}
              </Text>
            </View>
          </View>

          {/* Right Column: 27mm x 27mm Right-Aligned QR Code */}
          <View className="w-[52%] aspectRatio-1 p-2 bg-white border border-slate-200 rounded items-center justify-center">
            <QRCode
              value={qrValue}
              size={135}
              color="black"
              backgroundColor="white"
            />
          </View>
        </View>
      </ScrollView>

      <View className="px-6 pt-4 bg-white gap-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handleBack}
          disabled={isPrinting}
          className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center mb-1"
          activeOpacity={0.8}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            className="text-[#030E25] font-extrabold text-sm"
            style={{
              color: "#030E25",
              fontSize: 14,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePrintPress}
          disabled={isPrinting}
          className={`w-full h-[50px] rounded-full items-center justify-center ${isPrinting ? "bg-gray-400" : "bg-black"}`}
          activeOpacity={0.8}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {isPrinting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              className="text-white font-extrabold text-base"
              style={{
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {route.params?.isReprint ? "Start Again" : `Print (${currentStep})`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <EndShiftModal
        visible={endShiftModalVisible}
        onClose={() => setEndShiftModalVisible(false)}
        navigation={navigation}
        positionText="QR Position"
      />

      <AlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (alertType === "success") {
            if (currentStep >= steps.length) {
              navigation.navigate("QRHandling");
            } else {
              setCurrentStep(currentStep + 1);
            }
          }
        }}
      />

      {/* Bluetooth Printer Select Modal matching Expo57-QR-Printer */}
      <PrinterSelectModal
        visible={isPrinterModalOpen}
        onClose={() => {
          setIsPrinterModalOpen(false);
          stopScan();
        }}
        devices={discoveredDevices}
        isScanning={isScanning}
        isConnecting={isConnecting}
        connectedDevice={connectedDevice}
        onStartScan={startScan}
        onSelectDevice={handleSelectPrinter}
        onDisconnect={disconnect}
      />
    </View>
  );
}
