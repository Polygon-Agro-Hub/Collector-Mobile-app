import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { CameraView, Camera } from "expo-camera";
import { useTranslation } from "react-i18next";
import CustomHeader from "../navigations/CustomHeader";
import CameraAccess from "../permission/CameraAccess";

type QRScannerNavigationProp = StackNavigationProp<
  RootStackParamList,
  "QRScanner"
>;

interface QRScannerProps {
  navigation: QRScannerNavigationProp;
}

const { width } = Dimensions.get("window");
const scanningAreaSize = width * 0.8;

const QRScanner: React.FC<QRScannerProps> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState<boolean>(false);
  const [showCameraAccess, setShowCameraAccess] = useState<boolean>(false);

  const { t } = useTranslation();

  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState<boolean>(false);

  const [unsuccessfulLoadingBarWidth, setUnsuccessfulLoadingBarWidth] =
    useState(new Animated.Value(100));

  useEffect(() => {
    const checkCameraPermissions = async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      
      if (status === "granted") {
        setHasPermission(true);
        setShowCameraAccess(false);
      } else if (status === "denied") {
        setHasPermission(false);
        setShowCameraAccess(true);
      } else {
        // undetermined - show camera access screen
        setHasPermission(false);
        setShowCameraAccess(true);
      }
    };

    checkCameraPermissions();

    const unsubscribe = navigation.addListener("focus", () => {
      setScanned(false);
      setIsUnsuccessfulModalVisible(false);
    });

    return unsubscribe;
  }, [navigation]);

  const handlePermissionGranted = () => {
    setHasPermission(true);
    setShowCameraAccess(false);
  };

  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);

    try {
      const qrData = JSON.parse(data);

      const userId = qrData.userInfo?.id;

      if (!userId) {
        throw new Error(t("Error.User ID not found in QR code"));
      }

      navigation.navigate("FarmerQr" as any, { userId });
    } catch (error) {
      console.error("QR Parsing Error:", error);

      setIsUnsuccessfulModalVisible(true);

      unsuccessfulLoadingBarWidth.setValue(100);
      Animated.timing(unsuccessfulLoadingBarWidth, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: false,
      }).start();

      setTimeout(() => {
        setIsUnsuccessfulModalVisible(false);
        navigation.navigate("SearchFarmer" as any);
      }, 5000);
    }
  };

  // Show CameraAccess screen when permission is not granted
  if (showCameraAccess) {
    return (
      <CameraAccess
        navigation={navigation as any}
        onPermissionGranted={handlePermissionGranted}
        returnScreen="QRScanner"
      />
    );
  }

  // Show loading state while checking permissions
  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, color: "#333" }}>
          {t("QRScanner.Requesting for camera permission")}
        </Text>
      </View>
    );
  }

  // Show scanner when permission is granted
  if (hasPermission === true) {
    return (
      <View style={{ flex: 1, position: "relative" }}>
        <CustomHeader
          title={t("QRScanner.ScantheQR")}
          showBackButton={true}
          navigation={navigation}
          onBackPress={() => navigation.goBack()}
        />
        <CameraView
          className="flex-1 "
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
          style={{ flex: 1 }}
        />

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: scanningAreaSize,
              height: scanningAreaSize,
              borderColor: "#FAE432",
              borderWidth: 2,
              borderRadius: 10,
            }}
          />
        </View>

        {/* "Tap to Scan Again" button */}
        {scanned && (
          <View style={{ position: "absolute", bottom: 50, alignSelf: "center" }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#FAE432",
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 8,
              }}
              onPress={() => {
                setScanned(false);
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16 }}>
                {t("QRScanner.TapScan")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          transparent={true}
          visible={isUnsuccessfulModalVisible}
          animationType="slide"
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-70">
            <View className="bg-white rounded-lg w-72 h-80 items-center relative overflow-hidden">
              <View className="p-6 items-center">
                <Text className="text-xl font-bold mb-4">
                  {t("QRScanner.Failed")}
                </Text>
                <View className="mb-4">
                  <Image
                    source={require("../../assets/images/collection-common/error.webp")}
                    className="w-32 h-32"
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-gray-700">{t("QRScanner.SearchNIC")}</Text>
              </View>

              {/* Red Loading Bar at bottom */}
              <View className="absolute bottom-0 left-0 w-full h-2 bg-gray-300">
                <Animated.View
                  className="h-full bg-red-500"
                  style={{ width: unsuccessfulLoadingBarWidth }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return null;
};

export default QRScanner;