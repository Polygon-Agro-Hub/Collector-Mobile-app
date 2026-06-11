import React, { useState, useEffect, useCallback, useRef } from "react";
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
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import bankNames from "../../assets/jsons/banks.json";
import districtData from "../../assets/jsons/sri-lanka-districts.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { MaterialIcons } from "@expo/vector-icons";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "../commons/GlobalSearchModal";
import { useFocusEffect } from "@react-navigation/native";

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

  // ─── ref to track if we navigated to OTP (so we don't reset on return) ───
  const cameFromOTP = useRef(false);

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);

  const languageOptions = [
    { label: "English", value: "English" },
    { label: "සිංහල", value: "Sinhala" },
    { label: "தமிழ்", value: "Tamil" },
  ];

  const districtOptions = districtData.map((d) => ({
    label: t(d.translationKey),
    value: d.value,
  }));

  const bankModalData = bankNames.map((bank) => ({
    label: bank.name,
    value: bank.name,
  }));

  const branchModalData = filteredBranches.map((branch) => ({
    label: branch.name,
    value: branch.name,
  }));

  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../../assets/jsons/branches.json");
          const rawBranches = data[selectedBank.ID] || [];
          const uniqueBranches = rawBranches.filter(
            (branch: any, index: number, self: any[]) =>
              index === self.findIndex((b) => b.name === branch.name),
          );
          const sortedBranches = uniqueBranches.sort(
            (a: { name: string }, b: { name: any }) =>
              a.name.localeCompare(b.name),
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

  const validateAllFields = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim())
      errors.firstName = t("UnregisteredFarmerDetails.EnterFirstName");
    if (!lastName.trim())
      errors.lastName = t("UnregisteredFarmerDetails.EnterLastName");
    if (!PreferdLanguage)
      errors.preferdLanguage = t("UnregisteredFarmerDetails.SelectLanguage");
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
    if (!district)
      errors.district = t("UnregisteredFarmerDetails.SelectDistrict");
    if (!accNumber.trim()) {
      errors.accNumber = t("UnregisteredFarmerDetails.EnterAccountNumber");
    } else if (accNumberError) {
      errors.accNumber = accNumberError;
    }
    if (!accHolderName.trim())
      errors.accHolderName = t("UnregisteredFarmerDetails.EnterAccountName");
    if (!bankName) errors.bankName = t("UnregisteredFarmerDetails.SelectBank");
    if (!branchName)
      errors.branchName = t("UnregisteredFarmerDetails.SelectBranch");

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    Keyboard.dismiss();
    setFieldErrors({});

    if (!validateAllFields()) {
      setLoading(false);
      return;
    }

    await AsyncStorage.removeItem("referenceId");

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      const checkBody = {
        phoneNumber: `${callingCode}${phoneNumber}`,
        NICnumber: NICnumber,
      };

      const checkResponse = await api.post(
        "api/farmer/farmer-register-checker",
        checkBody,
      );

      if (checkResponse.data.message === "This Phone Number already exists.") {
        Alert.alert(
          t("Error.error"),
          t("Error.This Phone Number already exists."),
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
          t("Error.This Phone Number and NIC already exist."),
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
        otpMessage = `${companyName} සමඟ බැංකු විස්තර සත්‍යාපනය සඳහා ඔබගේ OTP: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nනිවැරදි නම්, ඔබව සම්බන්ධ කර ගන්නා ${companyName} නියෝජිතයා සමඟ පමණක් OTP අංකය බෙදා ගන්න.`;
      } else if (PreferdLanguage === "Tamil") {
        companyName =
          (await AsyncStorage.getItem("companyNameTamil")) || "PolygonAgro";
        otpMessage = `${companyName} உடன் வங்கி விவர சரிபார்ப்புக்கான உங்கள் OTP: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nசரியாக இருந்தால், உங்களைத் தொடர்பு கொள்ளும் ${companyName} பிரதிநிதியுடன் மட்டும் OTP ஐப் பகிரவும்.`;
      } else {
        companyName =
          (await AsyncStorage.getItem("companyNameEnglish")) || "PolygonAgro";
        otpMessage = `Your OTP for bank detail verification with ${companyName} is: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nIf correct, share OTP only with the ${companyName} representative who contacts you.`;
      }

      const body = {
        source: "PolygonAgro",
        transport: "sms",
        content: { sms: otpMessage },
        destination: `${callingCode}${phoneNumber}`,
      };

      const response = await axios.post(apiUrl, body, { headers });
      await AsyncStorage.setItem("referenceId", response.data.referenceId);

      // ─── Mark that we are navigating to OTP so useFocusEffect won't reset ───
      cameFromOTP.current = true;

      navigation.navigate("Main" as any, {
        screen: "OTPE",
        params: {
          firstName,
          lastName,
          NICnumber,
          phoneNumber: `${callingCode}${phoneNumber}`,
          district,
          accNumber,
          accHolderName,
          bankName,
          branchName,
          PreferdLanguage,
        },
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
    if (language === "si") return { fontSize: 14, lineHeight: 20 };
  };

  const handleNameChange = (text: string, setName: (name: string) => void) => {
    let filteredText = text.replace(/[^a-zA-Z\s]/g, "");
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    const capitalizedText = filteredText
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
      )
      .join(" ");
    setName(capitalizedText);
  };

  const handleFirstNameChange = (text: string) => {
    handleNameChange(text, setFirstName);
    if (fieldErrors.firstName)
      setFieldErrors((prev) => ({ ...prev, firstName: "" }));
  };

  const handleLastNameChange = (text: string) => {
    handleNameChange(text, setLastName);
    if (fieldErrors.lastName)
      setFieldErrors((prev) => ({ ...prev, lastName: "" }));
  };

  const handleAccountNameChange = (text: string) => {
    let filteredText = text.replace(/[^a-zA-Z\s]/g, "");
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    const capitalizedText = filteredText
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
      )
      .join(" ");
    setAccHolderName(capitalizedText);
    if (fieldErrors.accHolderName)
      setFieldErrors((prev) => ({ ...prev, accHolderName: "" }));
  };

  useFocusEffect(
    useCallback(() => {
      if (!cameFromOTP.current) {
        // ─── Fresh entry from SearchFarmer — reset all fields ───
        setFirstName("");
        setLastName("");
        setNICnumber(NIC ?? "");
        setPhoneNumber("");
        setDistrict("");
        setAccNumber("");
        setAccHolderName("");
        setBankName("");
        setBranchName("");
        setPreferdLanguage("");
        setCallingCode("+94");
        setNICError("");
        setPhoneError("");
        setAccNumberError("");
        setFieldErrors({});
        setIsModalVisible(false);
        setIsUnsuccessfulModalVisible(false);
        setErrorMessage(null);
      } else {
        // ─── Returning from OTP screen — keep all form data as-is ───
        cameFromOTP.current = false;
      }

      // Always reset loading state regardless of navigation origin
      setLoading(false);

      const handleBackPress = () => {
        navigation.navigate("Main" as any, { screen: "SearchFarmer" });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [navigation, NIC]),
  );

  const SelectorButton = ({
    value,
    placeholder,
    hasError,
    onPress,
  }: {
    value: string;
    placeholder: string;
    hasError: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 50,
        backgroundColor: "#F4F4F4",
        borderRadius: 50,
        borderWidth: 1,
        borderColor: hasError ? "#ef4444" : "#F4F4F4",
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{ color: value ? "#000" : "#9CA3AF", fontSize: 14, flex: 1 }}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <CustomHeader
        title={t("UnregisteredFarmerDetails.FillDetails")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, { screen: "SearchFarmer" })
        }
      />
      <View className="flex-1 bg-white w-full max-w-[500px] mx-auto px-6">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
        >
          {/* First Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.FirstName")}
            </Text>
            <TextInput
              className={`border ${fieldErrors.firstName ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"} p-3 rounded-full h-[50px]`}
              style={{ fontSize: 14 }}
              value={firstName}
              onChangeText={handleFirstNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
              placeholderTextColor="#9CA3AF"
            />
            {fieldErrors.firstName ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.firstName}
              </Text>
            ) : null}
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.LastName")}
            </Text>
            <TextInput
              className={`border ${fieldErrors.lastName ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"} p-3 rounded-full h-[50px]`}
              style={{ fontSize: 14 }}
              value={lastName}
              onChangeText={handleLastNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
              placeholderTextColor="#9CA3AF"
            />
            {fieldErrors.lastName ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.lastName}
              </Text>
            ) : null}
          </View>

          {/* Preferred Language */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.Preferd Language")}
            </Text>
            <SelectorButton
              value={
                languageOptions.find((l) => l.value === PreferdLanguage)
                  ?.label || ""
              }
              placeholder="Select Language"
              hasError={!!fieldErrors.preferdLanguage}
              onPress={() => setLanguageModalVisible(true)}
            />
            {fieldErrors.preferdLanguage ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.preferdLanguage}
              </Text>
            ) : null}
          </View>

          {/* NIC */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.NIC")}
            </Text>
            <TextInput
              className={`border ${fieldErrors.nic || NICError ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"} p-3 rounded-full h-[50px]`}
              style={{ fontSize: 14 }}
              placeholder={t("UnregisteredFarmerDetails.NIC")}
              placeholderTextColor="#9CA3AF"
              value={NICnumber}
              onChangeText={(text) => {
                const sanitized = text.replace(/[^0-9vV]/g, "");
                if (sanitized !== text) return;

                if (
                  /^\d{9}[vV]$/.test(NICnumber) &&
                  sanitized.length > NICnumber.length
                ) {
                  return;
                }

                const updatedText = sanitized.replace(/v$/, "V");
                setNICnumber(updatedText);

                if (!updatedText) {
                  setNICError("");
                  if (fieldErrors.nic)
                    setFieldErrors((prev) => ({ ...prev, nic: "" }));
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
                  if (fieldErrors.nic)
                    setFieldErrors((prev) => ({ ...prev, nic: "" }));
                } else {
                  setNICError(t("UnregisteredFarmerDetails.InvalidNIC"));
                }
              }}
              maxLength={12}
            />
            {fieldErrors.nic || NICError ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.nic || NICError}
              </Text>
            ) : null}
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.Phone")}
            </Text>
            <View
              className={`flex-row items-center border ${
                fieldErrors.phone || phoneError
                  ? "border-red-500"
                  : "border-[#F4F4F4] bg-[#F4F4F4]"
              } px-4 rounded-full h-[50px]`}
            >
              <TextInput
                placeholder="7XXXXXXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  if (!/^\d*$/.test(text)) {
                    setPhoneError(
                      t("UnregisteredFarmerDetails.OnlyDigitsAllowed"),
                    );
                    return;
                  }
                  setPhoneNumber(text);

                  if (!text) {
                    setPhoneError("");
                    if (fieldErrors.phone)
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    return;
                  }

                  if (text.length > 0 && text[0] !== "7") {
                    setPhoneError(
                      t("UnregisteredFarmerDetails.MustStartWith7"),
                    );
                    return;
                  }

                  if (text.length === 9) {
                    setPhoneError("");
                    if (fieldErrors.phone)
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                  } else {
                    setPhoneError(
                      t("UnregisteredFarmerDetails.InvalidPhoneLength"),
                    );
                  }
                }}
                className="flex-1 h-full"
                style={{ fontSize: 14, height: 50, paddingVertical: 0 }}
                maxLength={9}
              />
            </View>
            {fieldErrors.phone || phoneError ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.phone || phoneError}
              </Text>
            ) : null}
          </View>

          {/* District */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.District")}
            </Text>
            <SelectorButton
              value={
                districtOptions.find((d) => d.value === district)?.label || ""
              }
              placeholder="--Select District--"
              hasError={!!fieldErrors.district}
              onPress={() => setDistrictModalVisible(true)}
            />
            {fieldErrors.district ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.district}
              </Text>
            ) : null}
          </View>

          {/* Account Number */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.AccountNum")}
            </Text>
            <TextInput
              className={`border ${fieldErrors.accNumber || accNumberError ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"} p-3 rounded-full h-[50px]`}
              style={{ fontSize: 14 }}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              value={accNumber}
              onChangeText={(text) => {
                if (/^\d*$/.test(text)) {
                  setAccNumber(text);
                  setAccNumberError("");
                  setFieldErrors((prev) => ({ ...prev, accNumber: "" }));
                }
              }}
            />
            {fieldErrors.accNumber || accNumberError ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.accNumber || accNumberError}
              </Text>
            ) : null}
          </View>

          {/* Account Holder Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.AccountName")}
            </Text>
            <TextInput
              className={`border ${fieldErrors.accHolderName ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"} p-3 rounded-full h-[50px]`}
              style={{ fontSize: 14 }}
              value={accHolderName}
              onChangeText={handleAccountNameChange}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
              placeholderTextColor="#9CA3AF"
            />
            {fieldErrors.accHolderName ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.accHolderName}
              </Text>
            ) : null}
          </View>

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.Bank")}
            </Text>
            <SelectorButton
              value={bankName}
              placeholder="--Select Bank--"
              hasError={!!fieldErrors.bankName}
              onPress={() => setBankModalVisible(true)}
            />
            {fieldErrors.bankName ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.bankName}
              </Text>
            ) : null}
          </View>

          {/* Branch Name */}
          <View className="mb-8">
            <Text className="text-[#434343] mb-2" style={{ fontSize: 14 }}>
              {t("UnregisteredFarmerDetails.Branch")}
            </Text>
            <SelectorButton
              value={branchName}
              placeholder="--Select Branch--"
              hasError={!!fieldErrors.branchName}
              onPress={() => {
                if (!bankName) {
                  Alert.alert(
                    t("Error.error"),
                    t("UnregisteredFarmerDetails.SelectBank"),
                  );
                  return;
                }
                setBranchModalVisible(true);
              }}
            />
            {fieldErrors.branchName ? (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.branchName}
              </Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-full h-[50px] items-center mb-[30%] justify-center mt-4 ${loading ? "bg-gray-400 opacity-50" : "bg-[#000000]"}`}
            onPress={() => {
              if (!loading) {
                setLoading(true);
                handleNext();
              }
            }}
            disabled={loading}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
              height: 50,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={{ fontSize: 16 }}
                className="text-center text-white font-semibold"
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
          <View
            style={{
              flex: 1,
              backgroundColor: "#00000040",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Success")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/collection-common/tick.webp")}
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

        {/* Unsuccessful Modal */}
        <Modal
          transparent={true}
          visible={isUnsuccessfulModalVisible}
          animationType="slide"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#00000040",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Oops")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/collection-common/error-unregister.webp")}
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

      {/* Language Modal */}
      <GlobalSearchModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        title={t("UnregisteredFarmerDetails.Preferd Language")}
        data={languageOptions}
        selectedItems={PreferdLanguage ? [PreferdLanguage] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setPreferdLanguage(val);
          if (val && fieldErrors.preferdLanguage)
            setFieldErrors((prev) => ({ ...prev, preferdLanguage: "" }));
        }}
        multiSelect={false}
        showSearch={false}
      />

      {/* District Modal */}
      <GlobalSearchModal
        visible={districtModalVisible}
        onClose={() => setDistrictModalVisible(false)}
        title={t("UnregisteredFarmerDetails.District")}
        data={districtOptions}
        selectedItems={district ? [district] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setDistrict(val);
          if (val && fieldErrors.district)
            setFieldErrors((prev) => ({ ...prev, district: "" }));
        }}
        searchPlaceholder="Search district..."
        multiSelect={false}
      />

      {/* Bank Modal */}
      <GlobalSearchModal
        visible={bankModalVisible}
        onClose={() => setBankModalVisible(false)}
        title={t("UnregisteredFarmerDetails.Bank")}
        data={bankModalData}
        selectedItems={bankName ? [bankName] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setBankName(val);
          setBranchName("");
          if (val && fieldErrors.bankName)
            setFieldErrors((prev) => ({ ...prev, bankName: "" }));
        }}
        searchPlaceholder="Search bank..."
        multiSelect={false}
      />

      {/* Branch Modal */}
      <GlobalSearchModal
        visible={branchModalVisible}
        onClose={() => setBranchModalVisible(false)}
        title={t("UnregisteredFarmerDetails.Branch")}
        data={branchModalData}
        selectedItems={branchName ? [branchName] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setBranchName(val);
          if (val && fieldErrors.branchName)
            setFieldErrors((prev) => ({ ...prev, branchName: "" }));
        }}
        searchPlaceholder="Search branch..."
        multiSelect={false}
      />
    </KeyboardAvoidingView>
  );
};

export default UnregisteredFarmerDetails;