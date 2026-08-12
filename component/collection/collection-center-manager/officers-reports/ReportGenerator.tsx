import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  const { t } = useTranslation();

  const {
    officerId,
    collectionOfficerId,
    phoneNumber1,
    officerName,
    phoneNumber2,
  } = route.params;

  const getTodayInColombo = () => {
    const now = new Date();
    const colomboOffset = 330;
    const utcOffset = now.getTimezoneOffset();
    const colomboTime = new Date(
      now.getTime() + (colomboOffset - utcOffset) * 60 * 1000,
    );
    colomboTime.setHours(0, 0, 0, 0);
    return colomboTime;
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
      );

      if (!uri) {
        Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
        return;
      }

      const fmtForFileName = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fileName = `Report_${officerId}_From_${fmtForFileName(startDate!)}_To_${fmtForFileName(endDate!)}.pdf`;

      if (Platform.OS === "android") {
        let directoryUri = await AsyncStorage.getItem("download_directory_uri");
        
        if (!directoryUri) {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
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
            const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              fileName,
              "application/pdf"
            );
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            Alert.alert(
              t("Error.Success") || "Success",
              "Attachment has been saved to your selected folder",
            );
          } catch (e) {
            // Permission might have been revoked, try to request again
            await AsyncStorage.removeItem("download_directory_uri");
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              const newDirectoryUri = permissions.directoryUri;
              await AsyncStorage.setItem("download_directory_uri", newDirectoryUri);

              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                newDirectoryUri,
                fileName,
                "application/pdf"
              );
              await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });

              Alert.alert(
                t("Error.Success") || "Success",
                "Attachment has been saved to your selected folder",
              );
            } else {
              Alert.alert(
                t("Error.Permission Denied") || "Permission Denied",
                "Storage permission is required to save the PDF."
              );
            }
          }
        } else {
          Alert.alert(
            t("Error.Permission Denied") || "Permission Denied",
            "Storage permission is required to save the PDF."
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

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    type: string,
  ) => {
    if (event.type === "set") {
      if (type === "start") {
        setStartDate(selectedDate || startDate);
        setEndDate(undefined);
        setShowStartPicker(false);
      } else {
        setEndDate(selectedDate || endDate);
        setShowEndPicker(false);
      }
    } else {
      if (type === "start") setShowStartPicker(false);
      else setShowEndPicker(false);
    }
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
              onPress={() => setShowStartPicker((prev) => !prev)}
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

          {showStartPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              maximumDate={getTodayInColombo()}
              onChange={(event, date) => handleDateChange(event, date, "start")}
            />
          )}
          {showStartPicker && Platform.OS === "ios" && (
            <>
              <View className=" justify-center items-center z-50 absolute -ml-2 mt-[30%] bg-gray-100  rounded-lg">
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="inline"
                  style={{ width: 320, height: 260 }}
                  maximumDate={getTodayInColombo()}
                  onChange={(event, date) =>
                    handleDateChange(event, date, "start")
                  }
                />
              </View>
            </>
          )}
        </View>

        <View className="mb-6">
          <Text className=" mb-2" style={{ color: "#374151" }}>
            {t("ReportGenerator.End Date")} :
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (startDate) setShowEndPicker((prev) => !prev);
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

          {showEndPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              maximumDate={getTodayInColombo()}
              minimumDate={startDate}
              onChange={(event, date) => handleDateChange(event, date, "end")}
            />
          )}
          {showEndPicker && Platform.OS === "ios" && (
            <>
              <View className=" justify-center items-center z-50 absolute -ml-2 mt-[30%] bg-gray-100  rounded-lg">
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="inline"
                  style={{ width: 320, height: 260 }}
                  maximumDate={getTodayInColombo()}
                  minimumDate={startDate}
                  onChange={(event, date) =>
                    handleDateChange(event, date, "end")
                  }
                />
              </View>
            </>
          )}
        </View>

        <View className="flex-row justify-center gap-2 items-center">
          <TouchableOpacity
            onPress={handleReset}
            className="border border-[#6B6B6B] bg-[white] py-3 rounded-full items-center h-[45px] justify-center"
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
              width: 120,
            }}
          >
            <Text
              className="text-gray-700 text-center text-lg"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t("ReportGenerator.Reset")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!startDate || !endDate}
            className="bg-[#980775] py-3 rounded-full w-40 h-[45px] justify-center items-center"
            style={{
              backgroundColor: startDate && endDate ? "#980775" : "#D3A0C5",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: startDate && endDate ? 0.25 : 0,
              shadowRadius: 10,
              elevation: startDate && endDate ? 6 : 0,
              width: 120,
            }}
          >
            <Text
              className="text-white font-semibold text-center text-lg"
              numberOfLines={1}
              ellipsizeMode="tail"
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

          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleDownload}
              className="bg-[#000000] rounded-lg items-center justify-center ml-4"
              style={{
                width: 100,
                height: 70,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <Ionicons name="download" size={24} color="white" />
              <Text
                className="text-sm text-white mt-1"
                style={[
                  i18n.language === "si"
                    ? { fontSize: 13 }
                    : i18n.language === "ta"
                      ? { fontSize: 12 }
                      : { fontSize: 14 },
                ]}
              >
                {t("ReportGenerator.Download")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="bg-[#000000] rounded-lg items-center justify-center"
              style={{
                width: 100,
                height: 70,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <Ionicons name="share-social" size={24} color="white" />
              <Text
                className="text-sm text-white mt-1"
                style={[
                  i18n.language === "si"
                    ? { fontSize: 13 }
                    : i18n.language === "ta"
                      ? { fontSize: 12 }
                      : { fontSize: 14 },
                ]}
              >
                {t("ReportGenerator.Share")}
              </Text>
            </TouchableOpacity>
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
