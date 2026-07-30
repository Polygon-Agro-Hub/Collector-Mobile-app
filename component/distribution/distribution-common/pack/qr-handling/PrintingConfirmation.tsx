import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import CustomHeader from "@/component/navigations/CustomHeader";

interface PrintStep {
  id: number;
  label: string;
  textColor: string;
  circleBgColor: string;
  circleTextColor: string;
}

export default function PrintingConfirmation({ route, navigation }: { route: any; navigation: any }) {
  const { orderNumber = "26050500001 (R)", category = "Pickup Order" } = route.params || {};

  // Convert (R) to (Retail) and (W) to (Wholesale) for display inside the QR card
  const displayOrderNumber = orderNumber.includes("(R)")
    ? orderNumber.replace("(R)", "(Retail)")
    : orderNumber.includes("(W)")
    ? orderNumber.replace("(W)", "(Wholesale)")
    : orderNumber;

  // State to track the current printing step (1 to 4)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // List of print steps as specified:
  // 1. Main Container (Black)
  // 2. Fruit Pack (#980775)
  // 3. Spices Pack (#980775)
  // 4. À la carte (#AC7F5E)
  const steps: PrintStep[] = [
    {
      id: 1,
      label: "Main Container",
      textColor: "text-black",
      circleBgColor: "bg-slate-100",
      circleTextColor: "text-slate-700",
    },
    {
      id: 2,
      label: "Fruit Pack",
      textColor: "text-[#980775]",
      circleBgColor: "bg-[#fdf4ff]",
      circleTextColor: "text-[#980775]",
    },
    {
      id: 3,
      label: "Spices Pack",
      textColor: "text-[#980775]",
      circleBgColor: "bg-[#fdf4ff]",
      circleTextColor: "text-[#980775]",
    },
    {
      id: 4,
      label: "À la carte",
      textColor: "text-[#AC7F5E]",
      circleBgColor: "bg-[#fdf8f6]",
      circleTextColor: "text-[#AC7F5E]",
    },
  ];

  const activeStep = steps[currentStep - 1];

  const handlePrintPress = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert("Success", "All packages printed successfully!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("Main", { screen: "DistridutionaDashboard" });
          },
        },
      ]);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={handleBack}
      />

      {/* Main Scrollable Content Area */}
      <ScrollView className="flex-1 bg-white px-6">
        {/* Header Title section matching ReadyToPrint design */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-slate-950">Printing Confirmation</Text>
        </View>

        {/* Progress step segments at top */}
        <View className="flex-row justify-between items-center gap-2 px-2 mb-8">
          {[1, 2, 3, 4].map((stepNum) => {
            const isFilled = stepNum <= currentStep;
            return (
              <View
                key={stepNum}
                className={`h-1.5 flex-1 rounded-full ${
                  isFilled ? "bg-[#09152B]" : "bg-gray-200"
                }`}
              />
            );
          })}
        </View>

        {/* Step Index Circle and Label */}
        <View className="flex-row items-center justify-center mb-6 gap-2">
          {/* Circular step count indicator */}
          <View className={`w-8 h-8 rounded-full items-center justify-center bg-[#E9ECF1]`}>
            <Text className={`font-bold text-sm text-[#030E25]`}>
              {String(currentStep).padStart(2, "0")}
            </Text>
          </View>
          {/* Label */}
          <Text className={`font-bold text-lg ${activeStep.textColor}`}>
            {activeStep.label}
          </Text>
        </View>

        {/* Square Black Border QR Code Box */}
        <View className="items-center justify-center bg-white border border-black p-6 mb-6">
          <View className="p-4 bg-white mb-4">
            <QRCode
              value={orderNumber}
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

      {/* Print Button Pinned to Bottom */}
      <View className="px-6 pt-4 pb-8 bg-white">
        <TouchableOpacity
          onPress={handlePrintPress}
          className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-white font-extrabold text-base">
            Print ({currentStep})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
