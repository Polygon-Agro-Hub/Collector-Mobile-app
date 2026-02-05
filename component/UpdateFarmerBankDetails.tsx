import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  StyleSheet,
  Animated,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "./types";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import bankNames from "../assets/jsons/banks.json";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { SelectList } from "react-native-dropdown-select-list";
import { navigate } from "expo-router/build/global-state/routing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";


const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type UnregisteredFarmerDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UpdateFarmerBankDetails"
>;

interface UnregisteredFarmerDetailsProps {
  navigation: UnregisteredFarmerDetailsNavigationProp;
  route: any; // Add route to the props interface
}

interface allBranches {
  bankID: number;
  ID: number;
  name: string;
}

const UnregisteredFarmerDetails: React.FC<UnregisteredFarmerDetailsProps> = ({
  navigation,
  route,
}) => {
  const { id, NICnumber, phoneNumber, PreferdLanguage, officerRole } =
    route.params;
  console.log(id);
  console.log(NICnumber);
  const [accNumber, setAccNumber] = useState("");
  console.log(accNumber);
  const [accHolderName, setAccHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  console.log(bankName);
  const [branchName, setBranchName] = useState("");
  console.log(branchName);
  const [isModalVisible, setIsModalVisible] = useState(false); // Success modal visibility state
  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState(false); // Unsuccessful modal visibility state
  const [loading, setLoading] = useState(false); // Loading state for the progress bar
  const [progress] = useState(new Animated.Value(0)); // Animated value for progress
  const [unsuccessfulProgress] = useState(new Animated.Value(0)); // Animated value for unsuccessful loading bar
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error messages
  const { t } = useTranslation();
  const [filteredBranches, setFilteredBranches] = useState<allBranches[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const [accNumberError, setAccNumberError] = useState("");

  const validateAccountNumber = (value: any) => {
    // Check if the value contains only numbers
    const numericRegex = /^[0-9]*$/;
    if (!numericRegex.test(value)) {
      setAccNumberError(t("UnregisteredFarmerDetails.AccountNumberError"));
      return false;
    }
    setAccNumberError("");
    return true;
  };

  const handleAccountNumberChange = (value: any) => {
    if (validateAccountNumber(value)) {
      setAccNumber(value);
    }
  };

  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../assets/jsons/branches.json");
          const filteredBranches = data[selectedBank.ID] || [];

          const sortedBranches = filteredBranches.sort(
            (a: { name: string }, b: { name: any }) =>
              a.name.localeCompare(b.name)
          );

          setFilteredBranches(sortedBranches);
        } catch (error) {
          console.error("Error loading branches", error);
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        } finally {
          setLoading(false);
        }
      } else {
        setFilteredBranches([]);
      }
    } else {
      setFilteredBranches([]);
    }
  }, [bankName]);

  const handleNext = async () => {
    if (
      !accNumber ||
      !accHolderName ||
      !bankName ||
      !branchName // Removed trailing comma
    ) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please fill in all required fields.")
      );
      setLoading(false);
      return;
    }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
    return; 
  }

    try {
      const apiUrl = "https://api.getshoutout.com/otpservice/send";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      console.log(phoneNumber);

      let otpMessage = "";
      let companyName = "";

      if (PreferdLanguage === "Sinhala") {
        companyName =
          (await AsyncStorage.getItem("companyNameSinhala")) || "PolygonAgro";
        otpMessage = `${companyName} සමඟ බැංකු විස්තර සත්‍යාපනය සඳහා ඔබගේ OTP: {{code}}
      
${accHolderName}
${accNumber}
${bankName}
${branchName}
      
නිවැරදි නම්, ඔබව සම්බන්ධ කර ගන්නා ${companyName} නියෝජිතයා සමඟ පමණක් OTP අංකය බෙදා ගන්න.`;
      } else if (PreferdLanguage === "Tamil") {
        companyName =
          (await AsyncStorage.getItem("companyNameTamil")) || "PolygonAgro";
        otpMessage = `${companyName} உடன் வங்கி விவர சரிபார்ப்புக்கான உங்கள் OTP: {{code}}
      
${accHolderName}
${accNumber}
${bankName}
${branchName}
      
சரியாக இருந்தால், உங்களைத் தொடர்பு கொள்ளும் ${companyName} பிரதிநிதியுடன் மட்டும் OTP ஐப் பகிரவும்.`;
      } else {
        companyName =
          (await AsyncStorage.getItem("companyNameEnglish")) || "PolygonAgro";
        otpMessage = `Your OTP for bank detail verification with ${companyName} is: {{code}}
      
${accHolderName}
${accNumber}
${bankName}
${branchName}
      
If correct, share OTP only with the ${companyName} representative who contacts you.`;
      }

      const body = {
        source: "PolygonAgro",
        transport: "sms",
        content: {
          sms: otpMessage,
        },
        destination: `${phoneNumber}`,
      };

      const response = await axios.post(apiUrl, body, { headers });
      console.log("OTP Response:", response.data);
      await AsyncStorage.setItem("referenceId", response.data.referenceId);

      navigation.navigate("otpBankDetailsupdate", {
        phoneNumber: phoneNumber,
        accNumber: accNumber,
        accHolderName: accHolderName,
        bankName: bankName,
        branchName: branchName,
        PreferdLanguage: PreferdLanguage,
        farmerId: id,
        officerRole: officerRole,
      });
      setLoading(false);
    } catch (error) {
      Alert.alert(t("Error.error"), t("Error.otpSendFailed"));
      setLoading(false);
    }
  };


  const loadingBarWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const unsuccessfulLoadingBarWidth = unsuccessfulProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14, 
        lineHeight: 20, 
      };
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1}}
    >
      <View className="flex-1 p-5 bg-white">
        {/* Header with Back Icon */}
        <View className="flex-row items-center mb-4">
        
          <TouchableOpacity  onPress={() => navigation.goBack()} className="bg-[#f3f3f380] rounded-full p-2 justify-center w-10" >
                                   <AntDesign name="left" size={24} color="#000502" />
                                 </TouchableOpacity>
          <View className="w-full items-center">
            <Text
              className="text-xl font-bold text-center mr-[14%]"
              style={{ fontSize: 18 }}
            >
              {t("UnregisteredFarmerDetails.FillDetails")}
            </Text>
          </View>
        </View>

        {/* Scrollable Form */}
        <ScrollView className="flex-1 p-3 mt-4">
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.AccountNum")}
            </Text>
            <TextInput
             // placeholder={t("UnregisteredFarmerDetails.AccountNum")}
              className={`border ${
                accNumberError ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"
              } p-3 rounded-full`}
              keyboardType="numeric"
              value={accNumber}
              onChangeText={(text) => {
                if (/^\d*$/.test(text)) {
                  setAccNumber(text);
                  setAccNumberError("");
                } else {
                  setAccNumberError(
                    t("UnregisteredFarmerDetails.AccountNumberError")
                  );
                }
              }}
            />
            {accNumberError ? (
              <Text className="text-red-500 text-sm mt-1">
                {accNumberError}
              </Text>
            ) : null}
          </View>

          {/* Account Holder's Name */}
         <View className="mb-4">
  <Text className="text-[#434343] mb-2">
    {t("UnregisteredFarmerDetails.AccountName")}
  </Text>
  <TextInput
    className="border border-[#F4F4F4] bg-[#F4F4F4] p-3 rounded-full"
    value={accHolderName}
    onChangeText={(text) => {
      // Only allow letters and spaces - block numbers, dots, and all special characters
      let filteredText = text.replace(/[^a-zA-Z\s]/g, "");
      
      // Prevent space at the beginning
      if (filteredText.startsWith(' ')) {
        filteredText = filteredText.trimStart();
      }
      
      // Capitalize first letter and make rest lowercase, handle multiple words
      const capitalizedText = filteredText
        .toLowerCase()
        .split(' ')
        .map(word => {
          if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
          return word;
        })
        .join(' ');
      
      setAccHolderName(capitalizedText);
    }}
    keyboardType="default"
    autoCapitalize="words"
    autoCorrect={false}
    maxLength={100}
  />
</View>

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Bank")}
            </Text>
            <View className="  rounded-full">
              <SelectList
                setSelected={setBankName}
                data={bankNames.map((bank) => ({
                  key: bank.name,
                  value: bank.name,
                }))}
                placeholder="Select Bank"
                boxStyles={{  borderRadius: 25 ,
                    borderColor: "#F4F4F4", 
                  backgroundColor: "#F4F4F4"
               
                }}
                dropdownStyles={{ borderColor: "#ccc" }}
                search={true}
              />
            </View>
          </View>

          {/* Branch Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Branch")}
            </Text>
            <View className=" rounded-full">
              <SelectList
                setSelected={setBranchName}
                data={filteredBranches.map((branch) => ({
                  key: branch.name,
                  value: branch.name,
                }))}
                placeholder="Select Branch"
                boxStyles={{  borderRadius: 25 ,
                    borderColor: "#F4F4F4", 
                  backgroundColor: "#F4F4F4"
               
                }}
                dropdownStyles={{ borderColor: "#ccc" }}
                search={true}
              />
            </View>
          </View>
          <TouchableOpacity
            className={`p-3 rounded-full items-center mt-5 ${
              loading ? "bg-gray-400 opacity-50" : "bg-[#000000]"
            }`}
            onPress={() => {
              if (!loading) {
                setLoading(true); // Disable the button on click
                handleNext(); // Your action function
              }
            }}
            disabled={loading} // Disable button during the operation
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                className="text-center text-xl font-semibold text-white"
              >
                {t("UnregisteredFarmerDetails.Submit")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Success Modal */}
        <Modal
          transparent={true}
          visible={isModalVisible}
          animationType="slide"
        >
          <View className="flex-1 justify-center items-center bg-black/50 bg-opacity-50">
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {" "}
                {t("UnregisteredFarmerDetails.Success")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../assets/images/tick.webp")} // Replace with your own checkmark image
                  className="w-24 h-24"
                />
              </View>
              <Text className="text-gray-700">
                {t("UnregisteredFarmerDetails.Successful")}
              </Text>
              <View className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mt-6">
                <Animated.View
                  className="h-full bg-green-500"
                  style={{ width: loadingBarWidth }}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent={true}
          visible={isUnsuccessfulModalVisible}
          animationType="slide"
        >
          <View className="flex-1 justify-center items-center bg-black/50 bg-opacity-50">
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Oops")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../assets/images/error.webp")} // Replace with your own error image
                  className="w-24 h-24"
                />
              </View>
              <Text className="text-gray-700">
                {t("UnregisteredFarmerDetails.Unsuccessful")}
              </Text>

              {/* Display error message */}
              {errorMessage && (
                <Text className="text-red-600 text-center mt-2">
                  {errorMessage}
                </Text>
              )}

              {/* Red Loading Bar */}
              <View className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mt-6">
                <Animated.View
                  className="h-full bg-red-500"
                  style={{ width: unsuccessfulLoadingBarWidth }}
                />
              </View>

              <TouchableOpacity
                className="bg-red-500 p-2 rounded-full mt-4"
                onPress={() => {
                  setIsUnsuccessfulModalVisible(false);
                  setErrorMessage(null); // Clear error message when closing
                  unsuccessfulProgress.setValue(0); // Reset animation value when closing
                }}
              >
                <Text className="text-white">
                  {t("UnregisteredFarmerDetails.Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

export default UnregisteredFarmerDetails;
