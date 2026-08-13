import store from "@/services/reducxStore";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { RootStackParamList } from "@/types/types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "react-i18next";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import DownloadShareButtons from "@/component/components/buttons/DownloadShareButtons";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type ReportPageNavigationProps = StackNavigationProp<
  RootStackParamList,
  "ReportPage"
>;
type ReportPageRouteProp = RouteProp<RootStackParamList, "ReportPage">;

interface ReportPageProps {
  navigation: ReportPageNavigationProps;
}

interface PersonalAndBankDetails {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  NICnumber: string | null;
  profileImage: string | null;
  qrCode: string | null;
  address: string | null;
  accNumber: string | null;
  accHolderName: string | null;
  bankName: string | null;
  branchName: string | null;
}

interface Crop {
  id: number;
  cropName: string;
  variety: string;
  unitPriceA: string;
  weightA: string;
  unitPriceB: string;
  weightB: string;
  unitPriceC: string;
  weightC: string;
  total: number;
  invoiceNumber: string;
}

interface officerDetails {
  QRCode: string;
}

const ReportPage: React.FC<ReportPageProps> = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 600;
  const [details, setDetails] = useState<PersonalAndBankDetails | null>(null);
  const [officerDetails, setofficerDetails] = useState<officerDetails | null>(
    null,
  );
  const route = useRoute<ReportPageRouteProp>();
  const { userId, registeredFarmerId } = route.params || {};
  const [crops, setCrops] = useState<Crop[]>([]);

  const { t } = useTranslation();

  const totalSum = crops.reduce(
    (sum: number, crop: any) => sum + parseFloat(crop.total || 0),
    0,
  );

  const fetchOfficerDetails = async () => {
    try {
      const token = store.getState().auth.token;
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      const response = await api.get("api/collection-officer/user-profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data.data;

      if (response.data.status === "success") {
        const officerDetails = {
          empId: data.empId,
          QRCode: data.QRcode,
        };

        setofficerDetails(officerDetails);
      } else {
        Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
      }
    } catch (error) {
      console.error("Error fetching officer details:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
    }
  };

  useEffect(() => {
    fetchOfficerDetails();
  }, []);

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      const token = store.getState().auth.token;
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      const [detailsResponse, cropsResponse] = await Promise.all([
        api.get(`api/farmer/report-user-details/${userId}`),
        api.get(
          `api/unregisteredfarmercrop/user-crops/today/${userId}/${registeredFarmerId}`,
        ),
      ]);

      const data = detailsResponse.data;
      setDetails({
        userId: data.userId ?? "",
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phoneNumber: data.phoneNumber ?? "",
        NICnumber: data.NICnumber ?? "",
        profileImage: data.profileImage ?? "",
        qrCode: data.qrCode ?? "",
        address: data.address ?? "",
        accNumber: data.accNumber ?? "",
        accHolderName: data.accHolderName ?? "",
        bankName: data.bankName ?? "",
        branchName: data.branchName ?? "",
      });

      setCrops(cropsResponse.data);
    } catch (error) {
      console.error("Error fetching details:", error);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
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

    const cropsTableRows = crops
      .map(
        (crop) => `
          <tr>
            <td>${crop.cropName}</td>
            <td>${crop.variety}</td>
            <td>${crop.unitPriceA}</td>
            <td>${crop.weightA}</td>
            <td>${crop.unitPriceB}</td>
            <td>${crop.weightB}</td>
            <td>${crop.unitPriceC}</td>
            <td>${crop.weightC}</td>
            <td>${crop.total}</td>
          </tr>
        `,
      )
      .join("");

    const totalSum = crops.reduce((sum: number, crop: Crop) => {
      return sum + Number(crop.total);
    }, 0);

    const officerQRCode = officerDetails?.QRCode || "";
    const farmerQRCode = details?.qrCode
      ? details.qrCode.replace(/^data:image\/png;base64,/, "")
      : "";

    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial; margin: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .qr-codes { display: flex; justify-content: space-between; margin-top: 20px; }
          .qr-codes div { text-align: center; }
          .qr-codes img { width: 150px; height: 150px; }
        </style>
      </head>
      <body>
        <h1>Purchase Report</h1>
          <h2>Invoice Number: ${
            crops.length > 0 ? crops[0].invoiceNumber : "N/A"
          }</h2>
          <h2><strong> Date:</strong> ${new Date().toLocaleDateString()}</h2>
          
  
        <h2>Personal Details</h2>
        <table>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>NIC Number</th>
            <th>Phone Number</th>
            <th>Address</th>
          </tr>
          <tr>
            <td>${details.firstName}</td>
            <td>${details.lastName}</td>
            <td>${details.NICnumber}</td>
            <td>${details.phoneNumber}</td>
            <td>${details.address}</td>
          </tr>
        </table>
  
        <h2>Bank Details</h2>
        <table>
          <tr>
            <th>Account Number</th>
            <th>Account Holder's Name</th>
            <th>Bank Name</th>
            <th>Branch Name</th>
          </tr>
          <tr>
            <td>${details.accNumber}</td>
            <td>${details.accHolderName}</td>
            <td>${details.bankName}</td>
            <td>${details.branchName}</td>
          </tr>
        </table>
  
        <h2>Crop Details</h2>
        <table>
          <tr>
            <th>Crop Name</th>
            <th>Variety</th>
            <th>Unit Price A</th>
            <th>Weight A</th>
            <th>Unit Price B</th>
            <th>Weight B</th>
            <th>Unit Price C</th>
            <th>Weight C</th>
            <th>Total</th>
          </tr>
          ${cropsTableRows}
        </table>
  
        <div>
          <strong>Total Price:</strong> ${totalSum.toFixed(2)}
        </div>
  
      <div class="qr-codes">
  <div>
    <img src="${farmerQRCode}" alt="Farmer's QR Code" style="width: 200px; height: 200px;" />
    <p><strong>Farmer's QR Code</strong></p>
  </div>
  <div>
    <img src="${officerQRCode}" alt="Officer's QR Code" style="width: 200px; height: 200px;" />
    <p><strong>Officer's QR Code</strong></p>
  </div>
  <div></div>
  <div></div>
   <div></div>
</div>

  
      </body>
    </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert(t("Error.error"), t("Error.PDF was not generated."));
      return "";
    }
  };

  const handleDownloadPDF = async () => {
    const uri = await generatePDF();

    if (uri) {
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `PurchaseReport_${
        crops.length > 0 ? crops[0].invoiceNumber : "N/A"
      }_${date}.pdf`;

      try {
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
        } else {
          // iOS: Use Sharing
          if (await Sharing.isAvailableAsync()) {
            const newUri = `${(FileSystem as any).cacheDirectory}${fileName}`;
            try {
              await FileSystem.copyAsync({ from: uri, to: newUri });
              await Sharing.shareAsync(newUri, {
                dialogTitle: t("Save PDF"),
                mimeType: "application/pdf",
                UTI: "com.adobe.pdf",
              });
            } catch (error) {
              console.error("Error renaming PDF before share:", error);
              await Sharing.shareAsync(uri, {
                dialogTitle: t("Save PDF"),
                mimeType: "application/pdf",
                UTI: "com.adobe.pdf",
              });
            }
          } else {
            Alert.alert(
              t("Error.error"),
              t("Error.Failed to save PDF to Downloads folder."),
            );
          }
        }
      } catch (error) {
        console.error("Error saving PDF:", error);
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to save PDF to Downloads folder."),
        );
      }
    } else {
      Alert.alert(t("Error.error"), t("Error.PDF was not generated."));
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
        await FileSystem.copyAsync({ from: uri, to: newUri });
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
      Alert.alert("Error.error", t("Error.somethingWentWrong"));
    }
  };
  
  return (
    <ScrollView className="flex-1 bg-white ">
      <CustomHeader
        title={t("ReportPage.PurchaseReport")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main" as any)}
      />
      <View className="p-4 w-full">
        {/* Personal Details Section */}
        {details && (
          <View className="mb-4 max-w-[750px] w-full mx-auto">
            <View className="mb-2">
              <Text className="text-sm font-bold">
                {t("ReportPage.INV")}
                {crops.length > 0 ? crops[0].invoiceNumber : "N/A"}
              </Text>
            </View>
            <Text className="font-bold text-sm mb-2">
              {t("ReportPage.PersonalDetails")}
            </Text>
            {(() => {
              const tableContent = (
                <View style={isTablet ? undefined : { width: 590 }}>
                  {/* Table Header */}
                  <View className="flex-row bg-gray-200">
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.FirstName")}
                    </Text>
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.LastName")}
                    </Text>
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.NIC")}
                    </Text>
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.Phone")}
                    </Text>
                    <Text className="p-2 font-bold" style={{ flex: 1.2 }}>
                      {t("ReportPage.Address")}
                    </Text>
                  </View>
                  {/* Table Rows */}
                  <View className="flex-row">
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.firstName}
                    </Text>
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.lastName}
                    </Text>
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.NICnumber}
                    </Text>
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.phoneNumber}
                    </Text>
                    <Text className="p-2" style={{ flex: 1.2, flexWrap: "wrap" }}>{details.address}</Text>
                  </View>
                </View>
              );

              return isTablet ? (
                <View className="w-full border border-gray-300 rounded-lg">
                  {tableContent}
                </View>
              ) : (
                <ScrollView horizontal className="border border-gray-300 rounded-lg">
                  {tableContent}
                </ScrollView>
              );
            })()}
          </View>
        )}

        {/* Bank Details Section */}
        {details && (
          <View className="mb-4 max-w-[750px] w-full mx-auto">
            <Text className="font-bold text-sm mb-2">
              {t("ReportPage.Bank")}
            </Text>
            {(() => {
              const bankTableContent = (
                <View style={isTablet ? undefined : { width: 480 }}>
                  {/* Table Header */}
                  <View className="flex-row bg-gray-200">
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.AccountNum")}
                    </Text>
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.AccountName")}
                    </Text>
                    <Text className="p-2 font-bold border-r border-gray-300" style={{ flex: 1 }}>
                      {t("ReportPage.BankName")}
                    </Text>
                    <Text className="p-2" style={{ flex: 1 }}>{t("ReportPage.BranchName")}</Text>
                  </View>
                  {/* Table Rows */}
                  <View className="flex-row">
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.accNumber}
                    </Text>
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.accHolderName}
                    </Text>
                    <Text className="p-2 border-r border-gray-300" style={{ flex: 1, flexWrap: "wrap" }}>
                      {details.bankName}
                    </Text>
                    <Text className="p-2" style={{ flex: 1, flexWrap: "wrap" }}>{details.branchName}</Text>
                  </View>
                </View>
              );

              return isTablet ? (
                <View className="w-full border border-gray-300 rounded-lg">
                  {bankTableContent}
                </View>
              ) : (
                <ScrollView horizontal className="border border-gray-300 rounded-lg">
                  {bankTableContent}
                </ScrollView>
              );
            })()}
          </View>
        )}

        {/* Crop Details Section */}
        {crops.length > 0 && (
          <View className="mb-4 max-w-[750px] w-full mx-auto">
            <Text className="font-bold text-sm mb-2">
              {t("ReportPage.CropDetails")}
            </Text>
            <ScrollView
              horizontal
              className="w-full border border-gray-300 rounded-lg"
            >
              <View>
                {/* Table Header */}
                <View className="flex-row bg-gray-200">
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 110 }}>
                    {t("ReportPage.CropName")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 110 }}>
                    {t("ReportPage.Variety")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 100 }}>
                    {t("ReportPage.Unit Price A")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 90 }}>
                    {t("ReportPage.Weight A")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 100 }}>
                    {t("ReportPage.Unit Price B")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 90 }}>
                    {t("ReportPage.Weight B")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 100 }}>
                    {t("ReportPage.Unit Price C")}
                  </Text>
                  <Text className="p-2 font-bold border-r border-gray-300" style={{ width: 90 }}>
                    {t("ReportPage.Weight C")}
                  </Text>
                  <Text className="p-2" style={{ width: 110 }}>{t("ReportPage.Total")}</Text>
                </View>
                {/* Table Rows */}
                {crops.map((crop) => (
                  <View key={crop.id} className="flex-row">
                    <Text className="p-2 border-b border-gray-300" style={{ width: 110, flexWrap: "wrap" }}>
                      {crop.cropName}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 110, flexWrap: "wrap" }}>
                      {crop.variety}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 100, flexWrap: "wrap" }}>
                      {crop.unitPriceA}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 90, flexWrap: "wrap" }}>
                      {crop.weightA}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 100, flexWrap: "wrap" }}>
                      {crop.unitPriceB}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 90, flexWrap: "wrap" }}>
                      {crop.weightB}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 100, flexWrap: "wrap" }}>
                      {crop.unitPriceC}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 90, flexWrap: "wrap" }}>
                      {crop.weightC}
                    </Text>
                    <Text className="p-2 border-b border-gray-300" style={{ width: 110, flexWrap: "wrap" }}>
                      {crop.total}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View className="p-2 border-t border-gray-300">
          <Text className="font-bold">
            {t("ReportPage.TotalSum")} {totalSum.toFixed(2)}
          </Text>
        </View>

        {details &&
          details.qrCode &&
          officerDetails &&
          officerDetails.QRCode && (
            <View className="mb-4 flex-row items-center justify-start">
              <View className="mr-4">
                <View>
                  <Image
                    source={{
                      uri: details.qrCode.replace(
                        /^data:image\/png;base64,/,
                        "",
                      ),
                    }}
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="font-bold ml-5 text-sm mb-2">
                    {t("ReportPage.FarmerQR")}
                  </Text>
                </View>
              </View>
              <View>
                <Image
                  source={{
                    uri: officerDetails.QRCode.replace(
                      /^data:image\/png;base64,/,
                      "",
                    ),
                  }}
                  style={{ width: 150, height: 150 }}
                />

                <Text className="font-bold ml-5 text-sm mb-2">
                  {t("ReportPage.OfficerQR")}
                </Text>
              </View>
            </View>
          )}

        <View className="w-full mb-7">
          <DownloadShareButtons
            onDownload={handleDownloadPDF}
            onShare={handleSharePDF}
            downloadLabel={t("ReportPage.Download")}
            shareLabel={t("ReportPage.Share")}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default ReportPage;
