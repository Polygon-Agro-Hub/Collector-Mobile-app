import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { RootStackParamList } from "../types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type FarmerReportNavigationProps = StackNavigationProp<
  RootStackParamList,
  "FarmerReport"
>;
type FarmerReportRouteProp = RouteProp<RootStackParamList, "FarmerReport">;

interface FarmerReportProps {
  navigation: FarmerReportNavigationProps;
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

const FarmerReport: React.FC<FarmerReportProps> = ({ navigation }) => {
  const [details, setDetails] = useState<PersonalAndBankDetails | null>(null);
  const [officerDetails, setofficerDetails] = useState<officerDetails | null>(
    null
  );
  const route = useRoute<FarmerReportRouteProp>();
  const [qrValue, setQrValue] = useState<string>("");
  const {
    registeredFarmerId,
    userId,
    firstName,
    lastName,
    phoneNumber,
    address,
    NICnumber,
    totalAmount,
    bankAddress,
    accountNumber,
    accountHolderName,
    bankName,
    branchName,
    selectedDate,
  } = route.params;

//  console.log("Farmer Report:", route.params);
  const [crops, setCrops] = useState<Crop[]>([]);
  const totalSum = crops.reduce(
    (sum: number, crop: any) => sum + parseFloat(crop.total || 0),
    0
  );
  const { t } = useTranslation();

  const fetchOfficerDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
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
    //  console.log(data);

      if (response.data.status === "success") {
        const officerDetails = {
          empId: data.empId,
          QRCode: data.QRcode, // Ensure case is correct
        };

       // console.log("Extracted QR Code:", officerDetails.QRCode);

        // Set the officerDetails state
        setofficerDetails(officerDetails);

        // If you need to store QR code or other details in other states
        const qrData = JSON.stringify(officerDetails);
        setQrValue(qrData); // Assuming setQrValue is for QR code
      } else {
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to fetch officer details")
        );
      }
    } catch (error) {
      console.error("Error fetching officer details:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
    }
  };

  useEffect(() => {
    fetchOfficerDetails(); // Fetch details when the component mounts
  }, []);

  const fetchCropDetails = async (
    userId: number,
    createdAt: string,
    farmerId: number
  ) => {
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/transaction-details/${userId}/${selectedDate}/${registeredFarmerId}`
      );

      if (response.status === 200) {
      //  console.log("Crop Details:", response.data);
        return response.data;
      } else {
        console.error("Failed to fetch crop details:", response.statusText);
        return [];
      }
    } catch (error) {
      console.error("Error fetching crop details:", error);
      return [];
    }
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

      const [detailsResponse, cropsResponse] = await Promise.all([
        api.get(`api/farmer/report-user-details/${userId}`),
        api.get(
          `api/unregisteredfarmercrop/user-crops/today/${userId}/${registeredFarmerId}`
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
   //   console.log("crop response for report", cropsResponse.data);
    } catch (error) {
      console.error("Error fetching details:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to load details"));
    }
  };

  useEffect(() => {
    const loadCropDetails = async () => {
      try {
        const data = await fetchCropDetails(
          userId,
          selectedDate,
          registeredFarmerId
        );
        setCrops(data); // Populate the `crops` state with fetched data
      } catch (error) {
        Alert.alert(t("Error.error"), t("Error.Failed to load crop details"));
      }
    };

    loadCropDetails();
  }, [userId, selectedDate, registeredFarmerId]); // Dependencies trigger re-fetch when changed

  const generatePDF = async () => {
    try {
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
          `
        )
        .join("");

      const totalSum = crops.reduce(
        (sum: number, crop: Crop) => sum + Number(crop.total),
        0
      );
      const officerQRCode = officerDetails
        ? officerDetails.QRCode.replace(/^data:image\/png;base64,/, "")
        : ""; // Default to empty string if officerDetails is null
      const farmerQRCode = details?.qrCode
        ? details.qrCode.replace(/^data:image\/png;base64,/, "")
        : ""; // Default to empty string if details is null

      const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Purchase Report</h1>
          <h2>Invoice Number: ${
            crops.length > 0 ? crops[0].invoiceNumber : "N/A"
          }</h2>
          <h2>Date: ${selectedDate}</h2>
          
          <h3>Personal Details</h3>
          <table>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>NIC Number</th>
              <th>Phone Number</th>
              <th>Address</th>
            </tr>
            <tr>
              <td>${firstName}</td>
              <td>${lastName}</td>
              <td>${NICnumber}</td>
              <td>${phoneNumber}</td>
              <td>${address}</td>
            </tr>
          </table>
  
          <h3>Bank Details</h3>
          <table>
            <tr>
              <th>Account Number</th>
              <th>Account Holder's Name</th>
              <th>Bank Name</th>
              <th>Branch Name</th>
            </tr>
            <tr>
              <td>${accountNumber || "N/A"}</td>
              <td>${accountHolderName || "N/A"}</td>
              <td>${bankName || "N/A"}</td>
              <td>${branchName || "N/A"}</td>
            </tr>
          </table>
  
          <h3>Crop Details</h3>
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
  
          <div style="text-align: left; margin-top: 20px;">
            <strong>Full Total: Rs. ${totalSum.toFixed(2)}</strong>
          </div>

         <div class="qr-codes" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
  <div style="text-align: center; margin-right: 20px;">
      <img src="${farmerQRCode}" alt="Farmer's QR Code" style="width: 200px; height: 200px;" />
    <p><strong>Farmer's QR Code</strong></p>
  </div>
  <div style="text-align: center;">
      <img src="${officerQRCode}" alt="Farmer's QR Code" style="width: 200px; height: 200px;" />
    <p><strong>Officer's QR Code</strong></p>
  </div>
  <div></div>
   <div></div>
</div>

        </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to generate PDF"));
      return "";
    }
  };

  const handleDownloadPDF = async () => {
    const uri = await generatePDF(); // Generate the PDF and get its URI

    if (uri) {
      // Get the current date in YYYY-MM-DD format
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `PurchaseReport_${
        crops.length > 0 ? crops[0].invoiceNumber : "N/A"
      }_${date}.pdf`;

      try {
        // Request permission to access media library
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status === "granted") {
          // Define a temporary path in the FileSystem's cache directory with the correct file name
          const tempUri = `${(FileSystem as any).cacheDirectory}${fileName}`;

          // Copy the file to the new temporary path with the desired file name
          await FileSystem.copyAsync({
            from: uri, // Original URI
            to: tempUri, // New URI with the correct name
          });

          // Create an asset with the renamed file
          const asset = await MediaLibrary.createAssetAsync(tempUri);

          // Save to the Downloads album
          const album = await MediaLibrary.getAlbumAsync("Download");
          if (!album) {
            await MediaLibrary.createAlbumAsync("Download", asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }

          Alert.alert(
            t("Error.Success"),
            t('Error.Downloaded PDF"', { fileName })
          );
        } else {
          Alert.alert(
            t("Error.Permission Denied"),
            t("Error.Permission Denied Message")
          );
        }
      } catch (error) {
        console.error("Error saving PDF:", error);
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to save PDF to Downloads folder.")
        );
      }
    } else {
      Alert.alert(t("Error.error"), t("Error.PDF was not generated."));
    }
  };

  const handleSharePDF = async () => {
    const uri = await generatePDF();
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert(
        t("Error.error"),
        t("Error.Sharing is not available on this device")
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../assets/images/back.webp")} // Path to your back icon
            style={{ width: 24, height: 24 }}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-[25%]">
          {t("ReportPage.PurchaseReport")}
        </Text>
      </View>

      {/* Personal Details Section */}

      <View className="mb-4 p-4">
        {/* Selected Date and Invoice Number */}
        <View className="mb-2">
          <Text className="text-sm font-bold">
            {t("ReportPage.INV")}
            {crops.length > 0 ? crops[0].invoiceNumber : "N/A"}
          </Text>
          <Text className="text-sm font-bold">
            {t("ReportPage.Date")}: {selectedDate}
          </Text>
        </View>

        <Text className="font-bold text-sm mb-2">
          {t("ReportPage.PersonalDetails")}
        </Text>
        <ScrollView horizontal className="border border-gray-300 rounded-lg">
          <View>
            {/* Table Header */}
            <View className="flex-row bg-gray-200">
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.FirstName")}
              </Text>
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.LastName")}
              </Text>
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.NIC")}
              </Text>
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.Phone")}
              </Text>
              <Text className="w-32 p-2 font-bold">
                {t("ReportPage.Address")}
              </Text>
            </View>
            {/* Table Rows */}
            <View className="flex-row">
              <Text className="w-32 p-2 border-r border-gray-300">
                {firstName}
              </Text>
              <Text className="w-32 p-2 border-r border-gray-300">
                {lastName}
              </Text>
              <Text className="w-32 p-2 border-r border-gray-300">
                {NICnumber}
              </Text>
              <Text className="w-32 p-2 border-r border-gray-300">
                {phoneNumber}
              </Text>
              <Text className="w-32 p-2">{address}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Bank Details Section */}

      <View className="mb-4 p-4">
        <Text className="font-bold text-sm mb-2">{t("ReportPage.Bank")}</Text>
        <ScrollView horizontal className="border border-gray-300 rounded-lg">
          <View>
            {/* Table Header */}
            <View className="flex-row bg-gray-200">
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.AccountNum")}
              </Text>
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.AccountName")}
              </Text>
              <Text className="w-32 p-2 font-bold border-r border-gray-300">
                {t("ReportPage.BankName")}
              </Text>
              <Text className="w-32 p-2">{t("ReportPage.BranchName")}</Text>
            </View>
            {/* Table Rows */}
            <View className="flex-row">
              <Text className="w-32 p-2 border-r border-gray-300">
                {accountNumber || "N/A"}
              </Text>
              <Text className="w-32 p-2 border-r border-gray-300">
                {accountHolderName || "N/A"}
              </Text>
              <Text className="w-32 p-2 border-r border-gray-300">
                {bankName || "N/A"}
              </Text>
              <Text className="w-32 p-2">{branchName || "N/A"}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Crop Details Section */}
      {crops.length > 0 && (
        <View className="mb-4 p-4">
          <Text className="font-bold text-sm mb-2">
            {t("ReportPage.CropDetails")}
          </Text>
          <ScrollView horizontal className="border border-gray-300 rounded-lg">
            <View>
              {/* Table Header */}
              <View className="flex-row bg-gray-200">
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.CropName")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Variety")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Unit Price A")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Weight A")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Unit Price B")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Weight B")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Unit Price C")}
                </Text>
                <Text className="w-32 p-2 font-bold border-r border-gray-300">
                  {t("ReportPage.Weight C")}
                </Text>
                <Text className="w-32 p-2">{t("ReportPage.Total")}</Text>
              </View>
              {/* Table Rows */}
              {crops.map((crop) => (
                <View key={crop.id} className="flex-row">
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.cropName}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.variety}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.unitPriceA}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.weightA}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.unitPriceB}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.weightB}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.unitPriceC}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
                    {crop.weightC}
                  </Text>
                  <Text className="w-32 p-2 border-b border-gray-300">
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

      {details && details.qrCode && officerDetails && officerDetails.QRCode && (
        <View className="mb-4 flex-row items-center justify-start">
          <View className="mr-4">
            <View>
              <Image
                source={{
                  uri: details.qrCode.replace(/^data:image\/png;base64,/, ""),
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
                  ""
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

      <View className="flex-row justify-around w-full mb-7">
        <TouchableOpacity
          className="bg-[#2AAD7A] p-4 h-[80px] w-[120px] rounded-lg items-center"
          onPress={handleDownloadPDF}
        >
          <Image
            source={require("../../assets/images/download.webp")} // Path to download icon
            style={{ width: 24, height: 24 }}
          />
          <Text className="text-sm text-cyan-50">
            {t("ReportPage.Download")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#2AAD7A] p-4 h-[80px] w-[120px] rounded-lg items-center"
          onPress={handleSharePDF}
        >
          <Image
            source={require("../../assets/images/Share.webp")} // Path to share icon
            style={{ width: 24, height: 24 }}
          />
          <Text className="text-sm text-cyan-50">{t("ReportPage.Share")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default FarmerReport;
