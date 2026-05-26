import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { RadioButton } from "react-native-paper";
import Checkbox from "expo-checkbox";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { RouteProp } from "@react-navigation/native";
import { OfficerBasicDetailsFormData } from "../types/types";
import { environment } from "@/environment/environment";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import i18n from "@/i18n/i18n";
import countryData from "../../assets/jsons/countryflag.json";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "../commons/GlobalSearchModal";

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

  const scrollRef = useRef<ScrollView>(null);

  const [phoneCode1, setPhoneCode1] = useState<string>("+94");
  const [phoneCode2, setPhoneCode2] = useState<string>("+94");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const { t } = useTranslation();
  const [currentCountryCodeModal, setCurrentCountryCodeModal] = useState<
    "phone1" | "phone2"
  >("phone1");
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

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

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
      setError3(
        t("Error.NIC Number must be 9 digits followed by 'V' or 12 digits."),
      );
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
        setFormData((prev) => ({
          ...prev,
          userId: response.data.result.empId,
        }));
      }
    } catch (error) {
      console.error("Error fetching empId:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch empid."));
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmpId(jobRole);
    }, [jobRole]),
  );

  useFocusEffect(
    useCallback(() => {
      setJobRole(String(jobRolle));
      fetchEmpId(String(jobRolle));
      return () => {};
    }, []),
  );

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        t("Error.Permission required"),
        t("Error.Permission required message"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstNameEnglish.trim())
      errors.firstNameEnglish = t("Error.First name in English is required");
    if (!formData.lastNameEnglish.trim())
      errors.lastNameEnglish = t("Error.Last name in English is required");
    if (!formData.firstNameSinhala?.trim())
      errors.firstNameSinhala = t("Error.First name in Sinhala is required");
    if (!formData.lastNameSinhala?.trim())
      errors.lastNameSinhala = t("Error.Last name in Sinhala is required");
    if (!formData.firstNameTamil?.trim())
      errors.firstNameTamil = t("Error.First name in Tamil is required");
    if (!formData.lastNameTamil?.trim())
      errors.lastNameTamil = t("Error.Last name in Tamil is required");
    if (!phoneNumber1.trim())
      errors.phoneNumber1 = t("Error.Phone number is required");
    if (!formData.nicNumber.trim())
      errors.nicNumber = t("Error.NIC number is required");
    if (!formData.email.trim()) errors.email = t("Error.Email is required");
    if (!jobRole) errors.jobRole = t("Error.Job role is required");
    if (Object.values(preferredLanguages).every((val) => !val)) {
      errors.preferredLanguages = t(
        "Error.Please select at least one preferred language",
      );
    }
    if (
      phoneNumber1.trim() &&
      phoneNumber2.trim() &&
      phoneCode1 === phoneCode2 &&
      phoneNumber1 === phoneNumber2
    ) {
      errors.phoneNumber2Duplicate = t(
        "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
      );
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (!validateFields()) return;

    try {
      setIsValidating(true);

      if (phoneNumber1.trim() && validatePhoneNumber(phoneNumber1)) {
        const token = await AsyncStorage.getItem("token");

        const phone1Res = await axios.get(
          `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode1}${phoneNumber1}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (phone1Res.data.exists) {
          setError1(
            t("Error.This phone number is already registered in the system."),
          );
          setIsValidating(false);
          return;
        }
      }

      if (phoneNumber2.trim() && validatePhoneNumber(phoneNumber2)) {
        const token = await AsyncStorage.getItem("token");

        const phone2Res = await axios.get(
          `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode2}${phoneNumber2}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (phone2Res.data.exists) {
          setError2(
            t("Error.This phone number is already registered in the system."),
          );
          setIsValidating(false);
          return;
        }
      }

      if (
        error1 ||
        (error2 && phoneNumber2.length > 0) ||
        errorEmail ||
        error3
      ) {
        setIsValidating(false);
        return;
      }

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
    const capitalizedText = filteredText
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
      )
      .join(" ");
    setFormData({ ...formData, [fieldName]: capitalizedText });
  };

  const handleSinhalaNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);

    let filteredText = text.replace(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
      "",
    );
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    setFormData({ ...formData, [fieldName]: filteredText });
  };

  const handleTamilNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);

    let filteredText = text.replace(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
      "",
    );
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

      if (
        error2 ===
        t(
          "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
        )
      ) {
        setError2("");
      }
    } else if (!numbersOnly.startsWith("7")) {
      setError1(t("Error.Invalid phone number"));
    } else if (numbersOnly.length < 9) {
      setError1(t("Error.Phone number must be 9 digits long"));
    } else if (validatePhoneNumber(numbersOnly)) {
      setError1("");

      if (phoneNumber2.length > 0 && validatePhoneNumber(phoneNumber2)) {
        if (phoneCode1 === phoneCode2 && numbersOnly === phoneNumber2) {
          setError2(
            t(
              "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
            ),
          );
        } else {
          setError2((prev) =>
            prev ===
            t(
              "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
            )
              ? ""
              : prev,
          );
        }
      }
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
        setError1(
          t("Error.This phone number is already registered in the system."),
        );
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
      if (phoneCode1 === phoneCode2 && numbersOnly === phoneNumber1) {
        setError2(
          t(
            "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
          ),
        );
      } else {
        checkPhone2Exists(numbersOnly, phoneCode2);
      }
    } else {
      setError2(t("Error.Invalid phone number"));
    }
  };

  const checkPhone2Exists = async (phoneNumber: string, dialCode: string) => {
    if (!validatePhoneNumber(phoneNumber)) return;
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${dialCode}${phoneNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setError2(
          t("Error.This phone number is already registered in the system."),
        );
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
    const generalEmailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!generalEmailRegex.test(email)) return false;
    const emailLower = email.toLowerCase();
    const [localPart, domain] = emailLower.split("@");
    const allowedTLDs = [".com", ".gov", ".lk"];
    if (domain === "gmail.com" || domain === "googlemail.com")
      return validateGmailLocalPart(localPart);
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

    if (!trimmedInput) {
      setErrorEmail(t("Error.Email is required"));
      return;
    }
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
    if (!validateEmail(email)) {
      setErrorEmail(t("Error.Invalid email address Example"));
      return;
    }
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-email/${email}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setErrorEmail(
          t("Error.This Email is already registered in the system."),
        );
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

  const handleCountryCodeSelect = (selectedValues: string[]) => {
    if (selectedValues.length > 0) {
      const selectedCode = selectedValues[0];
      if (currentCountryCodeModal === "phone1") {
        setPhoneCode1(selectedCode);
        setPhoneCode1ModalVisible(false);
      } else {
        setPhoneCode2(selectedCode);
        setPhoneCode2ModalVisible(false);
      }
    }
  };

  const renderCountryCodeItem = (item: any, isSelected: boolean) => (
    <TouchableOpacity
      className="px-4 py-3 border-b border-gray-200 flex-row items-center"
      onPress={() => handleCountryCodeSelect([item.value])}
    >
      <Text className="text-2xl mr-3">{item.flag}</Text>
      <View className="flex-1 flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{item.dialCode}</Text>
        <Text className="text-base text-gray-800 font-medium">
          {item.countryName}
        </Text>
      </View>
      {isSelected && <MaterialIcons name="check" size={20} color="#21202B" />}
    </TouchableOpacity>
  );

  const getSelectedFlag = (dialCode: string) =>
    countryItems.find((item) => item.dialCode === dialCode)?.flag ?? "🏳️";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
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

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="w-full max-w-[500px] mx-auto"
      >
        <View className="items-center mt-6">
          <TouchableOpacity onPress={handleImagePick}>
            <View className="relative">
              <View className="w-20 h-20 bg-gray-300 rounded-full overflow-hidden items-center justify-center">
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={40} color="#fff" />
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-6 h-6 bg-[#980775] rounded-full items-center justify-center">
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View className="p-2 px-4">
          <View className="px-2 mt-6 items-center">
            <View className="flex flex-row items-center gap-2 justify-between">
              <Text className="text-base font-medium">
                {t("AddOfficerBasicDetails.Type")}
              </Text>
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setType("Permanent")}
              >
                <RadioButton
                  value="Permanent"
                  status={type === "Permanent" ? "checked" : "unchecked"}
                  onPress={() => setType("Permanent")}
                  color="#980775"
                  uncheckedColor="#980775"
                />
                <Text
                  className="ml-1 text-base text-[#534E4E]"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 10 }
                        : { fontSize: 14 },
                  ]}
                >
                  {t("AddOfficerBasicDetails.Permanent")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setType("Temporary")}
              >
                <RadioButton
                  value="Temporary"
                  status={type === "Temporary" ? "checked" : "unchecked"}
                  onPress={() => setType("Temporary")}
                  color="#980775"
                  uncheckedColor="#980775"
                />
                <Text
                  className="ml-1 text-base text-[#534E4E]"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 10 }
                        : { fontSize: 14 },
                  ]}
                >
                  {t("AddOfficerBasicDetails.Temporary")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="border border-[#ADADAD] border-b-0 mt-4" />

          <View className="px-6 mt-4">
            <Text className="text-base font-medium mb-4">
              {t("AddOfficerBasicDetails.PreferredLanguages")}
            </Text>
            <View className="flex-row justify-between gap-4">
              {(
                Object.keys(preferredLanguages) as Array<
                  keyof typeof preferredLanguages
                >
              ).map((lang) => (
                <View key={lang} className="flex-row items-center gap-1">
                  <Checkbox
                    value={preferredLanguages[lang]}
                    onValueChange={() => toggleLanguage(lang)}
                    color={preferredLanguages[lang] ? "#980775" : "#980775"}
                  />
                  <Text className="text-base text-[#534E4E]">
                    {t(`AddOfficerBasicDetails.${lang}`)}
                  </Text>
                </View>
              ))}
            </View>
            {fieldErrors.preferredLanguages && (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors.preferredLanguages}
              </Text>
            )}
          </View>

          <View className="border border-[#ADADAD] border-b-0 mt-4" />

          <View className="px-4 mt-4 gap-4">
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.FirstNameEnglish")}
                placeholderTextColor="#7D7D7D"
                value={formData.firstNameEnglish}
                onChangeText={(text) =>
                  handleEnglishNameChange(text, "firstNameEnglish")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.firstNameEnglish ? "border border-red-500" : ""
                }`}
                keyboardType="default"
                autoCapitalize="words"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.firstNameEnglish && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.firstNameEnglish}
                </Text>
              )}
            </View>

            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.LastNameEnglish")}
                placeholderTextColor="#7D7D7D"
                value={formData.lastNameEnglish}
                onChangeText={(text) =>
                  handleEnglishNameChange(text, "lastNameEnglish")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.lastNameEnglish ? "border border-red-500" : ""
                }`}
                keyboardType="default"
                autoCapitalize="words"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.lastNameEnglish && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.lastNameEnglish}
                </Text>
              )}
            </View>

            {/* First Name Sinhala */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.FirstNameinSinhala")}
                placeholderTextColor="#7D7D7D"
                value={formData.firstNameSinhala}
                onChangeText={(text) =>
                  handleSinhalaNameChange(text, "firstNameSinhala")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.firstNameSinhala ? "border border-red-500" : ""
                }`}
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.firstNameSinhala && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.firstNameSinhala}
                </Text>
              )}
            </View>

            {/* Last Name Sinhala */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.LastNameSinhala")}
                placeholderTextColor="#7D7D7D"
                value={formData.lastNameSinhala}
                onChangeText={(text) =>
                  handleSinhalaNameChange(text, "lastNameSinhala")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.lastNameSinhala ? "border border-red-500" : ""
                }`}
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.lastNameSinhala && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.lastNameSinhala}
                </Text>
              )}
            </View>

            {/* First Name Tamil */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.FirstNameTamil")}
                placeholderTextColor="#7D7D7D"
                value={formData.firstNameTamil}
                onChangeText={(text) =>
                  handleTamilNameChange(text, "firstNameTamil")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.firstNameTamil ? "border border-red-500" : ""
                }`}
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.firstNameTamil && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.firstNameTamil}
                </Text>
              )}
            </View>

            {/* Last Name Tamil */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.LastNameTamil")}
                placeholderTextColor="#7D7D7D"
                value={formData.lastNameTamil}
                onChangeText={(text) =>
                  handleTamilNameChange(text, "lastNameTamil")
                }
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.lastNameTamil ? "border border-red-500" : ""
                }`}
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              {fieldErrors.lastNameTamil && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.lastNameTamil}
                </Text>
              )}
            </View>
          </View>

          {/* ── Divider ── */}
          <View className="border border-[#ADADAD] border-b-0 mt-4" />

          {/* ── Phone & Contact Fields ── */}
          <View className="px-4 mt-4 gap-4">
            {/* Phone Number 1 */}
            <View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="bg-[#F4F4F4] rounded-2xl px-3 h-[50px] w-24 flex-row justify-between items-center"
                  onPress={() => {
                    setCurrentCountryCodeModal("phone1");
                    setPhoneCode1ModalVisible(true);
                  }}
                >
                  <Text className="text-base">
                    {getSelectedFlag(phoneCode1)}
                  </Text>
                  <Text className="text-black text-xs">{phoneCode1}</Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                <View className="flex-1">
                  <TextInput
                    placeholder="7XXXXXXXX"
                    placeholderTextColor="#7D7D7D"
                    className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] flex-1 ${
                      error1 || fieldErrors.phoneNumber1
                        ? "border border-red-500"
                        : ""
                    }`}
                    value={phoneNumber1}
                    onChangeText={handlePhoneNumber1Change}
                    keyboardType="phone-pad"
                    underlineColorAndroid="transparent"
                    maxLength={9}
                  />
                </View>
              </View>
              {(error1 || fieldErrors.phoneNumber1) && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.phoneNumber1 || error1}
                </Text>
              )}
            </View>

            {/* Phone Number 2 */}
            {/* Phone Number 2 */}
            <View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="bg-[#F4F4F4] rounded-2xl px-3 h-[50px] w-24 flex-row justify-between items-center"
                  onPress={() => {
                    setCurrentCountryCodeModal("phone2");
                    setPhoneCode2ModalVisible(true);
                  }}
                >
                  <Text className="text-base">
                    {getSelectedFlag(phoneCode2)}
                  </Text>
                  <Text className="text-black text-xs">{phoneCode2}</Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
                <View className="flex-1">
                  <TextInput
                    placeholder="7XXXXXXXX"
                    placeholderTextColor="#7D7D7D"
                    className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] flex-1 ${
                      error2 || fieldErrors.phoneNumber2Duplicate
                        ? "border border-red-500"
                        : ""
                    }`}
                    value={phoneNumber2}
                    onChangeText={handlePhoneNumber2Change}
                    keyboardType="phone-pad"
                    underlineColorAndroid="transparent"
                    maxLength={9}
                  />
                </View>
              </View>
              {error2 && (
                <Text className="text-red-500 text-sm mt-1 ml-2">{error2}</Text>
              )}
              {!error2 && fieldErrors.phoneNumber2Duplicate && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.phoneNumber2Duplicate}
                </Text>
              )}
            </View>

            {/* NIC */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.NIC")}
                placeholderTextColor="#7D7D7D"
                value={formData.nicNumber}
                onChangeText={handleNicNumberChange}
                maxLength={12}
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.nicNumber || error3 ? "border border-red-500" : ""
                }`}
                underlineColorAndroid="transparent"
              />
              {(error3 || fieldErrors.nicNumber) && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.nicNumber || error3}
                </Text>
              )}
            </View>

            {/* Email */}
            <View>
              <TextInput
                placeholder={t("AddOfficerBasicDetails.Email")}
                placeholderTextColor="#7D7D7D"
                value={formData.email}
                onChangeText={handleEmailChange}
                className={`bg-[#F4F4F4] rounded-2xl px-4 h-[50px] ${
                  fieldErrors.email || errorEmail ? "border border-red-500" : ""
                }`}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isValidating}
                underlineColorAndroid="transparent"
              />
              {isValidating && (
                <Text className="text-gray-500 text-xs mt-1 ml-2">
                  {t("Validating email...")}
                </Text>
              )}
              {(errorEmail || fieldErrors.email) && (
                <Text className="text-red-500 text-sm mt-1 ml-2">
                  {fieldErrors.email || errorEmail}
                </Text>
              )}
            </View>
          </View>

          {/* ── Buttons ── */}
          <View className="px-4 flex-col w-full gap-4 mt-6">
            <TouchableOpacity
              className="bg-[#D9D9D9] rounded-3xl px-6 h-[50px] w-full justify-center items-center"
              onPress={() => navigation.goBack()}
              style={{
                shadowColor: "#8f8a8a",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text
                className="text-[#686868]"
                style={[
                  i18n.language === "si"
                    ? { fontSize: 13 }
                    : i18n.language === "ta"
                      ? { fontSize: 10 }
                      : { fontSize: 14 },
                ]}
              >
                {t("AddOfficerBasicDetails.Cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-black rounded-3xl px-6 h-[50px] w-full justify-center items-center ${
                isValidating ? "opacity-50" : ""
              }`}
              onPress={handleNext}
              disabled={isValidating}
              style={{
                shadowColor: "#070707",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              {isValidating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  className="text-white"
                  style={[
                    i18n.language === "si"
                      ? { fontSize: 13 }
                      : i18n.language === "ta"
                        ? { fontSize: 10 }
                        : { fontSize: 14 },
                  ]}
                >
                  {t("AddOfficerBasicDetails.Next")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Phone Code 1 Modal */}
      <GlobalSearchModal
        visible={phoneCode1ModalVisible}
        onClose={() => setPhoneCode1ModalVisible(false)}
        title={t("AddOfficerBasicDetails.SelectCountryCode")}
        data={countryItems}
        selectedItems={[phoneCode1]}
        onSelect={(items) => {
          setPhoneCode1(items[0] ?? "+94");
          setPhoneCode1ModalVisible(false);
        }}
        searchPlaceholder={t("AddOfficerBasicDetails.SearchCountry")}
        multiSelect={false}
        renderItem={renderCountryCodeItem}
        searchKeys={["label", "value", "countryName"]}
      />

      {/* Phone Code 2 Modal */}
      <GlobalSearchModal
        visible={phoneCode2ModalVisible}
        onClose={() => setPhoneCode2ModalVisible(false)}
        title={t("AddOfficerBasicDetails.SelectCountryCode")}
        data={countryItems}
        selectedItems={[phoneCode2]}
        onSelect={(items) => {
          const newCode = items[0] ?? "+94";
          setPhoneCode2(newCode);
          setPhoneCode2ModalVisible(false);

          if (phoneNumber2.length > 0 && validatePhoneNumber(phoneNumber2)) {
            if (phoneCode1 === newCode && phoneNumber2 === phoneNumber1) {
              setError2(
                t(
                  "AddOfficerBasicDetails.Phone Number 01 and Phone Number 02 cannot be the same.",
                ),
              );
            } else {
              checkPhone2Exists(phoneNumber2, newCode);
            }
          }
        }}
        searchPlaceholder={t("AddOfficerBasicDetails.SearchCountry")}
        multiSelect={false}
        renderItem={renderCountryCodeItem}
        searchKeys={["label", "value", "countryName"]}
      />
    </KeyboardAvoidingView>
  );
};

export default AddOfficerBasicDetails;
