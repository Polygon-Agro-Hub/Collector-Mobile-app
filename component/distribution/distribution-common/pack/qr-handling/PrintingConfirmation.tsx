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
import { generateLabelHTML, LabelTheme } from "@/utils/packing/label-templates";
import { usePrinter } from "@/services/printer/usePrinter";
import {
  LabelThemeData,
  buildTheme1TSPL,
  buildTheme2TSPL,
} from "@/services/printer/Tspllabelbuilder";
import { PrinterSelectModal } from "@/component/components/popup/PrinterSelectModal";
import {
  generatePrintSteps,
  PrintStep,
} from "@/utils/packing/packing-helpers";

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
  } = route.params || {};

  const insets = useSafeAreaInsets();
  const [endShiftModalVisible, setEndShiftModalVisible] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<LabelTheme>("theme1");
  const [sampleData, setSampleData] = useState<any>(null);

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
  const initialStep = firstUnprintedIndex !== -1 ? firstUnprintedIndex + 1 : steps.length;

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState<string>("Success");

  const activeStep = steps[currentStep - 1] || steps[0];
  const qrValue = cleanInv || invoiceNumber || orderNumber;

  // Active Label Fields (Sample data overrides or route params)
  const activeCleanInv = sampleData?.cleanInv || cleanInv;
  const activeCategory = sampleData?.category || category || "Moragahahena";
  const activeIsWholesale = sampleData ? sampleData.isWholesale : isWholesale;
  const activeDate = sampleData?.date || route.params?.date || "2026/08/25";
  const activeTimeSlot = sampleData?.timeSlot || route.params?.timeSlot || "08:00AM - 12:00PM";
  const activeStepLabel = sampleData?.stepLabel || activeStep?.label || "à la carte";
  const activeStepIndex = sampleData?.stepIndex || `Step ${currentStep}/${steps.length}`;
  const activeQrValue = sampleData?.qrValue || qrValue;

  const handleGenerateSampleData = () => {
    setSampleData({
      cleanInv: "2608180003",
      category: "Moragahahena",
      isWholesale: true,
      date: "2026/08/25",
      timeSlot: "08:00AM - 12:00PM",
      stepLabel: "à la carte",
      stepIndex: "Step 1/1",
      qrValue: "2608180003",
    });
    setAlertType("success");
    setAlertTitle("Sample Data Loaded");
    setAlertMessage("Sample 50mm x 30mm label data generated! Press Print to test.");
    setAlertVisible(true);
  };

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

  const handlePrintPress = async () => {
    // Force user to select a printer first if not connected
    if (!connectedDevice) {
      handleOpenPrinterModal();
      setAlertType("error");
      setAlertTitle("Printer Required");
      setAlertMessage("Please select a Bluetooth thermal printer first before printing.");
      setAlertVisible(true);
      return;
    }

    if (isPrinting) return;
    try {
      const labelData: LabelThemeData = {
        qrValue: activeQrValue,
        orderNumber: activeCleanInv,
        category: activeCategory,
        orderType: activeIsWholesale ? "Wholesale" : "Retail",
        date: activeDate,
        timeSlot: activeTimeSlot,
        stepLabel: activeStepLabel,
        stepIndex: activeStepIndex,
      };

      // 1. Build TSPL command strictly for 50mm x 30mm sticker
      const tspl = selectedTheme === "theme1" ? buildTheme1TSPL(labelData) : buildTheme2TSPL(labelData);
      await printTSPL(tspl);

      const printerName = connectedDevice.displayName || connectedDevice.name;
      const themeName = selectedTheme === "theme1" ? "Horizontal" : "Vertical (90° Rotated)";
      setAlertType("success");
      setAlertTitle("Print Successful");
      if (currentStep < steps.length) {
        const stepName = steps[currentStep - 1]?.label || "Package";
        setAlertMessage(`${stepName} QR label printed on ${printerName} (${themeName})!`);
      } else {
        setAlertMessage(`Label printed on ${printerName} (${themeName})!`);
      }
      setAlertVisible(true);
    } catch (err: any) {
      console.error("Bluetooth print error:", err);
      setAlertType("error");
      setAlertTitle("Print Error");
      setAlertMessage(err?.message || "Failed to print label to Bluetooth thermal printer.");
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
        {/* Header Title section matching ReadyToPrint design */}
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
              const isFilled = stepNum <= currentStep || (s as any).isPrinted;
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

            {/* Label Text - Fully Visible */}
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

        {/* Generate Sample Test Data Card */}
        <TouchableOpacity
          onPress={handleGenerateSampleData}
          className="mb-5 bg-purple-50 border border-purple-200 p-3.5 rounded-2xl flex-row items-center justify-between shadow-sm"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
            <Ionicons name="sparkles" size={20} color="#980775" />
            <View className="flex-1">
              <Text className="text-xs font-extrabold text-[#980775]">
                Generate Sample Test Data
              </Text>
              <Text className="text-[10px] text-slate-500 font-medium mt-0.5">
                50mm x 30mm Scale • 28mm x 28mm QR Code
              </Text>
            </View>
          </View>
          <View className="bg-[#980775] px-3 py-1.5 rounded-xl">
            <Text className="text-white text-[11px] font-extrabold">Sample</Text>
          </View>
        </TouchableOpacity>

        {/* Label Design Theme Selector */}
        <View className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <Text className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
            Select Label Layout Theme
          </Text>

          <View className="flex-row gap-3">
            {/* Theme 1: Horizontal */}
            <TouchableOpacity
              onPress={() => setSelectedTheme("theme1")}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                selectedTheme === "theme1"
                  ? "bg-[#030E25] border-[#030E25]"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-extrabold text-xs text-center ${
                  selectedTheme === "theme1" ? "text-white" : "text-slate-900"
                }`}
              >
                Theme 1 (Horizontal)
              </Text>
              <Text
                className={`text-[10px] mt-0.5 text-center ${
                  selectedTheme === "theme1" ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Standard Left Text
              </Text>
            </TouchableOpacity>

            {/* Theme 2: Vertical 90° Rotated */}
            <TouchableOpacity
              onPress={() => setSelectedTheme("theme2")}
              className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                selectedTheme === "theme2"
                  ? "bg-[#030E25] border-[#030E25]"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-extrabold text-xs text-center ${
                  selectedTheme === "theme2" ? "text-white" : "text-slate-900"
                }`}
              >
                Theme 2 (Vertical 90°)
              </Text>
              <Text
                className={`text-[10px] mt-0.5 text-center ${
                  selectedTheme === "theme2" ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Rotated Text
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 50mm x 30mm Sticker Label Preview Card (Left Text, Right 28x28mm QR Code) */}
        <View className="bg-white border border-slate-300 p-3.5 mb-6 rounded-lg flex-row justify-between items-center shadow-sm">
          {/* Left Column Details */}
          {selectedTheme === "theme2" ? (
            <View className="w-[46%] items-center justify-center py-0.5 h-[135px]">
              <View style={{ transform: [{ rotate: "-90deg" }], width: 135, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Text className="text-[#000000] font-black text-sm leading-tight tracking-tight">
                  {activeCleanInv}
                </Text>
                <Text className="text-[#0B192C] font-extrabold text-[10px] leading-tight mt-0.5">
                  {activeCategory} • {activeIsWholesale ? "Wholesale" : "Retail"}
                </Text>
                <Text className="text-[#0B192C] font-bold text-[9px] leading-tight mt-0.5">
                  {activeDate} {activeTimeSlot}
                </Text>
                <View className="h-[1px] bg-slate-400 my-1 w-full" />
                <Text className="text-[#0B192C] font-bold text-[9px] leading-tight">
                  {activeStepLabel} ({activeStepIndex})
                </Text>
              </View>
            </View>
          ) : (
            <View className="w-[46%] justify-between py-0.5">
              <View>
                <Text className="text-[#000000] font-black text-lg leading-tight tracking-tight">
                  {activeCleanInv}
                </Text>
                <Text className="text-[#0B192C] font-bold text-sm leading-tight mt-0.5">
                  {activeCategory}
                </Text>
                <Text className="text-[#0B192C] font-normal text-xs leading-tight mt-0.5">
                  {activeIsWholesale ? "Wholesale" : "Retail"}
                </Text>
              </View>

              <View className="mt-2.5">
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
          )}

          {/* Right Column: 28mm x 28mm Right-Aligned QR Code */}
          <View className="w-[52%] aspectRatio-1 p-2 bg-white border border-slate-200 rounded items-center justify-center">
            <QRCode
              value={activeQrValue}
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
          if (alertType === "success" && alertTitle === "Print Successful") {
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
