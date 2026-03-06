import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { RouteProp } from "@react-navigation/native";
import { OfficerBasicDetailsFormData } from "../types";
import { environment } from "@/environment/environment";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import i18n from "@/i18n/i18n";
import countryData from "../../assets/jsons/countryflag.json";
import CustomHeader from "../common/CustomHeader";
import GlobalSearchModal from "../common/GlobalSearchModal"; 

type AddOfficerBasicDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddOfficerBasicDetails"
>;

type AddOfficerRouteProp = RouteProp<
  RootStackParamList,
  "AddOfficerBasicDetails"
>;

interface AddOfficerProp {
  navigation: AddOfficerBasicDetailsNavigationProp;
  route: AddOfficerRouteProp;
}

interface CountryItem {
  label: string;
  value: string;
  countryName: string;
  flag: string;
  dialCode: string;
}

const AddOfficerBasicDetails: React.FC<AddOfficerProp> = ({
  route,
  navigation,
}) => {
  const { jobRolle } = route.params;
  const [type, setType] = useState<"Permanent" | "Temporary">("Permanent");
  const [preferredLanguages, setPreferredLanguages] = useState({
    Sinhala: false,
    English: false,
    Tamil: false,
  });
  const [jobRole, setJobRole] = useState<string>("Collection Officer");

  const [phoneCode1, setPhoneCode1] = useState<string>("+94");
  const [phoneCode2, setPhoneCode2] = useState<string>("+94");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const { t } = useTranslation();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");
  const [error3, setError3] = useState("");
  const [errorEmail, setErrorEmail] = useState("");

  const [formData, setFormData] = useState<OfficerBasicDetailsFormData>({
    userId: "",
    firstNameEnglish: "",
    lastNameEnglish: "",
    firstNameSinhala: "",
    lastNameSinhala: "",
    firstNameTamil: "",
    lastNameTamil: "",
    nicNumber: "",
    email: "",
    profileImage: "",
    jobRole: "",
    phoneCode1: "",
    phoneNumber1: "",
    phoneCode2: "",
    phoneNumber2: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [countryItems, setCountryItems] = useState<CountryItem[]>([]);
  const [phoneCode1ModalVisible, setPhoneCode1ModalVisible] = useState(false);
  const [phoneCode2ModalVisible, setPhoneCode2ModalVisible] = useState(false);

  useMemo(() => {
    const initialItems = countryData.map((country) => ({
      label: `${country.emoji}  ${country.dial_code}`,
      value: country.dial_code,
      countryName: country.name,
      flag: country.emoji,
      dialCode: country.dial_code,
    }));
    setCountryItems(initialItems);
  }, []);

  const toggleLanguage = (language: keyof typeof preferredLanguages) => {
    clearFieldError("preferredLanguages");
    setPreferredLanguages((prev) => ({ ...prev, [language]: !prev[language] }));
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateNicNumber = (input: string) =>
    /^[0-9]{9}V$|^[0-9]{12}$/.test(input);

  const handleNicNumberChange = (input: string) => {
    clearFieldError("nicNumber");
    const filteredInput = input.replace(/[^0-9Vv]/g, "");
    const normalizedInput = filteredInput.replace(/[vV]/g, "V");
    setFormData({ ...formData, nicNumber: normalizedInput });

    if (normalizedInput.length === 0) {
      setError3("");
    } else if (!validateNicNumber(normalizedInput)) {
      setError3(t("Error.NIC Number must be 9 digits followed by 'V' or 12 digits."));
    } else {
      setError3("");
      checkNicExists(normalizedInput);
    }
  };

  const checkNicExists = async (nic: string) => {
    if (!validateNicNumber(nic) || nic.length === 0) return;

    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-nic/${nic}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setError3(t("Error.This NIC is already registered in the system."));
      } else {
        setError3("");
      }
    } catch (error: any) {
      console.error("Error checking NIC:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const fetchEmpId = async (role: string) => {
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/generate-empId/${role}`,
      );
      if (response.data.status) {
        setFormData((prev) => ({ ...prev, userId: response.data.result.empId }));
      }
    } catch (error) {
      console.error("Error fetching empId:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch empid."));
    }
  };

  useFocusEffect(useCallback(() => { fetchEmpId(jobRole); }, [jobRole]));

  useFocusEffect(
    useCallback(() => {
      setJobRole(String(jobRolle));
      fetchEmpId(String(jobRolle));
      return () => {};
    }, []),
  );

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(t("Error.Permission required"), t("Error.Permission required message"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setSelectedImage(result.assets[0].base64);
    }
  };

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstNameEnglish.trim()) errors.firstNameEnglish = t("Error.First name in English is required");
    if (!formData.lastNameEnglish.trim()) errors.lastNameEnglish = t("Error.Last name in English is required");
    if (!formData.firstNameSinhala?.trim()) errors.firstNameSinhala = t("Error.First name in Sinhala is required");
    if (!formData.lastNameSinhala?.trim()) errors.lastNameSinhala = t("Error.Last name in Sinhala is required");
    if (!formData.firstNameTamil?.trim()) errors.firstNameTamil = t("Error.First name in Tamil is required");
    if (!formData.lastNameTamil?.trim()) errors.lastNameTamil = t("Error.Last name in Tamil is required");
    if (!phoneNumber1.trim()) errors.phoneNumber1 = t("Error.Phone number is required");
    if (!formData.nicNumber.trim()) errors.nicNumber = t("Error.NIC number is required");
    if (!formData.email.trim()) errors.email = t("Error.Email is required");
    if (!jobRole) errors.jobRole = t("Error.Job role is required");
    if (Object.values(preferredLanguages).every((val) => !val)) {
      errors.preferredLanguages = t("Error.Please select at least one preferred language");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (error1) return;
    if (error2 && phoneNumber2.length > 0) return;
    if (errorEmail) return;
    if (error3) return;
    if (!validateFields()) return;

    try {
      setIsValidating(true);
      const updatedFormData = {
        ...formData,
        phoneCode1,
        phoneNumber1,
        phoneCode2,
        phoneNumber2,
        profileImage: selectedImage || "",
      };

      navigation.navigate("AddOfficerAddressDetails", {
        formData: { ...updatedFormData },
        type,
        preferredLanguages,
        jobRole,
      });
    } catch (error) {
      console.error("Error validating user data:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to validate user data."));
    } finally {
      setIsValidating(false);
    }
  };

  const handleEnglishNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);
    let filteredText = text.replace(/[^a-zA-Z\s]/g, "");
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    const capitalizedText = filteredText.toLowerCase().split(" ")
      .map((word) => word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      .join(" ");
    setFormData({ ...formData, [fieldName]: capitalizedText });
  };

  const handleSinhalaNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);
    let filteredText = text;
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    setFormData({ ...formData, [fieldName]: filteredText });
  };

  const handleTamilNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);
    let filteredText = text;
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    setFormData({ ...formData, [fieldName]: filteredText });
  };

  const validatePhoneNumber = (input: string) => /^7[0-9]{8}$/.test(input);

  const handlePhoneNumber1Change = (input: string) => {
    clearFieldError("phoneNumber1");
    let numbersOnly = input.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setPhoneNumber1(numbersOnly);

    if (numbersOnly.length === 0) {
      setError1("");
    } else if (!numbersOnly.startsWith("7")) {
      setError1(t("Error.Invalid phone number"));
    } else if (numbersOnly.length < 9) {
      setError1(t("Error.Phone number must be 9 digits long"));
    } else if (validatePhoneNumber(numbersOnly)) {
      setError1("");
      checkPhoneExists(numbersOnly);
    } else {
      setError1(t("Error.Invalid phone number"));
    }
  };

  const checkPhoneExists = async (phoneNumber: string) => {
    if (!validatePhoneNumber(phoneNumber)) return;
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode1}${phoneNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setError1(t("Error.This phone number is already registered in the system."));
      } else {
        setError1("");
      }
    } catch (error) {
      console.error("Error checking phone number:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePhoneNumber2Change = (input: string) => {
    let numbersOnly = input.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setPhoneNumber2(numbersOnly);

    if (numbersOnly.length === 0) {
      setError2("");
    } else if (!numbersOnly.startsWith("7")) {
      setError2(t("Error.Invalid phone number"));
    } else if (numbersOnly.length < 9) {
      setError2(t("Error.Phone number must be 9 digits long"));
    } else if (validatePhoneNumber(numbersOnly)) {
      setError2("");
      checkPhone2Exists(numbersOnly);
    } else {
      setError2(t("Error.Invalid phone number"));
    }
  };

  const checkPhone2Exists = async (phoneNumber: string) => {
    if (!validatePhoneNumber(phoneNumber)) return;
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode2}${phoneNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setError2(t("Error.This phone number is already registered in the system."));
      } else {
        setError2("");
      }
    } catch (error) {
      console.error("Error checking phone number 2:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const generalEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!generalEmailRegex.test(email)) return false;

    const emailLower = email.toLowerCase();
    const [localPart, domain] = emailLower.split("@");
    const allowedTLDs = [".com", ".gov", ".lk"];

    if (domain === "gmail.com" || domain === "googlemail.com") return validateGmailLocalPart(localPart);
    if (domain === "yahoo.com") return true;
    for (const tld of allowedTLDs) {
      if (domain.endsWith(tld)) return true;
    }
    return false;
  };

  const validateGmailLocalPart = (localPart: string): boolean => {
    if (!/^[a-zA-Z0-9.+]+$/.test(localPart)) return false;
    if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
    if (localPart.includes("..")) return false;
    if (localPart.length === 0) return false;
    return true;
  };

  const handleEmailChange = (input: string) => {
    clearFieldError("email");
    const trimmedInput = input.trim();
    setFormData({ ...formData, email: trimmedInput });

    if (!trimmedInput) { setErrorEmail(t("Error.Email is required")); return; }

    if (!validateEmail(trimmedInput)) {
      const domain = trimmedInput.toLowerCase().split("@")[1];
      setErrorEmail(
        domain === "gmail.com" || domain === "googlemail.com"
          ? t("Error.Invalid Gmail address")
          : t("Error.Invalid email address Example"),
      );
      return;
    }

    setErrorEmail("");
    checkEmailExists(trimmedInput);
  };

  const checkEmailExists = async (email: string) => {
    if (!validateEmail(email)) { setErrorEmail(t("Error.Invalid email address Example")); return; }

    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-email/${email}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setErrorEmail(t("Error.This Email is already registered in the system."));
      } else {
        setErrorEmail("");
      }
    } catch (error: any) {
      console.error("Error checking Email:", error);
      setErrorEmail(t("Error.somethingWentWrong"));
    } finally {
      setIsValidating(false);
    }
  };

  // Phone code selector pill component
  const PhoneCodeSelector = ({
    value,
    onPress,
    hasError,
  }: {
    value: string;
    onPress: () => void;
    hasError?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 90,
        height: 46,
        backgroundColor: "#F4F4F4",
        borderRadius: 25,
        borderWidth: 1,
        borderColor: hasError ? "#ef4444" : "#F4F4F4",
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 13, color: "#374151" }} numberOfLines={1}>
        {value}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
          <CustomHeader
            title={t("AddOfficerBasicDetails.AddOfficer")}
            showBackButton={true}
            navigation={navigation}
            onBackPress={async () => {
              try {
                await AsyncStorage.removeItem("officerFormData");
                navigation.goBack();
              } catch (error) {
                console.error("Error clearing form data:", error);
              }
            }}
          />

          {/* Profile Avatar */}
          <View className="justify-center items-center my-4 relative">
            <Image
              source={
                selectedImage
                  ? { uri: `data:image/png;base64,${selectedImage}` }
                  : require("../../assets/images/collection-manager/user2.webp")
              }
              className="w-24 h-24 rounded-full"
            />
            <TouchableOpacity
              onPress={handleImagePick}
              className="absolute bottom-0 right-4 bg-[#980775] p-1 rounded-full mr-[35%] shadow-md"
              style={{ elevation: 5 }}
            >
              <Ionicons name="pencil" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Type Selector */}
          <View className="px-8 flex-row items-center mb-4">
            <Text className="font-semibold text-sm mr-4">
              {t("AddOfficerBasicDetails.Type")}
            </Text>
            {(["Permanent", "Temporary"] as const).map((t_type) => (
              <TouchableOpacity
                key={t_type}
                className={`flex-row items-center ${t_type === "Permanent" ? "mr-6" : ""}`}
                onPress={() => setType(t_type)}
              >
                <Ionicons
                  name={type === t_type ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color="#980775"
                />
                <Text
                  className="ml-2 text-gray-700"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 10 }
                        : { fontSize: 14 },
                  ]}
                >
                  {t_type === "Permanent"
                    ? t("AddOfficerBasicDetails.Permanent")
                    : t("AddOfficerBasicDetails.Temporary")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ borderBottomWidth: 1, borderColor: "#ADADAD", marginVertical: 10 }} />

          {/* Preferred Languages */}
          <View className="px-8 mb-1">
            <Text className="font-semibold text-sm mb-2">
              {t("AddOfficerBasicDetails.PreferredLanguages")}
            </Text>
            <View className="flex-row items-center">
              {["සිංහල", "English", "தமிழ்"].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  className="flex-row items-center mr-6"
                  onPress={() => toggleLanguage(lang as keyof typeof preferredLanguages)}
                >
                  <Ionicons
                    name={
                      preferredLanguages[lang as keyof typeof preferredLanguages]
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={20}
                    color="#980775"
                  />
                  <Text className="ml-2 text-gray-700">{lang}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {fieldErrors.preferredLanguages ? (
            <Text className="text-red-500 text-sm mb-3 ml-8">{fieldErrors.preferredLanguages}</Text>
          ) : (
            <View className="mb-3" />
          )}

          <View style={{ borderBottomWidth: 1, borderColor: "#ADADAD", marginVertical: 10 }} />

          {/* Input Fields */}
          <View className="px-8">
            {/* Name fields */}
            {[
              { placeholder: t("AddOfficerBasicDetails.FirstNameEnglish"), key: "firstNameEnglish", handler: handleEnglishNameChange },
              { placeholder: t("AddOfficerBasicDetails.LastNameEnglish"), key: "lastNameEnglish", handler: handleEnglishNameChange },
              { placeholder: t("AddOfficerBasicDetails.FirstNameinSinhala"), key: "firstNameSinhala", handler: handleSinhalaNameChange },
              { placeholder: t("AddOfficerBasicDetails.LastNameSinhala"), key: "lastNameSinhala", handler: handleSinhalaNameChange },
              { placeholder: t("AddOfficerBasicDetails.FirstNameTamil"), key: "firstNameTamil", handler: handleTamilNameChange },
              { placeholder: t("AddOfficerBasicDetails.LastNameTamil"), key: "lastNameTamil", handler: handleTamilNameChange },
            ].map(({ placeholder, key, handler }) => (
              <View key={key}>
                <TextInput
                  placeholder={placeholder}
                  value={(formData as any)[key]}
                  onChangeText={(text) => handler(text, key)}
                  className={`border ${fieldErrors[key] ? "border-red-500" : "border-[#F4F4F4]"} bg-[#F4F4F4] rounded-full px-3 py-3 mb-1 text-gray-700`}
                  keyboardType="default"
                  autoCapitalize={key.includes("English") ? "words" : "none"}
                  autoCorrect={false}
                />
                {fieldErrors[key] ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors[key]}</Text>
                ) : (
                  <View className="mb-3" />
                )}
              </View>
            ))}

            {/* Phone Number 1 */}
            <View className="mb-1">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <PhoneCodeSelector
                  value={phoneCode1}
                  onPress={() => setPhoneCode1ModalVisible(true)}
                  hasError={!!fieldErrors.phoneNumber1}
                />
                <View
                  style={{
                    flex: 1,
                    height: 46,
                    borderWidth: 1,
                    borderColor: fieldErrors.phoneNumber1 ? "#ef4444" : "#F4F4F4",
                    backgroundColor: "#F4F4F4",
                    borderRadius: 25,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    placeholder="7X-XXX-XXXX"
                    keyboardType="phone-pad"
                    value={phoneNumber1}
                    onChangeText={handlePhoneNumber1Change}
                    style={{ paddingHorizontal: 14, fontSize: 14, color: "#374151" }}
                    maxLength={9}
                  />
                </View>
              </View>
            </View>
            {error1 || fieldErrors.phoneNumber1 ? (
              <Text className="text-red-500 text-sm mb-3 ml-3">
                {fieldErrors.phoneNumber1 || error1}
              </Text>
            ) : (
              <View className="mb-3" />
            )}

            {/* Phone Number 2 */}
            <View className="mb-1">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <PhoneCodeSelector
                  value={phoneCode2}
                  onPress={() => setPhoneCode2ModalVisible(true)}
                />
                <View
                  style={{
                    flex: 1,
                    height: 46,
                    borderWidth: 1,
                    borderColor: "#F4F4F4",
                    backgroundColor: "#F4F4F4",
                    borderRadius: 25,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    placeholder="7X-XXX-XXXX"
                    keyboardType="phone-pad"
                    value={phoneNumber2}
                    onChangeText={handlePhoneNumber2Change}
                    style={{ paddingHorizontal: 14, fontSize: 14, color: "#374151" }}
                    maxLength={9}
                  />
                </View>
              </View>
            </View>
            {error2 ? (
              <Text className="text-red-500 text-sm mb-3 ml-3">{error2}</Text>
            ) : (
              <View className="mb-3" />
            )}

            {/* NIC */}
            <TextInput
              placeholder={t("AddOfficerBasicDetails.NIC")}
              value={formData.nicNumber}
              onChangeText={handleNicNumberChange}
              maxLength={12}
              keyboardType="default"
              autoCapitalize="characters"
              autoCorrect={false}
              className={`border ${fieldErrors.nicNumber || error3 ? "border-red-500" : "border-[#F4F4F4]"} bg-[#F4F4F4] rounded-full px-3 py-3 mb-1 text-gray-700`}
            />
            {error3 || fieldErrors.nicNumber ? (
              <Text className="text-red-500 text-sm mb-3 ml-3">
                {fieldErrors.nicNumber || error3}
              </Text>
            ) : (
              <View className="mb-3" />
            )}

            {/* Email */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.Email")}
                value={formData.email}
                onChangeText={handleEmailChange}
                className={`border ${fieldErrors.email || errorEmail ? "border-red-500" : "border-[#F4F4F4]"} bg-[#F4F4F4] rounded-full px-3 py-3 mb-1 text-gray-700`}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isValidating}
              />
              {isValidating && (
                <Text style={{ color: "#666", fontSize: 12, marginBottom: 4, marginLeft: 12 }}>
                  {t("Validating email...")}
                </Text>
              )}
              {errorEmail || fieldErrors.email ? (
                <Text className="text-red-500 text-sm mb-3 ml-3">
                  {fieldErrors.email || errorEmail}
                </Text>
              ) : (
                <View className="mb-3" />
              )}
            </View>
          </View>

          {/* Buttons */}
          <View className="flex-row justify-center space-x-3 px-2 mt-8 mb-4">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="bg-gray-300 px-10 py-3 rounded-full"
            >
              <Text className="text-gray-800 text-center">
                {t("AddOfficerBasicDetails.Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              disabled={isValidating}
              className={`${isValidating ? "bg-gray-400" : "bg-[#000000]"} px-12 py-3 rounded-full`}
            >
              <Text className="text-white text-center">
                {isValidating ? <ActivityIndicator /> : t("AddOfficerBasicDetails.Next")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Phone Code 1 Modal */}
      <GlobalSearchModal
        visible={phoneCode1ModalVisible}
        onClose={() => setPhoneCode1ModalVisible(false)}
        title="Select Country Code"
        data={countryItems}
        selectedItems={[phoneCode1]}
        onSelect={(items) => setPhoneCode1(items[0] ?? "+94")}
        searchPlaceholder="Search country or code..."
        multiSelect={false}
      />

      {/* Phone Code 2 Modal */}
      <GlobalSearchModal
        visible={phoneCode2ModalVisible}
        onClose={() => setPhoneCode2ModalVisible(false)}
        title="Select Country Code"
        data={countryItems}
        selectedItems={[phoneCode2]}
        onSelect={(items) => setPhoneCode2(items[0] ?? "+94")}
        searchPlaceholder="Search country or code..."
        multiSelect={false}
      />
    </>
  );
};

export default AddOfficerBasicDetails;