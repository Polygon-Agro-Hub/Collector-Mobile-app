import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/component/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Entypo, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";

type qrcodeNavigationProp = StackNavigationProp<RootStackParamList, "qrcode">;

interface qrcodeProps {
  navigation: qrcodeNavigationProp;
  route: RouteProp<RootStackParamList, "qrcode">;
}

interface FailedModalProps {
  visible: boolean;
  title?: string;
  message: string | React.ReactElement;
  onClose: () => void;
  showRescanButton?: boolean;
  onRescan?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const FailedModal: React.FC<FailedModalProps> = ({
  visible,
  title = "Failed!",
  message,
  onClose,
  showRescanButton = false,
  onRescan,
  autoClose = true,
  duration = 4000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      if (autoClose) {
        progressAnim.setValue(100);
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }).start();

        const timer = setTimeout(() => {
          onClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
      progressAnim.setValue(100);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className="bg-white rounded-3xl p-6 mx-6 w-[85%] max-w-sm relative overflow-hidden"
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-xl font-bold text-center text-gray-800 mb-6">
            {title}
          </Text>

          {/* Icon with pulsing animation */}
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/collection-common/error.webp")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Message */}
          <View className="mb-6">
            {typeof message === "string" ? (
              <Text className="text-center text-gray-600 text-base">
                {message}
              </Text>
            ) : (
              message
            )}
          </View>

          {/* Progress Bar */}
          {autoClose && (
            <View
              className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200"
              style={{
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }}
            >
              <Animated.View
                className="h-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#EF4444",
                  borderBottomLeftRadius: 24,
                  borderBottomRightRadius: 24,
                }}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string | React.ReactElement;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = "Success!",
  message,
  onClose,
  autoClose = true,
  duration = 4000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.sequence([
        Animated.delay(200),
        Animated.spring(checkAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        progressAnim.setValue(100);
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }).start();

        const timer = setTimeout(() => {
          onClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
      progressAnim.setValue(100);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className="bg-white rounded-3xl p-6 mx-6 w-[85%] max-w-sm relative overflow-hidden"
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-xl font-bold text-center text-gray-800 mb-6">
            {title}
          </Text>

          {/* Icon with animation */}
          <Animated.View
            style={{ transform: [{ scale: checkAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/collection-common/otpsuccess.webp")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Message */}
          <View className="mb-6">
            {typeof message === "string" ? (
              <Text className="text-center text-gray-600 text-base">
                {message}
              </Text>
            ) : (
              message
            )}
          </View>

          {/* Progress Bar */}
          {autoClose && (
            <View
              className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200"
              style={{
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }}
            >
              <Animated.View
                className="h-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#980775",
                  borderBottomLeftRadius: 24,
                  borderBottomRightRadius: 24,
                }}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const qrcode: React.FC<qrcodeProps> = ({ navigation, route }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  const expectedOrderId = route.params?.expectedOrderId;
  const fromScreen = route.params?.fromScreen;
  const isOrderVerification = !!expectedOrderId;

  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [showRescanButton, setShowRescanButton] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | React.ReactElement>(
    "",
  );

  const isFocusedRef = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;

      setScanned(false);
      setLoading(false);
      setShowTimeoutModal(false);
      setShowErrorModal(false);
      setShowSuccessModal(false);

      if (permission?.granted) {
        startTimeoutTimer();
      }

      return () => {
        isFocusedRef.current = false;

        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [permission?.granted]),
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }

    startScanAnimation();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (permission?.granted && !scanned && !loading && isFocusedRef.current) {
      startTimeoutTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [permission?.granted, scanned, loading]);

  const startTimeoutTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (!scanned && !loading && isFocusedRef.current) {
        setModalTitle("Scan Timeout");
        setModalMessage(
          "The QR code could not be detected within the time limit. Please check and try again.",
        );
        setShowRescanButton(true);
        setShowTimeoutModal(true);
      }
    }, 15000);
  };

  const resetScanning = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setScanned(false);
    setShowTimeoutModal(false);
    setShowErrorModal(false);
    setShowSuccessModal(false);

    if (isFocusedRef.current) {
      startTimeoutTimer();
    }
  };

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const extractOrderId = (qrData: string): string | null => {
    try {
      if (qrData.startsWith("{") && qrData.endsWith("}")) {
        try {
          const parsed = JSON.parse(qrData);

          if (
            parsed.orderId ||
            parsed.id ||
            parsed.orderNumber ||
            parsed.order_id ||
            parsed.invNo ||
            parsed.invoiceNo
          ) {
            const orderId =
              parsed.orderId ||
              parsed.id ||
              parsed.orderNumber ||
              parsed.order_id ||
              parsed.invNo ||
              parsed.invoiceNo;

            return String(orderId);
          }
        } catch (e) {
          console.log("Not valid JSON");
        }
      }

      const simplePattern = /^\d{6,15}$/;
      if (simplePattern.test(qrData)) {
        return qrData;
      }

      const orderIdPattern = /\b\d{6,15}\b/g;
      const match = qrData.match(orderIdPattern);
      if (match) {
        return match[0];
      }

      const numericPattern = /\d{6,}/g;
      const numericMatches = qrData.match(numericPattern);
      if (numericMatches && numericMatches.length > 0) {
        const longestMatch = numericMatches.reduce((a, b) =>
          a.length > b.length ? a : b,
        );
        return longestMatch;
      }

      return null;
    } catch (error) {
      console.error("Error extracting order ID:", error);
      return null;
    }
  };

  const extractInvoiceNumber = (qrData: string): string | null => {
    try {
      const invoicePattern = /INV[0-9]+/gi;
      const match = qrData.match(invoicePattern);
      if (match) {
        return match[0];
      }

      if (qrData.startsWith("{") && qrData.endsWith("}")) {
        try {
          const parsed = JSON.parse(qrData);

          if (
            parsed.invoiceNo ||
            parsed.invNo ||
            parsed.invoiceNumber ||
            parsed.invoice
          ) {
            const invoice =
              parsed.invoiceNo ||
              parsed.invNo ||
              parsed.invoiceNumber ||
              parsed.invoice;

            return invoice;
          }
        } catch (e) {
          console.log("Not valid JSON");
        }
      }

      const simplePattern = /^[A-Z0-9]{6,20}$/;
      if (simplePattern.test(qrData)) {
        return qrData;
      }

      const alphanumericPattern = /[A-Z0-9]{6,}/gi;
      const alphanumericMatches = qrData.match(alphanumericPattern);
      if (alphanumericMatches && alphanumericMatches.length > 0) {
        const longestMatch = alphanumericMatches.reduce((a, b) =>
          a.length > b.length ? a : b,
        );
        return longestMatch;
      }

      return null;
    } catch (error) {
      console.error("Error extracting invoice:", error);
      return null;
    }
  };

  const assignOrderToDriver = async (invoiceNo: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const apiUrl = `${environment.API_BASE_URL}api/order/assign-driver-order`;

      const response = await axios.post(
        apiUrl,
        {
          invNo: invoiceNo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });

      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw {
            message: error.response.data?.message || "Failed to assign order",
            status: error.response.status,
            data: error.response.data,
          };
        } else if (error.request) {
          throw new Error("Network error. Please check your connection.");
        } else {
          throw new Error(error.message || "Failed to assign order");
        }
      } else {
        throw new Error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned || loading || !isFocusedRef.current) return;

    setScanned(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    try {
      if (isOrderVerification) {
        const scannedOrderId = extractOrderId(data);

        if (!scannedOrderId) {
          setModalTitle("Failed!");
          setModalMessage("You have scanned the wrong package.");
          setShowRescanButton(true);
          setShowErrorModal(true);
          return;
        }

        if (scannedOrderId === expectedOrderId) {
          setModalTitle("Success!");
          setModalMessage(
            <View className="items-center">
              <Text className="text-center text-[#000000] mb-3 mt-2 font-bold text-lg">
                Order ID:
              </Text>
              <Text className="text-center font-bold text-[#000000] text-lg">
                #{scannedOrderId}
              </Text>
            </View>,
          );
          setShowSuccessModal(true);
        } else {
          setModalTitle("Failed!");
          setModalMessage("You have scanned the wrong package.");
          setShowRescanButton(true);
          setShowErrorModal(true);
        }
        return;
      }

      const invoiceNo = extractInvoiceNumber(data);

      if (!invoiceNo) {
        setModalTitle("Error!");
        setModalMessage(
          "The QR code is not identified.\nPlease check and try again.",
        );
        setShowRescanButton(true);
        setShowErrorModal(true);
        return;
      }

      const result = await assignOrderToDriver(invoiceNo);

      if (result.status === "success") {
        setModalTitle("Successful!");
        setModalMessage(
          <View className="items-center">
            <Text className="text-center text-[#4E4E4E] mb-5 mt-2">
              Order:{" "}
              <Text className="font-bold text-[#000000]">{invoiceNo}</Text> has
              been successfully assigned to you.
            </Text>
          </View>,
        );
        setShowSuccessModal(true);
      } else {
        let title = "Error";
        const message = result.message || "Failed to assign order";

        if (message.includes("already in your target list")) {
          title = "Already got this!";
        } else if (
          message.includes("already been collected") ||
          message.includes("already been assigned to another driver")
        ) {
          title = "Order Unavailable!";
        } else if (
          message.includes("Still processing this order") ||
          message.includes("Scanning will be available")
        ) {
          title = "Order Not Ready!";
        }

        setModalTitle(title);
        setModalMessage(message);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Error processing QR scan:", error);

      let title = "Error";
      let message = error.message || "Failed to process QR code";

      const errorMessage =
        error.response?.data?.message || error.message || message;
      const statusCode = error.response?.status || error.status;

      if (
        statusCode === 409 &&
        (errorMessage.includes("already in your target list") ||
          errorMessage.toLowerCase().includes("already got"))
      ) {
        title = "Already got this!";
        message = errorMessage;
      } else if (
        statusCode === 409 &&
        (errorMessage.includes("already been collected") ||
          errorMessage.includes("already been assigned to another driver") ||
          errorMessage.toLowerCase().includes("collected by another Driver") ||
          errorMessage.toLowerCase().includes("assigned to another") ||
          errorMessage.toLowerCase().includes("Driver id:"))
      ) {
        title = "Order Unavailable!";

        message = errorMessage
          .replace(/officer/gi, "Driver")
          .replace(/Officer ID:/gi, "Driver ID:");
      } else if (
        statusCode === 400 &&
        (errorMessage.includes("Still processing this order") ||
          errorMessage.includes("Scanning will be available") ||
          errorMessage.toLowerCase().includes("not ready") ||
          errorMessage.toLowerCase().includes("processing"))
      ) {
        title = "Order Not Ready!";
        message = errorMessage.includes("Scanning will be available")
          ? errorMessage
          : "Still processing this order. Scanning will be available after it's set to Out For Delivery.";
      } else if (
        statusCode === 404 ||
        errorMessage.includes("not found") ||
        errorMessage.includes("Invoice number not found") ||
        errorMessage.toLowerCase().includes("invalid invoice")
      ) {
        title = "Error!";
        message = "The QR code is not identified.Please check and try again.";
      } else if (
        errorMessage.includes("Network error") ||
        errorMessage.includes("Network Error")
      ) {
        title = "Network Error";
        message = "Please check your internet connection and try again.";
      } else if (statusCode === 401 || errorMessage.includes("Unauthorized")) {
        title = "Session Expired";
        message = "Please login again to continue.";
      } else if (statusCode === 500) {
        title = "Server Error";
        message = "Internal server error. Please try again later.";
      } else if (statusCode === 400) {
        title = "Invalid Request";
        message = errorMessage || "Invalid request. Please try again.";
      }

      setModalTitle(title);
      setModalMessage(message);
      setShowErrorModal(true);
    }
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    if (isOrderVerification) {
      resetScanning();
    } else {
      resetScanning();
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setScanned(false);

    if (isOrderVerification) {
      navigation.navigate("DigitalSignature" as any, {
        orderId: expectedOrderId,
        fromScreen: fromScreen,
      });
    }
  };

  const handleTimeoutModalClose = () => {
    setShowTimeoutModal(false);
    resetScanning();
  };

  const handleTimeoutRescan = () => {
    setShowTimeoutModal(false);
    resetScanning();
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center">
        <StatusBar barStyle="light-content" />
        <View className="bg-black/50 p-8 rounded-full">
          <ActivityIndicator size="large" color="black" />
        </View>
        <Text className="text-white text-lg mt-4">Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center px-6">
        <StatusBar barStyle="light-content" />
        <View className="bg-red-500/20 p-6 rounded-full mb-6">
          <Ionicons name="camera" size={wp(15)} color="#EF4444" />
        </View>
        <Text className="text-white text-2xl font-bold mb-3 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-400 text-center mb-8 px-4">
          Please grant camera permission to scan QR codes.
        </Text>
        <TouchableOpacity
          className="bg-[black] py-4 px-12 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-black font-bold text-base">
            Grant Permission
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, wp(70)],
  });

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />

      {/* Loading Overlays */}
      {loading && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 z-50 justify-center items-center">
          <View className="bg-black/80 p-6 rounded-xl items-center">
            <ActivityIndicator size="large" color="black" />
            <Text className="text-white text-lg font-semibold mt-4">
              {isOrderVerification
                ? "Verifying Order..."
                : "Assigning Order..."}
            </Text>
          </View>
        </View>
      )}

      {/* Timeout Modal */}
      <FailedModal
        visible={showTimeoutModal}
        title="Scan Timeout"
        message="The QR code could not be detected within the time limit. Please check and try again."
        onClose={handleTimeoutModalClose}
        showRescanButton={true}
        onRescan={handleTimeoutRescan}
        autoClose={true}
        duration={4000}
      />

      {/* Error Modal */}
      <FailedModal
        visible={showErrorModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleErrorModalClose}
        showRescanButton={showRescanButton}
        onRescan={resetScanning}
        autoClose={true}
        duration={4000}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleSuccessModalClose}
        autoClose={true}
        duration={4000}
      />

      <View className="flex-1">
        {/* Semi-transparent overlay */}
        <View className="flex-1 bg-black/50">
          <View className="flex-row items-center justify-between px-4 py-3 relative">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="items-start"
              disabled={loading}
            >
              <Entypo
                name="chevron-left"
                size={25}
                color="black"
                style={{
                  backgroundColor: loading ? "#666" : "#F7FAFF",
                  borderRadius: 50,
                  padding: wp(2.5),
                }}
              />
            </TouchableOpacity>
          </View>

          {/* Scan Frame Container */}
          <View className="flex-1 justify-center items-center">
            {/* Scan Frame with Camera */}
            <View
              style={{
                width: wp(80),
                height: wp(80),
                borderRadius: 24,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Camera View inside the frame */}
              <CameraView
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={
                  scanned || loading ? undefined : handleBarCodeScanned
                }
              />

              {/* Animated Scan Line */}
              <Animated.View
                style={{
                  width: "100%",
                  height: 3,
                  backgroundColor: "black",
                  transform: [{ translateY: scanLineTranslateY }],
                  position: "relative",
                  zIndex: 10,
                  opacity: scanned || loading ? 0 : 1,
                }}
              />

              {/* Corner Markers - Top Left */}
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  left: -3,
                  width: 50,
                  height: 50,
                  zIndex: 20,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 12,
                    backgroundColor: "black",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  }}
                />
                <View
                  style={{
                    width: 12,
                    height: 38,
                    backgroundColor: "black",
                    borderBottomLeftRadius: 20,
                  }}
                />
              </View>

              {/* Corner Markers - Top Right */}
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 50,
                  height: 50,
                  zIndex: 20,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 12,
                    backgroundColor: "black",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  }}
                />
                <View
                  style={{
                    width: 12,
                    height: 38,
                    backgroundColor: "black",
                    borderBottomRightRadius: 20,
                    alignSelf: "flex-end",
                  }}
                />
              </View>

              {/* Corner Markers - Bottom Left */}
              <View
                style={{
                  position: "absolute",
                  bottom: -3,
                  left: -3,
                  width: 50,
                  height: 50,
                  zIndex: 20,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 38,
                    backgroundColor: "black",
                    borderTopLeftRadius: 20,
                  }}
                />
                <View
                  style={{
                    width: 50,
                    height: 12,
                    backgroundColor: "black",
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                  }}
                />
              </View>

              {/* Corner Markers - Bottom Right */}
              <View
                style={{
                  position: "absolute",
                  bottom: -3,
                  right: -3,
                  width: 50,
                  height: 50,
                  zIndex: 20,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 38,
                    backgroundColor: "#0c0c0cff",
                    borderTopRightRadius: 20,
                    alignSelf: "flex-end",
                  }}
                />
                <View
                  style={{
                    width: 50,
                    height: 12,
                    backgroundColor: "#0d0d0cff",
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default qrcode;
