import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import axios from "axios";
import { environment } from "@/environment/environment";
import AlertModal from "@/component/components/popup/AlertModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PrintStep {
  id: number;
  type: "main" | "package" | "alacarte";
  label: string;
  formattedIndex: string;
  textColor: string;
  circleBgColor: string;
  circleTextColor: string;
  packageId?: number;
  packageIndex?: number;
}

export interface PackageItem {
  id: number;
  name: string;
  count: number;
}

export default function PrintingConfirmation({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const {
    orderNumber = "2607300005 (R)",
    invoiceNumber = "2607300005",
    category = "Pickup Order",
    packagesList = [
      { id: 1, name: "Daily Veggie Pack", count: 3 },
      { id: 2, name: "Fruit & Veggie Family Pack", count: 4 },
      { id: 3, name: "Smart Prep Veggie Box", count: 2 },
    ],
    alacarteCount = 3,
  } = route.params || {};

  const insets = useSafeAreaInsets();
  const rawType = String(route.params?.type || "").toUpperCase();
  const isWholesale = rawType === "W" || rawType === "WHOLESALE" || String(orderNumber).includes("(W)") || String(orderNumber).includes("(Wholesale)") || String(orderNumber).includes("Wholesale");
  const cleanInv = String(invoiceNumber || orderNumber).replace(/\s*\([^\)]*\)/g, "").trim();
  const displayOrderNumber = isWholesale ? `${cleanInv} (Wholesale)` : `${cleanInv} (Retail)`;

  // Build dynamic print steps based on package count
  const steps: PrintStep[] = [];

  // Calculate total physical packages based on package quantity (pkg.qty)
  const totalPhysicalPackages = packagesList && packagesList.length > 0
    ? packagesList.reduce((acc: number, pkg: any) => acc + Math.max(1, Number(pkg.qty || 1)), 0)
    : 0;

  // Calculate total physical boxes (Package boxes + 1 Alacarte box if present)
  const totalBoxes = totalPhysicalPackages + (alacarteCount > 0 ? 1 : 0);

  // 1. If total physical boxes > 1, add Main Container as Step 1
  if (totalBoxes > 1) {
    steps.push({
      id: 1,
      type: "main",
      label: "Main Container",
      formattedIndex: "01",
      textColor: "#000000",
      circleBgColor: "bg-slate-100",
      circleTextColor: "text-black",
    });
  }

  // 2. Add individual package steps based on actual package quantity (pkg.qty)
  if (packagesList && packagesList.length > 0) {
    packagesList.forEach((pkg: any, pkgIdx: number) => {
      const pkgQty = Math.max(1, Number(pkg.qty || 1));
      for (let i = 0; i < pkgQty; i++) {
        const stepId = steps.length + 1;
        const formattedIndex = String(stepId).padStart(2, "0");
        const label = pkgQty > 1 ? `${pkg.name} (${i + 1}/${pkgQty})` : pkg.name;
        steps.push({
          id: stepId,
          type: "package",
          label: label,
          formattedIndex,
          textColor: "#980775",
          circleBgColor: "bg-[#fdf4ff]",
          circleTextColor: "text-[#980775]",
          packageId: pkg.id,
          packageIndex: pkgIdx,
        });
      }
    });
  }

  // 3. Add final À la carte step
  if (alacarteCount > 0) {
    const stepId = steps.length + 1;
    const formattedIndex = String(stepId).padStart(2, "0");
    steps.push({
      id: stepId,
      type: "alacarte",
      label: "À la carte",
      formattedIndex,
      textColor: "#AC7F5E",
      circleBgColor: "bg-[#fdf8f6]",
      circleTextColor: "text-[#AC7F5E]",
    });
  }

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

  const activeStep = steps[currentStep - 1] || steps[0];
  const qrValue = invoiceNumber || orderNumber;

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

  const handlePrintPress = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const isReprint = route.params?.isReprint;
      if (isReprint) {
        setAlertType("success");
        setAlertTitle("Success");
        if (currentStep < steps.length) {
          const stepName = steps[currentStep - 1]?.label || "Package";
          setAlertMessage(`${stepName} QR Code Re-printed Successfully!`);
        } else {
          setAlertMessage(
            `All packages for order ${orderNumber} re-printed successfully!`,
          );
        }
        setAlertVisible(true);
        return;
      }

      const token = store.getState().auth.token;
      const processOrderId =
        route.params?.processOrderId || route.params?.orderId || 3131;

      const activeStep = steps[currentStep - 1] || steps[0];

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
          if (code === "STATION_OCCUPIED") {
            setAlertTitle("Position Busy");
            setAlertMessage(msg);
          } else if (code === "NO_OFFICER_ASSIGNED") {
            setAlertTitle("Position Empty");
            setAlertMessage(msg);
          } else {
            setAlertTitle("Error");
            setAlertMessage(msg);
          }
          setAlertVisible(true);
          return;
        }

        setAlertType("success");
        setAlertTitle("Success");
        setAlertMessage("Main Container QR Code Printed Successfully!");
        setAlertVisible(true);
      } else {
        const isPackageStep = activeStep.type === "package";
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            orderpackageId: activeStep.packageId || null,
            isPackage: isPackageStep ? 1 : 0,
            packageIndex: isPackageStep ? (activeStep.packageIndex ?? 0) : 0,
            rowId: route.params?.rowId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data && response.data.success === false) {
          const code = response.data.code;
          const msg = response.data.message || "An error occurred.";
          setAlertType("error");
          if (code === "STATION_OCCUPIED") {
            setAlertTitle("Position Busy");
            setAlertMessage(msg);
          } else if (code === "NO_OFFICER_ASSIGNED") {
            setAlertTitle("Position Empty");
            setAlertMessage(msg);
          } else {
            setAlertTitle("Error");
            setAlertMessage(msg);
          }
          setAlertVisible(true);
          return;
        }

        setAlertType("success");
        setAlertTitle("Success");
        if (currentStep < steps.length) {
          const stepName = steps[currentStep - 1]?.label || "Package";
          setAlertMessage(`${stepName} QR Code Printed Successfully!`);
          setAlertVisible(true);
        } else {
          setAlertMessage(
            `All packages for order ${orderNumber} printed successfully!`,
          );
          setAlertVisible(true);
        }
      }

    } catch (err: any) {
      console.error("Error updating order status on QR print:", err);
      const msg = err.response?.data?.message || "Failed to communicate with packing server. Please try again.";
      const code = err.response?.data?.code;

      setAlertType("error");
      if (code === "STATION_OCCUPIED") {
        setAlertTitle("Position Busy");
      } else if (code === "NO_OFFICER_ASSIGNED") {
        setAlertTitle("Position Empty");
      } else {
        setAlertTitle("Error");
      }
      setAlertMessage(msg);
      setAlertVisible(true);
    } finally {
      setIsPrinting(false);
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
      <CustomHeader title="" navigation={navigation} onBackPress={handleBack} />

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
        <View className="items-center mb-6">
          <View className="px-4 py-2 rounded-full flex-row items-center gap-2">
            {/* Index Badge */}
            <View className="bg-[#E9ECF1] px-2.5 py-2 rounded-full items-center justify-center">
              <Text className="font-extrabold text-xs text-[#030E25]">
                {activeStep?.formattedIndex}
              </Text>
            </View>

            {/* Label Text */}
            <Text
              className="font-extrabold text-sm"
              style={{ color: activeStep?.textColor || "#000000" }}
            >
              {activeStep?.label}
            </Text>
          </View>
        </View>

        {/* Standardized QR Code Card Frame matching ReadyToPrint */}
        <View className="items-center justify-center bg-white border border-black p-6 mb-6">
          <View className="p-4 bg-white mb-4">
            <QRCode
              value={qrValue}
              size={240}
              color="black"
              backgroundColor="white"
            />
          </View>
          <Text className="text-lg font-extrabold text-slate-950 tracking-tight text-center">
            {displayOrderNumber}
          </Text>
          <Text className="text-gray-400 text-xs mt-1 text-center font-medium">
            {category}
          </Text>
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
          <Text className="text-[#030E25] font-extrabold text-sm">Cancel</Text>
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
            <Text className="text-white font-extrabold text-base">
              {route.params?.isReprint ? "Start Again" : `Print (${currentStep})`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
    </View>
  );
}
