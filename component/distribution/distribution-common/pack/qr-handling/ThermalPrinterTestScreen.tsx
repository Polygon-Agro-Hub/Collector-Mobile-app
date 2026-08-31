import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrinter } from "@/services/printer/usePrinter";
import { PrinterSelectModal } from "@/component/components/popup/PrinterSelectModal";
import {
  LabelThemeData,
  buildTheme1TSPL,
  buildTheme2TSPL,
} from "@/services/printer/Tspllabelbuilder";

export default function ThermalPrinterTestScreen({
  navigation,
}: {
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const [customText, setCustomText] = useState<string>("Sample Test 50x30mm");
  const [customQr, setCustomQr] = useState<string>("2608180003");
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [logMessage, setLogMessage] = useState<string>("");

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

  const handleOpenPrinterModal = () => {
    setIsPrinterModalOpen(true);
    startScan();
  };

  const handleSelectPrinter = async (device: any) => {
    const success = await connectToDevice(device);
    if (success) {
      setIsPrinterModalOpen(false);
      setLogMessage(`Connected to ${device.displayName || device.name}`);
    }
  };

  // Print Raw Custom Text
  const handlePrintCustomText = async () => {
    if (!connectedDevice) {
      handleOpenPrinterModal();
      Alert.alert("Printer Required", "Please connect to a Bluetooth printer first.");
      return;
    }
    if (!customText.trim()) {
      Alert.alert("Input Required", "Please enter test text to print.");
      return;
    }
    try {
      setLogMessage("Sending text command...");
      const escaped = customText.replace(/"/g, '\\"');
      const lines: string[] = [
        "SIZE 50 mm, 30 mm",
        "GAP 2 mm, 0 mm",
        "DIRECTION 1",
        "CLS",
        `TEXT 16, 24, "3", 0, 1, 1, "${escaped}"`,
        `TEXT 16, 64, "2", 0, 1, 1, "Status: Connected OK"`,
        `TEXT 16, 100, "1", 0, 1, 1, "${new Date().toLocaleTimeString()}"`,
        "PRINT 1, 1",
      ];
      await printTSPL(lines.join("\r\n") + "\r\n");
      setLogMessage("Custom text printed successfully!");
      Alert.alert("Success", "Custom text printed successfully!");
    } catch (err: any) {
      setLogMessage(`Print failed: ${err.message}`);
      Alert.alert("Print Error", err?.message || "Failed to print text.");
    }
  };

  // Print Full 50mm x 30mm Label (with 28mm x 28mm QR Code)
  const handlePrintFullTestLabel = async () => {
    if (!connectedDevice) {
      handleOpenPrinterModal();
      Alert.alert("Printer Required", "Please connect to a Bluetooth printer first.");
      return;
    }
    try {
      setLogMessage("Sending full label command (50x30mm with 28x28mm QR)...");
      const labelData: LabelThemeData = {
        qrValue: customQr.trim() || "2608180003",
        orderNumber: customQr.trim() || "2608180003",
        category: "Moragahahena",
        orderType: "Wholesale",
        date: "2026/08/25",
        timeSlot: "08:00AM - 12:00PM",
        stepLabel: "à la carte",
        stepIndex: "Step 1/1",
      };
      const tspl = buildTheme1TSPL(labelData);
      await printTSPL(tspl);
      setLogMessage("Full test label printed successfully!");
      Alert.alert("Success", "50mm x 30mm test label printed!");
    } catch (err: any) {
      setLogMessage(`Label print failed: ${err.message}`);
      Alert.alert("Print Error", err?.message || "Failed to print label.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title="Printer Test Station"
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView className="flex-1 px-6 pt-4">
        {/* Connected Printer Status Banner */}
        <View
          style={{
            backgroundColor: connectedDevice ? "#f0fdf4" : "#fef2f2",
            borderWidth: 1,
            borderColor: connectedDevice ? "#bbf7d0" : "#fecaca",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 8 }}>
            <MaterialCommunityIcons
              name={connectedDevice ? "bluetooth-connect" : "bluetooth-off"}
              size={26}
              color={connectedDevice ? "#16a34a" : "#dc2626"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "bold",
                  color: connectedDevice ? "#14532d" : "#991b1b",
                }}
                numberOfLines={1}
              >
                {connectedDevice ? connectedDevice.displayName || connectedDevice.name : "No Printer Connected"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: connectedDevice ? "#166534" : "#b91c1c",
                }}
              >
                {connectedDevice ? "Bluetooth Ready (50x30mm TSPL)" : "Tap connect to scan devices"}
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

        {/* Section 1: Print Custom Text */}
        <View className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
            1. Print Custom Text Line
          </Text>
          <TextInput
            value={customText}
            onChangeText={setCustomText}
            placeholder="Type text to print..."
            placeholderTextColor="#94a3b8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold mb-3"
          />
          <TouchableOpacity
            onPress={handlePrintCustomText}
            disabled={isPrinting}
            className="bg-[#030E25] p-3.5 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
            activeOpacity={0.8}
          >
            {isPrinting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="text" size={16} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">Print Text</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section 2: Print 50mm x 30mm Label with QR */}
        <View className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
            2. Print 50x30mm Label (28x28mm QR)
          </Text>
          <TextInput
            value={customQr}
            onChangeText={setCustomQr}
            placeholder="Enter Order ID / QR Value (e.g. 2608180003)"
            placeholderTextColor="#94a3b8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold mb-3"
          />
          <TouchableOpacity
            onPress={handlePrintFullTestLabel}
            disabled={isPrinting}
            className="bg-[#980775] p-3.5 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
            activeOpacity={0.8}
          >
            {isPrinting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="qrcode-scan" size={18} color="#ffffff" />
                <Text className="text-white font-extrabold text-sm">Print 50x30mm Test Label</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Log */}
        {logMessage ? (
          <View className="bg-slate-100 border border-slate-200 rounded-xl p-3 mb-6">
            <Text className="text-xs font-mono text-slate-600">
              {logMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Printer Selection Modal */}
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
