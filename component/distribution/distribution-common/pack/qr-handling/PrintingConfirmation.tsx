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
import AsyncStorage from "@react-native-async-storage/async-storage";
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

  // Convert (R) to (Retail) and (W) to (Wholesale) for display inside the QR card
  const displayOrderNumber = orderNumber.includes("(R)")
    ? orderNumber.replace("(R)", "(Retail)")
    : orderNumber.includes("(W)")
      ? orderNumber.replace("(W)", "(Wholesale)")
      : orderNumber;

  // Build dynamic print steps based on package count
  const steps: PrintStep[] = [];

  // Calculate total physical boxes (Package boxes + 1 Alacarte box if present)
  const totalBoxes =
    (packagesList ? packagesList.length : 0) + (alacarteCount > 0 ? 1 : 0);

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

  // 2. Add individual package steps with item counts
  if (packagesList && packagesList.length > 0) {
    packagesList.forEach((pkg: PackageItem) => {
      const stepId = steps.length + 1;
      const formattedIndex = String(stepId).padStart(2, "0");
      steps.push({
        id: stepId,
        type: "package",
        label: pkg.name,
        formattedIndex,
        textColor: "#980775",
        circleBgColor: "bg-[#fdf4ff]",
        circleTextColor: "text-[#980775]",
      });
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

  const [currentStep, setCurrentStep] = useState<number>(1);
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

      const token = await AsyncStorage.getItem("token");
      const processOrderId =
        route.params?.processOrderId || route.params?.orderId || 3131;

      let currentPackageId: number | null = null;
      const totalPhysicalBoxes =
        (packagesList ? packagesList.length : 0) + (alacarteCount > 0 ? 1 : 0);
      const hasMainContainer = totalPhysicalBoxes > 1;
      const packageStepIndex = hasMainContainer
        ? currentStep - 2
        : currentStep - 1;

      if (
        packagesList &&
        packageStepIndex >= 0 &&
        packageStepIndex < packagesList.length
      ) {
        currentPackageId = packagesList[packageStepIndex].id;
      }

      const isMainContainerStep = hasMainContainer && currentStep === 1;

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
        const isPackageStep =
          packagesList &&
          packageStepIndex >= 0 &&
          packageStepIndex < packagesList.length;
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            orderpackageId: currentPackageId,
            isPackage: isPackageStep ? 1 : 0,
            packageIndex: isPackageStep ? packageStepIndex : 0,
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
              const isFilled = stepNum <= currentStep;
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

      <View className="px-6 pt-4 bg-white" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handlePrintPress}
          disabled={isPrinting}
          className={`w-full h-[50px] rounded-full items-center justify-center shadow-lg ${isPrinting ? "bg-gray-400" : "bg-black"}`}
          activeOpacity={0.8}
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
