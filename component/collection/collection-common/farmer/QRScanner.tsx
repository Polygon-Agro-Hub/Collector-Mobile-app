import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { CameraView, Camera } from "expo-camera";
import { useTranslation } from "react-i18next";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import CameraAccess from "@/component/common/permission/CameraAccess";
import { useFocusEffect } from "@react-navigation/native";
import { AlertModal } from "@/component/components/popup/AlertModal";

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

  const [jobRole, setJobRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobRole = async () => {
      try {
        const role = store.getState().auth.jobRole;
        setJobRole(role);
      } catch (error) {
        console.error("Error fetching job role:", error);
      }
    };
    fetchJobRole();
  }, []);

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

  const handleBackPress = () => {
    if (jobRole === "Collection Officer") {
      navigation.navigate("Main" as any, {
        screen: "CollectionOfficerDashboard",
      });
    } else if (jobRole === "Collection Centre Manager") {
      navigation.navigate("Main" as any, { screen: "ManagerDashboard" });
    } else {
      navigation.navigate("Main" as any, {
        screen: "CollectionOfficerDashboard",
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (jobRole === "Collection Officer") {
          navigation.navigate("Main" as any, {
            screen: "CollectionOfficerDashboard",
          });
        } else if (jobRole === "Collection Centre Manager") {
          navigation.navigate("Main" as any, { screen: "ManagerDashboard" });
        } else {
          navigation.navigate("Main" as any, {
            screen: "CollectionOfficerDashboard",
          });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation, jobRole]),
  );

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

      navigation.navigate("Main" as any, { screen: "FarmerQr", params: { userId } });
    } catch (error) {
      console.error("QR Parsing Error:", error);

      setIsUnsuccessfulModalVisible(true);
    }
  };

  if (showCameraAccess) {
    return (
      <CameraAccess
        navigation={navigation as any}
        onPermissionGranted={handlePermissionGranted}
        returnScreen="QRScanner"
      />
    );
  }

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, color: "#333" }}>
          {t("QRScanner.Requesting for camera permission")}
        </Text>
      </View>
    );
  }

  if (hasPermission === true) {
    return (
      <View style={{ flex: 1, position: "relative" }}>
        <CustomHeader
          title={t("QRScanner.ScantheQR")}
          showBackButton={true}
          navigation={navigation}
          onBackPress={handleBackPress}
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

        <AlertModal
          visible={isUnsuccessfulModalVisible}
          title={t("QRScanner.Failed")}
          message={t("QRScanner.SearchNIC")}
          type="error"
          duration={5000}
          showRescanButton={true}
          onRescan={() => {
            setIsUnsuccessfulModalVisible(false);
            setScanned(false);
          }}
          onClose={() => {
            setIsUnsuccessfulModalVisible(false);
            navigation.navigate("SearchFarmer" as any);
          }}
        />
      </View>
    );
  }

  return null;
};

export default QRScanner;
