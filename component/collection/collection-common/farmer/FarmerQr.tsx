import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useState } from "react";
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
import { useRoute, RouteProp } from "@react-navigation/native";
import axios from "axios";
import { environment } from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import FarmerQrSkeletonLoader from "@/component/components/skeletons/FarmerQrSkeletonLoader";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { MaterialIcons } from "@expo/vector-icons";

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
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmerLanguage, setFarmerLanguage] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingPensionStatus, setCheckingPensionStatus] = useState(false);
  const { t } = useTranslation();

  const route = useRoute<FarmerQrRouteProp>();
  const { userId } = route.params;
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
      await MediaLibrary.requestPermissionsAsync(true);
    };

    getPermissions();
  }, [userId]);

  const checkPensionStatus = async () => {
    try {
      setCheckingPensionStatus(true);

      const token = store.getState().auth.token;

      if (!token) {
        Alert.alert(t("Error.error"), "Authentication token not found");
        setCheckingPensionStatus(false);
        return;
      }

      const eligibilityResponse = await api.get(
        `api/pension/check-eligibility/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!eligibilityResponse.data.eligible) {
        setCheckingPensionStatus(false);
        navigation.navigate("NotEligibleScreen");
        return;
      }

      const statusResponse = await api.post(
        `api/pension/pension-request/check-status-by-nic`,
        { nic: farmerNIC },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setCheckingPensionStatus(false);

      if (statusResponse.data.status) {
        if (statusResponse.data.hasPensionRequest) {
          navigation.navigate("GoviPensionStatus", {
            status: statusResponse.data.reqStatus,
            creatAt: statusResponse.data.requestCreatedAt,
          });
        } else {
          navigation.navigate("GoviPensionForm", {
            farmerNIC: farmerNIC,
            farmerPhone: farmerPhone,
            userId: userId,
          });
        }
      } else {
        Alert.alert(
          t("Error.error"),
          statusResponse.data.message || "Failed to check pension status",
        );
      }
    } catch (error: any) {
      setCheckingPensionStatus(false);
      console.error("Error checking pension eligibility/status:", error);

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

      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Gallery access is required to save QR Code.",
        );
        return;
      }

      const fileUri = `${(FileSystem as any).documentDirectory}QRCode_${Date.now()}.png`;
      const response = await FileSystem.downloadAsync(farmerQRCode, fileUri);

      const asset = await MediaLibrary.createAssetAsync(response.uri);
      await MediaLibrary.createAlbumAsync("Download", asset, false);

      Alert.alert(t("QRcode.successTitle") || "Success", "Attachment has been saved to your selected folder");
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
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBackPress();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBackPress]),
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
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#00000040",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 w-full max-w-[500px] mx-auto px-4">
          {loading ? (
            <FarmerQrSkeletonLoader />
          ) : (
            <View className="flex-1 justify-center items-center">
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
                  className={`rounded-full items-center justify-center ${
                    !farmerQRCode ? "bg-gray-400" : "bg-[#980775]"
                  }`}
                  onPress={() =>
                    navigation.navigate("Main", {
                      screen: "UnregisteredCropDetails",
                      params: { userId, farmerPhone, farmerLanguage },
                    } as any)
                  }
                  disabled={!farmerQRCode}
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                    width: 293,
                    height: 50,
                  }}
                >
                  <Text className="text-white text-lg font-medium">
                    {t("FarmerQr.Collect")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="items-center mb-8 mx-4">
                <TouchableOpacity
                  style={{
                    width: 293,
                    height: 50,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#000000",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFFFFF",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                  onPress={checkPensionStatus}
                  disabled={checkingPensionStatus}
                  activeOpacity={0.8}
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
              <View className="flex-row w-full px-12 pb-8 gap-8 max-w-[500px] mx-auto">
                <TouchableOpacity
                  className="bg-black rounded-lg items-center justify-center flex-1 py-4"
                  onPress={downloadQRCode}
                  disabled={checkingPensionStatus}
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <View className="flex-col items-center justify-center gap-2">
                    <MaterialIcons name="download" size={20} color="white" />
                    <Text
                      className="text-white text-base"
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
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-black rounded-lg items-center justify-center flex-1 py-4"
                  onPress={shareQRCode}
                  disabled={checkingPensionStatus}
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <View className="flex-col items-center justify-center gap-2">
                    <MaterialIcons name="share" size={20} color="white" />
                    <Text
                      className="text-white text-base"
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
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FarmerQr;
