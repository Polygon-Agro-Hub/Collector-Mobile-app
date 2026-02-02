import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import Signature from "react-native-signature-canvas";
import { FontAwesome6, Ionicons, Entypo } from "@expo/vector-icons";
import { useFocusEffect, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/component/types";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

type DigitalSignatureNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DigitalSignature"
>;

type DigitalSignatureRouteProp = RouteProp<
  RootStackParamList,
  "DigitalSignature"
>;

interface DigitalSignatureProps {
  navigation: DigitalSignatureNavigationProp;
  route: DigitalSignatureRouteProp;
}

// Custom DashedBorder component
interface DashedBorderProps {
  children: React.ReactNode;
  style?: any;
  borderColor?: string;
  dashWidth?: number;
  gapWidth?: number;
  borderWidth?: number;
}

const DashedBorder = ({
  children,
  style,
  borderColor = "#2D7BFF",
  dashWidth = 10,
  gapWidth = 5,
  borderWidth = 2,
}: DashedBorderProps) => {
  return (
    <View style={[style, { position: "relative" }]}>
      {/* Top border */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: borderWidth,
          flexDirection: "row",
        }}
      >
        {Array.from({ length: Math.ceil(1000 / (dashWidth + gapWidth)) }).map(
          (_, i) => (
            <View
              key={`top-${i}`}
              style={{
                width: dashWidth,
                height: borderWidth,
                backgroundColor: borderColor,
                marginRight: gapWidth,
              }}
            />
          ),
        )}
      </View>

      {/* Right border */}
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: borderWidth,
          alignItems: "center",
        }}
      >
        {Array.from({ length: Math.ceil(1000 / (dashWidth + gapWidth)) }).map(
          (_, i) => (
            <View
              key={`right-${i}`}
              style={{
                width: borderWidth,
                height: dashWidth,
                backgroundColor: borderColor,
                marginBottom: gapWidth,
              }}
            />
          ),
        )}
      </View>

      {/* Bottom border */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: borderWidth,
          flexDirection: "row",
        }}
      >
        {Array.from({ length: Math.ceil(1000 / (dashWidth + gapWidth)) }).map(
          (_, i) => (
            <View
              key={`bottom-${i}`}
              style={{
                width: dashWidth,
                height: borderWidth,
                backgroundColor: borderColor,
                marginRight: gapWidth,
              }}
            />
          ),
        )}
      </View>

      {/* Left border */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: borderWidth,
          alignItems: "center",
        }}
      >
        {Array.from({ length: Math.ceil(1000 / (dashWidth + gapWidth)) }).map(
          (_, i) => (
            <View
              key={`left-${i}`}
              style={{
                width: borderWidth,
                height: dashWidth,
                backgroundColor: borderColor,
                marginBottom: gapWidth,
              }}
            />
          ),
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, margin: borderWidth }}>{children}</View>
    </View>
  );
};

export default function DigitalSignature({
  route,
  navigation,
}: DigitalSignatureProps) {
  const signatureRef = useRef<any>(null);
  const { orderId, fromScreen } = route.params;
  const [loading, setLoading] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<
    string | React.ReactNode
  >("");
  
  // KEY FIX: Use state to control if signature component should render
  const [shouldRenderSignature, setShouldRenderSignature] = useState(false);

  console.log("order id in digital sig screen", orderId, fromScreen);

  // Handle screen focus - this is the main fix
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const setupScreen = async () => {
        if (!isActive) return;

        // Reset all states
        setSignatureDrawn(false);
        setLoading(false);
        setShowSuccessModal(false);
        setSuccessMessage("");
        
        // CRITICAL: Unmount signature component first
        setShouldRenderSignature(false);

        // Lock orientation
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
        );

        // Wait for orientation to settle
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!isActive) return;
        
        // CRITICAL: Now remount the signature component
        setShouldRenderSignature(true);
      };

      setupScreen();

      // Cleanup function when screen loses focus
      return () => {
        isActive = false;
        // Unmount signature when leaving
        setShouldRenderSignature(false);
        // Unlock orientation when leaving this screen
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

  // Also handle with useEffect as backup
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    };
  }, []);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignatureDrawn(false);
  };

  const saveSignature = async (signatureBase64: string) => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        setLoading(false);
        navigation.navigate("Login");
        return;
      }

      if (!orderId) {
        Alert.alert("Error", "Order ID not provided");
        setLoading(false);
        return;
      }

      // Create FormData
      const formData = new FormData();

      // Prepare the signature file
      const base64Data = signatureBase64.includes(",")
        ? signatureBase64.split(",")[1]
        : signatureBase64;

      const fileName = `pickup_signature_${Date.now()}.png`;

      // Create file object for React Native
      const file = {
        uri: `data:image/png;base64,${base64Data}`,
        type: "image/png",
        name: fileName,
      };

      // Append the signature file to FormData
      formData.append("signature", file as any);

      // Append the orderId to FormData
      formData.append("orderId", orderId.toString());

      console.log("Saving pickup signature for order:", orderId);

      const response = await axios.post(
        `${environment.API_BASE_URL}api/pickup/update-pickup-Details`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        },
      );

      if (response.data.status === "success") {
        console.log("Pickup signature saved successfully:", response.data);

        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );

        const message = (
          <View className="items-center">
            <Text className="text-center text-[#4E4E4E] mb-5 mt-2">
              Pickup details for order:{" "}
              <Text className="font-bold text-[#000000]">
                {String(orderId)}
              </Text>{" "}
              has been saved successfully!
            </Text>
          </View>
        );

        setLoading(false);
        setSuccessMessage(message);
        setShowSuccessModal(true);

        setTimeout(() => {
          setShowSuccessModal(false);
          navigation.navigate("Main", { screen: "ReadytoPickupOrders" });
        }, 2500);
      } else {
        throw new Error(response.data.message || "Failed to save signature");
      }
    } catch (error: any) {
      console.error("Error saving pickup signature:", error);
      setLoading(false);

      let errorMessage = "Failed to save signature. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error("Server error response:", error.response.data);
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigation.navigate("Main", { screen: "ReadytoPickupOrders" });
  };

  const handleBackPress = () => {
    Alert.alert(
      "Cancel Signature",
      "Are you sure you want to cancel? Your signature will not be saved.",
      [
        {
          text: "No, Continue",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          onPress: () => {
            navigation.navigate("Main", { screen: "ReadytoPickupOrders" });
          },
        },
      ],
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBackPress();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  const handleOK = async (signature: string) => {
    if (!signature) {
      Alert.alert("Warning", "Please draw a signature before submitting");
      return;
    }

    if (!orderId) {
      Alert.alert("Error", "Order ID not available");
      return;
    }

    Alert.alert(
      "Confirm Signature",
      "Are you sure you want to save this signature for pickup?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Save",
          onPress: async () => {
            await saveSignature(signature);
          },
        },
      ],
    );
  };

  const handleSignatureChange = () => {
    setSignatureDrawn(true);
  };

  const signatureStyle = `
    .m-signature-pad {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      box-shadow: none;
    }
    .m-signature-pad--body {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
      padding: 0;
      border: none;
      width: 100% !important;
      height: 100% !important;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #DFEDFC;
    }
    canvas {
      background-color: #DFEDFC;
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
  `;

  if (!shouldRenderSignature) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#2D7BFF" />
        <Text className="mt-4 text-gray-600">Preparing signature pad...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 pb-3">
        {/* LEFT - BACK BUTTON */}
        <View style={{ width: wp(15) }}>
          <TouchableOpacity onPress={handleBackPress} className="items-start">
            <Entypo
              name="chevron-left"
              size={25}
              color="black"
              style={{
                backgroundColor: "#F7FAFF",
                borderRadius: 50,
                padding: wp(2.5),
              }}
            />
          </TouchableOpacity>
        </View>

        {/* CENTER - TITLE */}
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-gray-800">
            Customer's Digital Signature
          </Text>
        </View>

        {/* RIGHT - EMPTY SPACE FOR BALANCE */}
        <View style={{ width: wp(15) }} />
      </View>

      {/* SIGNATURE AREA */}
      <View className="flex-1 mx-10 mb-4 mt-2 rounded rounded-full">
        <DashedBorder
          style={{
            backgroundColor: "#DFEDFC",
            flex: 1,
            borderRadius: 10,
            overflow: "hidden",
          }}
          borderColor="#2D7BFF"
          dashWidth={15}
          gapWidth={8}
          borderWidth={3}
        >
          {/* CLEAR BUTTON */}
          <TouchableOpacity
            onPress={handleClear}
            className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg flex-row items-center z-10"
            style={{
              elevation: 10,
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
            disabled={loading}
          >
            <FontAwesome6 name="eraser" size={16} color="#2D7BFF" />
            <Text className="ml-2 text-[#2D7BFF] font-semibold">Clear</Text>
          </TouchableOpacity>

          {/* SIGNATURE CANVAS */}
          <View style={{ flex: 1 }}>
            <Signature
              ref={signatureRef}
              onOK={handleOK}
              onEnd={handleSignatureChange}
              webStyle={signatureStyle}
              autoClear={false}
              descriptionText=""
              style={{
                flex: 1,
                backgroundColor: "#DFEDFC",
              }}
            />
          </View>
        </DashedBorder>
      </View>

      {/* BOTTOM BUTTONS */}
      <View className="flex-row justify-between items-center px-4 pb-4">
        <TouchableOpacity
          onPress={handleBackPress}
          className="flex-row items-center bg-[#DFE5F2] border border-[#DFE5F2] px-6 py-3 rounded-full"
          disabled={loading}
        >
          <Ionicons name="close" size={20} color="black" />
          <Text className="text-black font-medium ml-2">Cancel</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="flex-row items-center bg-gray-300 px-6 py-3 rounded-full">
            <ActivityIndicator size="small" color="#000" />
            <Text className="font-semibold text-black ml-2">Saving...</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (!signatureDrawn) {
                Alert.alert(
                  "Warning",
                  "Please draw a signature before submitting",
                );
                return;
              }

              if (signatureRef.current) {
                signatureRef.current.readSignature();
              }
            }}
            className="flex-row items-center bg-[#980775] px-6 py-3 rounded-full"
            disabled={!signatureDrawn || loading}
            style={{ opacity: signatureDrawn ? 1 : 0.5 }}
          >
            <FontAwesome6 name="check" size={18} color={"white"} />
            <Text className="font-semibold text-white ml-2">Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Success Modal - Now displays in portrait mode */}
      {showSuccessModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              width: "80%",
              maxWidth: 400,
            }}
          >
            {successMessage}
            <TouchableOpacity
              onPress={handleSuccessModalClose}
              className="bg-[#980775] px-6 py-3 rounded-full mt-4"
            >
              <Text className="text-center font-semibold text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}