import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { RootStackParamList } from "../types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
//import * as FileSystem from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "react-i18next";
import { AntDesign } from "@expo/vector-icons";

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
  const [details, setDetails] = useState<PersonalAndBankDetails | null>(null);
  const [officerDetails, setofficerDetails] = useState<officerDetails | null>(
    null
  );
  const route = useRoute<ReportPageRouteProp>();
  const { userId, registeredFarmerId } = route.params || {};
  const [crops, setCrops] = useState<Crop[]>([]);
  // const qrCodeRef = useRef<any>(null);
  const [qrValue, setQrValue] = useState<string>("");
  const { t } = useTranslation();

  const totalSum = crops.reduce(
    (sum: number, crop: any) => sum + parseFloat(crop.total || 0),
    0
  );

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

        console.log("Extracted QR Code:", officerDetails.QRCode);

        // Set the officerDetails state
        setofficerDetails(officerDetails);

        // If you need to store QR code or other details in other states
        const qrData = JSON.stringify(officerDetails);
        setQrValue(qrData); // Assuming setQrValue is for QR code
      } else {
        Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
      }
    } catch (error) {
      console.error("Error fetching officer details:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch details"));
    }
  };

  useEffect(() => {
    fetchOfficerDetails(); // Fetch details when the component mounts
  }, []);

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
        // Commented out officer QR code fetching
        // api.get(`api/collection-officer/get-officer-Qr`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // }),
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
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    }
  };

  const generatePDF = async () => {
    if (!details) {
      Alert.alert(
        t("Error.error"),
        t("Error.Details are missing for generating PDF")
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
        `
      )
      .join("");

    // Calculate total price from the crops array, ensuring total is treated as a number
    const totalSum = crops.reduce((sum: number, crop: Crop) => {
      return sum + Number(crop.total); // Ensure total is a number
    }, 0);

    // Check if officerDetails exists before accessing QR code
    const officerQRCode = officerDetails?.QRCode || ""; // Default to empty string if officerDetails is null
    const farmerQRCode = details?.qrCode
      ? details.qrCode.replace(/^data:image\/png;base64,/, "")
      : ""; // Default to empty string if details is null

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

  console.log("QR Code URL:", details?.qrCode);

  const handleSharePDF = async () => {
    const uri = await generatePDF();
    if (uri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert("Error.error", t("Error.somethingWentWrong"));
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => navigation.navigate("Main" as any)}>
          <AntDesign name="left" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-[25%]">
          {t("ReportPage.PurchaseReport")}
        </Text>
      </View>

      {/* Personal Details Section */}
      {details && (
        <View className="mb-4">
          {/* Selected Date and Invoice Number */}
          <View className="mb-2">
            <Text className="text-sm font-bold">
              {t("ReportPage.INV")}
              {crops.length > 0 ? crops[0].invoiceNumber : "N/A"}
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
                  {details.firstName}
                </Text>
                <Text className="w-32 p-2 border-r border-gray-300">
                  {details.lastName}
                </Text>
                <Text className="w-32 p-2 border-r border-gray-300">
                  {details.NICnumber}
                </Text>
                <Text className="w-32 p-2 border-r border-gray-300">
                  {details.phoneNumber}
                </Text>
                <Text className="w-32 p-2">{details.address}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Bank Details Section */}
      {details && (
        <View className="mb-4">
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
                  {details.accNumber}
                </Text>
                <Text className="w-32 p-2 border-r border-gray-300">
                  {details.accHolderName}
                </Text>
                <Text className="w-32 p-2 border-r border-gray-300">
                  {details.bankName}
                </Text>
                <Text className="w-32 p-2">{details.branchName}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Crop Details Section */}
      {crops.length > 0 && (
        <View className="mb-4">
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

export default ReportPage;
