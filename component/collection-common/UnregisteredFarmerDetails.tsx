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
  Animated,
  Keyboard,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { CountryCode } from "react-native-country-picker-modal";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import bankNames from "../../assets/jsons/banks.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import NetInfo from "@react-native-community/netinfo";
import { SelectList } from "react-native-dropdown-select-list";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type UnregisteredFarmerDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UnregisteredFarmerDetails"
>;

interface UnregisteredFarmerDetailsProps {
  navigation: UnregisteredFarmerDetailsNavigationProp;
  route: any;
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
  const { NIC } = route.params;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [NICnumber, setNICnumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accHolderName, setAccHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [progress] = useState(new Animated.Value(0));
  const [unsuccessfulProgress] = useState(new Animated.Value(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();
  const [filteredBranches, setFilteredBranches] = useState<allBranches[]>([]);
  const [callingCode, setCallingCode] = useState("+94");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [PreferdLanguage, setPreferdLanguage] = useState<string>("");
  const [NICError, setNICError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [accNumberError, setAccNumberError] = useState("");
  
  // New state for field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const districtOptions = [
    { key: 1, value: "Ampara", translationKey: t("Districts.Ampara") },
    { key: 2, value: "Anuradhapura", translationKey: t("Districts.Anuradhapura") },
    { key: 3, value: "Badulla", translationKey: t("Districts.Badulla") },
    { key: 4, value: "Batticaloa", translationKey: t("Districts.Batticaloa") },
    { key: 5, value: "Colombo", translationKey: t("Districts.Colombo") },
    { key: 6, value: "Galle", translationKey: t("Districts.Galle") },
    { key: 7, value: "Gampaha", translationKey: t("Districts.Gampaha") },
    { key: 8, value: "Hambantota", translationKey: t("Districts.Hambantota") },
    { key: 9, value: "Jaffna", translationKey: t("Districts.Jaffna") },
    { key: 10, value: "Kalutara", translationKey: t("Districts.Kalutara") },
    { key: 11, value: "Kandy", translationKey: t("Districts.Kandy") },
    { key: 12, value: "Kegalle", translationKey: t("Districts.Kegalle") },
    { key: 13, value: "Kilinochchi", translationKey: t("Districts.Kilinochchi") },
    { key: 14, value: "Kurunegala", translationKey: t("Districts.Kurunegala") },
    { key: 15, value: "Mannar", translationKey: t("Districts.Mannar") },
    { key: 16, value: "Matale", translationKey: t("Districts.Matale") },
    { key: 17, value: "Matara", translationKey: t("Districts.Matara") },
    { key: 18, value: "Moneragala", translationKey: t("Districts.Moneragala") },
    { key: 19, value: "Mullaitivu", translationKey: t("Districts.Mullaitivu") },
    { key: 20, value: "Nuwara Eliya", translationKey: t("Districts.NuwaraEliya") },
    { key: 21, value: "Polonnaruwa", translationKey: t("Districts.Polonnaruwa") },
    { key: 22, value: "Puttalam", translationKey: t("Districts.Puttalam") },
    { key: 23, value: "Rathnapura", translationKey: t("Districts.Rathnapura") },
    { key: 24, value: "Trincomalee", translationKey: t("Districts.Trincomalee") },
    { key: 25, value: "Vavuniya", translationKey: t("Districts.Vavuniya") },
  ];

  useEffect(() => {
    if (NIC) {
      setNICnumber(NIC);
    }
  }, [NIC]);

  // Function to validate all fields
  const validateAllFields = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = t("UnregisteredFarmerDetails.EnterFirstName");
    }
    if (!lastName.trim()) {
      errors.lastName = t("UnregisteredFarmerDetails.EnterLastName");
    }
    if (!PreferdLanguage) {
      errors.preferdLanguage = t("UnregisteredFarmerDetails.SelectLanguage");
    }
    if (!NICnumber.trim()) {
      errors.nic = t("UnregisteredFarmerDetails.EnterNIC");
    } else if (NICError) {
      errors.nic = NICError;
    }
    if (!phoneNumber.trim()) {
      errors.phone = t("UnregisteredFarmerDetails.EnterPhone");
    } else if (phoneError) {
      errors.phone = phoneError;
    }
    if (!district) {
      errors.district = t("UnregisteredFarmerDetails.SelectDistrict");
    }
    if (!accNumber.trim()) {
      errors.accNumber = t("UnregisteredFarmerDetails.EnterAccountNumber");
    } else if (accNumberError) {
      errors.accNumber = accNumberError;
    }
    if (!accHolderName.trim()) {
      errors.accHolderName = t("UnregisteredFarmerDetails.EnterAccountName");
    }
    if (!bankName) {
      errors.bankName = t("UnregisteredFarmerDetails.SelectBank");
    }
    if (!branchName) {
      errors.branchName = t("UnregisteredFarmerDetails.SelectBranch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAccountNumber = (value: any) => {
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

  const handleNext = async () => {
    Keyboard.dismiss();
    
    // Clear previous errors
    setFieldErrors({});
    
    // Validate all fields
    if (!validateAllFields()) {
      setLoading(false);
      return;
    }

    await AsyncStorage.removeItem("referenceId");

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      const checkApiUrl = `api/farmer/farmer-register-checker`;
      const checkBody = {
        phoneNumber: `${callingCode}${phoneNumber}`,
        NICnumber: NICnumber,
      };

      console.log("Full API URL:", `${api.defaults.baseURL}${checkApiUrl}`);
      const checkResponse = await api.post(checkApiUrl, checkBody);

      if (checkResponse.data.message === "This Phone Number already exists.") {
        Alert.alert(
          t("Error.error"),
          t("Error.This Phone Number already exists.")
        );
        setLoading(false);
        return;
      } else if (checkResponse.data.message === "This NIC already exists.") {
        Alert.alert(t("Error.error"), t("Error.This NIC already exists."));
        setLoading(false);
        return;
      } else if (
        checkResponse.data.message ===
        "This Phone Number and NIC already exist."
      ) {
        Alert.alert(
          t("Error.error"),
          t("Error.This Phone Number and NIC already exist.")
        );
        setLoading(false);
        return;
      }

      const apiUrl = "https://api.getshoutout.com/otpservice/send";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

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
        destination: `${callingCode}${phoneNumber}`,
      };

      const response = await axios.post(apiUrl, body, { headers });
      console.log("OTP Response:", response.data);
      await AsyncStorage.setItem("referenceId", response.data.referenceId);

      navigation.navigate("OTPE", {
        firstName: firstName,
        lastName: lastName,
        NICnumber: NICnumber,
        phoneNumber: `${callingCode}${phoneNumber}`,
        district: district,
        accNumber: accNumber,
        accHolderName: accHolderName,
        bankName: bankName,
        branchName: branchName,
        PreferdLanguage: PreferdLanguage,
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

  const handleNameChange = (text: string, setName: (name: string) => void) => {
    let filteredText = text.replace(/[^a-zA-Z\s]/g, '');
    if (filteredText.startsWith(' ')) {
      filteredText = filteredText.trimStart();
    }
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
    setName(capitalizedText);
  };

  const handleFirstNameChange = (text: string) => {
    handleNameChange(text, setFirstName);
    // Clear error when user starts typing
    if (fieldErrors.firstName) {
      setFieldErrors(prev => ({ ...prev, firstName: '' }));
    }
  };

  const handleLastNameChange = (text: string) => {
    handleNameChange(text, setLastName);
    if (fieldErrors.lastName) {
      setFieldErrors(prev => ({ ...prev, lastName: '' }));
    }
  };

  const handleAccountNameChange = (text: string) => {
    let filteredText = text.replace(/[^a-zA-Z\s]/g, '');
    if (filteredText.startsWith(' ')) {
      filteredText = filteredText.trimStart();
    }
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
    if (fieldErrors.accHolderName) {
      setFieldErrors(prev => ({ ...prev, accHolderName: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1}}
    >
      <View className="flex-1 p-5 bg-white">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#f3f3f380] rounded-full p-2 justify-center w-10">
            <AntDesign name="left" size={24} color="#000502" />
          </TouchableOpacity>
          <View className="w-full items-center">
            <Text className="text-xl font-bold text-center mr-[11%]">
              {t("UnregisteredFarmerDetails.FillDetails")}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 p-3">
          {/* First Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.FirstName")}
            </Text>
            <TextInput
              className={`border ${
                fieldErrors.firstName ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-3 rounded-full`}
              value={firstName}
              onChangeText={handleFirstNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />
            {fieldErrors.firstName ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</Text>
            ) : null}
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.LastName")}
            </Text>
            <TextInput
              className={`border ${
                fieldErrors.lastName ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-3 rounded-full`}
              value={lastName}
              onChangeText={handleLastNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />
            {fieldErrors.lastName ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</Text>
            ) : null}
          </View>

          {/* Preferred Language */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Preferd Language")}
            </Text>
            <SelectList
              setSelected={(val: string) => {
                setPreferdLanguage(val);
                if (fieldErrors.preferdLanguage) {
                  setFieldErrors(prev => ({ ...prev, preferdLanguage: '' }));
                }
              }}
              data={[
                { key: "English", value: "English" },
                { key: "Sinhala", value: "සිංහල" },
                { key: "Tamil", value: "தமிழ்" },
              ]}
              placeholder="Select Language"
              boxStyles={{ 
                borderColor: fieldErrors.preferdLanguage ? "#red-500" : "#F4F4F4", 
                borderRadius: 25,
                backgroundColor: "#F4F4F4"
              }}
              dropdownStyles={{ borderColor: "#ccc" }}
              search={false}
            />
            {fieldErrors.preferdLanguage ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.preferdLanguage}</Text>
            ) : null}
          </View>

          {/* NIC */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.NIC")}
            </Text>
            <TextInput
              placeholder={t("UnregisteredFarmerDetails.NIC")}
              className={`border ${
                fieldErrors.nic || NICError ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-3 rounded-full`}
              value={NICnumber}
              onChangeText={(text) => {
                const updatedText = text.replace(/v$/, "V");
                setNICnumber(updatedText);

                if (!updatedText) {
                  setNICError("");
                  if (fieldErrors.nic) {
                    setFieldErrors(prev => ({ ...prev, nic: '' }));
                  }
                  return;
                }

                const isValidCharacters = /^(\d+|[\d]+[vV]?)$/.test(updatedText);
                if (!isValidCharacters) {
                  setNICError(t("UnregisteredFarmerDetails.InvalidNIC"));
                  return;
                }

                if (updatedText.length < 9) {
                  setNICError(t("UnregisteredFarmerDetails.InvalidNIC"));
                  return;
                }

                const is12Digits = /^\d{12}$/.test(updatedText);
                const is9DigitsWithV = /^\d{9}[vV]$/.test(updatedText);

                if (is12Digits || is9DigitsWithV) {
                  setNICError("");
                  if (fieldErrors.nic) {
                    setFieldErrors(prev => ({ ...prev, nic: '' }));
                  }
                } else {
                  setNICError(t("UnregisteredFarmerDetails.InvalidNIC"));
                }
              }}
              maxLength={12}
            />
            {(fieldErrors.nic || NICError) ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.nic || NICError}</Text>
            ) : null}
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Phone")}
            </Text>
            <View
              className={`flex-row items-center border ${
                fieldErrors.phone || phoneError ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-1  rounded-full`}
            >
              <TextInput
                placeholder="7XXXXXXXX"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  if (!/^\d*$/.test(text)) {
                    setPhoneError(t("UnregisteredFarmerDetails.OnlyDigitsAllowed"));
                    return;
                  }

                  setPhoneNumber(text);

                  if (!text) {
                    setPhoneError("");
                    if (fieldErrors.phone) {
                      setFieldErrors(prev => ({ ...prev, phone: '' }));
                    }
                    return;
                  }

                  if (text.length > 0 && text[0] !== "7") {
                    setPhoneError(t("UnregisteredFarmerDetails.MustStartWith7"));
                    return;
                  }

                  if (text.length === 9) {
                    setPhoneError("");
                    if (fieldErrors.phone) {
                      setFieldErrors(prev => ({ ...prev, phone: '' }));
                    }
                  } else {
                    setPhoneError(t("UnregisteredFarmerDetails.InvalidPhoneLength"));
                  }
                }}
                className="flex-1"
                maxLength={9}
              />
            </View>
            {(fieldErrors.phone || phoneError) ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.phone || phoneError}</Text>
            ) : null}
          </View>

          {/* District */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.District")}
            </Text>
            <View className="rounded-lg">
              <SelectList
                setSelected={(val: string) => {
                  setDistrict(val);
                  if (fieldErrors.district) {
                    setFieldErrors(prev => ({ ...prev, district: '' }));
                  }
                }}
                data={districtOptions.map((district) => ({
                  key: district.value,
                  value: district.translationKey,
                }))}
                placeholder="--Select District--"
                boxStyles={{ 
                  borderColor: fieldErrors.district ? "red-500" : "#F4F4F4", 
                  borderRadius: 25,
                  backgroundColor: "#F4F4F4"
                }}
                dropdownStyles={{ borderColor: "#ccc" }}
                search={true}
              />
            </View>
            {fieldErrors.district ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.district}</Text>
            ) : null}
          </View>

          {/* Account Number */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.AccountNum")}
            </Text>
            <TextInput
              className={`border ${
                fieldErrors.accNumber || accNumberError ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-3 rounded-full`}
              keyboardType="numeric"
              value={accNumber}
              onChangeText={(text) => {
                if (/^\d*$/.test(text)) {
                  setAccNumber(text);
                  setAccNumberError("");
                  if (fieldErrors.accNumber) {
                    setFieldErrors(prev => ({ ...prev, accNumber: '' }));
                  }
                } else {
                  setAccNumberError(t("UnregisteredFarmerDetails.AccountNumberError"));
                }
              }}
            />
            {(fieldErrors.accNumber || accNumberError) ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.accNumber || accNumberError}
              </Text>
            ) : null}
          </View>

          {/* Account Holder Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.AccountName")}
            </Text>
            <TextInput
              className={`border ${
                fieldErrors.accHolderName ? "border-red-500" : "border-[#F4F4F4]"
              } bg-[#F4F4F4] p-3 rounded-full`}
              value={accHolderName}
              onChangeText={handleAccountNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
            {fieldErrors.accHolderName ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.accHolderName}</Text>
            ) : null}
          </View>

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Bank")}
            </Text>
            <View className="rounded-lg">
              <SelectList
                setSelected={(val: string) => {
                  setBankName(val);
                  if (fieldErrors.bankName) {
                    setFieldErrors(prev => ({ ...prev, bankName: '' }));
                  }
                }}
                data={bankNames.map((bank) => ({
                  key: bank.name,
                  value: bank.name,
                }))}
                placeholder="--Select Bank--"
                boxStyles={{ 
                  borderColor: fieldErrors.bankName ? "red-500" : "#F4F4F4", 
                  borderRadius: 25,
                  backgroundColor: "#F4F4F4"
                }}
                dropdownStyles={{ borderColor: "#ccc" }}
                search={true}
              />
            </View>
            {fieldErrors.bankName ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.bankName}</Text>
            ) : null}
          </View>

          {/* Branch Name */}
          <View className="mb-8">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Branch")}
            </Text>
            <View className="rounded-lg">
              <SelectList
                setSelected={(val: string) => {
                  setBranchName(val);
                  if (fieldErrors.branchName) {
                    setFieldErrors(prev => ({ ...prev, branchName: '' }));
                  }
                }}
                data={filteredBranches.map((branch) => ({
                  key: branch.name,
                  value: branch.name,
                }))}
                placeholder="--Select Branch--"
                boxStyles={{ 
                  borderColor: fieldErrors.branchName ? "red-500" : "#F4F4F4", 
                  borderRadius: 25,
                  backgroundColor: "#F4F4F4"
                }}
                dropdownStyles={{ borderColor: "#ccc" }}
                search={true}
              />
            </View>
            {fieldErrors.branchName ? (
              <Text className="text-red-500 text-sm mt-1">{fieldErrors.branchName}</Text>
            ) : null}
          </View>
        </ScrollView>

        <TouchableOpacity
          className={`p-3 rounded-full items-center mt-5 ${
            loading ? "bg-gray-400 opacity-50" : "bg-[#000000]"
          }`}
          onPress={() => {
            if (!loading) {
              setLoading(true);
              handleNext();
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-center text-xl font-light text-white"
            >
              {t("UnregisteredFarmerDetails.Submit")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Success Modal */}
        <Modal
          transparent={true}
          visible={isModalVisible}
          animationType="slide"
        >
          <View className="flex-1 justify-center items-center bg-black/50 bg-opacity-50">
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Success")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/tick.webp")}
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
          <View className="flex-1 justify-center items-center bg-gray-900 bg-opacity-50">
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Oops")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/error.webp")}
                  className="w-24 h-24"
                />
              </View>
              <Text className="text-gray-700">
                {t("UnregisteredFarmerDetails.Unsuccessful")}
              </Text>

              {errorMessage && (
                <Text className="text-red-600 text-center mt-2">
                  {errorMessage}
                </Text>
              )}

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
                  setErrorMessage(null);
                  unsuccessfulProgress.setValue(0);
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