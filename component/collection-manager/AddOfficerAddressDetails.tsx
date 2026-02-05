import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AntDesign from "react-native-vector-icons/AntDesign";
import countryCodes from "./countryCodes.json";
import { SelectList } from "react-native-dropdown-select-list";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import bankNames from "../../assets/jsons/banks.json";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import i18n from "@/i18n/i18n";

type AddOfficerAddressDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddOfficerAddressDetails"
>;

type District = {
  en: string;
  si: string;
  ta: string;
};

const AddOfficerAddressDetails: React.FC = () => {
  const navigation = useNavigation<AddOfficerAddressDetailsNavigationProp>();
  const route =
    useRoute<RouteProp<RootStackParamList, "AddOfficerAddressDetails">>();

  const {
    formData: basicDetails,
    type,
    preferredLanguages,
    jobRole,
  } = route.params;
  
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const [bankName, setBankName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    houseNumber: "",
    streetName: "",
    city: "",
    country: "Sri Lanka",
    province: "",
    district: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    bankName: "",
    branchName: "",
    profileImage: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countries, setCountries] = useState<
    { name: string; dial_code: string; code: string }[]
  >([]);

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const saveDataToStorage = async (updatedData: any) => {
    try {
      await AsyncStorage.setItem(
        "officerFormData",
        JSON.stringify(updatedData)
      );
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  };

  // Clear specific field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleInputChange = (key: string, value: string) => {
    clearFieldError(key); // Clear error when user types
    setFormData((prevData) => {
      const updatedData = { ...prevData, [key]: value };
      saveDataToStorage(updatedData);
      return updatedData;
    });
  };

  const handleValidation = (key: string, value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, '');
    clearFieldError(key); // Clear error when user types
    
    setFormData((prevState) => {
      const updatedFormData = { ...prevState, [key]: numbersOnly };
      const { accountNumber, confirmAccountNumber } = updatedFormData;

      if (
        accountNumber &&
        confirmAccountNumber &&
        accountNumber !== confirmAccountNumber
      ) {
        setError(t("Error.Account numbers do not match."));
      } else {
        setError("");
      }

      saveDataToStorage(updatedFormData);
      return updatedFormData;
    });
  };

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedData = await AsyncStorage.getItem("officerFormData");
        if (storedData) {
          setFormData(JSON.parse(storedData));
        }
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };

    loadStoredData();
  }, []);

  useEffect(() => {
    setCountries(countryCodes);
  }, []);

  // Validate all required fields
  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!formData.houseNumber.trim()) {
      errors.houseNumber = t("Error.House number is required");
    }
    if (!formData.streetName.trim()) {
      errors.streetName = t("Error.Street name is required");
    }
    if (!formData.city.trim()) {
      errors.city = t("Error.City is required");
    }
    if (!formData.province) {
      errors.province = t("Error.Province is required");
    }
    if (!formData.district) {
      errors.district = t("Error.District is required");
    }
    if (!formData.accountHolderName.trim()) {
      errors.accountHolderName = t("Error.Account holder name is required");
    }
    if (!formData.accountNumber.trim()) {
      errors.accountNumber = t("Error.Account number is required");
    }
    if (!formData.confirmAccountNumber.trim()) {
      errors.confirmAccountNumber = t("Error.Confirm account number is required");
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      errors.confirmAccountNumber = t("Error.Account numbers do not match.");
    }
    if (!formData.bankName) {
      errors.bankName = t("Error.Bank name is required");
    }
    if (!formData.branchName) {
      errors.branchName = t("Error.Branch name is required");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate all fields
    if (!validateFields()) {
      return;
    }

    const combinedData = {
      ...basicDetails,
      ...formData,
      jobRole,
      empType: type,
      languages: Object.keys(preferredLanguages)
        .filter(
          (lang) => preferredLanguages[lang as keyof typeof preferredLanguages]
        )
        .join(", "),
      profileImage: basicDetails.profileImage || "",
    };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${environment.API_BASE_URL}api/collection-manager/collection-officer/add`,
        combinedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201) {
        Alert.alert(
          t("Error.Success"),
          t("Error.Officer created successfully")
        );
        setLoading(false);
        await AsyncStorage.removeItem("officerFormData");
        if (jobRole === "Collection Officer") {
          navigation.navigate("Main", { screen: "CollectionOfficersList" });
        } else if (jobRole === "Distribution Officer") {
          navigation.navigate("Main", { screen: "DistributionOfficersList" });
        }
      }
    } catch (error) {
      console.error("Error submitting officer data:", error);
      setLoading(false);
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status === 400
      ) {
        Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      } else {
        Alert.alert(
          t("Error.error"),
          t("Error.An error occurred while creating the officer.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const jsonData = {
    provinces: [
      {
        name: { en: "Western", si: "බටහිර", ta: "மேற்கு" },
        districts: [
          { en: "Colombo", si: "කොළඹ", ta: "கொழும்பு" },
          { en: "Gampaha", si: "ගම්පහ", ta: "கம்பஹா" },
          { en: "Kalutara", si: "කළුතර", ta: "களுத்துறை" },
        ],
      },
      {
        name: { en: "Central", si: "මධ්‍යම", ta: "மத்திய" },
        districts: [
          { en: "Kandy", si: "මහනුවර", ta: "கண்டி" },
          { en: "Matale", si: "මාතලේ", ta: "மாதளை" },
          { en: "Nuwara Eliya", si: "නුවරඑළිය", ta: "நுவரேலியா" },
        ],
      },
      {
        name: { en: "Southern", si: "දකුණ", ta: "தெற்கு" },
        districts: [
          { en: "Galle", si: "ගාල්ල", ta: "காலி" },
          { en: "Matara", si: "මාතර", ta: "மாத்தறை" },
          { en: "Hambantota", si: "හම්බන්තොට", ta: "ஹம்பாந்தோட்டை" },
        ],
      },
      {
        name: { en: "Eastern", si: "නැගෙනහිර", ta: "கிழக்கு" },
        districts: [
          { en: "Ampara", si: "අම්පාර", ta: "அம்பாறை" },
          { en: "Batticaloa", si: "මඩකලපුව", ta: "பாட்டிக்கோடை" },
          { en: "Trincomalee", si: "ත්‍රිකුණාමලය", ta: "திருகோணமலை" },
        ],
      },
      {
        name: { en: "Northern", si: " උතුරු", ta: "வடக்கு" },
        districts: [
          { en: "Jaffna", si: "යාපනය", ta: "யாழ்ப்பாணம்" },
          { en: "Kilinochchi", si: "කිලිනොච්චි", ta: "கில்லினோச்சி" },
          { en: "Mullaitivu", si: "මුල්ලිතිවු", ta: "முல்லைத்தீவு" },
        ],
      },
      {
        name: { en: "North Western", si: "උතුරු මැද", ta: "வடமேல்" },
        districts: [
          { en: "Kurunegala", si: "කුරුණෑගල", ta: "குருநாகல்" },
          { en: "Puttalam", si: "පුත්තලම", ta: "புத்தளம்" },
        ],
      },
      {
        name: { en: "North Central", si: "උතුරු මධ්‍යම", ta: "வட மத்திய" },
        districts: [
          { en: "Anuradhapura", si: "අනුරාධපුර", ta: "அனுராதபுரம்" },
          { en: "Polonnaruwa", si: "පොලොන්නරුව", ta: "பொலன்னருவ" },
        ],
      },
      {
        name: { en: "Uva", si: "උව", ta: "உவா" },
        districts: [
          { en: "Badulla", si: "බදුල්ල", ta: "பதுளை" },
          { en: "Moneragala", si: "මොනරාගල", ta: "முனரகலை" },
        ],
      },
      {
        name: { en: "Sabaragamuwa", si: "සබරගමුව", ta: "சபரகமுவ" },
        districts: [
          { en: "Ratnapura", si: "රත්නපුර", ta: "ரத்நாபுர" },
          { en: "Kegalle", si: "කැගල්ල", ta: "கெகலே" },
        ],
      },
    ],
  };

  const [districts, setDistricts] = useState<District[]>([]);

  const handleProvinceChange = (provinceName: string) => {
    clearFieldError('province');
    clearFieldError('district');
    
    const selectedProvince = jsonData.provinces.find(
      (p) => p.name.en === provinceName
    );

    if (selectedProvince) {
      setFormData({
        ...formData,
        province: selectedProvince.name.en,
        district: "",
      });

      if (!selectedLanguage) return;

      setDistricts(
        selectedProvince.districts.map((d) => ({
          en: d.en,
          si: d.si,
          ta: d.ta,
        }))
      );
    }
  };

  const handleDistrictChange = (district: string) => {
    clearFieldError('district');
    setFormData({ ...formData, district });
  };

  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../../assets/jsons/branches.json");
          const filteredBranches = data[selectedBank.ID] || [];

          const sortedBranches = filteredBranches.sort(
            (a: { name: string }, b: { name: any }) =>
              a.name.localeCompare(b.name)
          );

          setFilteredBranches(sortedBranches);
        } catch (error) {
          console.error("Error loading branches", error);
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

  const formatText = (text: string) => {
    let formattedText = text.replace(/^\s+/, '');
    
    if (formattedText.length > 0) {
      formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
    }
    
    return formattedText;
  };

  const handleBankSelection = (selectedBank: string) => {
    clearFieldError('bankName');
    clearFieldError('branchName');
    setBankName(selectedBank);
    setBranchName("");
    setFormData((prevData) => {
      const updatedData = {
        ...prevData,
        bankName: selectedBank,
        branchName: ""
      };
      saveDataToStorage(updatedData);
      return updatedData;
    });
  };

  const handleBranchSelection = (selectedBranch: string) => {
    clearFieldError('branchName');
    setBranchName(selectedBranch);
    setFormData((prevData) => {
      const updatedData = { ...prevData, branchName: selectedBranch };
      saveDataToStorage(updatedData);
      return updatedData;
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-white"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 bg-white shadow-sm">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-[#f3f3f380] rounded-full p-2 justify-center w-10"
          >
            <AntDesign name="left" size={24} color="#000502" />
          </TouchableOpacity>

          <View className="flex-1 justify-center items-center mr-[8%]">
            <Text className="text-lg font-bold">
              {t("AddOfficerAddressDetails.AddOfficer")}
            </Text>
          </View>
        </View>

        {/* Address Details */}
        <View className="px-8 mt-4">
          <TextInput
            placeholder={t("AddOfficerAddressDetails.House")}
            value={formData.houseNumber}
            onChangeText={(text) => handleInputChange("houseNumber", text)}
            className={`border ${
              fieldErrors.houseNumber ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
          />
          {fieldErrors.houseNumber ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.houseNumber}</Text>
          ) : <View className="mb-3" />}

          <TextInput
            placeholder={t("AddOfficerAddressDetails.Street Name")}
            value={formData.streetName}
            onChangeText={(text) => {
              const formattedText = formatText(text);
              handleInputChange("streetName", formattedText);
            }}
            className={`border ${
              fieldErrors.streetName ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
            autoCorrect={false}
          />
          {fieldErrors.streetName ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.streetName}</Text>
          ) : <View className="mb-3" />}

          <TextInput
            placeholder={t("AddOfficerAddressDetails.City")}
            value={formData.city}
            onChangeText={(text) => {
              const formattedText = formatText(text);
              handleInputChange("city", formattedText);
            }}
            className={`border ${
              fieldErrors.city ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
            autoCorrect={false}
          />
          {fieldErrors.city ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.city}</Text>
          ) : <View className="mb-3" />}

          <TextInput
            placeholder={t("AddOfficerAddressDetails.Country")}
            value={t("AddOfficerAddressDetails.Country")}
            editable={false}
            className="border-[#F4F4F4] bg-[#F4F4F4] rounded-full px-3 py-2 mb-4 text-gray-700"
          />

          <View style={{ marginBottom: 1 }}>
            <SelectList
              setSelected={(province: any) => handleProvinceChange(province)}
              data={jsonData.provinces.map((province) => ({
                key: province.name.en,
                value:
                  province.name[
                    selectedLanguage as keyof typeof province.name
                  ] || province.name.en,
              }))}
              boxStyles={{
                borderColor: fieldErrors.province ? "#ef4444" : "#F4F4F4",
                borderRadius: 25,
                width: "100%",
                height: 50,
                backgroundColor: "#F4F4F4",
              }}
              dropdownStyles={{
                borderRadius: 5,
                borderWidth: 1,
                borderColor: "#cccccc",
              }}
              search={true}
              placeholder={t("AddOfficerAddressDetails.Select Province")}
            />
          </View>
          {fieldErrors.province ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.province}</Text>
          ) : <View className="mb-3" />}

          {/* District Dropdown */}
          {formData.province && (
            <>
              <View style={{ marginBottom: 1 }}>
                <SelectList
                  setSelected={handleDistrictChange}
                  data={districts.map((district) => ({
                    key: district.en,
                    value: district[selectedLanguage as keyof typeof district],
                  }))}
                  boxStyles={{
                    borderColor: fieldErrors.district ? "#ef4444" : "#F4F4F4",
                    borderRadius: 25,
                    width: "100%",
                    height: 50,
                    backgroundColor: "#F4F4F4",
                  }}
                  dropdownStyles={{
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: "#cccccc",
                  }}
                  search={true}
                  placeholder={t("AddOfficerAddressDetails.Select District")}
                />
              </View>
              {fieldErrors.district ? (
                <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.district}</Text>
              ) : <View className="mb-3" />}
            </>
          )}
        </View>

        {/* Bank Details */}
        <View className="px-8 mt-4">
          <TextInput
            placeholder={t("AddOfficerAddressDetails.AccountName")}
            value={formData.accountHolderName}
            onChangeText={(text) => {
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

              handleInputChange("accountHolderName", capitalizedText);
            }}
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
            className={`border ${
              fieldErrors.accountHolderName ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
          />
          {fieldErrors.accountHolderName ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.accountHolderName}</Text>
          ) : <View className="mb-3" />}

          <TextInput
            placeholder={t("AddOfficerAddressDetails.AccountNum")}
            keyboardType="numeric"
            value={formData.accountNumber}
            onChangeText={(text) => handleValidation("accountNumber", text)}
            className={`border ${
              fieldErrors.accountNumber ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
          />
          {fieldErrors.accountNumber ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.accountNumber}</Text>
          ) : <View className="mb-3" />}

          <TextInput
            placeholder={t("AddOfficerAddressDetails.Confirm AccountNum")}
            keyboardType="numeric"
            value={formData.confirmAccountNumber}
            onChangeText={(text) => handleValidation("confirmAccountNumber", text)}
            className={`border ${
              error || fieldErrors.confirmAccountNumber ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-full px-3 py-2 mb-1 text-gray-700`}
          />
          {(error || fieldErrors.confirmAccountNumber) ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.confirmAccountNumber || error}
            </Text>
          ) : <View className="mb-3" />}

          <View className="">
            <View className="mb-1">
              <SelectList
                setSelected={handleBankSelection}
                data={bankNames
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((bank) => ({
                    key: bank.name,
                    value: bank.name,
                  }))}
                defaultOption={{
                  key: formData.bankName,
                  value: formData.bankName,
                }}
                placeholder={t("AddOfficerAddressDetails.BankName")}
                boxStyles={{
                  borderColor: fieldErrors.bankName ? "#ef4444" : "#F4F4F4",
                  borderRadius: 25,
                  width: "100%",
                  height: 50,
                  backgroundColor: "#F4F4F4",
                }}
                dropdownStyles={{
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: "#cccccc",
                }}
                search={true}
              />
            </View>
            {fieldErrors.bankName ? (
              <Text className="text-red-500 text-sm mb-3 ml-3">{fieldErrors.bankName}</Text>
            ) : <View className="mb-3" />}

            <View>
              {filteredBranches.length > 0 && (
                <>
                  <SelectList
                    setSelected={handleBranchSelection}
                    data={filteredBranches.map((branch) => ({
                      key: branch.name,
                      value: branch.name,
                    }))}
                    defaultOption={{
                      key: formData.branchName,
                      value: formData.branchName,
                    }}
                    placeholder={t("AddOfficerAddressDetails.BranchName")}
                    boxStyles={{
                      borderColor: fieldErrors.branchName ? "#ef4444" : "#F4F4F4",
                      borderRadius: 25,
                      width: "100%",
                      height: 50,
                      backgroundColor: "#F4F4F4",
                    }}
                    dropdownStyles={{
                      borderRadius: 5,
                      borderWidth: 1,
                      borderColor: "#cccccc",
                    }}
                    search={true}
                  />
                  {fieldErrors.branchName ? (
                    <Text className="text-red-500 text-sm mt-1 ml-3">{fieldErrors.branchName}</Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View className="flex-row justify-center space-x-4 px-4 mt-8 mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-gray-300 px-8 py-3 rounded-full"
          >
            <Text
              className="text-gray-800 text-center"
              style={[
                i18n.language === "si"
                  ? { fontSize: 13 }
                  : i18n.language === "ta"
                  ? { fontSize: 10 }
                  : { fontSize: 14 }
              ]}
            >
              {t("AddOfficerAddressDetails.Go")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            className={`bg-[#000000] px-8 py-3 rounded-full ${
              loading ? "opacity-50" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                className="text-white text-center"
                style={[
                  i18n.language === "si"
                    ? { fontSize: 13 }
                    : i18n.language === "ta"
                    ? { fontSize: 10 }
                    : { fontSize: 14 }
                ]}
              >
                {t("AddOfficerAddressDetails.Submit")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddOfficerAddressDetails;