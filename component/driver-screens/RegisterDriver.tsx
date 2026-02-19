import React, { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useNavigation } from "@react-navigation/native";
import { OfficerBasicDetailsFormData } from "../types";
import { environment } from "@/environment/environment";
import countryCodes from "../collection-manager/countryCodes.json";
import AntDesign from "react-native-vector-icons/AntDesign";
import * as ImagePicker from "expo-image-picker";
import { SelectList } from "react-native-dropdown-select-list";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import DropDownPicker from "react-native-dropdown-picker";
import { useFocusEffect } from "@react-navigation/native";

import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';



type RegisterDriverNavigationProp = StackNavigationProp<
  RootStackParamList,
  "RegisterDriver"
>;

const RegisterDriver: React.FC = () => {
  const navigation = useNavigation<RegisterDriverNavigationProp>();

  const [type, setType] = useState<"Permanent" | "Temporary">("Permanent");
  const [preferredLanguages, setPreferredLanguages] = useState({
    සිංහල: false,
    English: false,
    Tamil: false,
  });
  console.log("Preferred Languages:", preferredLanguages);
  const [jobRole, setJobRole] = useState<string>("Driver");
  const [phoneCode1, setPhoneCode1] = useState<string>("+94");
  const [phoneCode2, setPhoneCode2] = useState<string>("+94");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

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

  const [error1, setError1] = useState("");
  const [error2, setError2] = useState("");
  const [error3, setError3] = useState("");
  const [error4, setError4] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [nicExists, setNicExists] = useState(false);
  const [email, setEmail] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [phone2Exists, setPhone2Exists] = useState(false);

  const toggleLanguage = (language: keyof typeof preferredLanguages) => {
    setPreferredLanguages((prev) => ({
      ...prev,
      [language]: !prev[language],
    }));
  };

  const validateNicNumber = (input: string) => /^[0-9]{9}V$|^[0-9]{12}$/.test(input);
  const validateEmail = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|\.com|\.gov|\.lk)$/i.test(email);
  const validatePhoneNumber = (input: string) => /^[0-9]{9}$/.test(input);

  // Check if NIC already exists in backend
  const checkNicExists = async (nic: string) => {
    if (!validateNicNumber(nic)) return;
    
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem('token'); // Get your auth token
      
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-nic/${nic}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.exists) {
        setNicExists(true);
        setError3(t("Error.This NIC is already registered in the system."));
      } else {
        setNicExists(false);
        setError3("");
      }
    } catch (error: any) { // Type the error as 'any' or create a more specific type
      console.error("Error checking NIC:", error);
      
      // Now you can access properties without TypeScript errors
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }
    } finally {
      setIsValidating(false);
    }
  };


  const checkEmailExists = async (email: string) => {
    if (!validateEmail(email)) {
      setErrorEmail(t("Error.Invalid email address. Please enter a valid email format (e.g. example@domain.com)."));
      setEmail(false);
      return;
    }
    
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem('token');
      console.log("hittting2");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-email/${email}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.exists) {
        setEmail(true);
        setErrorEmail(t("Error.This Email is already registered in the system."));
      } else {
        setEmail(false);
        setErrorEmail("");
      }
    } catch (error: any) {
      console.error("Error checking Email:", error);
      
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }
      // Set a generic error message if the check fails
      setErrorEmail(t("Error.Failed to verify email. Please try again."));
    } finally {
      setIsValidating(false);
    }
  };

  // Check if phone number already exists in backend
  const checkPhoneExists = async (phoneNumber: string) => {
    if (!validatePhoneNumber(phoneNumber)) return;
    
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode1}${phoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.exists) {
        setPhoneExists(true);
        setError1(t("Error.This phone number is already registered in the system."));
      } else {
        setPhoneExists(false);
        setError1("");
      }
    } catch (error) {
      console.error("Error checking phone number:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNicNumberChange = (input: string) => {
    const normalizedInput = input.replace(/[vV]/g, "V");
    setFormData({ ...formData, nicNumber: normalizedInput });

    if (!validateNicNumber(normalizedInput)) {
      setError3(t("Error.NIC Number must be 9 digits followed by 'V' or 12 digits."));
    } else {
      setError3("");
      // Check if NIC exists when it's valid
      checkNicExists(normalizedInput);
    }
  };

  const handleEmailChange = (input: string) => {
    const trimmedInput = input.trim();
    setFormData({ ...formData, email: trimmedInput });
    
    if (!trimmedInput) {
      setErrorEmail(t("Error.Email is required"));
      return;
    }
    
    if (!validateEmail(trimmedInput)) {
      setErrorEmail(t("Error.Invalid email address. Please enter a valid email format (e.g. example@domain.com)."));
      return;
    }
    
    // Only check for duplicates if the email is valid
    checkEmailExists(trimmedInput);
  };

  const handlePhoneNumber1Change = (input: string) => {
    setPhoneNumber1(input);
    if (!validatePhoneNumber(input)) {
      setError1(t("Error.setphoneError1"));
    } else {
      setError1("");
      // Check if phone number exists when it's valid
      checkPhoneExists(input);
    }
  };

  const checkPhone2Exists = async (phoneNumber: string) => {
    if (!validatePhoneNumber(phoneNumber)) return;
    
    try {
      setIsValidating(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode2}${phoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.exists) {
        setPhone2Exists(true);
        setError2(t("Error.This phone number is already registered in the system."));
      } else {
        setPhone2Exists(false);
        setError2("");
      }
    } catch (error) {
      console.error("Error checking phone number 2:", error);
    } finally {
      setIsValidating(false);
    }
  };
  
  // Update the handlePhoneNumber2Change function
  const handlePhoneNumber2Change = (input: string) => {
    setPhoneNumber2(input);
    if (!validatePhoneNumber(input)) {
      setError2(t("Error.setphoneError2"));
    } else {
      setError2("");
      // Check if phone number 2 exists when it's valid
      checkPhone2Exists(input);
    }
  };

  const fetchEmpId = async (role: string) => {
    console.log("Fetching empId for role:", role);
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/generate-empId/${role}`
      );
      if (response.data.status) {
        setFormData((prev) => ({
          ...prev,
          userId: response.data.result.empId,
        }));
      }
      console.log("EmpId:", response.data.result.empId);
    } catch (error) {
      console.error("Error fetching empId:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch empid."));
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log(jobRole);
      if (jobRole) {
        fetchEmpId(jobRole);
      }
    }, [jobRole])
  );

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "You need to grant camera roll permissions to select an image"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
      }
    }
  };

  const handleNext = async () => {
    console.log("joooooobRole", jobRole);
    if (
      !formData.userId ||
      !formData.firstNameEnglish ||
      !formData.lastNameEnglish ||
      !phoneNumber1 ||
      !formData.nicNumber ||
      !formData.email ||
      !formData.firstNameSinhala ||
      !formData.lastNameSinhala ||
      !formData.firstNameTamil ||
      !formData.lastNameTamil ||
      !jobRole ||
      !type ||
      Object.values(preferredLanguages).every((val) => !val)
    ) {
      Alert.alert(t("Error.error"), t("Error.Please fill in all required fields."));
      return;
    }
    
    if(error1) {
      Alert.alert(t("Error.error"), t("Error.Phone Number 1 already exists"));
      return;
    } else if(phoneNumber2 && error2) {
      Alert.alert(t("Error.error"), t("Error.Phone Number 2 already exists"));
      return;
    } else if(error3) {
      Alert.alert(t("Error.error"), t("Error.NIC Number already exists"));
      return;
    } else if(errorEmail) {
   Alert.alert(t("Error.error"), t("Error.Email already exists"));
      return;
    } 
  

    // Final validation check with backend
    try {
      setIsValidating(true);
    
      
      // Proceed if validation passes
      const updatedFormData = {
        ...formData,
        phoneCode1,
        phoneNumber1,
        phoneCode2,
        phoneNumber2,
      };

      updatedFormData.profileImage = selectedImage || "";

      console.log(
        "Form Data:",
        updatedFormData,
        preferredLanguages,
        type,
        jobRole
      );

      const prefixedUserId =
        jobRole === "Driver" ? `DVR${formData.userId}` : formData.userId;

      navigation.navigate("AddDriverAddressDetails" as any, {
        formData: { ...updatedFormData, userId: prefixedUserId },
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

  const jobRoles = [
    { key: "2", value: "Driver", label: t("Transport.Driver") },
    // Add more roles as necessary
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center bg-white shadow-sm" style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await AsyncStorage.removeItem("officerFormData"); // Clear stored data
                navigation.goBack();
              } catch (error) {
                console.error("Error clearing form data:", error);
              }
            }}
            className=""
          >
            <AntDesign name="left" size={24} color="#000502" />
          </TouchableOpacity>

          <View className="flex-1 justify-center items-center">
            <Text className="text-lg font-bold text-center">
              {t("AddOfficerBasicDetails.AddOfficer")}
            </Text>
          </View>
        </View>

        {/* Profile Avatar */}
        <View className="justify-center items-center my-4 relative">
          {/* Profile Image */}
          <Image
            source={
              selectedImage
                ? { uri: `data:image/png;base64,${selectedImage}` }
                : require("../../assets/images/user1.webp")
            }
            className="w-24 h-24 rounded-full"
          />

          {/* Edit Icon (Pen Icon) */}
          <TouchableOpacity
            onPress={handleImagePick} // Handle the image picking
            className="absolute bottom-0 right-4 bg-[#3980C0] p-1 rounded-full mr-[35%] shadow-md"
            style={{
              elevation: 5, // For shadow effect
            }}
          >
            <Ionicons name="pencil" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Type Selector */}
        <View className="px-8 flex-row items-center mb-4 ">
          <Text className="font-semibold text-sm mr-4">{t("AddOfficerBasicDetails.Type")}</Text>
          <TouchableOpacity
            className="flex-row items-center mr-6"
            onPress={() => setType("Permanent")}
          >
            <Ionicons
              name={
                type === "Permanent" ? "radio-button-on" : "radio-button-off"
              }
              size={20}
              color="#0021F5"
            />
            <Text className="ml-2 text-gray-700">{t("AddOfficerBasicDetails.Permanent")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setType("Temporary")}
          >
            <Ionicons
              name={
                type === "Temporary" ? "radio-button-on" : "radio-button-off"
              }
              size={20}
              color="#0021F5"
            />
            <Text className="ml-2 text-gray-700">{t("AddOfficerBasicDetails.Temporary")}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderBottomWidth: 1, borderColor: "#ADADAD", marginVertical: 10 }} />

        {/* Preferred Languages */}
        <View className="px-8 mb-4">
          <Text className="font-semibold text-sm mb-2">
          {t("AddOfficerBasicDetails.PreferredLanguages")}
          </Text>
          <View className="flex-row items-center">
            {["සිංහල", "English", "தமிழ்"].map((lang) => (
              <TouchableOpacity
                key={lang}
                className="flex-row items-center mr-6"
                onPress={() =>
                  toggleLanguage(lang as keyof typeof preferredLanguages)
                }
              >
                <Ionicons
                  name={
                    preferredLanguages[lang as keyof typeof preferredLanguages]
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={20}
                  color="#0021F5"
                />
                <Text className="ml-2 text-gray-700">{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ borderBottomWidth: 1, borderColor: "#ADADAD", marginVertical: 10 }} />

        {/* Input Fields */}
        <View className="px-8">
          {/* User ID Field */}
          <View className="flex-row items-center border border-gray-300 rounded-lg mb-4 mt-2 bg-gray-100">
            {/* Prefix (30% width) */}
            <View
              className="bg-gray-300 justify-center items-center"
              style={{
                flex: 3,
                height: 40, // Set the height to match the TextInput field
              }}
            >
              <Text className="text-gray-700 text-center">
                {jobRole === "Driver" ? "DVR" : ""}
              </Text>
            </View>

            {/* User ID (remaining 70% width) */}
            <View style={{ flex: 7 }}>
              <TextInput
                placeholder="--User ID--"
                placeholderTextColor={"#CFCFCF"}
                
                value={formData.userId}
                editable={false} // Make this field read-only
                className="px-3 py-2 text-gray-700 bg-gray-100"
                style={{
                  height: 40, // Ensure the height matches the grey part
                }}
              />
            </View>
          </View>

          <TextInput
            placeholder={t("AddOfficerBasicDetails.FirstNameEnglish")}
            value={formData.firstNameEnglish}
            onChangeText={(text) =>
              setFormData({ ...formData, firstNameEnglish: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          /> 
          <TextInput
            placeholder={t("AddOfficerBasicDetails.LastNameEnglish")}
            value={formData.lastNameEnglish}
            onChangeText={(text) =>
              setFormData({ ...formData, lastNameEnglish: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          <TextInput
            placeholder={t("AddOfficerBasicDetails.FirstNameinSinhala")}
            value={formData.firstNameSinhala}
            onChangeText={(text) =>
              setFormData({ ...formData, firstNameSinhala: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          <TextInput
            placeholder={t("AddOfficerBasicDetails.LastNameSinhala")}
            value={formData.lastNameSinhala}
            onChangeText={(text) =>
              setFormData({ ...formData, lastNameSinhala: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          <TextInput
            placeholder={t("AddOfficerBasicDetails.FirstNameTamil")}
            value={formData.firstNameTamil}
            onChangeText={(text) =>
              setFormData({ ...formData, firstNameTamil: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          <TextInput
            placeholder={t("AddOfficerBasicDetails.LastNameTamil")}
            value={formData.lastNameTamil}
            onChangeText={(text) =>
              setFormData({ ...formData, lastNameTamil: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />

          {/* Phone Number 1 */}
          <View className="mb-4">
            <View className="flex-row gap-2 rounded-lg">
              <View style={{ flex: 3, alignItems: "center" }} className="">
                <SelectList
                  setSelected={(value : any ) => {
                    setPhoneCode1(value);
                    // Reset validation when code changes
                    setPhoneExists(false);
                    if (phoneNumber1 && validatePhoneNumber(phoneNumber1)) {
                      checkPhoneExists(phoneNumber1);
                    }
                  }}
                  data={countryCodes.map((country: { code: any; dial_code: any; }) => ({
                    key: country.code,
                    value: `${country.code} (${country.dial_code})`,
                  }))}
                  boxStyles={{
                    borderColor: "#ccc",
                    borderRadius: 8,
                    width: "100%",
                    height: 40
                  }}
                  dropdownStyles={{ borderColor: "#ccc" }}
                  search={false}
                  defaultOption={{ key: phoneCode1, value: phoneCode1 }}
                />
              </View>
              <View style={{ flex: 7 }} className="border border-gray-300 rounded-lg text-gray-700">
                <TextInput
                  placeholder="7X-XXX-XXXX"
                  keyboardType="phone-pad"
                  value={phoneNumber1}
                  onChangeText={handlePhoneNumber1Change}
                  className="px-3 py-3 text-gray-700"
                  maxLength={9}
                />
              </View>
            </View>
            {error1 ? <Text className="mt-2" style={{ color: "red" }}>{error1}</Text> : null}
          </View>

          {/* Phone Number 2 */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 rounded-lg">
              <View style={{ flex: 3, alignItems: "center" }}>
                <SelectList
                  setSelected={setPhoneCode2}
                  data={countryCodes.map((country: { code: any; dial_code: any; }) => ({
                    key: country.code,
                    value: `${country.code} (${country.dial_code})`,
                  }))}
                  boxStyles={{
                    borderColor: "#ccc",
                    borderRadius: 8,
                    width: "100%",
                    height: 40
                  }}
                  dropdownStyles={{ borderColor: "#ccc" }}
                  search={false}
                  defaultOption={{ key: phoneCode2, value: phoneCode2 }}
                />
              </View>
              <View style={{ flex: 7 }} className="border border-gray-300 rounded-lg text-gray-700">
                <TextInput
                  placeholder="7X-XXX-XXXX"
                  keyboardType="phone-pad"
                  value={phoneNumber2}
                  onChangeText={handlePhoneNumber2Change}
                  className="px-3 py-3 text-gray-700"
                  maxLength={9}
                />
              </View>
            </View>
            {error2 ? <Text className="mt-2" style={{ color: "red" }}>{error2}</Text> : null}
          </View>

          <TextInput
            placeholder={t("AddOfficerBasicDetails.NIC")}
            value={formData.nicNumber}
            onChangeText={handleNicNumberChange}
            maxLength={12}
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          {error3 ? <Text className="mb-3" style={{ color: "red" }}>{error3}</Text> : null}
          <TextInput
            placeholder={t("AddOfficerBasicDetails.Email")}
            value={formData.email}
            onChangeText={handleEmailChange}
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-700"
          />
          {errorEmail ? <Text className="" style={{ color: "red" }}>{errorEmail}</Text> : null}
        </View>

        {/* Buttons */}
        <View className="flex-row justify-center space-x-4 px-4 mt-4 mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-gray-300 px-8 py-3 rounded-full"
          >
            <Text className="text-gray-800 text-center">{t("AddOfficerBasicDetails.Cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            disabled={isValidating}
            className={`${isValidating ? "bg-gray-400" : "bg-[#2AAD7A]"} px-8 py-3 rounded-full`}
          >
            <Text className="text-white text-center">
              {isValidating ? <ActivityIndicator/> : t("AddOfficerBasicDetails.Next")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterDriver;

