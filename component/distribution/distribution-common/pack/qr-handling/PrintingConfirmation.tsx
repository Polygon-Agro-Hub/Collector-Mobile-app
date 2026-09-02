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
  buildTheme2TSPL,
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

  const getFallbackDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  };

  const activeCategory = category || "Moragahahena";
  const activeDate = route.params?.date || getFallbackDate();
  const activeTimeSlot = route.params?.timeSlot || "08:00AM - 12:00PM";
  const activeStepLabel = activeStep?.label || "A la carte";
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

    if (isPrinting || isProcessing) return;
    setIsProcessing(true);

    let backendOpenedSuccessfully = false;
    let isMainContainerStep = activeStep.type === "main";
    let targetOrderPackageId = isMainContainerStep ? null : (activeStep.packageId || null);

    try {
      // 2. Validate with backend first (Check next station busy / position assigned)
      const token = (await AsyncStorage.getItem("@access_token")) || store.getState().auth.token;

      if (isMainContainerStep) {
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
          setIsProcessing(false);
          return; // Stop here! Do NOT print sticker
        }
      } else {
        const isPackageStep = activeStep.type === "package";
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            orderpackageId: targetOrderPackageId,
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
          setIsProcessing(false);
          return; // Stop here! Do NOT print sticker
        }
      }

      backendOpenedSuccessfully = true;

      // 3. Backend validated and updated successfully — now print the physical TSPL sticker
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

      const tspl = buildTheme2TSPL(labelData);
      
      try {
        await printTSPL(tspl);
      } catch (printErr: any) {
        console.error("Physical print failed, executing rollback:", printErr);
        // Rollback backend tracking changes because physical print failed
        try {
          await axios.post(
            `${environment.API_BASE_URL}api/packing/qr-rollback`,
            {
              orderId: processOrderId,
              orderpackageId: targetOrderPackageId,
              isMainContainer: isMainContainerStep,
              rowId: route.params?.rowId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (rbErr) {
          console.error("Failed to execute backend rollback:", rbErr);
        }

        setAlertType("error");
        setAlertTitle("Printer Error");
        setAlertMessage(
          printErr?.message || "Failed to print sticker on thermal printer. Order state was reverted. Please check your printer connection and try again."
        );
        setAlertVisible(true);
        setIsProcessing(false);
        return; // Do NOT advance step
      }

      // 4. Physical printing succeeded!
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
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Error updating order status on QR print:", err);
      const msg = err.response?.data?.message || err.message || "Failed to communicate with packing server. Please try again.";
      const code = err.response?.data?.code;

      if (backendOpenedSuccessfully) {
        // Rollback if needed
        try {
          const token = (await AsyncStorage.getItem("@access_token")) || store.getState().auth.token;
          await axios.post(
            `${environment.API_BASE_URL}api/packing/qr-rollback`,
            {
              orderId: processOrderId,
              orderpackageId: targetOrderPackageId,
              isMainContainer: isMainContainerStep,
              rowId: route.params?.rowId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (rbErr) {
          console.error("Failed to execute backend rollback in catch:", rbErr);
        }
      }

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
      setIsProcessing(false);
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
        <View className="items-center mb-4 mt-2">
          <Text className="text-xl font-bold text-slate-950">
            Printing Confirmation
          </Text>
        </View>

        {/* Dynamic Progress step segments at top */}
        {steps.length > 1 && (
          <View className="flex-row justify-between items-center gap-2 px-2 mb-6">
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
        <View className="items-center mb-4 w-full px-2">
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

        {/* Calibrated Theme 2 Standard Thermal Sticker Preview Card */}
        <View className="items-center justify-center my-3">
          <View
            className="bg-white border-2 border-black rounded-lg p-3 w-[270px] h-[162px] shadow-sm justify-between"
            style={{
              borderColor: "#000000",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Top Section: Left Details & Right Large QR */}
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-2">
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: "#000000",
                    letterSpacing: -0.2,
                  }}
                >
                  {cleanInv}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#000000",
                    marginTop: 2,
                  }}
                >
                  {activeCategory}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#000000",
                    marginTop: 1,
                  }}
                >
                  {isWholesale ? "Wholesale" : "Retail"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#000000",
                    marginTop: 1,
                  }}
                >
                  {activeDate}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#000000",
                    marginTop: 1,
                  }}
                >
                  {activeTimeSlot}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: "#000000",
                    marginTop: 2,
                  }}
                >
                  {activeStepIndex}
                </Text>
              </View>

              {/* Exact Proportion High Contrast QR Code */}
              <View
                style={{
                  width: 96,
                  height: 96,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#ffffff",
                }}
              >
                <QRCode
                  value={qrValue}
                  size={90}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  quietZone={0}
                />
              </View>
            </View>

            {/* Full Divider Line with Package Name Below */}
            <View className="w-full">
              <View
                style={{
                  height: 1.5,
                  backgroundColor: "#000000",
                  width: "100%",
                  marginBottom: 2,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: "#000000",
                  paddingLeft: 2,
                }}
              >
                {activeStepLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Printer Connectivity Status Banner */}
        <View
          style={{
            backgroundColor: connectedDevice ? "#f0fdf4" : "#fef2f2",
            borderWidth: 1,
            borderColor: connectedDevice ? "#bbf7d0" : "#fecaca",
            borderRadius: 16,
            padding: 12,
            marginTop: 8,
            marginBottom: 20,
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
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: connectedDevice ? "#16a34a" : "#030E25",
              borderRadius: 16,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }}>
              {connectedDevice ? "Change" : "Connect"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Buttons */}
      <View
        className="px-6 pt-3 bg-white"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          onPress={handleBack}
          disabled={isPrinting || isProcessing}
          className="w-full h-[44px] bg-[#E9ECF1] rounded-full items-center justify-center mb-2"
          activeOpacity={0.8}
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
          disabled={isPrinting || isProcessing}
          className={`w-full h-[50px] rounded-full items-center justify-center ${
            isPrinting || isProcessing ? "bg-gray-400" : "bg-black"
          }`}
          activeOpacity={0.8}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {isPrinting || isProcessing ? (
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

      {/* Bluetooth Printer Select Modal */}
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
