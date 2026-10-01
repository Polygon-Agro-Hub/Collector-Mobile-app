import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { AlertModal } from "@/component/components/popup/AlertModal";
import CameraAccess from "@/component/common/permission/CameraAccess";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";

type ScanLoadQRNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ScanLoadQR"
>;

interface ScanLoadQRProps {
  navigation: ScanLoadQRNavigationProp;
}

export interface VerifiedLoadData {
  transportId: string;
  transferCode: string;
  vehicleNo?: string;
  driverEmpId?: string;
  driverName?: string;
  driverNameEnglish?: string;
  driverNameSinhala?: string;
  driverNameTamil?: string;
  centreName?: string;
  origin?: string;
  items?: any[];
  isUnloaded?: boolean;
}

const PRIMARY_OUTLINE_COLOR = "#980775";

const ScanLoadQR: React.FC<ScanLoadQRProps> = ({ navigation }) => {
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

  const verifiedLoadRef = useRef<VerifiedLoadData | null>(null);
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
        setModalTitle(t("qrcode.ScanTimeout", "Scan Timeout"));
        setModalMessage(
          t(
            "qrcode.ScanTimeoutMessage",
            "The QR code could not be detected within the time limit. Please check and try again."
          )
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

    verifiedLoadRef.current = null;
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

  const handleBarCodeScanned = async ({
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

    // Validate format "L-DRV00001260912001"
    let cleanCode = (data || "").trim();
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        const codeVal = parsed.transferCode || parsed.loadCode || parsed.code;
        if (codeVal && typeof codeVal === "string") {
          cleanCode = codeVal.trim();
        }
      }
    } catch (e) {
      // Raw string format
    }

    // Must match format: "L-DRV00001260912001" -> ^L-DRV\d+$
    const isValidFormat = Boolean(cleanCode && /^L-DRV\d+$/i.test(cleanCode));

    if (!isValidFormat) {
      setModalTitle(t("qrcode.Error", "Error!"));
      setModalMessage(
        t(
          "qrcode.InvalidLoadQR",
          "Invalid QR code.\nPlease scan a valid Load QR code."
        )
      );
      setShowRescanButton(true);
      setModalType("error");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const authToken = store.getState().auth.token;
      let response;
      try {
        response = await axios.post(
          `${environment.API_BASE_URL}api/distribution/verify-load-qr`,
          { qrData: cleanCode },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      } catch (distErr: any) {
        if (distErr?.response?.status === 404 || distErr?.response?.status === 405) {
          response = await axios.post(
            `${environment.API_BASE_URL}api/transport/verify-load-qr`,
            { qrData: cleanCode },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
        } else {
          throw distErr;
        }
      }

      setLoading(false);

      if (response.data.success) {
        const load = response.data.data;
        verifiedLoadRef.current = load;

        setModalTitle(t("qrcode.Successful", "Successful!"));
        setModalMessage(
          <View className="items-center">
            <Text className="text-center text-[#4E4E4E] mb-2 mt-2">
              {t("qrcode.QRIdentified", "QR code identified successfully.")}
            </Text>
            <Text className="text-center font-bold text-[#000000] text-base">
              {load.transferCode}
            </Text>
          </View>
        );
        setModalType("success");
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setLoading(false);

      const errData = err?.response?.data;
      const code = errData?.code;

      if (code === "DISTRIBUTION_CENTER_MISMATCH") {
        setModalTitle(t("qrcode.Error", "Error!"));
        setModalMessage(
          t(
            "qrcode.CenterMismatch",
            "This load is not assigned to your distribution center."
          )
        );
        setShowRescanButton(true);
        setModalType("error");
        setShowErrorModal(true);
        return;
      }

      if (code === "JOURNEY_NOT_ENDED") {
        setModalTitle(t("qrcode.Error", "Error!"));
        setModalMessage(
          t(
            "qrcode.JourneyNotEnded",
            "This load's journey has not ended yet.\nPlease wait until the driver completes the journey."
          )
        );
        setShowRescanButton(true);
        setModalType("error");
        setShowErrorModal(true);
        return;
      }

      if (code === "INVALID_QR") {
        setModalTitle(t("qrcode.Error", "Error!"));
        setModalMessage(
          t(
            "qrcode.InvalidLoadQR",
            "Invalid QR code.\nPlease scan a valid Load QR code."
          )
        );
        setShowRescanButton(true);
        setModalType("error");
        setShowErrorModal(true);
        return;
      }

      // Generic / network / server error
      console.error("Error verifying load QR:", err);
      setModalTitle(t("qrcode.Error", "Error!"));
      setModalMessage(
        t("qrcode.VerifyFailed", "Something went wrong. Please try again.")
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

    const load = verifiedLoadRef.current;
    verifiedLoadRef.current = null;

    if (load) {
      navigation.navigate("ReceivedProductsSummary", {
        transportId: load.transportId,
        loadCode: load.transferCode,
        vehicleNo: load.vehicleNo,
        driverEmpId: load.driverEmpId,
        driverName: load.driverName,
        driverNameEnglish: load.driverNameEnglish,
        driverNameSinhala: load.driverNameSinhala,
        driverNameTamil: load.driverNameTamil,
        origin: load.centreName || load.origin,
        items: load.items,
        isUnloaded: load.isUnloaded ?? false,
        title: load.isUnloaded ? "Unloaded Summery" : undefined,
      });
    } else {
      navigation.navigate("ReceivedProductsToday");
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
        <View className="bg-black/50 p-8 rounded-full">
          <ActivityIndicator size="large" color={PRIMARY_OUTLINE_COLOR} />
        </View>
        <Text className="text-white text-lg mt-4">
          {t("qrcode.Loading camera", "Loading camera...")}
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
            <ActivityIndicator size="large" color={PRIMARY_OUTLINE_COLOR} />
            <Text className="text-white text-lg font-semibold mt-4">
              {t("qrcode.Verifying", "Verifying Load...")}
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
          "The QR code could not be detected within the time limit. Please check and try again."
        )}
        type="error"
        onClose={handleTimeoutModalClose}
        showRescanButton={true}
        onRescan={handleTimeoutRescan}
        duration={7000}
        autoClose={true}
      />

      {/* Error Modal */}
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

      {/* Full-Screen Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned || loading ? undefined : handleBarCodeScanned
        }
      />

      {/* Dark overlay with clear scan frame in center */}
      <View className="flex-1 bg-black/35">
        {/* Custom Header */}
        <CustomHeader
          title={t("ScanLoadQR.Title", t("qrcode.ScanLoadQR"))}
          navigation={navigation}
          iconBgColor="#F7FAFF"
          bgColor="#FFFFFF"
        />

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
            {/* Animated Purple Scan Line */}
            <Animated.View
              style={{
                width: "100%",
                height: 3,
                backgroundColor: PRIMARY_OUTLINE_COLOR,
                transform: [{ translateY: scanLineTranslateY }],
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                opacity: scanned || loading ? 0 : 1,
              }}
            />

            {/* Corner Markers - Top Left */}
            <View style={{ position: "absolute", top: -3, left: -3, width: 50, height: 50, zIndex: 20 }}>
              <View style={{ width: 50, height: 12, backgroundColor: PRIMARY_OUTLINE_COLOR, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
              <View style={{ width: 12, height: 38, backgroundColor: PRIMARY_OUTLINE_COLOR, borderBottomLeftRadius: 20 }} />
            </View>

            {/* Corner Markers - Top Right */}
            <View style={{ position: "absolute", top: -3, right: -3, width: 50, height: 50, zIndex: 20 }}>
              <View style={{ width: 50, height: 12, backgroundColor: PRIMARY_OUTLINE_COLOR, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
              <View style={{ width: 12, height: 38, backgroundColor: PRIMARY_OUTLINE_COLOR, borderBottomRightRadius: 20, alignSelf: "flex-end" }} />
            </View>

            {/* Corner Markers - Bottom Left */}
            <View style={{ position: "absolute", bottom: -3, left: -3, width: 50, height: 50, zIndex: 20 }}>
              <View style={{ width: 12, height: 38, backgroundColor: PRIMARY_OUTLINE_COLOR, borderTopLeftRadius: 20 }} />
              <View style={{ width: 50, height: 12, backgroundColor: PRIMARY_OUTLINE_COLOR, borderBottomLeftRadius: 20 }} />
            </View>

            {/* Corner Markers - Bottom Right */}
            <View style={{ position: "absolute", bottom: -3, right: -3, width: 50, height: 50, zIndex: 20 }}>
              <View style={{ width: 12, height: 38, backgroundColor: PRIMARY_OUTLINE_COLOR, borderTopRightRadius: 20, alignSelf: "flex-end" }} />
              <View style={{ width: 50, height: 12, backgroundColor: PRIMARY_OUTLINE_COLOR, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />
            </View>
          </View>

          {/* Subtitle helper badge */}
          <View className="mt-8 bg-black/60 px-5 py-2.5 rounded-full">
            <Text className="text-white text-xs font-semibold text-center">
              {t("ScanLoadQR.AlignLoadQR", t("qrcode.AlignLoadQR", "Align the Load QR code within the frame to scan"))}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ScanLoadQR;
