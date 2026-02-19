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
// import { BarCodeScanner } from 'expo-barcode-scanner';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { CameraView, Camera } from "expo-camera";
import { useTranslation } from "react-i18next";
import AntDesign from "react-native-vector-icons/AntDesign";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState<boolean>(false);

  const [unsuccessfulLoadingBarWidth, setUnsuccessfulLoadingBarWidth] =
    useState(new Animated.Value(100)); // Start with 100%

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();


    const unsubscribe = navigation.addListener("focus", () => {
      setScanned(false);
      setErrorMessage(null); 
      setIsUnsuccessfulModalVisible(false); 
    });


    return unsubscribe;
  }, [navigation]);

  // Handle QR scan
  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true); // Set the scanned flag to true

    try {
      // console.log("Scanned Data:", data);
      // console.log("Data Type:", typeof data);


      const qrData = JSON.parse(data); 

      console.log("Parsed QR Code Data:", qrData);
      console.log("Parsed Type:", typeof qrData);

    
      const userId = qrData.userInfo?.id; 

    //  console.log("User ID:", userId);

      if (!userId) {
        throw new Error(t("Error.User ID not found in QR code"));
      }

      // Navigate to the desired screen and pass the userId
      navigation.navigate("FarmerQr" as any, { userId });
    } catch (error) {
      console.error("QR Parsing Error:", error);
      setErrorMessage(
        t(
          "Error.The scanned QR code does not contain a valid user ID or is damaged."
        )
      );
      setIsUnsuccessfulModalVisible(true);

    
      unsuccessfulLoadingBarWidth.setValue(100); // Reset width to 100%
      Animated.timing(unsuccessfulLoadingBarWidth, {
        toValue: 0, // Animate to 0 (empty bar)
        duration: 5000, // 5 seconds duration
        useNativeDriver: false,
      }).start();

      // After 5 seconds (for the bar animation), close the modal and navigate
      setTimeout(() => {
        setIsUnsuccessfulModalVisible(false);
        setErrorMessage(null);
        navigation.navigate("SearchFarmer" as any); // Navigate to SearchFarmer
        console.log("hit");
      }, 5000);
    }
  };

  const handleError = (err: any) => {
    console.error("QR Reader Error:", err);
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
                    <View className="flex-row items-center px-4 py-4 bg-white shadow-sm">
                      <TouchableOpacity  className="bg-[#F6F6F680] rounded-full p-2 justify-center w-10 z-20 " onPress={() => navigation.goBack()}>
                        <AntDesign name="left" size={24} color="#000" />
                      </TouchableOpacity>
       
                      <View className="flex-1 ">
                        <Text className="text-lg font-bold text-center -ml-8">
                          {t("QRScanner.ScantheQR")}
                        </Text>
                      </View>
                    </View>
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
              setScanned(false); // Reset the scanned state
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
            source={require("../../assets/images/New/error.png")} // Replace with your own error image
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
