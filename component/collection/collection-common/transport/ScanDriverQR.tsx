import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Entypo } from "@expo/vector-icons";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { AlertModal } from "@/component/components/popup/AlertModal";
import CameraAccess from "@/component/common/permission/CameraAccess";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";

type ScanDriverQRNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ScanDriverQR"
>;

interface ScanDriverQRProps {
  navigation: ScanDriverQRNavigationProp;
}

const ScanDriverQR: React.FC<ScanDriverQRProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [showRescanButton, setShowRescanButton] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | React.ReactElement>("");
  const [modalType, setModalType] = useState<"error" | "success">("error");

  // Holds the verified driver payload until navigation happens on modal close
  const verifiedDriverRef = useRef<{
    driverId: number;
    empId: string;
    fullName: string;
    jobRole: string;
    vehicleId?: number | null;
    vehicleNo?: string | null;
    vRegNo?: string | null;
    vType?: string | null;
    vCapacity?: string | null;
  } | null>(null);

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
        setModalTitle(t("qrcode.ScanTimeout", "Scan Timeout"));
        setModalMessage(
          t(
            "qrcode.ScanTimeoutMessage",
            "The QR code is not identified. Please check and try again.",
          ),
        );
        setShowRescanButton(true);
        setModalType("error");
        setShowTimeoutModal(true);
      }
    }, 15000);
  };

  const resetScanning = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    verifiedDriverRef.current = null;
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

    setLoading(true);

    try {
      const authToken = store.getState().auth.token;
      const response = await axios.post(
        `${environment.API_BASE_URL}api/transport/verify-driver-qr`,
        { qrData: data },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      setLoading(false);

      if (response.data.success) {
        const driver = response.data.data;
        verifiedDriverRef.current = driver;

        setModalTitle(t("qrcode.Successful", "Successful!"));
        setModalMessage(
          <View className="items-center">
            <Text className="text-center text-[#4E4E4E] mb-2 mt-2">
              {t("qrcode.QRIdentified", "QR code identified successfully.")}
            </Text>
            <Text className="text-center font-bold text-[#000000]">
              {t("qrcode.Driver", "Driver")} : {driver.empId},
            </Text>
            <Text className="text-center font-bold text-[#000000]">
              {driver.fullName}
            </Text>
          </View>,
        );
        setModalType("success");
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setLoading(false);

      const errData = err?.response?.data;
      const code = errData?.code;

      if (code === "UNAUTHORIZED_ROLE") {
        setModalTitle(t("qrcode.Unauthorized", "Unauthorized!"));
        setModalMessage(
          t(
            "qrcode.UnauthorizedMessage",
            "Driver access has been rejected. Please contact the company for assistance.",
          ),
        );
        setShowRescanButton(false);
        setModalType("error");
        setShowErrorModal(true);
        return;
      }

      if (code === "INVALID_QR") {
        setModalTitle(t("qrcode.Error", "Error!"));
        setModalMessage(
          t("qrcode.InvalidQR", "Invalid QR code. Please scan a valid driver QR code."),
        );
        setShowRescanButton(true);
        setModalType("error");
        setShowErrorModal(true);
        return;
      }

      // Generic / network / server error
      console.error("Error verifying driver QR:", err);
      setModalTitle(t("qrcode.Error", "Error!"));
      setModalMessage(
        t("qrcode.VerifyFailed", "Something went wrong. Please try again."),
      );
      setShowRescanButton(true);
      setModalType("error");
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

    const driver = verifiedDriverRef.current;
    verifiedDriverRef.current = null;

    if (driver) {
      store.dispatch({
        type: "transport/setTransportDriver",
        payload: {
          driverId: driver.driverId,
          driverEmpId: driver.empId,
          driverName: driver.fullName,
          vehicleId: driver.vehicleId ?? null,
          vehicleNo: (driver.vRegNo || driver.vehicleNo) ?? null,
        },
      });
    }

    navigation.navigate("SelectDistributionCentre", {
      driverId: driver?.driverId,
      driverEmpId: driver?.empId,
      driverName: driver?.fullName,
      vehicleId: driver?.vehicleId ?? undefined,
      vehicleNo: (driver?.vRegNo || driver?.vehicleNo) ?? undefined,
      vType: driver?.vType ?? undefined,
      vCapacity: driver?.vCapacity ?? undefined,
    });
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
        <View className="bg-black/50 p-8 rounded-full">
          <ActivityIndicator size="large" color="#F7CA21" />
        </View>
        <Text className="text-white text-lg mt-4">
          {t("qrcode.Loading camera", "කැමරාව පූරණය වෙමින්...")}
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <CameraAccess
        navigation={navigation as any}
        onPermissionGranted={requestPermission}
        onClose={() => navigation.goBack()}
      />
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, wp(70)],
  });

  return (
    <View className="flex-1">
      {/* Loading Overlays */}
      {loading && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 z-50 justify-center items-center">
          <View className="bg-black/80 p-6 rounded-xl items-center">
            <ActivityIndicator size="large" color="#F7CA21" />
            <Text className="text-white text-lg font-semibold mt-4">
              {t("qrcode.IdentifyingDriver", "Identifying Driver...")}
            </Text>
          </View>
        </View>
      )}

      {/* Timeout Modal */}
      <AlertModal
        visible={showTimeoutModal}
        title={t("qrcode.ScanTimeout", "Scan Timeout")}
        message={t(
          "qrcode.ScanTimeoutMessage",
          "The QR code could not be detected within the time limit. Please check and try again.",
        )}
        type="error"
        onClose={handleTimeoutModalClose}
        showRescanButton={true}
        onRescan={handleTimeoutRescan}
        duration={7000}
        autoClose={true}
      />

      {/* Error / Unauthorized Modal */}
      <AlertModal
        visible={showErrorModal}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={handleErrorModalClose}
        showRescanButton={showRescanButton}
        onRescan={resetScanning}
        duration={7000}
        autoClose={true}
      />

      {/* Success Modal */}
      <AlertModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={handleSuccessModalClose}
        showRescanButton={false}
        duration={4000}
        autoClose={true}
      />

      <View className="flex-1">
        {/* Semi-transparent overlay */}
        <View className="flex-1 bg-black/50">
          {/* Back Button */}
          <View className="flex-row items-center justify-between px-4 py-3 relative mt-6">
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
                  backgroundColor: "#F7CA21",
                  transform: [{ translateY: scanLineTranslateY }],
                  position: "relative",
                  zIndex: 10,
                  opacity: scanned || loading ? 0 : 1,
                }}
              />

              {/* Corner Markers - Top Left */}
              <View style={{ position: "absolute", top: -3, left: -3, width: 50, height: 50, zIndex: 20 }}>
                <View style={{ width: 50, height: 12, backgroundColor: "#F7CA21", borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
                <View style={{ width: 12, height: 38, backgroundColor: "#F7CA21", borderBottomLeftRadius: 20 }} />
              </View>

              {/* Corner Markers - Top Right */}
              <View style={{ position: "absolute", top: -3, right: -3, width: 50, height: 50, zIndex: 20 }}>
                <View style={{ width: 50, height: 12, backgroundColor: "#F7CA21", borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
                <View style={{ width: 12, height: 38, backgroundColor: "#F7CA21", borderBottomRightRadius: 20, alignSelf: "flex-end" }} />
              </View>

              {/* Corner Markers - Bottom Left */}
              <View style={{ position: "absolute", bottom: -3, left: -3, width: 50, height: 50, zIndex: 20 }}>
                <View style={{ width: 12, height: 38, backgroundColor: "#F7CA21", borderTopLeftRadius: 20 }} />
                <View style={{ width: 50, height: 12, backgroundColor: "#F7CA21", borderBottomLeftRadius: 20 }} />
              </View>

              {/* Corner Markers - Bottom Right */}
              <View style={{ position: "absolute", bottom: -3, right: -3, width: 50, height: 50, zIndex: 20 }}>
                <View style={{ width: 12, height: 38, backgroundColor: "#F7CA21", borderTopRightRadius: 20, alignSelf: "flex-end" }} />
                <View style={{ width: 50, height: 12, backgroundColor: "#F7CA21", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ScanDriverQR;