import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  BackHandler,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import AlertModal from "@/component/commons/AlertModal";

interface PrintStep {
  id: number;
  label: string;
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

  // Convert (R) to (Retail) and (W) to (Wholesale) for display inside the QR card
  const displayOrderNumber = orderNumber.includes("(R)")
    ? orderNumber.replace("(R)", "(Retail)")
    : orderNumber.includes("(W)")
    ? orderNumber.replace("(W)", "(Wholesale)")
    : orderNumber;

  // Build dynamic print steps based on package count
  const steps: PrintStep[] = [];

  // 1. If packages > 1, add Main Container as Step 1
  if (packagesList && packagesList.length > 1) {
    steps.push({
      id: 1,
      label: "Main Container",
      textColor: "text-black",
      circleBgColor: "bg-slate-100",
      circleTextColor: "text-slate-700",
    });
  }

  // 2. Add individual package steps with item counts
  if (packagesList && packagesList.length > 0) {
    packagesList.forEach((pkg: PackageItem) => {
      const stepId = steps.length + 1;
      const countStr = String(pkg.count).padStart(2, "0");
      steps.push({
        id: stepId,
        label: `${countStr} ${pkg.name}`,
        textColor: "text-[#980775]",
        circleBgColor: "bg-[#fdf4ff]",
        circleTextColor: "text-[#980775]",
      });
    });
  }

  // 3. Add final À la carte step
  if (alacarteCount > 0) {
    const stepId = steps.length + 1;
    const countStr = String(alacarteCount).padStart(2, "0");
    steps.push({
      id: stepId,
      label: `${countStr} À la carte`,
      textColor: "text-[#AC7F5E]",
      circleBgColor: "bg-[#fdf8f6]",
      circleTextColor: "text-[#AC7F5E]",
    });
  }

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [alertVisible, setAlertVisible] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState<string>("Success");

  const activeStep = steps[currentStep - 1] || steps[0];
  const qrValue = invoiceNumber || orderNumber;

  useEffect(() => {
    const onBackPress = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        return true;
      }
      navigation.navigate("ReadyToPrint");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [currentStep, navigation]);

  const handlePrintPress = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const processOrderId = route.params?.processOrderId || route.params?.orderId || 3131;
      
      let currentPackageId: number | null = null;
      const hasMainContainer = packagesList && packagesList.length > 1;
      const packageStepIndex = hasMainContainer ? currentStep - 2 : currentStep - 1;

      if (packagesList && packageStepIndex >= 0 && packageStepIndex < packagesList.length) {
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
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.success === false && response.data.code === "STATION_OCCUPIED") {
          setAlertType("error");
          setAlertTitle("Position Busy");
          setAlertMessage(response.data.message || "Packing Position 1 is currently busy. Please wait until Position 1 completes its current box.");
          setAlertVisible(true);
          return;
        }

        setAlertType("success");
        setAlertTitle("Success");
        setAlertMessage("Main Container QR Code Printed Successfully!");
        setAlertVisible(true);
      } else {
        const isPackageStep = packagesList && packageStepIndex >= 0 && packageStepIndex < packagesList.length;
        const response = await axios.post(
          `${environment.API_BASE_URL}api/packing/qr-opened`,
          {
            orderId: processOrderId,
            orderpackageId: currentPackageId,
            isPackage: isPackageStep ? 1 : 0,
            packageIndex: isPackageStep ? packageStepIndex : 0,
            rowId: route.params?.rowId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.success === false && response.data.code === "STATION_OCCUPIED") {
          setAlertType("error");
          setAlertTitle("Position Busy");
          setAlertMessage(response.data.message || "Packing Position 1 is currently busy. Please wait until Position 1 completes its current box.");
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
          setAlertMessage(`All packages for order ${orderNumber} printed successfully!`);
          setAlertVisible(true);
        }
      }
    } catch (err: any) {
      console.error("Error updating order status on QR print:", err);
      const busyMsg = err.response?.data?.message;
      const isOccupied = err.response?.data?.code === "STATION_OCCUPIED";

      setAlertType("error");
      setAlertTitle(isOccupied ? "Position Busy" : "Error");
      setAlertMessage(
        busyMsg || "Failed to communicate with packing server. Please try again."
      );
      setAlertVisible(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.navigate("ReadyToPrint");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={handleBack}
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
        <View className="flex-row justify-between items-center gap-2 px-2 mb-8">
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isFilled = stepNum <= currentStep;
            return (
              <View key={s.id} className="flex-1 items-center">
                <View
                  className={`w-full h-1.5 rounded-full mb-1 ${
                    isFilled ? "bg-[#980775]" : "bg-gray-200"
                  }`}
                />
              </View>
            );
          })}
        </View>

        {/* Dynamic Step Active Pill Badge */}
        <View className="items-center mb-6">
          <View
            className={`px-5 py-2 rounded-full flex-row items-center gap-2 ${activeStep?.circleBgColor}`}
          >
            <Text
              className={`font-extrabold text-sm ${activeStep?.circleTextColor}`}
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

      <View className="px-6 pt-4 pb-8 bg-white">
        <TouchableOpacity
          onPress={handlePrintPress}
          className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white font-extrabold text-base">
            Print ({currentStep}/{steps.length})
          </Text>
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
