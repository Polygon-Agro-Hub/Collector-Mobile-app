import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { EndShiftHeaderRight, EndShiftModal } from "@/component/components/navigations/EndShiftModal";
import axios from "axios";
import environment from "@/environment/environment";
import AlertModal from "@/component/components/popup/AlertModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { generateLabelHTML, LabelTheme, LabelData } from "@/utils/packing/label-templates";

import {
  generatePrintSteps,
  PrintStep,
  PackageItem,
} from "@/utils/packing/packing-helpers";
import { PACKING_ERROR_CODES } from "@/constants/packing/error-codes";

import {
  saveSelectedPrinter,
  getSavedPrinter,
  SavedPrinter,
} from "@/utils/packing/printer-storage";

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
  const [selectedPrinter, setSelectedPrinter] = useState<Print.Printer | null>(null);
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinter | null>(null);
  const rawType = String(route.params?.type || "").toUpperCase();
  const isWholesale = rawType === "W" || rawType === "WHOLESALE" || String(orderNumber).includes("(W)") || String(orderNumber).includes("(Wholesale)") || String(orderNumber).includes("Wholesale");
  const cleanInv = String(invoiceNumber || orderNumber).replace(/\s*\([^\)]*\)/g, "").trim();
  const displayOrderNumber = isWholesale ? `${cleanInv} (Wholesale)` : `${cleanInv} (Retail)`;

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
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const [printerType, setPrinterType] = useState<"bluetooth" | "wifi">("bluetooth");
  const [selectedTheme, setSelectedTheme] = useState<LabelTheme>("theme1");

  const activeStep = steps[currentStep - 1] || steps[0];
  const qrValue = cleanInv || invoiceNumber || orderNumber;

  // Load saved default printer by name on mount
  useEffect(() => {
    getSavedPrinter().then((printer) => {
      if (printer) {
        setSavedPrinter(printer);
        setPrinterType(printer.type);
        if (printer.url && printer.name) {
          setSelectedPrinter({ name: printer.name, url: printer.url });
        }
      }
    });
  }, []);

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

  const [printerModalVisible, setPrinterModalVisible] = useState<boolean>(false);
  const [customPrinterName, setCustomPrinterName] = useState<string>("");

  const PRESET_PRINTERS: { name: string; type: "bluetooth" | "wifi" }[] = [
    { name: "Xprinter XP-365B / XP-420B", type: "bluetooth" },
    { name: "TSC / Gprinter Thermal Label", type: "bluetooth" },
    { name: "RawBT Thermal Printer Driver", type: "bluetooth" },
    { name: "Network Wi-Fi Printer (Port 9100)", type: "wifi" },
    { name: "System Default Printer", type: "wifi" },
  ];

  const handleChoosePrinter = async (name: string, type: "bluetooth" | "wifi", url?: string) => {
    const saved: SavedPrinter = { name, url: url || "", type };
    setSavedPrinter(saved);
    setPrinterType(type);
    setSelectedPrinter({ name, url: url || "" });
    await saveSelectedPrinter(saved);
    setPrinterModalVisible(false);
  };

  const handleSelectPrinter = async () => {
    setPrinterModalVisible(true);
  };

  const handlePrintPress = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const labelData: LabelData = {
        cleanInv,
        category: category || "Moragahahena",
        orderType: isWholesale ? "Wholesale" : "Retail",
        date: route.params?.date || "2026/08/25",
        timeSlot: route.params?.timeSlot || "08:00AM - 12:00PM",
        stepLabel: activeStep?.label || "à la carte",
        stepIndex: `Step ${currentStep}/${steps.length}`,
        qrValue,
      };

      const printHtml = generateLabelHTML(labelData, selectedTheme);

      if (printerType === "wifi" && selectedPrinter?.url) {
        await Print.printAsync({ html: printHtml, printerUrl: selectedPrinter.url });
      } else {
        await Print.printAsync({ html: printHtml });
      }

      const modeName = printerType === "bluetooth" ? "Bluetooth Thermal" : "Wi-Fi Network";
      const themeName = selectedTheme === "theme1" ? "Horizontal" : "Vertical (90° Rotated)";
      setAlertType("success");
      setAlertTitle("Success");
      if (currentStep < steps.length) {
        const stepName = steps[currentStep - 1]?.label || "Package";
        setAlertMessage(`${stepName} QR Code Printed (${themeName}) via ${modeName} Printer!`);
      } else {
        setAlertMessage(`All packages for order ${orderNumber} printed (${themeName}) via ${modeName} Printer!`);
      }
      setAlertVisible(true);
    } catch (err: any) {
      console.error("Local print error:", err);
      setAlertType("error");
      setAlertTitle("Print Error");
      setAlertMessage(err?.message || "Failed to print label.");
      setAlertVisible(true);
    } finally {
      setIsPrinting(false);
    }
  };;

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

        {/* Active Printer Status & Selection Card */}
        <View className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Selected Printer
            </Text>
            <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
              {selectedPrinter?.name || savedPrinter?.name || "System Default Thermal Printer"}
            </Text>
            <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
              {printerType === "bluetooth" ? "Bluetooth Mode" : "Wi-Fi / LAN Mode"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSelectPrinter}
            className="bg-[#030E25] px-3.5 py-2 rounded-xl flex-row items-center gap-1.5"
            activeOpacity={0.8}
          >
            <Ionicons name="print" size={14} color="#ffffff" />
            <Text className="text-white text-xs font-extrabold">
              {selectedPrinter || savedPrinter ? "Change" : "Select"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Printer Connection Mode Selector */}
        <View className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <Text className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
            Select Printer Connection
          </Text>

          <View className="flex-row gap-3">
            {/* Bluetooth Printer Mode */}
            <TouchableOpacity
              onPress={() => setPrinterType("bluetooth")}
              className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
                printerType === "bluetooth"
                  ? "bg-[#030E25] border-[#030E25]"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bluetooth"
                size={18}
                color={printerType === "bluetooth" ? "#ffffff" : "#030E25"}
              />
              <View className="flex-1">
                <Text
                  className={`font-extrabold text-xs ${
                    printerType === "bluetooth" ? "text-white" : "text-slate-900"
                  }`}
                >
                  Bluetooth
                </Text>
                <Text
                  className={`text-[10px] ${
                    printerType === "bluetooth" ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Thermal Printer
                </Text>
              </View>
            </TouchableOpacity>

            {/* Wi-Fi Printer Mode */}
            <TouchableOpacity
              onPress={() => setPrinterType("wifi")}
              className={`flex-1 p-3 rounded-xl border flex-row items-center gap-2 ${
                printerType === "wifi"
                  ? "bg-[#030E25] border-[#030E25]"
                  : "bg-white border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="wifi"
                size={18}
                color={printerType === "wifi" ? "#ffffff" : "#030E25"}
              />
              <View className="flex-1">
                <Text
                  className={`font-extrabold text-xs ${
                    printerType === "wifi" ? "text-white" : "text-slate-900"
                  }`}
                >
                  Wi-Fi / LAN
                </Text>
                <Text
                  className={`text-[10px] ${
                    printerType === "wifi" ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Network Printer
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

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
                  {cleanInv}
                </Text>
                <Text className="text-[#0B192C] font-extrabold text-[10px] leading-tight mt-0.5">
                  {category || "Moragahahena"} • {isWholesale ? "Wholesale" : "Retail"}
                </Text>
                <Text className="text-[#0B192C] font-bold text-[9px] leading-tight mt-0.5">
                  {route.params?.date || "2026/08/25"} {route.params?.timeSlot || "08:00AM - 12:00PM"}
                </Text>
                <View className="h-[1px] bg-slate-400 my-1 w-full" />
                <Text className="text-[#0B192C] font-bold text-[9px] leading-tight">
                  {activeStep?.label || "à la carte"} (Step {currentStep}/{steps.length})
                </Text>
              </View>
            </View>
          ) : (
            <View className="w-[46%] justify-between py-0.5">
              <View>
                <Text className="text-[#000000] font-black text-lg leading-tight tracking-tight">
                  {cleanInv}
                </Text>
                <Text className="text-[#0B192C] font-bold text-sm leading-tight mt-0.5">
                  {category || "Moragahahena"}
                </Text>
                <Text className="text-[#0B192C] font-normal text-xs leading-tight mt-0.5">
                  {isWholesale ? "Wholesale" : "Retail"}
                </Text>
              </View>

              <View className="mt-2.5">
                <Text className="text-[#0B192C] font-bold text-xs leading-tight">
                  {route.params?.date || "2026/08/25"}
                </Text>
                <Text className="text-[#0B192C] font-bold text-xs leading-tight mt-0.5">
                  {route.params?.timeSlot || "08:00AM - 12:00PM"}
                </Text>
              </View>

              {/* Horizontal Divider Line */}
              <View className="h-[1px] bg-slate-400 my-1.5 w-full" />

              <View>
                <Text className="text-[#0B192C] font-normal text-xs leading-tight">
                  {activeStep?.label || "à la carte"}
                </Text>
                <Text className="text-[#0B192C] font-normal text-xs leading-tight mt-0.5">
                  Step {currentStep}/{steps.length}
                </Text>
              </View>
            </View>
          )}

          {/* Right Column: 28mm x 28mm Right-Aligned QR Code */}
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

      {/* Printer Selection Modal */}
      <Modal
        visible={printerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPrinterModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-xl">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-extrabold text-slate-900">
                Select Printer by Name
              </Text>
              <TouchableOpacity onPress={() => setPrinterModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Presets List */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Common Printers
            </Text>
            <View className="gap-2 mb-4">
              {PRESET_PRINTERS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleChoosePrinter(preset.name, preset.type)}
                  className={`p-3 rounded-xl border flex-row justify-between items-center ${
                    selectedPrinter?.name === preset.name
                      ? "bg-[#030E25] border-[#030E25]"
                      : "bg-slate-50 border-slate-200"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`font-bold text-xs ${
                      selectedPrinter?.name === preset.name ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {preset.name}
                  </Text>
                  <Text
                    className={`text-[10px] font-semibold ${
                      selectedPrinter?.name === preset.name ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {preset.type === "bluetooth" ? "BT" : "LAN"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Input */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Custom Printer Name / IP
            </Text>
            <View className="flex-row gap-2 mb-4">
              <TextInput
                value={customPrinterName}
                onChangeText={setCustomPrinterName}
                placeholder="e.g. XP-365B or 192.168.1.100"
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
              />
              <TouchableOpacity
                onPress={() => {
                  if (customPrinterName.trim()) {
                    handleChoosePrinter(customPrinterName.trim(), printerType);
                    setCustomPrinterName("");
                  }
                }}
                className="bg-[#030E25] px-4 rounded-xl items-center justify-center"
              >
                <Text className="text-white font-extrabold text-xs">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
