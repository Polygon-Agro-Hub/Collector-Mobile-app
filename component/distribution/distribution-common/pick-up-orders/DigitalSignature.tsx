import store from "@/services/reducxStore";
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import Signature from "react-native-signature-canvas";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

import axios from "axios";
import { environment } from "@/environment/environment";
import { AlertModal } from "@/component/components/popup/AlertModal";

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
          zIndex: 1,
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
          zIndex: 1,
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
          zIndex: 1,
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
          zIndex: 1,
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
  const { orderId } = route.params;
  const [loading, setLoading] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<
    string | React.ReactNode
  >("");
  const [shouldRenderSignature, setShouldRenderSignature] = useState(false);

  const { width, height } = useWindowDimensions();

  const signatureHeight = height - 56 - 64 - 40;

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const setupScreen = async () => {
        if (!isActive) return;

        setSignatureDrawn(false);
        setLoading(false);
        setShowSuccessModal(false);
        setSuccessMessage("");
        setShouldRenderSignature(false);

        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
        );

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 700));

        if (!isActive) return;

        setShouldRenderSignature(true);
      };

      setupScreen();

      return () => {
        isActive = false;
        setShouldRenderSignature(false);
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

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

      const token = store.getState().auth.token;

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

      const formData = new FormData();

      const base64Data = signatureBase64.includes(",")
        ? signatureBase64.split(",")[1]
        : signatureBase64;

      const fileName = `pickup_signature_${Date.now()}.png`;

      const file = {
        uri: `data:image/png;base64,${base64Data}`,
        type: "image/png",
        name: fileName,
      };

      formData.append("signature", file as any);
      formData.append("orderId", orderId.toString());

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
        }, 4000);
      } else {
        throw new Error(response.data.message || "Failed to save signature");
      }
    } catch (error: any) {
      console.error("Error saving pickup signature:", error);
      setLoading(false);

      let errorMessage = "Failed to save signature. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
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
        { text: "No, Continue", style: "cancel" },
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
        { text: "Cancel", style: "cancel" },
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
    * { box-sizing: border-box; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #DFEDFC;
    }
    .m-signature-pad {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      margin: 0; padding: 0;
      width: 100% !important;
      height: 100% !important;
      box-shadow: none;
      border: none;
    }
    .m-signature-pad--body {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border: none !important;
      margin: 0; padding: 0;
      width: 100% !important;
      height: 100% !important;
    }
    .m-signature-pad--footer {
      display: none !important;
    }
    canvas {
      background-color: #DFEDFC !important;
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
      display: block;
    }
  `;

  if (!shouldRenderSignature) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#2D7BFF" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>
          Preparing signature pad...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* ── HEADER ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#F0F0F0",
        }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={handleBackPress}
          disabled={loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "#F7FAFF",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#000000" />
        </TouchableOpacity>

        {/* Title */}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "700",
            color: "#1A1A1A",
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          Customer's Digital Signature
        </Text>
      </View>

      {/* ── SIGNATURE CANVAS AREA ── */}
      <View
        style={{
          flex: 1,
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
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
          {/* Clear button — floats inside canvas */}
          <TouchableOpacity
            onPress={handleClear}
            disabled={loading}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "white",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              zIndex: 10,
              elevation: 10,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <FontAwesome6 name="eraser" size={16} color="#2D7BFF" />
            <Text
              style={{
                marginLeft: 8,
                color: "#2D7BFF",
                fontWeight: "600",
              }}
            >
              Clear
            </Text>
          </TouchableOpacity>

          {/* Signature WebView — explicit pixel dimensions prevent blank render */}
          <View style={{ width: "100%", height: signatureHeight }}>
            <Signature
              ref={signatureRef}
              onOK={handleOK}
              onEnd={handleSignatureChange}
              webStyle={signatureStyle}
              autoClear={false}
              descriptionText=""
              style={{
                width: "100%",
                height: signatureHeight,
                backgroundColor: "#DFEDFC",
              }}
            />
          </View>
        </DashedBorder>
      </View>

      {/* ── FOOTER BUTTONS ── */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          height: 64,
        }}
      >
        {/* Cancel */}
        <TouchableOpacity
          onPress={handleBackPress}
          disabled={loading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#DFE5F2",
            borderColor: "#DFE5F2",
            borderWidth: 1,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 999,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="close" size={20} color="black" />
          <Text style={{ color: "black", fontWeight: "700", marginLeft: 8 }}>
            Cancel
          </Text>
        </TouchableOpacity>

        {/* Done / Saving */}
        {loading ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#D1D5DB",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 999,
            }}
          >
            <ActivityIndicator size="small" color="#000" />
            <Text style={{ fontWeight: "600", color: "black", marginLeft: 8 }}>
              Saving...
            </Text>
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
              signatureRef.current?.readSignature();
            }}
            disabled={!signatureDrawn || loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: signatureDrawn ? "#980775" : "#DCDCDC",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 999,
              shadowColor: "#000000",
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <FontAwesome6
              name="check"
              size={18}
              color={signatureDrawn ? "white" : "#000000"}
            />
            <Text
              style={{
                color: signatureDrawn ? "white" : "#000000",
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SUCCESS MODAL ── */}
      <AlertModal
        visible={showSuccessModal}
        title="Successful!"
        message={successMessage}
        type="success"
        onClose={handleSuccessModalClose}
        autoClose={true}
        duration={3000}
      />
    </View>
  );
}
