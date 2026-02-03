import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {  useRoute, RouteProp } from "@react-navigation/native";
import axios from "axios";
import { environment } from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "./types";
//import * as FileSystem from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import FarmerQrSkeletonLoader from "./Skeleton/FarmerQrSkeletonLoader";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";
import CustomHeader from "./Common/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create API instance
const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type FarmerQrNavigationProp = StackNavigationProp<
  RootStackParamList,
  "FarmerQr"
>;

interface FarmerQrProps {
  navigation: FarmerQrNavigationProp;
}

type FarmerQrRouteProp = RouteProp<RootStackParamList, "FarmerQr">;

const FarmerQr: React.FC<FarmerQrProps> = ({ navigation }) => {
  const [farmerName, setFarmerName] = useState("");
  const [farmerNIC, setFarmerNIC] = useState("");
  const [farmerQRCode, setFarmerQRCode] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmerLanguage, setFarmerLanguage] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingPensionStatus, setCheckingPensionStatus] = useState(false);
  const { t } = useTranslation();

  const route = useRoute<FarmerQrRouteProp>();
  const { userId } = route.params;

  useEffect(() => {
    const fetchFarmerData = async () => {
      try {
        const response = await api.get(`api/farmer/register-farmer/${userId}`);
        const {
          firstName,
          lastName,
          NICnumber,
          qrCode,
          phoneNumber,
          language,
        } = response.data;

        setFarmerName(`${firstName} ${lastName}`);
        setFarmerNIC(NICnumber);
        if (qrCode) {
          setFarmerQRCode(qrCode);
        } else {
          console.log("No QR Code data found");
        }

        setFarmerPhone(phoneNumber);
        setFarmerLanguage(language);
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      } catch (error) {
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to fetch farmer details"),
        );
        setLoading(false);
      }
    };

    fetchFarmerData();

    const getPermissions = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionsGranted(status === "granted");
    };

    getPermissions();
  }, [userId]);

  const checkPensionStatus = async () => {
    try {
      setCheckingPensionStatus(true);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(t("Error.error"), "Authentication token not found");
        setCheckingPensionStatus(false);
        return;
      }

      const response = await api.post(
        `api/pension/pension-request/check-status-by-nic`,
        { nic: farmerNIC },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setCheckingPensionStatus(false);
      console.log("pension data",response.data)

      if (response.data.status) {
        if (response.data.hasPensionRequest) {
          // Has pension request, navigate to status screen with the status
          navigation.navigate("GoviPensionStatus", {
            status: response.data.reqStatus,
            creatAt: response.data.requestCreatedAt
          });
        } else {
          // No pension request found, navigate to application form
          navigation.navigate("GoviPensionForm", {
            farmerNIC: farmerNIC,
            farmerPhone: farmerPhone,
            userId: userId,
          });
        }
      } else {
        // API returned error
        Alert.alert(
          t("Error.error"),
          response.data.message || "Failed to check pension status",
        );
      }
    } catch (error: any) {
      setCheckingPensionStatus(false);
      console.error("Error checking pension status:", error);

      if (error.response?.status === 401) {
        Alert.alert(
          t("Error.error"),
          "Authentication failed. Please login again.",
        );
      } else if (error.response?.data?.message) {
        Alert.alert(t("Error.error"), error.response.data.message);
      } else {
        Alert.alert(
          t("Error.error"),
          "Failed to check pension status. Please try again.",
        );
      }
    }
  };
  const downloadQRCode = async () => {
    try {
      if (!farmerQRCode) {
        Alert.alert(t("Error.error"), t("Error.noQRCodeAvailable"));
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "QRcode.permissionDeniedTitle",
          "QRcode.permissionDeniedMessage",
        );
        return;
      }

      const fileUri = `${(FileSystem as any).documentDirectory}QRCode_${Date.now()}.png`;
      const response = await FileSystem.downloadAsync(farmerQRCode, fileUri);

      const asset = await MediaLibrary.createAssetAsync(response.uri);
      await MediaLibrary.createAlbumAsync("Download", asset, false);

      Alert.alert(t("QRcode.successTitle"), t("QRcode.savedToGallery"));
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(t("Error.error"), t("Error.failedSaveQRCode"));
    }
  };

  const shareQRCode = async () => {
    try {
      if (!farmerQRCode) {
        Alert.alert(t("Error.error"), t("Error.noQRCodeAvailable"));
        return;
      }

      const fileUri = `${(FileSystem as any).documentDirectory}QRCode_${Date.now()}.png`;
      const response = await FileSystem.downloadAsync(farmerQRCode, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(response.uri, {
          mimeType: "image/png",
          dialogTitle: "Share QR Code",
        });
      } else {
        Alert.alert(
          t("QRcode.sharingUnavailableTitle"),
          t("QRcode.sharingUnavailableMessage"),
        );
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert(t("Main.error"), t("QRcode.failedShareQRCode"));
    }
  };

  const handleBackPress = () => {
    navigation.navigate("Main", { screen: "Dashboard" });
    return true;
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Main", { screen: "Dashboard" });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      {/* Custom Header */}
      <CustomHeader
        title={t("FarmerQr.FarmerDetails")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={handleBackPress}
      />

      {/* Pension Status Checking Overlay */}
      {checkingPensionStatus && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 justify-center items-center z-50">
          <View className="bg-white p-6 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#980775" />
            <Text className="mt-4 text-gray-700 font-medium">
              {t("FarmerQr.Checking pension status...")}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        className="bg-white"
        contentContainerStyle={{
          paddingHorizontal: wp(4),
          paddingVertical: hp(2),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          {loading ? (
            <View
              className="items-center mt-10"
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FarmerQrSkeletonLoader />
            </View>
          ) : (
            <>
              {/* Farmer Name and NIC - Centered */}
              <View className="items-center mt-2 mb-6">
                <Text className="text-xl font-bold text-gray-800 mb-2">
                  {farmerName}
                </Text>
                <Text className="text-gray-500 text-base">{farmerNIC}</Text>
              </View>

              {/* QR Code - Centered */}
              <View className="items-center mb-8">
                {farmerQRCode ? (
                  <Image
                    source={{ uri: farmerQRCode }}
                    style={{
                      width: 280,
                      height: 280,
                      borderWidth: 1,
                      borderColor: "#FAE432",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <Text className="text-red-500 text-center">
                    {t("FarmerQr.QRavailable")}
                  </Text>
                )}
              </View>

              {/* Collect Button - Centered */}
              <View className="items-center mb-6 mx-4">
                <TouchableOpacity
                  className={`w-full py-4 rounded-full items-center ${
                    !farmerQRCode ? "bg-gray-400" : "bg-[#980775]"
                  }`}
                  onPress={() =>
                    navigation.navigate("Main", {
                      screen: "UnregisteredCropDetails",
                      params: { userId, farmerPhone, farmerLanguage },
                    } as never)
                  }
                  disabled={!farmerQRCode}
                >
                  <Text className="text-white text-lg font-medium">
                    {t("FarmerQr.Collect")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Apply For Pension Button - Centered */}
              <View className="items-center mb-8 mx-4">
                <TouchableOpacity
                  className="border border-[#606060] w-full py-4 rounded-full items-center"
                  onPress={checkPensionStatus}
                  disabled={checkingPensionStatus}
                >
                  {checkingPensionStatus ? (
                    <ActivityIndicator size="small" color="#606060" />
                  ) : (
                    <Text className="text-gray-700 text-lg font-medium">
                      {t("FarmerQr.Apply For Pension")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Download and Share buttons - Centered */}
              <View className="flex-row justify-center space-x-6 mb-4">
                <TouchableOpacity
                  className="bg-[#000000] p-4 h-[80px] w-[120px] rounded-lg items-center"
                  onPress={downloadQRCode}
                  disabled={checkingPensionStatus}
                >
                  <Image
                    source={require("../assets/images/download.webp")}
                    style={{ width: 24, height: 24, marginBottom: 8 }}
                  />
                  <Text
                    className="text-white text-sm"
                    style={[
                      i18n.language === "si"
                        ? { fontSize: 12 }
                        : i18n.language === "ta"
                          ? { fontSize: 11 }
                          : { fontSize: 15 },
                    ]}
                  >
                    {t("FarmerQr.Download")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-[#000000] p-4 h-[80px] w-[120px] rounded-lg items-center"
                  onPress={shareQRCode}
                  disabled={checkingPensionStatus}
                >
                  <Image
                    source={require("../assets/images/Share.webp")}
                    style={{ width: 24, height: 24, marginBottom: 8 }}
                  />
                  <Text
                    className="text-white text-sm"
                    style={[
                      i18n.language === "si"
                        ? { fontSize: 12 }
                        : i18n.language === "ta"
                          ? { fontSize: 11 }
                          : { fontSize: 15 },
                    ]}
                  >
                    {t("FarmerQr.Share")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FarmerQr;
