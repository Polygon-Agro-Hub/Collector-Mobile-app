import store from "@/services/reducxStore";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Entypo } from "@expo/vector-icons";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import axios from "axios";
import environment from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import CameraAccess from "@/component/common/permission/CameraAccess";
import { AlertModal } from "@/component/components/popup/AlertModal";

type ReceivedCashQrCodeNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedCashQrCode"
>;

interface ReceivedCashQrCodeProps {
  navigation: ReceivedCashQrCodeNavigationProp;
  route: RouteProp<RootStackParamList, "ReceivedCashQrCode">;
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
  return (
    <AlertModal
      type="error"
      visible={visible}
      title={title}
      message={message}
      onClose={onClose}
      showRescanButton={showRescanButton}
      onRescan={onRescan}
      autoClose={autoClose}
      duration={duration}
    />
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
  return (
    <AlertModal
      type="success"
      visible={visible}
      title={title}
      message={message}
      onClose={onClose}
      autoClose={autoClose}
      duration={duration}
    />
  );
};

const ReceivedCashQrCode: React.FC<ReceivedCashQrCodeProps> = ({
  navigation,
  route,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  const selectedTransactions = route.params?.selectedTransactions || [];
  const { t } = useTranslation();

  const totalCash = selectedTransactions.reduce(
    (sum: number, t: any) => sum + t.cash,
    0,
  );

  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hard safety-net timer: guarantees the loading overlay can never get
  // stuck forever even if something unexpected happens downstream.
  const loadingSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [showRescanButton, setShowRescanButton] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | React.ReactElement>(
    "",
  );

  const isFocusedRef = useRef(true);

  // ✅ FIX: synchronous ref-based guard instead of relying on `scanned`/
  // `loading` state, which update asynchronously and let expo-camera fire
  // onBarcodeScanned again before React commits the state change. That
  // duplicate call was racing the real one and could leave `loading`
  // stuck true with no modal ever shown.
  const isProcessingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      isProcessingRef.current = false;

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
        if (loadingSafetyRef.current) {
          clearTimeout(loadingSafetyRef.current);
          loadingSafetyRef.current = null;
        }
      };
    }, [permission?.granted]),
  );

  useEffect(() => {
    startScanAnimation();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (loadingSafetyRef.current) {
        clearTimeout(loadingSafetyRef.current);
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
    if (loadingSafetyRef.current) {
      clearTimeout(loadingSafetyRef.current);
      loadingSafetyRef.current = null;
    }

    isProcessingRef.current = false;
    setScanned(false);
    setLoading(false);
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

  const extractCashOfficerCode = (qrData: string): string | null => {
    try {
      if (qrData.startsWith("{") && qrData.endsWith("}")) {
        try {
          const parsed = JSON.parse(qrData);

          const fieldsToCheck = [
            parsed.empId,
            parsed.officerId,
            parsed.officerCode,
            parsed.employeeId,
            parsed.id,
            parsed.code,
            parsed.userId,
          ];

          for (const field of fieldsToCheck) {
            if (field && typeof field === "string") {
              const dcmPattern = /DCM\d{5}/gi;
              const match = field.match(dcmPattern);
              if (match) {
                return match[0];
              }
            }
          }
        } catch (e) {
          console.log("Not valid JSON");
        }
      }

      const dcmPatternGlobal = /DCM\d{5}/gi;
      const allMatches = qrData.match(dcmPatternGlobal);
      if (allMatches && allMatches.length > 0) {
        return allMatches[0];
      }

      return null;
    } catch (error) {
      console.error("Error extracting cash officer code:", error);
      return null;
    }
  };

  const validateDCMOfficerCode = (officerCode: string): boolean => {
    const dcmPattern = /^DCM\d{5}$/i;
    return dcmPattern.test(officerCode);
  };

  const handOverCashToOfficer = async (
    transactions: any[],
    officerCode: string,
  ) => {
    const token = store.getState().auth.token;

    if (!token) {
      throw new Error("Authentication token not found");
    }

    const apiUrl = `${environment.API_BASE_URL}api/pickup/update-cash-received`;

    const handoverData = {
      officerCode: officerCode,
      transactions: transactions.map((t) => ({
        transactionId: t.id,
        orderId: t.orderId,
        amount: t.cash,
        receivedTime: t.receivedTime,
        date: t.date,
      })),
      totalAmount: totalCash,
      handoverDate: new Date().toISOString(),
    };

    try {
      const response = await axios.post(apiUrl, handoverData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

       console.log(response.data.data)

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
            response: error.response,
          };
        } else if (error.request) {
          throw new Error("Network error. Please check your connection.");
        } else {
          throw new Error(error.message || "Failed to hand over cash");
        }
      } else {
        throw new Error("An unexpected error occurred");
      }
    }
  };

  console.log("STATE →", { scanned, loading, showErrorModal, showSuccessModal, modalTitle });

const handleBarCodeScanned = async ({
  type,
  data,
}: {
  type: string;
  data: string;
}) => {
  // ✅ FIX: single, synchronous, ref-based guard.
  if (isProcessingRef.current || !isFocusedRef.current) return;
  isProcessingRef.current = true;

  setScanned(true);
  setLoading(true);

  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  // Safety net: no matter what happens below, never let the overlay
  // stay up longer than 20s.
  if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
  loadingSafetyRef.current = setTimeout(() => {
    setLoading(false);
  }, 20000);

  try {
    const cashOfficerCode = extractCashOfficerCode(data);

    if (!cashOfficerCode) {
      setModalTitle("Failed!");
      setModalMessage(
        "The QR code is not identified.\nPlease check and try again.",
      );
      setShowRescanButton(true);
      setShowErrorModal(true);
      return;
    }

    if (!validateDCMOfficerCode(cashOfficerCode)) {
      setModalTitle("Failed!");
      setModalMessage(
        "Invalid officer code format.\nMust be DCM followed by 5 digits (e.g., DCM00001).",
      );
      setShowRescanButton(true);
      setShowErrorModal(true);
      return;
    }

    const result = await handOverCashToOfficer(
      selectedTransactions,
      cashOfficerCode,
    );

    // Check for success based on the actual response structure
    if (result.status === "success") {
      setModalTitle(t("qrcode.success"));
      setModalMessage(
        <View className="items-center">
          <Text className="text-center text-[#000000] text-base">
            <Text className="font-bold">
              {t("qrcode.Rs")}.{" "}
              {totalCash.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} {" "}
            </Text>
            {t("qrcode.has been successfully handed over to")}
            <Text className="font-bold">
              {" "}
              {cashOfficerCode.toUpperCase()}
            </Text>
            .
          </Text>
        </View>,
      );

      setShowSuccessModal(true);
    } else {
      // This handles cases where the backend returns an error status
      setModalTitle(t("error"));
      setModalMessage(result?.message || t("cashHandoverFailed"));
      setShowRescanButton(true);
      setShowErrorModal(true);
    }
  } catch (error: any) {
    console.error("Error processing QR scan:", error);

    // Extract the error message properly
    let title = "Failed!";
    let message = "The QR code is not identified.\nPlease check and try again.";

    // Get the error message from various possible locations
    const errorMessage = 
      error?.response?.data?.message || 
      error?.data?.message || 
      error?.message || 
      "";

    const statusCode = 
      error?.response?.status || 
      error?.status || 
      error?.data?.status;

    // Check for specific validation errors from the backend
    if (errorMessage.includes("already handed over") || 
        errorMessage.includes("already processed")) {
      title = "Already Processed!";
      message = "These transactions have already been handed over.";
    } else if (statusCode === 404) {
      title = "Officer Not Found";
      message = errorMessage || "The cash officer code is not recognized.";
    } else if (statusCode === 403) {
      title = "Not Valid!";
      // Show the specific validation message from the backend
      message = errorMessage || "This Manager's ID is not acceptable.";
      
      // Check for specific validation scenarios
      if (errorMessage.includes("not in the same centre")) {
        message = "This DCM officer is not in the same centre.";
      } else if (errorMessage.includes("Manager's ID is not acceptable")) {
        message = "This Manager's ID is not approved or not valid.";
      }
    } else if (statusCode === 400) {
      title = "Invalid Request";
      message = errorMessage || "Invalid request. Please try again.";
    } else if (statusCode === 409) {
      title = "Already Processed!";
      message = errorMessage || "These transactions have already been handed over.";
    } else if (errorMessage.includes("Network error")) {
      title = "Network Error";
      message = "Please check your internet connection and try again.";
    } else if (statusCode === 401) {
      title = "Session Expired";
      message = "Please login again to continue.";
    } else if (statusCode === 500) {
      title = "Server Error";
      message = "Internal server error. Please try again later.";
    } else if (errorMessage) {
      // Use the exact error message from the backend
      message = errorMessage;
    }

    setModalTitle(title);
    setModalMessage(message);
    setShowRescanButton(true);
    setShowErrorModal(true);
  } finally {
    if (loadingSafetyRef.current) {
      clearTimeout(loadingSafetyRef.current);
      loadingSafetyRef.current = null;
    }
    setLoading(false);
    isProcessingRef.current = false;
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
        <Text className="text-white text-lg mt-4">
          {" "}
          {t("qrcode.Loading camera")}
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <CameraAccess
        navigation={navigation as any}
        onPermissionGranted={() => {
          requestPermission();
        }}
        returnScreen="ReceivedCashQrCode"
      />
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
            <ActivityIndicator size="large" color="#ffffff" />
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
        autoClose={false}
      />

      <FailedModal
        visible={showErrorModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleErrorModalClose}
        showRescanButton={showRescanButton}
        onRescan={resetScanning}
        autoClose={false}
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
