import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { RootStackParamList } from "../types/types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useTranslation } from "react-i18next";
import CustomHeader from "../navigations/CustomHeader";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type NewReportNavigationProps = StackNavigationProp<
  RootStackParamList,
  "NewReport"
>;
type ReportPageRouteProp = RouteProp<RootStackParamList, "NewReport">;

interface NewReportProps {
  navigation: NewReportNavigationProps;
}

interface PersonalAndBankDetails {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  NICnumber: string | null;
  CropImage: string | null;
  qrCode: string | null;
  accNumber: string | null;
  accHolderName: string | null;
  bankName: string | null;
  branchName: string | null;
  companyNameEnglish: string | null;
  collectionCenterName: string | null;
}

interface Crop {
  id: number;
  cropName: string;
  cropNameSinhala: string;
  cropNameTamil: string;
  variety: string;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  grade: string;
  unitPrice: string;
  quantity: string;
  subTotal: string;
  invoiceNumber: string;
}

const NewReport: React.FC<NewReportProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<PersonalAndBankDetails | null>(null);

  const route = useRoute<ReportPageRouteProp>();
  const { userId, registeredFarmerId } = route.params || {};
  const [crops, setCrops] = useState<Crop[]>([]);

  const { t } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      if (lang === "en" || lang === "si" || lang === "ta") {
        setSelectedLanguage(lang);
      } else {
        setSelectedLanguage("en");
      }
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useEffect(() => {
    fetchSelectedLanguage();
  }, []);

  const getCropName = (crop: Crop) => {
    if (!crop) return "Loading...";

    switch (selectedLanguage) {
      case "si":
        return `${crop.cropNameSinhala} `;
      case "ta":
        return `${crop.cropNameTamil} `;
      default:
        return `${crop.cropName} `;
    }
  };

  const getVarietyName = (crop: Crop) => {
    if (!crop) return "Loading...";

    switch (selectedLanguage) {
      case "si":
        return `${crop.varietyNameSinhala} `;
      case "ta":
        return `${crop.varietyNameTamil} `;
      default:
        return `${crop.variety} `;
    }
  };

  const totalSum = (crops || []).reduce((sum: number, crop: Crop) => {
    const subTotal =
      typeof crop.subTotal === "string"
        ? parseFloat(crop.subTotal)
        : crop.subTotal || 0;
    return sum + subTotal;
  }, 0);

  const formatNumberWithCommas = (value: number | string): string => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    return numValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (value: number | string): string => {
    if (typeof value === "string") {
      return formatNumberWithCommas(parseFloat(value));
    }
    return formatNumberWithCommas(value);
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const detailsResponse = await api.get(
          `api/farmer/report-user-details/${userId}`,
          {
            headers,
          },
        );

        const data = detailsResponse.data;
        setDetails({
          userId: data.userId ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phoneNumber: data.phoneNumber ?? "",
          NICnumber: data.NICnumber ?? "",
          CropImage: data.CropImage ?? "",
          qrCode: data.qrCode ?? "",
          accNumber: data.accNumber ?? "",
          accHolderName: data.accHolderName ?? "",
          bankName: data.bankName ?? "",
          branchName: data.branchName ?? "",
          companyNameEnglish: data.companyNameEnglish ?? "company name",
          collectionCenterName: data.centerName ?? "Collection Centre",
        });
      } catch (detailsError) {
        console.error("Error fetching user details:", detailsError);
        if (axios.isAxiosError(detailsError)) {
          console.log("Details error response:", detailsError.response?.data);
        } else {
          console.log("Details error:", detailsError);
        }
      }

      try {
        const cropsResponse = await api.get(
          `api/unregisteredfarmercrop/user-crops/today/${userId}/${registeredFarmerId}`,
          {
            headers,
          },
        );

        const cropsData = cropsResponse.data?.data || cropsResponse.data || [];

        setCrops(Array.isArray(cropsData) ? cropsData : []);
      } catch (cropsError) {
        console.error("Error fetching crops:", cropsError);
        if (axios.isAxiosError(cropsError)) {
          console.log("Crops error response:", cropsError.response?.data);
        } else {
          console.log("Crops error response:", cropsError);
        }
        setCrops([]);
      }
    } catch (error) {
      console.error("Error in fetchDetails:", error);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      setCrops([]);
    } finally {
      console.error("Error in fetchDetails");
    }
  };

  const generatePDF = async () => {
    if (!details) {
      Alert.alert(
        t("Error.error"),
        t("Error.Details are missing for generating PDF"),
      );
      return "";
    }

    const totalSum = crops.reduce((sum: number, crop: Crop) => {
      return sum + Number(crop.subTotal);
    }, 0);

    const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 10px;
            background-color: white;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            box-sizing: border-box;
            border-radius: 20px;
            overflow: hidden;
          }
          h1 {
            text-align: center;
            font-size: 22px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .header-line {
            border-top: 1px solid #000;
            margin: 5px 0 15px 0;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .header-item {
            margin-bottom: 5px;
            font-size: 11px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 14px;
          }
          .supplier-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .supplier-section div div:not(.section-title) {
            font-size: 10px;
          }
          .received-by-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .received-by-section div div:not(.section-title) {
            font-size: 10px;
          }
          .table-title {
            font-weight: bold;
            margin: 15px 0 5px 0;
            text-align: center;
            background-color: #D6E6F4;
            padding: 8px;
            border: 1px solid #000;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background-color: white;
          }
          th {
            background-color: rgb(255, 255, 255);
            text-align: center;
            padding: 8px;
            border: 1px solid #000;
            font-weight: bold;
            font-size: 12px;
          }
          td {
            padding: 8px;
            text-align: center;
            border: 1px solid #000;
            background-color: white;
            font-size: 10px;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0;
          }
          .total-box {
            display: flex;
            background-color: white;
            border: 1px solid #000;
          }
          .total-label {
            padding: 8px;
            font-weight: bold;
            border-right: 1px solid #000;
            background-color: #D6E6F4;
            font-size: 13px;
          }
          .total-value {
            padding: 8px;
            min-width: 150px;
            text-align: center;
            font-weight: bold;
            font-size: 13px;
          }
          .note {
            font-size: 11px;
            margin: 15px 0;
            font-style: italic;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <h1>${t("NewReport.Goods Received Note")}</h1>
        <div class="header-line"></div>
        
        <div class="header-row">
          <div class="header-item">
            <strong>${t("NewReport.GRN No")}</strong> ${
              crops.length > 0 ? crops[0].invoiceNumber : "N/A"
            }
          </div>
          <div class="header-item">
            <strong>${t("NewReport.Date")}</strong> ${new Date()
              .toLocaleDateString("en-GB")
              .split("/")
              .reverse()
              .join("/")} ${new Date()
              .toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
              .toUpperCase()}
          </div>
        </div>
        
        <div class="supplier-section">
          <div>
            <div class="section-title">${t("NewReport.Supplier Details")}</div>
            <div>${t("NewReport.Name")} ${details.firstName} ${details.lastName}</div>
          </div>
          <div>
            <div>&nbsp;</div>
            <div>${details.phoneNumber}</div>
          </div>
        </div>
        
        <div class="received-by-section">
          <div>
            <div class="section-title">${t("NewReport.Received By")}</div>
            <div>${t("NewReport.Company Name")} ${details.companyNameEnglish || ""}</div>
          </div>
          <div>
            <div>&nbsp;</div>
            <div>${t("NewReport.Centre")} ${details.collectionCenterName || "Collection Centre"}</div>
          </div>
        </div>
        
        <div class="table-title">${t("NewReport.Received Items")}</div>
        <table>
          <thead>
            <tr>
              <th>${t("NewReport.Crop Name")}</th>
              <th>${t("NewReport.Variety")}</th>
              <th>${t("NewReport.Grade")}</th>
              <th>${t("NewReport.Unit Price(Rs.)")}</th>
              <th>${t("NewReport.Quantity(kg)")}</th>
              <th>${t("NewReport.Sub Total(Rs.)")}</th>
            </tr>
          </thead>
          <tbody>
            ${crops
              .map(
                (crop) => `
              <tr>
                <td>${getCropName(crop)}</td>
                <td>${getVarietyName(crop)}</td>
                <td>${crop.grade || "-"}</td>
                <td>${formatNumberWithCommas(parseFloat(crop.unitPrice))}</td>
                <td>${formatNumberWithCommas(parseFloat(crop.quantity))}</td>
                <td>${formatNumberWithCommas(parseFloat(crop.subTotal))}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="total-row">
          <div class="total-box">
            <div class="total-label">${t("NewReport.Full Total (Rs.)")}</div>
            <div class="total-value">Rs. ${formatNumberWithCommas(totalSum)}</div>
          </div>
        </div>
        
        <div class="note">
          <strong style="font-style: normal;">${t("NewReport.Note")}</strong> ${t("NewReport.GRNnote")}
        </div>
      </body>
    </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });

      return uri;
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert(t("Error.error"), t("NewReport.PDF was not generated."));
      return "";
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const uri = await generatePDF();

      if (!uri) {
        Alert.alert(
          t("Error.error"),
          t("NewReport.Failed to save PDF to Downloads folder."),
        );
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const fileName = `GRN_${
        crops.length > 0 ? crops[0].invoiceNumber : "N/A"
      }_${date}.pdf`;

      let tempFilePath = uri;

      if (Platform.OS === "android") {
        tempFilePath = `${(FileSystem as any).cacheDirectory}${fileName}`;

        await FileSystem.copyAsync({
          from: uri,
          to: tempFilePath,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempFilePath, {
            dialogTitle: t("NewReport.Save GRN Report"),
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert(
            t("Error.error"),
            t("NewReport.Sharing is not available on this device"),
          );
        }
      } else if (Platform.OS === "ios") {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempFilePath, {
            dialogTitle: t("NewReport.Save GRN Report"),
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
          });
          Alert.alert(
            t("NewReport.Info"),
            t("NewReport.Use the 'Save to Files' option to save to Downloads"),
          );
        } else {
          Alert.alert(
            t("Error.error"),
            t("NewReport.Sharing is not available on this device"),
          );
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(
        t("Error.error"),
        t("NewReport.Failed to prepare PDF for download"),
      );
    }
  };

  const handleSharePDF = async () => {
    const uri = await generatePDF();
    if (uri && (await Sharing.isAvailableAsync())) {
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `PurchaseReport_${
        crops.length > 0 ? crops[0].invoiceNumber : "N/A"
      }_${date}.pdf`;

      const newUri = `${(FileSystem as any).cacheDirectory}${fileName}`;

      try {
        await FileSystem.copyAsync({
          from: uri,
          to: newUri,
        });

        await Sharing.shareAsync(newUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Purchase Report",
          UTI: "com.adobe.pdf",
        });
      } catch (error) {
        console.error("Error sharing PDF with custom name:", error);

        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Purchase Report",
          UTI: "com.adobe.pdf",
        });
      }
    } else {
      Alert.alert(t("Error.error"), t("NewReport.Failed to share PDF file"));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        title={t("NewReport.Goods Received Note")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{
          paddingBottom: (insets.bottom || 20) + 40,
        }}
      >
        <View className="p-4">
          {/* GRN Header */}
          <View className="mb-4">
            <Text className="text-sm font-bold">
              {t("NewReport.GRN No")}{" "}
              {crops.length > 0 ? crops[0].invoiceNumber : "N/A"}
            </Text>
            <Text className="text-sm">
              {t("NewReport.Date")}{" "}
              {new Date()
                .toLocaleDateString("en-GB")
                .split("/")
                .reverse()
                .join("/")}{" "}
              {new Date()
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
                .toUpperCase()}
            </Text>
          </View>

          {/* Supplier Details */}
          <View className="mb-4">
            <Text className="font-bold text-sm mb-1">
              {t("NewReport.Supplier Details")}
            </Text>
            <View className="border border-gray-300 rounded-lg p-2">
              <Text>
                <Text className="">{t("NewReport.Name")}</Text>{" "}
                {details?.firstName} {details?.lastName}
              </Text>
              <Text>
                <Text className="">{t("NewReport.Phone")}</Text>{" "}
                {details?.phoneNumber}
              </Text>
            </View>
          </View>

          {/* Received By */}
          <View className="mb-4">
            <Text className="font-bold text-sm mb-1">
              {t("NewReport.Received By")}
            </Text>
            <View className="border border-gray-300 rounded-lg p-2">
              <Text>
                <Text className="">{t("NewReport.Company Name")}</Text>{" "}
                {details?.companyNameEnglish || ""}
              </Text>
              <Text>
                <Text className="">{t("NewReport.Centre")}</Text>{" "}
                {details?.collectionCenterName || "Collection Centre"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="border-t border-gray-400 my-2" />

          {/* Received Items */}
          <View className="mb-4">
            <Text className="font-bold text-sm mb-2">
              {t("NewReport.Received Items")} :
            </Text>
            <ScrollView
              horizontal
              className="border border-gray-300 rounded-lg"
            >
              <View>
                {/* Table Header */}
                <View className="flex-row bg-gray-200">
                  <Text className="w-24 p-2 font-bold border-r border-gray-300">
                    {t("NewReport.Crop Name")}
                  </Text>
                  <Text className="w-24 p-2 font-bold border-r border-gray-300">
                    {t("NewReport.Variety")}
                  </Text>
                  <Text className="w-20 p-2 font-bold border-r border-gray-300">
                    {t("NewReport.Grade")}
                  </Text>
                  <Text className="w-24 p-2 font-bold border-r border-gray-300">
                    {t("NewReport.Unit Price(Rs.)")}
                  </Text>
                  <Text className="w-24 p-2 font-bold border-r border-gray-300">
                    {t("NewReport.Quantity(kg)")}
                  </Text>
                  <Text className="w-24 p-2 font-bold">
                    {t("NewReport.Sub Total(Rs.)")}
                  </Text>
                </View>

                {/* Table Rows */}
                {crops.map((crop, index) => (
                  <View key={`${crop.id}-${index}`} className="flex-row">
                    <Text
                      className="w-24 p-2 border-b border-gray-300 text-left"
                      style={{ flexWrap: "wrap" }}
                    >
                      {getCropName(crop)}
                    </Text>
                    <Text className="w-24 p-2 border-b border-gray-300">
                      {getVarietyName(crop)}
                    </Text>
                    <Text className="w-20 p-2 border-b border-gray-300">
                      {crop.grade || "-"}
                    </Text>
                    <Text className="w-24 p-2 border-b border-gray-300 text-right">
                      {formatNumber(crop.unitPrice)}
                    </Text>
                    <Text className="w-24 p-2 border-b border-gray-300 text-right">
                      {formatNumber(crop.quantity)}
                    </Text>
                    <Text className="w-24 p-2 border-b border-gray-300 text-right">
                      {formatNumber(crop.subTotal)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Divider */}
          <View className="border-t border-gray-400 my-2" />

          {/* Total */}
          <View className="py-2 items-end justify-center">
            <Text className="font-bold">
              {t("NewReport.Full Total (Rs.) Rs.")}
              {totalSum.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          {/* Divider */}
          <View className="border-t border-gray-400 my-2" />

          {/* Note */}
          <View className="mb-4">
            <Text className="text-xs">
              <Text className="font-bold">{t("NewReport.Note")}</Text>
              <Text className="italic"> {t("NewReport.GRNnote")}</Text>
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            className="flex-row justify-around w-full mt-4"
            style={{ paddingBottom: insets.bottom || 20 }}
          >
            <TouchableOpacity
              className="bg-[#000000] p-4 h-[80px] w-[120px] rounded-lg justify-center items-center"
              onPress={handleDownloadPDF}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Image
                source={require("../../assets/images/collection-common/download.webp")}
                style={{ width: 24, height: 24 }}
              />
              <Text className="text-sm text-cyan-50">
                {t("NewReport.Download")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#000000] p-4 h-[80px] w-[120px] rounded-lg justify-center items-center"
              onPress={handleSharePDF}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Image
                source={require("../../assets/images/collection-common/share.webp")}
                style={{ width: 24, height: 24 }}
              />
              <Text className="text-sm text-cyan-50">
                {t("NewReport.Share")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default NewReport;