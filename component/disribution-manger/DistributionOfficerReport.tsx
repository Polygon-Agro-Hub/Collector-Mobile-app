import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { handleGeneratePDF } from "./ReportPDF";
import * as Sharing from "expo-sharing";
import { RouteProp } from "@react-navigation/native";
import { Platform } from "react-native";
//import * as FileSystem from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import NetInfo from "@react-native-community/netinfo";

type DistributionOfficerReportNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DistributionOfficerReport"
>;

type DistributionOfficerReportRouteProp = RouteProp<
  RootStackParamList,
  "DistributionOfficerReport"
>;

interface DistributionOfficerReportProps {
  navigation: DistributionOfficerReportNavigationProp;
  route: DistributionOfficerReportRouteProp;
}

const DistributionOfficerReport: React.FC<DistributionOfficerReportProps> = ({
  navigation,
  route,
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(
    null
  );
  const [generateAgain, setGenerateAgain] = useState(false);
  const { t } = useTranslation();

  const { officerId, collectionOfficerId } = route.params;
  console.log(officerId);

  const getTodayInColombo = () => {
    const now = new Date();
    const colomboOffset = 330; 
    const utcOffset = now.getTimezoneOffset();
    const colomboTime = new Date(
      now.getTime() + (colomboOffset - utcOffset) * 60 * 1000
    );
    colomboTime.setHours(0, 0, 0, 0); 
    return colomboTime;
  };

  const reportCounters: { [key: string]: number } = {};

//  console.log("...........................................................")

  const handleGenerate = async () => {
    setReportGenerated(false);
    setGenerateAgain(true);
    if (!startDate || !endDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please select both start and end dates.")
      );
      return;
    }

    if (endDate < startDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.End date cannot be earlier than the start date.")
      );
      return;
    }

  
    const fileUri = await handleGeneratePDF(
      formatDate(startDate),
      formatDate(endDate),
      officerId,
      collectionOfficerId
    );
    if (fileUri) {
      const reportIdMatch = fileUri.match(/report_(.+)\.pdf/);
      const reportId = reportIdMatch ? reportIdMatch[1] : null;

      const generateReportId = (officerId: string): string => {
    
        if (!reportCounters[officerId]) {
          reportCounters[officerId] = 1;
        } else {
          reportCounters[officerId] += 1; 
        }

   
        const paddedCount = reportCounters[officerId]
          .toString()
          .padStart(3, "0");
        return `${officerId}M${paddedCount}`;
      };

      const reportIdno = generateReportId(officerId);
      setGeneratedReportId(reportIdno); 
      setReportGenerated(true);
      setGenerateAgain(false);
     
    } else {
      Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
      setGenerateAgain(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!startDate || !endDate) {
        Alert.alert(
          t("Error.error"),
          t("Error.Please select both start and end dates.")
        );
        return;
      }

      const uri = await handleGeneratePDF(
        formatDate(startDate),
        formatDate(endDate),
        officerId,
        collectionOfficerId
      );

      if (!uri) {
        Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
        return;
      }

      
      const date = new Date().toISOString().slice(0, 10); 
      const fileName = `Report_${officerId}_${date}.pdf`; 

    
      let tempFilePath = uri; 

      if (Platform.OS === "android") {
     
        tempFilePath = `${(FileSystem as any).cacheDirectory}${fileName}`;

       
        await FileSystem.copyAsync({
          from: uri,
          to: tempFilePath,
        });

      
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempFilePath, {
            dialogTitle: t("Save PDF"),
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
         
        } else {
          Alert.alert(
            t("Error.error"),
            t("Error.Failed to save PDF to Downloads folder.")
          );
        }
      } else if (Platform.OS === "ios") {
       
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempFilePath, {
           
            dialogTitle: t("Save PDF"),
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
         
        } else {
          Alert.alert(
            t("Error.error"),
            t("Error.Failed to save PDF to Downloads folder.")
          );
        }
      }

 
      console.log(`PDF prepared for sharing: ${tempFilePath}`);
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(
        t("Error.error"),
        t("Error.Failed to prepare PDF for download.")
      );
    }
  };

  const handleShare = async () => {
    if (!startDate || !endDate) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please select both start and end dates.")
      );
      return;
    }

    const fileUri = await handleGeneratePDF(
      formatDate(startDate),
      formatDate(endDate),
      officerId,
      collectionOfficerId
    );
    if (fileUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(fileUri, { mimeType: "application/pdf" });
    } else {
      Alert.alert(
        t("Error.error"),
        t("Error.Sharing is not available on this device.")
      );
    }
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setReportGenerated(false);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Select Date";
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    type: string
  ) => {
    if (event.type === "set") {
      // User confirmed
      if (type === "start") {
        setStartDate(selectedDate || startDate);
        setShowStartPicker(false);
      } else {
        setEndDate(selectedDate || endDate);
        setShowEndPicker(false);
      }
    } else {
      // User cancelled
      if (type === "start") setShowStartPicker(false);
      else setShowEndPicker(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-row items-center  p-6 rounded-b-lg">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-4 left-4 bg-[#F6F6F680] rounded-full p-2 z-50"
        >
          <AntDesign name="left" size={24} color="#000" />
        </TouchableOpacity>

        <Text className="text-black text-lg font-semibold text-center w-full">
          {officerId}
        </Text>
      </View>

      {/* Form Section */}
      <View className="px-8 mt-8">
        <View className="mb-6">
          <Text className="text-sm text-gray-700 mb-2">
            {t("ReportGenerator.Start Date")}
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setShowStartPicker((prev) => !prev)}
              className="bg-[#F4F4F4] rounded-full px-4 py-3 flex-1 flex-row justify-between items-center"
            >
              <Text className="text-gray-500">{formatDate(startDate)}</Text>
              <Image
                source={require("../../assets/images/Rescheduling.webp")}
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
              maximumDate={getTodayInColombo()} // Disallow future dates
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
                  maximumDate={getTodayInColombo()} // Disallow future dates
                  onChange={(event, date) =>
                    handleDateChange(event, date, "start")
                  }
                />
              </View>
            </>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-700 mb-2">
            {t("ReportGenerator.End Date")}
          </Text>
          <TouchableOpacity
            onPress={() => setShowEndPicker((prev) => !prev)}
            className="bg-[#F4F4F4] rounded-full px-4 py-3 flex-row justify-between items-center"
          >
            <Text className="text-gray-500">{formatDate(endDate)}</Text>
            <Image
              source={require("../../assets/images/Rescheduling.webp")}
              className="w-6 h-6"
              resizeMode="contain"
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

        <View className="flex-row justify-center gap-2 items-center mt-2">
          <TouchableOpacity
            onPress={handleReset}
            className="border border-[#6B6B6B] py-2 rounded-full w-40 items-center"
          >
            <Text
              className="text-[#858585] text-center text-base"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t("ReportGenerator.Reset")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGenerate}
            className="bg-[#980775] py-2 rounded-full w-40 items-center"
          >
            <Text
              className="text-white font-semibold text-center text-base"
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

      {/* Conditional UI Section */}
      {reportGenerated ? (
        <View className="items-center justify-center flex-1">
          <View className="w-24 h-24 bg-[#FFE6CB66] rounded-full items-center justify-center mb-4">
            <Image
              source={require("../../assets/images/document.webp")}
              className="w-14 h-14"
            />
          </View>

       
          <Text className="text-sm text-gray-500 italic mb-6">
            {t("ReportGenerator.Report has been generated")}
          </Text>


          <View className="flex-row space-x-8">
            <TouchableOpacity
              onPress={handleDownload}
              className="bg-[#000000] rounded-lg items-center justify-center"
              style={{ width: 100, height: 70 }} 
            >
              <Ionicons name="download" size={24} color="white" />
              <Text className="text-sm text-white mt-1">
                {t("ReportGenerator.Download")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="bg-[#000000] rounded-lg items-center justify-center"
              style={{ width: 100, height: 70 }}
            >
              <Ionicons name="share-social" size={24} color="white" />
              <Text className="text-sm text-white mt-1">
                {t("ReportGenerator.Share")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : generateAgain ? (
        <View className="items-center justify-center flex-1">
          <LottieView
            source={require("../../assets/lottie/newLottie.json")}
            autoPlay
            loop
            style={{ width: 250, height: 250 }}
          />
        </View>
      ) : (
        <View className="items-center justify-center flex-1">
          <Image
            source={require("../../assets/images/empty.webp")}
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

export default DistributionOfficerReport;
