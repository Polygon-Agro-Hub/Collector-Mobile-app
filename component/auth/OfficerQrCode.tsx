import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  BackHandler,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import CustomHeader from "../navigations/CustomHeader";
import LoadingPage from "../commons/LoadingPage";
import { useFocusEffect } from "@react-navigation/native";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type OfficerQrNavigationProps = StackNavigationProp<
  RootStackParamList,
  "OfficerQr"
>;

interface OfficerQrProps {
  navigation: OfficerQrNavigationProps;
}

const OfficerQr: React.FC<OfficerQrProps> = ({ navigation }) => {
  const [QR, setQR] = useState<string>("");
  const { t } = useTranslation();
  const [language, setLanguage] = useState<string>("en");
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLanguage = async () => {
      const storedLanguage = await AsyncStorage.getItem("@user_language");
      if (storedLanguage) {
        setLanguage(storedLanguage);
      }
    };

    fetchLanguage();
  }, []);

  const fetchRegistrationDetails = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      const [response] = await Promise.all([
        api.get("api/collection-officer/user-profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      const data = response.data.data;

      if (response.data.status === "success") {
        setProfile(data);
        setQR(data.QRcode || "");
      } else {
        Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      }
    } catch (error) {
      console.error("Error fetching registration details:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
    } finally {
      setIsLoading(false);
    }
  };

  const getFullName = () => {
    if (!profile) return "Loading...";
    switch (language) {
      case "si":
        return `${profile.firstNameSinhala} ${profile.lastNameSinhala}`;
      case "ta":
        return `${profile.firstNameTamil} ${profile.lastNameTamil}`;
      default:
        return `${profile.firstNameEnglish} ${profile.lastNameEnglish}`;
    }
  };

  const getCompanyName = () => {
    if (!profile) return "Loading...";
    switch (language) {
      case "si":
        return profile.companyNameSinhala;
      case "ta":
        return profile.companyNameTamil;
      default:
        return profile.companyNameEnglish;
    }
  };

  useEffect(() => {
    fetchRegistrationDetails();
  }, []);

  const downloadQRCode = async () => {
    try {
      if (!QR) {
        Alert.alert(t("Error.error"), t("Error.No QR Code available."));
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
      const response = await FileSystem.downloadAsync(QR, fileUri);
      const asset = await MediaLibrary.createAssetAsync(response.uri);
      await MediaLibrary.createAlbumAsync("Download", asset, false);

      Alert.alert(t("Error.Success") || "Success", "Attachment has been saved to your selected folder");
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(t("Error.error"), t("Error.failedSaveQRCode"));
    }
  };

  const shareQRCode = async () => {
    try {
      if (!QR) {
        Alert.alert(t("Error.error"), t("Error.No QR Code available."));
        return;
      }

      const fileUri = `${(FileSystem as any).documentDirectory}QRCode_${Date.now()}.png`;
      const response = await FileSystem.downloadAsync(QR, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(response.uri, {
          mimeType: "image/png",
          dialogTitle: "Share QR Code",
        });
      } else {
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device.",
        );
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to share QR Code."));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("SideMenu");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("OfficerQr.QRCode")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.navigate("SideMenu")}
      />

      {isLoading ? (
        <LoadingPage fullScreen />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 4 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center">
            <View className="items-center mb-8 mt-[-5%]">
              {QR ? (
                <View className="bg-white p-4 rounded-3xl border-2 border-[#FAE432]">
                  <Image
                    source={{ uri: QR }}
                    className="w-[270px] h-[270px]"
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <Text className="text-gray-500 text-center mt-4">
                  {t("OfficerQr.Noavailable")}
                </Text>
              )}
            </View>

            <View className="flex-row items-center justify-center mb-8 px-4">
              {profile && profile.image ? (
                <Image
                  source={{ uri: profile.image }}
                  className="w-20 h-20 rounded-full border-2 border-gray-300 mr-4"
                />
              ) : (
                <Image
                  source={require("../../assets/images/collection-manager/pc-profile.webp")}
                  className="w-20 h-20 rounded-full border-2 border-gray-300 mr-4"
                />
              )}
              <View>
                <Text className="text-lg font-semibold">{getFullName()}</Text>
                <Text className="text-gray-600">{getCompanyName()}</Text>
              </View>
            </View>

            <View className="flex-row w-full px-8 pb-8 gap-4 max-w-[500px] mx-auto">
              <TouchableOpacity
                className="bg-black rounded-lg items-center justify-center flex-1 py-3 h-[70px]"
                onPress={downloadQRCode}
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <View className="flex-col items-center justify-center gap-2">
                  <MaterialIcons name="download" size={24} color="white" />
                  <Text className="text-white text-base">
                    {t("OfficerQr.Download")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-black rounded-lg items-center justify-center flex-1 py-4 h-[70px]"
                onPress={shareQRCode}
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <View className="flex-col items-center justify-center gap-2">
                  <MaterialIcons name="share" size={24} color="white" />
                  <Text className="text-white text-base">
                    {t("OfficerQr.Share")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default OfficerQr;
