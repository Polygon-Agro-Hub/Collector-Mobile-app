import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  PermissionsAndroid,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image
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
import { useTranslation } from 'react-i18next';

type ReceivedCashQrCodeNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedCashQrCode"
>;

interface ReceivedCashQrCodeProps {
  navigation: ReceivedCashQrCodeNavigationProp;
  route: RouteProp<RootStackParamList, "ReceivedCashQrCode">;
}

// Failed Modal Component
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
        ])
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
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center text-gray-800 mb-6">
            {title}
          </Text>

          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/New/error.png")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />  
            </View>
          </Animated.View>

          <View className="mb-6">
            {typeof message === "string" ? (
              <Text className="text-center text-gray-600 text-base">
                {message}
              </Text>
            ) : (
              message
            )}
          </View>

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
                    outputRange: ['0%', '100%'],
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

// Success Modal Component
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
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center text-gray-800 mb-6">
            {title}
          </Text>

          <Animated.View
            style={{ transform: [{ scale: checkAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/New/otpsuccess.png")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <View className="mb-6">
            {typeof message === "string" ? (
              <Text className="text-center text-gray-600 text-base">
                {message}
              </Text>
            ) : (
              message
            )}
          </View>

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
                    outputRange: ['0%', '100%'],
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

// Main QR Code Scanner Component
const ReceivedCashQrCode: React.FC<ReceivedCashQrCodeProps> = ({ navigation, route }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  // Get data from route params
  const selectedTransactions = route.params?.selectedTransactions || [];
  const fromScreen = route.params?.fromScreen;
  const { t } = useTranslation();

  console.log("Selected Transactions:", selectedTransactions);
  
  // Calculate total cash
  const totalCash = selectedTransactions.reduce((sum: number, t: any) => sum + t.cash, 0);
  
  // Timer states for timeout
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [showRescanButton, setShowRescanButton] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | React.ReactElement>("");
  
  // Track if screen is focused
  const isFocusedRef = useRef(true);

  // Handle screen focus/blur
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
    }, [permission?.granted])
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
          "The QR code could not be detected within the time limit. Please check and try again."
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
      ])
    ).start();
  };

  // Extract cash officer code from QR data - must be DCM followed by 5 digits
  const extractCashOfficerCode = (qrData: string): string | null => {
    try {
      console.log("Raw QR Data for cash officer:", qrData);

      // Method 1: Check if QR contains DCM officer ID pattern
      const dcmOfficerPattern = /DCM\d{5}/gi;
      const dcmMatch = qrData.match(dcmOfficerPattern);
      if (dcmMatch) {
        console.log("Found DCM officer pattern:", dcmMatch[0]);
        return dcmMatch[0];
      }

      // Method 2: Check if QR is JSON containing DCM officer info
      if (qrData.startsWith("{") && qrData.endsWith("}")) {
        try {
          const parsed = JSON.parse(qrData);
          console.log("Parsed JSON for officer:", parsed);
          
          const fieldsToCheck = [
            parsed.officerId, 
            parsed.officerCode, 
            parsed.employeeId, 
            parsed.id,
            parsed.code,
            parsed.userId
          ];
          
          for (const field of fieldsToCheck) {
            if (field && typeof field === 'string') {
              const dcmPattern = /DCM\d{5}/gi;
              const match = field.match(dcmPattern);
              if (match) {
                console.log("Found DCM officer ID in JSON:", match[0]);
                return match[0];
              }
            }
          }
        } catch (e) {
          console.log("Not valid JSON");
        }
      }

      // Method 3: Try to extract DCM pattern from the entire string
      const dcmPatternGlobal = /DCM\d{5}/gi;
      const allMatches = qrData.match(dcmPatternGlobal);
      if (allMatches && allMatches.length > 0) {
        console.log("Found DCM pattern in string:", allMatches[0]);
        return allMatches[0];
      }

      console.log("No valid DCM officer code found in QR data");
      return null;
    } catch (error) {
      console.error("Error extracting cash officer code:", error);
      return null;
    }
  };

  // Validate if the officer code is in correct DCM format
  const validateDCMOfficerCode = (officerCode: string): boolean => {
    const dcmPattern = /^DCM\d{5}$/i;
    return dcmPattern.test(officerCode);
  };

  // API call to hand over cash to officer
  const handOverCashToOfficer = async (transactions: any[], officerCode: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      console.log("Officer Code:", officerCode);
      
      const apiUrl = `${environment.API_BASE_URL}api/pickup/update-cash-received`;
      console.log("Making API call to:", apiUrl);
      console.log("Transactions:", transactions);
      console.log("Total Cash:", totalCash);

      const handoverData = {
        officerCode: officerCode,
        transactions: transactions.map(t => ({
          transactionId: t.id,
          orderId: t.orderId,
          amount: t.cash,
          receivedTime: t.receivedTime,
          date: t.date
        })),
        totalAmount: totalCash,
        handoverDate: new Date().toISOString()
      };

      console.log("Handover Data:", handoverData);

      const response = await axios.post(
        apiUrl,
        handoverData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("API Response:", response.data);
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
            message: error.response.data?.message || "Failed to hand over cash",
            status: error.response.status,
            data: error.response.data,
          };
        } else if (error.request) {
          throw new Error("Network error. Please check your connection.");
        } else {
          throw new Error(error.message || "Failed to hand over cash");
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
      // Extract the cash officer's ID from QR
      const cashOfficerCode = extractCashOfficerCode(data);
      
      if (!cashOfficerCode) {
        setModalTitle("Failed!");
        setModalMessage("The QR code is not identified.\nPlease check and try again.");
        setShowRescanButton(true);
        setShowErrorModal(true);
        return;
      }
      
      // Validate the officer code format
      if (!validateDCMOfficerCode(cashOfficerCode)) {
        setModalTitle("Failed!");
        setModalMessage("Invalid officer code format.\nMust be DCM followed by 5 digits (e.g., DCM00001).");
        setShowRescanButton(true);
        setShowErrorModal(true);
        return;
      }
      
      // Call API to hand over cash
      const result = await handOverCashToOfficer(selectedTransactions, cashOfficerCode);
      
    if (result.status === "success" || result.success) {
        setModalTitle(t("qrcode.success"));
        setModalMessage(
          <View className="items-center">
            <Text className="text-center text-[#000000] mb-2">
              {t("qrcode.cashHandoverSuccess", {
                amount: totalCash.toFixed(2),
                officerCode: cashOfficerCode.toUpperCase()
              })}
            </Text>
          </View>
        );
        setShowSuccessModal(true);
      } else {
        setModalTitle(t("error"));
        setModalMessage(result.message || t("cashHandoverFailed"));
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Error processing QR scan:", error);

      let title = "Failed!";
      let message = "The QR code is not identified.\nPlease check and try again.";

      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || error.status;

      console.log("Error details:", { errorMessage, statusCode });

      if (errorMessage.includes("officer") || errorMessage.includes("Officer")) {
        title = "Officer Error";
        message = errorMessage;
      } else if (errorMessage.includes("already handed over") || errorMessage.includes("already processed")) {
        title = "Already Processed!";
        message = "These transactions have already been handed over.";
      } else if (statusCode === 404) {
        title = "Officer Not Found";
        message = "The cash officer code is not recognized.";
      } else if (statusCode === 400) {
        title = "Invalid Request";
        message = errorMessage || "Invalid request. Please try again.";
      } else if (errorMessage.includes("Network error")) {
        title = "Network Error";
        message = "Please check your internet connection and try again.";
      } else if (statusCode === 401) {
        title = "Session Expired";
        message = "Please login again to continue.";
      } else if (statusCode === 500) {
        title = "Server Error";
        message = "Internal server error. Please try again later.";
      }

      setModalTitle(title);
      setModalMessage(message);
      setShowErrorModal(true);
    }
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    resetScanning();
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setScanned(false);
    navigation.goBack();
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
        <Text className="text-white text-lg mt-4"> {t("qrcode.Loading camera")}</Text>
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
         {t("qrcode.Camera Permission Required")} 
        </Text>
        <Text className="text-gray-400 text-center mb-8 px-4">
        {t("qrcode.Please grant camera permission to scan QR codes.")}  
        </Text>
        <TouchableOpacity
          className="bg-[black] py-4 px-12 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-black font-bold text-base">
           {t("qrcode.Grant Permission")}  
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

      {loading && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 z-50 justify-center items-center">
          <View className="bg-black/80 p-6 rounded-xl items-center">
            <ActivityIndicator size="large" color="black" />
            <Text className="text-white text-lg font-semibold mt-4">
              {t("qrcode.Handing Over Cash")} 
            </Text>
          </View>
        </View>
      )}

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

      <SuccessModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleSuccessModalClose}
        autoClose={true}
        duration={4000}
      />

      <View className="flex-1">
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

          <View className="flex-1 justify-center items-center">
            <View
              style={{
                width: wp(80),
                height: wp(80),
                borderRadius: 24,
                overflow: "hidden",
                position: "relative",
              }}
            >
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

export default ReceivedCashQrCode;