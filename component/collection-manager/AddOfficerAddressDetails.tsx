import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import bankNames from "../../assets/jsons/banks.json";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import i18n from "@/i18n/i18n";
import CustomHeader from "../common/CustomHeader;
import GlobalSearchModal from "../common/GlobalSearchModal;
import provincesData from "../../assets/jsons/sri-lanka-provinces.json";
import { Entypo } from "@expo/vector-icons";

type AddOfficerAddressDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddOfficerAddressDetails"
>;

type City = {
  en: string;
  si: string;
  ta: string;
};

type District = {
  en: string;
  si: string;
  ta: string;
  cities: City[];
};

type Province = {
  name: { en: string; si: string; ta: string };
  districts: District[];
};

type ModalKey = "province" | "district" | "bank" | "branch" | null;

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
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  useEffect(() => {
    const fetchSelectedLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language");
        setSelectedLanguage(lang || "en");
      } catch (error) {
        console.error("Error fetching language preference:", error);
      }
    };
    fetchSelectedLanguage();
  }, []);

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedData = await AsyncStorage.getItem("officerFormData");
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setFormData(parsed);
          if (parsed.bankName) setBankName(parsed.bankName);
          if (parsed.province) {
            const found = (provincesData.provinces as Province[]).find(
              (p) => p.name.en === parsed.province,
            );
            if (found) setDistricts(found.districts);
          }
        }
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };
    loadStoredData();
  }, []);

  const saveDataToStorage = async (updatedData: any) => {
    try {
      await AsyncStorage.setItem(
        "officerFormData",
        JSON.stringify(updatedData),
      );
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleInputChange = (key: string, value: string) => {
    clearFieldError(key);
    setFormData((prevData) => {
      const updatedData = { ...prevData, [key]: value };
      saveDataToStorage(updatedData);
      return updatedData;
    });
  };

  const handleValidation = (key: string, value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, "");
    clearFieldError(key);

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

  const formatText = (text: string) => {
    let formattedText = text.replace(/^\s+/, "");
    if (formattedText.length > 0) {
      formattedText =
        formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
    }
    return formattedText;
  };

  const handleProvinceSelect = (items: string[]) => {
    const provinceName = items[0];
    if (!provinceName) return;

    clearFieldError("province");
    clearFieldError("district");

    const selectedProvince = (provincesData.provinces as Province[]).find(
      (p) => p.name.en === provinceName,
    );

    if (selectedProvince) {
      setDistricts(selectedProvince.districts);
      const updatedData = {
        ...formData,
        province: selectedProvince.name.en,
        district: "",
      };
      setFormData(updatedData);
      saveDataToStorage(updatedData);
    }
  };

  const handleDistrictSelect = (items: string[]) => {
    const districtName = items[0];
    if (!districtName) return;

    clearFieldError("district");
    const updatedData = { ...formData, district: districtName };
    setFormData(updatedData);
    saveDataToStorage(updatedData);
  };

  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../../assets/jsons/branches.json");
          const branches = data[selectedBank.ID] || [];
          setFilteredBranches(
            branches.sort((a: { name: string }, b: { name: string }) =>
              a.name.localeCompare(b.name),
            ),
          );
        } catch (err) {
          console.error("Error loading branches", err);
          setFilteredBranches([]);
        }
      } else {
        setFilteredBranches([]);
      }
    } else {
      setFilteredBranches([]);
    }
  }, [bankName]);

  const handleBankSelect = (items: string[]) => {
    const selected = items[0];
    if (!selected) return;

    clearFieldError("bankName");
    clearFieldError("branchName");
    setBankName(selected);

    const updatedData = { ...formData, bankName: selected, branchName: "" };
    setFormData(updatedData);
    saveDataToStorage(updatedData);
  };

  const handleBranchSelect = (items: string[]) => {
    const selected = items[0];
    if (!selected) return;

    clearFieldError("branchName");
    const updatedData = { ...formData, branchName: selected };
    setFormData(updatedData);
    saveDataToStorage(updatedData);
  };

  const validateFields = () => {
    const errors: Record<string, string> = {};

    if (!formData.houseNumber.trim())
      errors.houseNumber = t("Error.House number is required");
    if (!formData.streetName.trim())
      errors.streetName = t("Error.Street name is required");
    if (!formData.city.trim()) errors.city = t("Error.City is required");
    if (!formData.province) errors.province = t("Error.Province is required");
    if (!formData.district) errors.district = t("Error.District is required");
    if (!formData.accountHolderName.trim())
      errors.accountHolderName = t("Error.Account holder name is required");
    if (!formData.accountNumber.trim())
      errors.accountNumber = t("Error.Account number is required");
    if (!formData.confirmAccountNumber.trim()) {
      errors.confirmAccountNumber = t(
        "Error.Confirm account number is required",
      );
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      errors.confirmAccountNumber = t("Error.Account numbers do not match.");
    }
    if (!formData.bankName) errors.bankName = t("Error.Bank name is required");
    if (!formData.branchName)
      errors.branchName = t("Error.Branch name is required");

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;

    const combinedData = {
      ...basicDetails,
      ...formData,
      jobRole,
      empType: type,
      languages: Object.keys(preferredLanguages)
        .filter(
          (lang) => preferredLanguages[lang as keyof typeof preferredLanguages],
        )
        .join(", "),
      profileImage: basicDetails.profileImage || "",
    };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

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
        },
      );

      if (response.status === 201) {
        Alert.alert(
          t("Error.Success"),
          t("Error.Officer created successfully"),
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
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      } else {
        Alert.alert(
          t("Error.error"),
          t("Error.An error occurred while creating the officer."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const provinceModalData = (provincesData.provinces as Province[]).map(
    (p) => ({
      label: p.name[selectedLanguage as keyof typeof p.name] || p.name.en,
      value: p.name.en,
    }),
  );

  const districtModalData = districts.map((d) => ({
    label: (d[selectedLanguage as keyof typeof d] as string) || d.en,
    value: d.en,
  }));

  const bankModalData = bankNames
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((bank) => ({ label: bank.name, value: bank.name }));

  const branchModalData = filteredBranches.map((b) => ({
    label: b.name,
    value: b.name,
  }));

  const DropdownButton = ({
    placeholder,
    value,
    hasError,
    onPress,
    disabled,
  }: {
    placeholder: string;
    value: string;
    hasError: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`border ${
        hasError ? "border-red-500" : "border-[#F4F4F4]"
      } bg-[#F4F4F4] rounded-2xl px-4 h-[46px] flex-row items-center justify-between ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className={value ? "text-gray-700" : "text-gray-400"}>
        {value || placeholder}
      </Text>
      <Entypo name="chevron-small-down" size={20} color="#666" />
    </TouchableOpacity>
  );

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
        <CustomHeader
          title={t("AddOfficerAddressDetails.AddOfficer")}
          showBackButton={true}
          navigation={navigation}
          onBackPress={() => navigation.goBack()}
        />

        {/* ── Address Details ── */}
        <View className="px-8 mt-4">
          {/* House Number */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.House")}
            value={formData.houseNumber}
            onChangeText={(text) => handleInputChange("houseNumber", text)}
            className={`border ${
              fieldErrors.houseNumber ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
          />
          {fieldErrors.houseNumber ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.houseNumber}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Street Name */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.Street Name")}
            value={formData.streetName}
            onChangeText={(text) =>
              handleInputChange("streetName", formatText(text))
            }
            className={`border ${
              fieldErrors.streetName ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
            autoCorrect={false}
          />
          {fieldErrors.streetName ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.streetName}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* City */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.City")}
            value={formData.city}
            onChangeText={(text) => handleInputChange("city", formatText(text))}
            className={`border ${
              fieldErrors.city ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
            autoCorrect={false}
          />
          {fieldErrors.city ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.city}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Country */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.Country")}
            value={t("AddOfficerAddressDetails.Country")}
            editable={false}
            className="border-[#F4F4F4] bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-4 text-gray-700"
          />

          {/* Province */}
          <View className="mb-1">
            <DropdownButton
              placeholder={t("AddOfficerAddressDetails.Select Province")}
              value={
                formData.province
                  ? (() => {
                      const p = (provincesData.provinces as Province[]).find(
                        (pr) => pr.name.en === formData.province,
                      );
                      return p
                        ? p.name[selectedLanguage as keyof typeof p.name] ||
                            p.name.en
                        : formData.province;
                    })()
                  : ""
              }
              hasError={!!fieldErrors.province}
              onPress={() => setActiveModal("province")}
            />
          </View>
          {fieldErrors.province ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.province}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* District */}
          {formData.province && (
            <>
              <View className="mb-1">
                <DropdownButton
                  placeholder={t("AddOfficerAddressDetails.Select District")}
                  value={
                    formData.district
                      ? (() => {
                          const d = districts.find(
                            (dis) => dis.en === formData.district,
                          );
                          return d
                            ? (d[
                                selectedLanguage as keyof typeof d
                              ] as string) || d.en
                            : formData.district;
                        })()
                      : ""
                  }
                  hasError={!!fieldErrors.district}
                  onPress={() => setActiveModal("district")}
                />
              </View>
              {fieldErrors.district ? (
                <Text className="text-red-500 text-sm mb-3 ml-3">
                  {fieldErrors.district}
                </Text>
              ) : (
                <View className="mb-3" />
              )}
            </>
          )}
        </View>

        <View className="h-0.5 bg-[#ADADAD] my-4" />

        {/* ── Bank Details ── */}
        <View className="px-8 mt-4">
          {/* Account Holder Name */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.AccountName")}
            value={formData.accountHolderName}
            onChangeText={(text) => {
              let filtered = text.replace(/[^a-zA-Z\s]/g, "").trimStart();
              const capitalized = filtered
                .toLowerCase()
                .split(" ")
                .map((w) =>
                  w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w,
                )
                .join(" ");
              handleInputChange("accountHolderName", capitalized);
            }}
            keyboardType="default"
            autoCapitalize="words"
            autoCorrect={false}
            className={`border ${
              fieldErrors.accountHolderName
                ? "border-red-500"
                : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
          />
          {fieldErrors.accountHolderName ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.accountHolderName}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Account Number */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.AccountNum")}
            keyboardType="numeric"
            value={formData.accountNumber}
            onChangeText={(text) => handleValidation("accountNumber", text)}
            className={`border ${
              fieldErrors.accountNumber ? "border-red-500" : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
          />
          {fieldErrors.accountNumber ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.accountNumber}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Confirm Account Number */}
          <TextInput
            placeholder={t("AddOfficerAddressDetails.Confirm AccountNum")}
            keyboardType="numeric"
            value={formData.confirmAccountNumber}
            onChangeText={(text) =>
              handleValidation("confirmAccountNumber", text)
            }
            className={`border ${
              error || fieldErrors.confirmAccountNumber
                ? "border-red-500"
                : "border-[#F4F4F4]"
            } bg-[#F4F4F4] rounded-2xl px-3 py-3 mb-1 text-gray-700`}
          />
          {error || fieldErrors.confirmAccountNumber ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.confirmAccountNumber || error}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Bank Name */}
          <View className="mb-1">
            <DropdownButton
              placeholder={t("AddOfficerAddressDetails.BankName")}
              value={formData.bankName}
              hasError={!!fieldErrors.bankName}
              onPress={() => setActiveModal("bank")}
            />
          </View>
          {fieldErrors.bankName ? (
            <Text className="text-red-500 text-sm mb-3 ml-3">
              {fieldErrors.bankName}
            </Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Branch Name */}
          {filteredBranches.length > 0 && (
            <>
              <View className="mb-1">
                <DropdownButton
                  placeholder={t("AddOfficerAddressDetails.BranchName")}
                  value={formData.branchName}
                  hasError={!!fieldErrors.branchName}
                  onPress={() => setActiveModal("branch")}
                />
              </View>
              {fieldErrors.branchName ? (
                <Text className="text-red-500 text-sm mt-1 ml-3">
                  {fieldErrors.branchName}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* ── Buttons ── */}

        <View className="px-8 flex-col w-full gap-4 mt-5 mb-4">
          <TouchableOpacity
            className="bg-[#D9D9D9] rounded-3xl px-6 py-4 w-full items-center"
            onPress={() => navigation.goBack()}
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
              {t("AddOfficerAddressDetails.Go")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`bg-black rounded-3xl px-6 py-4 w-full items-center ${
              loading ? "opacity-50" : ""
            }`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
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
      </ScrollView>

      {/* Province Modal */}
      <GlobalSearchModal
        visible={activeModal === "province"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.Select Province")}
        data={provinceModalData}
        selectedItems={formData.province ? [formData.province] : []}
        onSelect={handleProvinceSelect}
        searchPlaceholder={t("AddOfficerAddressDetails.Select Province")}
        multiSelect={false}
      />

      {/* District Modal */}
      <GlobalSearchModal
        visible={activeModal === "district"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.Select District")}
        data={districtModalData}
        selectedItems={formData.district ? [formData.district] : []}
        onSelect={handleDistrictSelect}
        searchPlaceholder={t("AddOfficerAddressDetails.Select District")}
        multiSelect={false}
      />

      {/* Bank Modal */}
      <GlobalSearchModal
        visible={activeModal === "bank"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.BankName")}
        data={bankModalData}
        selectedItems={formData.bankName ? [formData.bankName] : []}
        onSelect={handleBankSelect}
        searchPlaceholder={t("AddOfficerAddressDetails.BankName")}
        multiSelect={false}
      />

      {/* Branch Modal */}
      <GlobalSearchModal
        visible={activeModal === "branch"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.BranchName")}
        data={branchModalData}
        selectedItems={formData.branchName ? [formData.branchName] : []}
        onSelect={handleBranchSelect}
        searchPlaceholder={t("AddOfficerAddressDetails.BranchName")}
        multiSelect={false}
      />
    </KeyboardAvoidingView>
  );
};

export default AddOfficerAddressDetails;
