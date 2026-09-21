import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { handleGeneratePDF } from "./ReportPDFGenerator";
import * as Sharing from "expo-sharing";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import i18n from "@/i18n/i18n";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import DownloadShareButtons from "@/component/components/buttons/DownloadShareButtons";
import CustomCalendar from "@/component/components/popup/CustomcalendarModal";

type ReportLanguage = "en" | "si" | "ta";

type ReportGeneratorNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReportGenerator"
>;

type ReportGeneratorRouteProp = RouteProp<
  RootStackParamList,
  "ReportGenerator"
>;

interface ReportGeneratorProps {
  navigation: ReportGeneratorNavigationProp;
  route: ReportGeneratorRouteProp;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  navigation,
  route,
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [generateAgain, setGenerateAgain] = useState(false);
  const { t, i18n: i18nInstance } = useTranslation();

  const {
    officerId,
    collectionOfficerId,
    phoneNumber1,
    officerName,
    phoneNumber2,
  } = route.params;

  // Normalizes i18next's current language (which can come back as "si-LK",
  // "ta-IN", etc. depending on device locale) down to the "en" | "si" | "ta"
  // union that ReportPDFGenerator expects, with a safe fallback to "en".
  const getCurrentReportLanguage = (): ReportLanguage => {
    const base = i18nInstance.language?.split("-")[0];
    if (base === "si" || base === "ta" || base === "en") {
      return base;
    }
    return "en";
  };

  // Returns "today" as it currently is in Asia/Colombo, expressed as a
  // *local* Date object set to the end of that day (23:59:59.999).
  //
  // Why not just `new Date()` or the old getTimezoneOffset() math?
  // - CustomCalendar builds each day cell with `new Date(year, month, d)`,
  //   which uses the DEVICE's local timezone getters/setters.
  // - The previous implementation tried to shift `now` by
  //   `(colomboOffset - utcOffset)` minutes, but `now.getTime()` is already
  //   an absolute UTC timestamp — it doesn't need the device's local offset
  //   subtracted from it again. On a device already running in Colombo time
  //   (UTC+5:30, so getTimezoneOffset() === -330), that math computed
  //   `330 - (-330) = 660`, shifting "today" forward by 11 extra hours.
  //   Depending on the time of day, that silently rolled "today" into
  //   "tomorrow", which is why tomorrow was still selectable as a start date.
  // - Using Intl.DateTimeFormat reads Colombo's actual calendar date
  //   directly (independent of the device's own timezone), and then we
  //   build a local Date from those Y/M/D parts so it compares correctly
  //   against the local Date objects the calendar grid produces.
  const getTodayInColombo = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);

    // End of "today" (Colombo) so today itself stays selectable while
    // tomorrow (and any later date) is disabled by CustomCalendar's
    // `date > maximumDate` check.
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please select both start and end dates."),
      );
      return;
    }

    if (endDate < startDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.End date cannot be earlier than the start date."),
      );
      return;
    }

    setReportGenerated(false);
    setGenerateAgain(true);

    const fileUri = await handleGeneratePDF(
      formatDate(startDate),
      formatDate(endDate),
      officerId,
      collectionOfficerId,
      getCurrentReportLanguage(),
    );

    if (fileUri) {
      setReportGenerated(true);
      setGenerateAgain(false);
    } else {
      Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
      setGenerateAgain(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setStartDate(undefined);
      setEndDate(undefined);
      setReportGenerated(false);
      setGenerateAgain(false);
    }, []),
  );

  const handleDownload = async () => {
    try {
      if (!startDate || !endDate) {
        Alert.alert(
          t("Error.error"),
          t("Error.Please select both start and end dates."),
        );
        return;
      }

      const uri = await handleGeneratePDF(
        formatDate(startDate),
        formatDate(endDate),
        officerId,
        collectionOfficerId,
        getCurrentReportLanguage(),
      );

      if (!uri) {
        Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
        return;
      }

      const isSinhala = (i18n.language || "en").toLowerCase().startsWith("si");
      const isTamil = (i18n.language || "en").toLowerCase().startsWith("ta");
      const fmtForFileName = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      let fileName: string;

      if (isSinhala) {
        fileName = `වාර්තාව_${officerId}_${fmtForFileName(startDate!)}_සිට_${fmtForFileName(endDate!)}_දක්වා.pdf`;
      } else if (isTamil) {
        fileName = `அறிக்கை_${officerId}_${fmtForFileName(startDate!)}_இருந்து_${fmtForFileName(endDate!)}_வரை.pdf`;
      } else {
        fileName = `Report_${officerId}_From_${fmtForFileName(startDate!)}_To_${fmtForFileName(endDate!)}.pdf`;
      }

      if (Platform.OS === "android") {
        let directoryUri = await AsyncStorage.getItem("download_directory_uri");

        if (!directoryUri) {
          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            directoryUri = permissions.directoryUri;
            await AsyncStorage.setItem("download_directory_uri", directoryUri);
          }
        }

        if (directoryUri) {
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const fileUri =
              await FileSystem.StorageAccessFramework.createFileAsync(
                directoryUri,
                fileName,
                "application/pdf",
              );
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            Alert.alert(
              t("Error.Success") || "Success",
              t("Error.AttachmentHasBeenSavedToYourSelectedFolder"),
            );
          } catch (e) {
            // Permission might have been revoked, try to request again
            await AsyncStorage.removeItem("download_directory_uri");
            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              const newDirectoryUri = permissions.directoryUri;
              await AsyncStorage.setItem(
                "download_directory_uri",
                newDirectoryUri,
              );

              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const fileUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  newDirectoryUri,
                  fileName,
                  "application/pdf",
                );
              await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });

              Alert.alert(
                t("Error.Success") || "Success",
                t("Error.AttachmentHasBeenSavedToYourSelectedFolder"),
              );
            } else {
              Alert.alert(
                t("Error.Permission Denied") || "Permission Denied",
                "Storage permission is required to save the PDF.",
              );
            }
          }
        } else {
          Alert.alert(
            t("Error.Permission Denied") || "Permission Denied",
            "Storage permission is required to save the PDF.",
          );
        }
      } else if (Platform.OS === "ios") {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            dialogTitle: t("Save PDF"),
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert(
            t("Error.error"),
            t("Error.Failed to save PDF to Downloads folder."),
          );
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(
        t("Error.error"),
        t("Error.Failed to prepare PDF for download."),
      );
    }
  };

  const handleShare = async () => {
    if (!startDate || !endDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please select both start and end dates."),
      );
      return;
    }

    const fileUri = await handleGeneratePDF(
      formatDate(startDate),
      formatDate(endDate),
      officerId,
      collectionOfficerId,
      getCurrentReportLanguage(),
    );
    if (fileUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(fileUri, { mimeType: "application/pdf" });
    } else {
      Alert.alert(
        t("Error.error"),
        t("Error.Sharing is not available on this device."),
      );
    }
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setReportGenerated(false);
  };

  const formatDate = (date: Date | undefined, placeholder?: string) => {
    if (!date) return placeholder ?? "Select Date";
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}/${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleBackPress = useCallback(() => {
    navigation.navigate("OfficerSummary" as any, {
      collectionOfficerId,
      officerId,
      phoneNumber1,
      phoneNumber2,
      officerName,
    });
    return true;
  }, [
    navigation,
    collectionOfficerId,
    officerId,
    phoneNumber1,
    phoneNumber2,
    officerName,
  ]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => handleBackPress();

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [handleBackPress]),
  );

  const isNonLatin = ["si", "ta"].includes(getCurrentReportLanguage());

  return (
    <ScrollView className="flex-1 bg-white">
      <CustomHeader
        title={officerId}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("OfficerSummary" as any, {
            collectionOfficerId,
            officerId,
            phoneNumber1,
            phoneNumber2,
            officerName,
          })
        }
      />

      <View className="px-8 mt-8">
        <View className="mb-6">
          <Text className=" text-gray-700 mb-2">
            {t("ReportGenerator.Start Date")} :
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full px-4 py-3 h-[50px] flex-1 flex-row justify-between items-center"
            >
              <Text className="text-[#858585] italic">
                {formatDate(startDate, t("ReportGenerator.Start Date"))}
              </Text>
              <Image
                source={require("../../../../assets/images/collection-manager/rescheduling.webp")}
                className="w-6 h-6"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <CustomCalendar
            visible={showStartPicker}
            value={startDate || new Date()}
            maximumDate={getTodayInColombo()}
            onClose={() => setShowStartPicker(false)}
            onConfirm={(date) => {
              setStartDate(date);
              setEndDate(undefined);
            }}
          />
        </View>

        <View className="mb-6">
          <Text className=" mb-2" style={{ color: "#374151" }}>
            {t("ReportGenerator.End Date")} :
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (startDate) setShowEndPicker(true);
            }}
            disabled={!startDate}
            className="border border-[#F4F4F4] rounded-full px-4 py-3 h-[50px] flex-row justify-between items-center"
            style={{ backgroundColor: startDate ? "#F4F4F4" : "#EBEBEB" }}
          >
            <Text
              style={{ color: startDate ? "#858585" : "#858585" }}
              className="italic"
            >
              {formatDate(endDate, t("ReportGenerator.End Date"))}
            </Text>
            <Image
              source={require("../../../../assets/images/collection-manager/rescheduling.webp")}
              className="w-6 h-6"
              resizeMode="contain"
              style={{ opacity: startDate ? 1 : 0.35 }}
            />
          </TouchableOpacity>

          <CustomCalendar
            visible={showEndPicker}
            value={endDate || startDate || new Date()}
            maximumDate={getTodayInColombo()}
            minimumDate={startDate}
            onClose={() => setShowEndPicker(false)}
            onConfirm={(date) => setEndDate(date)}
          />
        </View>

        <View className="flex-row justify-center gap-2 items-center">
          <TouchableOpacity
            onPress={handleReset}
            className="border border-[#6B6B6B] bg-[white] py-3 rounded-full items-center justify-center px-4"
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
              minWidth: 120,
              height: 45,
            }}
          >
            <Text
              className="text-gray-700 text-center"
              style={{ fontSize: isNonLatin ? 14 : 16 }}
              numberOfLines={1}
            >
              {t("ReportGenerator.Reset")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!startDate || !endDate}
            className="py-3 rounded-full justify-center items-center px-4"
            style={{
              backgroundColor: startDate && endDate ? "#980775" : "#D3A0C5",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: startDate && endDate ? 0.25 : 0,
              shadowRadius: 10,
              elevation: startDate && endDate ? 6 : 0,
              minWidth: 120,
              height: 45,
            }}
          >
            <Text
              className="text-white font-semibold text-center"
              style={{ fontSize: isNonLatin ? 14 : 16 }}
              numberOfLines={1}
            >
              {t("ReportGenerator.Generate")}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderColor: "#ADADAD",
            marginVertical: 10,
            marginTop: 30,
            marginBottom: 40,
          }}
        />
      </View>

      {reportGenerated ? (
        <View className="items-center justify-center flex-1">
          <View className="w-24 h-24 bg-[#FFE6CB66] rounded-full items-center justify-center mb-4">
            <Image
              source={require("../../../../assets/images/collection-manager/document.webp")}
              className="w-14 h-14"
            />
          </View>

          <Text className="text-sm text-gray-500 italic mb-6">
            {t("ReportGenerator.Report has been generated")}
          </Text>

          <View className="w-full">
            <DownloadShareButtons
              onDownload={handleDownload}
              onShare={handleShare}
              downloadLabel={t("ReportGenerator.Download")}
              shareLabel={t("ReportGenerator.Share")}
            />
          </View>
        </View>
      ) : generateAgain ? (
        <View className="items-center justify-center flex-1">
          <LottieView
            source={require("../../../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={{ width: 250, height: 250 }}
          />
        </View>
      ) : (
        <View className="items-center justify-center flex-1">
          <Image
            source={require("../../../../assets/images/collection-manager/empty.webp")}
            className="w-20 h-20 mb-4"
            resizeMode="contain"
          />
          <Text className="text-gray-500 italic">
            {t("ReportGenerator.Time Duration first")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ReportGenerator;