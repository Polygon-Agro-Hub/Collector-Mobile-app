import store from "@/services/reducxStore";
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
import { saveImageToGallery } from "@/utils/mediaSave";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import environment from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LoadingPage from "@/component/components/loading/LoadingPage";
import { useFocusEffect } from "@react-navigation/native";
import DownloadShareButtons from "@/component/components/buttons/DownloadShareButtons";

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
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<string>("en");
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read the saved language (called every time the screen gains focus)
  const fetchLanguage = useCallback(async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem("@user_language");
      setLanguage(storedLanguage || i18n.language || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  }, [i18n.language]);

  // Also react when i18n itself changes language
  useEffect(() => {
    if (i18n.language) {
      setLanguage(i18n.language);
    }
  }, [i18n.language]);

  const fetchRegistrationDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = store.getState().auth.token;
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
  }, []);

  // Reload language + profile every time this screen is navigated to
  useFocusEffect(
    useCallback(() => {
      fetchLanguage();
      fetchRegistrationDetails();
    }, [fetchLanguage, fetchRegistrationDetails]),
  );

  // Names are derived from the stored profile at render time, so a language
  // change is reflected immediately.
  const getFullName = () => {
    if (!profile) return t("ManagerTransactions.Loading");

    const english =
      `${profile.firstNameEnglish ?? ""} ${profile.lastNameEnglish ?? ""}`.trim();

    switch (language) {
      case "si": {
        const name =
          `${profile.firstNameSinhala ?? ""} ${profile.lastNameSinhala ?? ""}`.trim();
        return name || english;
      }
      case "ta": {
        const name =
          `${profile.firstNameTamil ?? ""} ${profile.lastNameTamil ?? ""}`.trim();
        return name || english;
      }
      default:
        return english;
    }
  };

  const getCompanyName = () => {
    if (!profile) return t("ManagerTransactions.Loading");
    switch (language) {
      case "si":
        return profile.companyNameSinhala || profile.companyNameEnglish;
      case "ta":
        return profile.companyNameTamil || profile.companyNameEnglish;
      default:
        return profile.companyNameEnglish;
    }
  };

  const downloadQRCode = async () => {
    try {
      if (!QR) {
        Alert.alert(
          t("Error.error", "Error"),
          t(
            "OfficerQr.NoQrAvailable",
            t("Error.No QR Code available.", "No QR Code available."),
          ),
          [{ text: t("OfficerQr.OK", t("AlertModal.OK", "OK")) }],
        );
        return;
      }

      const success = await saveImageToGallery(QR, "Officer_QRCode");
      if (success) {
        Alert.alert(
          t("OfficerQr.Success", t("Error.Success", "Success")),
          t(
            "OfficerQr.SuccessMessage",
            t(
              "Error.AttachmentHasBeenSavedToYourSelectedFolder",
              "Attachment has been saved to your selected folder",
            ),
          ),
        );
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(
        t("Error.error", "Error"),
        t(
          "OfficerQr.FailedSave",
          t("Error.failedSaveQRCode", "Failed to save QR Code."),
        ),
        [{ text: t("OfficerQr.OK", t("AlertModal.OK", "OK")) }],
      );
    }
  };

  const shareQRCode = async () => {
    try {
      if (!QR) {
        Alert.alert(
          t("Error.error", "Error"),
          t(
            "OfficerQr.NoQrAvailable",
            t("Error.No QR Code available.", "No QR Code available."),
          ),
          [{ text: t("OfficerQr.OK", t("AlertModal.OK", "OK")) }],
        );
        return;
      }

      const fileUri = `${(FileSystem as any).cacheDirectory}Officer_QRCode_${Date.now()}.png`;
      const response = await FileSystem.downloadAsync(QR, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(response.uri, {
          mimeType: "image/png",
          dialogTitle: t("OfficerQr.Share", "Share QR Code"),
          UTI: "public.png",
        });
      } else {
        Alert.alert(
          t("OfficerQr.SharingUnavailableTitle", "Sharing Unavailable"),
          t(
            "OfficerQr.SharingUnavailable",
            "Sharing is not available on this device.",
          ),
          [{ text: t("OfficerQr.OK", t("AlertModal.OK", "OK")) }],
        );
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert(
        t("Error.error", "Error"),
        t(
          "OfficerQr.FailedShare",
          t("Error.Failed to share QR Code.", "Failed to share QR Code."),
        ),
        [{ text: t("OfficerQr.OK", t("AlertModal.OK", "OK")) }],
      );
    }
  };

  // Hardware back button
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
                  source={require("../../../assets/images/collection-manager/pc-profile.webp")}
                  className="w-20 h-20 rounded-full border-2 border-gray-300 mr-4"
                />
              )}
              <View>
                <Text className="text-lg font-semibold">{getFullName()}</Text>
                <Text className="text-gray-600">{getCompanyName()}</Text>
              </View>
            </View>

            <DownloadShareButtons
              onDownload={downloadQRCode}
              onShare={shareQRCode}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default OfficerQr;
