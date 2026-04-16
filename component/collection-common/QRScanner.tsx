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
import { RootStackParamList } from "../types";
import { CameraView, Camera } from "expo-camera";
import { useTranslation } from "react-i18next";
import CustomHeader from "../common/CustomHeader;

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
  const [showPermissionModal, setShowPermissionModal] =
    useState<boolean>(false);

  const { t } = useTranslation();

  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState<boolean>(false);

  const [unsuccessfulLoadingBarWidth, setUnsuccessfulLoadingBarWidth] =
    useState(new Animated.Value(100));

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();

    const unsubscribe = navigation.addListener("focus", () => {
      setScanned(false);

      setIsUnsuccessfulModalVisible(false);
    });

    return unsubscribe;
  }, [navigation]);

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

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, color: "#333" }}>
          {t("QRScanner.Requesting for camera permission")}
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.7)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 10,
              shadowColor: "black",
              width: "80%",
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
            >
              {t("QRScanner.CameraRequired")}
            </Text>
            <Text style={{ color: "#555", marginBottom: 0 }}>
              {t("QRScanner.WeneedCamera")}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#34D399",
                padding: 10,
                borderRadius: 8,
              }}
              onPress={() => {
                setShowPermissionModal(false);
                navigation.navigate("Dashboard");
              }}
            >
              <Text
                style={{ color: "white", textAlign: "center", fontSize: 16 }}
              >
                {" "}
                {t("QRScanner.Close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

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
};

export default QRScanner;
