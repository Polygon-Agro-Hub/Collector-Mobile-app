import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RadioButton } from "react-native-paper";
import Checkbox from "expo-checkbox";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { OfficerBasicDetailsFormData } from "@/types/types";
import environment from "@/environment/environment";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import i18n from "@/i18n/i18n";
import countryData from "../../../../assets/jsons/countryflag.json";
import bankNames from "../../../../assets/jsons/banks.json";
import provincesData from "../../../../assets/jsons/sri-lanka-provinces.json";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import * as FileSystem from "expo-file-system/legacy";

type DistributionAddOfficerNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DistributionAddOfficer"
>;

type DistributionAddOfficerRouteProp = RouteProp<
  RootStackParamList,
  "DistributionAddOfficer"
>;

interface AddOfficerProp {
  navigation: DistributionAddOfficerNavigationProp;
  route: DistributionAddOfficerRouteProp;
}

interface CountryItem {
  label: string;
  value: string;
  countryName: string;
  flag: string;
  dialCode: string;
}

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

const DistributionAddOfficer: React.FC<AddOfficerProp> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  // Unified step navigation state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Basic Details states
  const [type, setType] = useState<"Permanent" | "Temporary">("Permanent");
  const [preferredLanguages, setPreferredLanguages] = useState({
    Sinhala: false,
    English: false,
    Tamil: false,
  });
  const [jobRole, setJobRole] = useState<string>("Distribution Officer");
  const [phoneCode1, setPhoneCode1] = useState<string>("+94");
  const [phoneCode2, setPhoneCode2] = useState<string>("+94");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
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
  const [currentCountryCodeModal, setCurrentCountryCodeModal] = useState<
    "phone1" | "phone2"
  >("phone1");

  // Step 2: Address Details states
  const [formDataAddress, setFormDataAddress] = useState({
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

  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const [bankName, setBankName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [fieldErrorsAddress, setFieldErrorsAddress] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  // Reset form helper
  const resetForm = () => {
    setFormData({
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
      jobRole: String(route.params?.jobRolle || "Distribution Officer"),
      phoneCode1: "",
      phoneNumber1: "",
      phoneCode2: "",
      phoneNumber2: "",
    });
    setFormDataAddress({
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
    setPhoneCode1("+94");
    setPhoneCode2("+94");
    setPhoneNumber1("");
    setPhoneNumber2("");
    setSelectedImage(null);
    setFieldErrors({});
    setFieldErrorsAddress({});
    setError1("");
    setError2("");
    setError3("");
    setError("");
    setErrorEmail("");
    setType("Permanent");
    setPreferredLanguages({ Sinhala: false, English: false, Tamil: false });
    setStep(1);
  };

  // Helper function to save all state to storage
  const saveToStorage = async (
    currentStep: 1 | 2,
    basicForm: OfficerBasicDetailsFormData,
    addrForm: typeof formDataAddress,
    tVal: "Permanent" | "Temporary",
    langs: typeof preferredLanguages,
    role: string,
    p1: string,
    p2: string,
    pc1: string,
    pc2: string,
    img: string | null
  ) => {
    try {
      const dataToSave = {
        step: currentStep,
        basicDetails: basicForm,
        addressDetails: addrForm,
        type: tVal,
        preferredLanguages: langs,
        jobRole: role,
        phoneNumber1: p1,
        phoneNumber2: p2,
        phoneCode1: pc1,
        phoneCode2: pc2,
        profileImage: img,
      };
      await AsyncStorage.setItem("officerFormData", JSON.stringify(dataToSave));
    } catch (err) {
      console.error("Error saving form data to storage:", err);
    }
  };

  // Load initial settings and stored data
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch selected language
        const lang = await AsyncStorage.getItem("@user_language");
        setSelectedLanguage(lang || "en");

        // Fetch stored form data
        const storedData = await AsyncStorage.getItem("officerFormData");
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.basicDetails) setFormData(parsed.basicDetails);
          if (parsed.addressDetails) {
            setFormDataAddress(parsed.addressDetails);
            if (parsed.addressDetails.bankName) {
              setBankName(parsed.addressDetails.bankName);
            }
            if (parsed.addressDetails.province) {
              const found = (provincesData.provinces as Province[]).find(
                (p) => p.name.en === parsed.addressDetails.province,
              );
              if (found) setDistricts(found.districts);
            }
          }
          if (parsed.type) setType(parsed.type);
          if (parsed.preferredLanguages) setPreferredLanguages(parsed.preferredLanguages);
          if (parsed.jobRole) setJobRole(parsed.jobRole);
          if (parsed.phoneNumber1 !== undefined) setPhoneNumber1(parsed.phoneNumber1);
          if (parsed.phoneNumber2 !== undefined) setPhoneNumber2(parsed.phoneNumber2);
          if (parsed.phoneCode1) setPhoneCode1(parsed.phoneCode1);
          if (parsed.phoneCode2) setPhoneCode2(parsed.phoneCode2);
          if (parsed.profileImage !== undefined) setSelectedImage(parsed.profileImage);
          if (parsed.step) setStep(parsed.step);
        } else {
          // If no stored data, initialize jobRole from route params
          const role = String(route.params?.jobRolle || "Distribution Officer");
          setJobRole(role);
          setFormData((prev) => ({ ...prev, jobRole: role }));
        }
      } catch (err) {
        console.error("Error loading stored data:", err);
      }
    };
    init();
  }, []);

  // Fetch empId when jobRole is set/changed and no userId exists
  const fetchEmpId = async (role: string) => {
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/generate-empId/${role}`,
      );
      if (response.data.status) {
        setFormData((prev) => {
          const updated = { ...prev, userId: response.data.result.empId };
          saveToStorage(
            step,
            updated,
            formDataAddress,
            type,
            preferredLanguages,
            role,
            phoneNumber1,
            phoneNumber2,
            phoneCode1,
            phoneCode2,
            selectedImage
          );
          return updated;
        });
      }
    } catch (err) {
      console.error("Error fetching empId:", err);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch empid."));
    }
  };

  useEffect(() => {
    if (jobRole && !formData.userId) {
      fetchEmpId(jobRole);
    }
  }, [jobRole, formData.userId]);

  // Country Data Initializer
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

  // Scroll to top when view is focused or step changes
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [step]),
  );

  // Clear form data when screen is unfocused (navigated away)
  useFocusEffect(
    useCallback(() => {
      return () => {
        (async () => {
          try {
            await AsyncStorage.removeItem("officerFormData");
            resetForm();
          } catch (err) {
            console.error("Error clearing form data on unfocus:", err);
          }
        })();
      };
    }, [])
  );

  // Back Press Handler (hardware)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (step === 2) {
          setStep(1);
          saveToStorage(
            1,
            formData,
            formDataAddress,
            type,
            preferredLanguages,
            jobRole,
            phoneNumber1,
            phoneNumber2,
            phoneCode1,
            phoneCode2,
            selectedImage
          );
          return true;
        } else {
          (async () => {
            try {
              await AsyncStorage.removeItem("officerFormData");
              resetForm();
              navigation.navigate("Main", { screen: "DistributionOfficersList" });
            } catch (err) {
              console.error("Error clearing form data:", err);
            }
          })();
          return true;
        }
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [step, formData, formDataAddress, type, preferredLanguages, jobRole, phoneNumber1, phoneNumber2, phoneCode1, phoneCode2, selectedImage, navigation]),
  );

  // ─────────── Step 1 Logic ───────────

  const toggleLanguage = (language: keyof typeof preferredLanguages) => {
    clearFieldError("preferredLanguages");
    setPreferredLanguages((prev) => {
      const updated = { ...prev, [language]: !prev[language] };
      saveToStorage(
        step,
        formData,
        formDataAddress,
        type,
        updated,
        jobRole,
        phoneNumber1,
        phoneNumber2,
        phoneCode1,
        phoneCode2,
        selectedImage
      );
      return updated;
    });
  };

  const handleTypeChange = (newType: "Permanent" | "Temporary") => {
    setType(newType);
    saveToStorage(
      step,
      formData,
      formDataAddress,
      newType,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
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
    const updatedForm = { ...formData, nicNumber: normalizedInput };
    setFormData(updatedForm);
    saveToStorage(
      step,
      updatedForm,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );

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
      const token = store.getState().auth.token;
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-nic/${nic}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists) {
        setError3(t("Error.This NIC is already registered in the system."));
      } else {
        setError3("");
      }
    } catch (err: any) {
      console.error("Error checking NIC:", err);
    } finally {
      setIsValidating(false);
    }
  };

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
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      saveToStorage(
        step,
        formData,
        formDataAddress,
        type,
        preferredLanguages,
        jobRole,
        phoneNumber1,
        phoneNumber2,
        phoneCode1,
        phoneCode2,
        uri
      );
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
        const token = store.getState().auth.token;

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
        const token = store.getState().auth.token;

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
      setFormData(updatedFormData);

      await saveToStorage(
        2,
        updatedFormData,
        formDataAddress,
        type,
        preferredLanguages,
        jobRole,
        phoneNumber1,
        phoneNumber2,
        phoneCode1,
        phoneCode2,
        selectedImage
      );

      setStep(2);
    } catch (err) {
      console.error("Error validating user data:", err);
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

    const updatedForm = { ...formData, [fieldName]: capitalizedText };
    setFormData(updatedForm);
    saveToStorage(
      step,
      updatedForm,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const handleSinhalaNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);

    let filteredText = text.replace(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
      "",
    );
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();
    
    const updatedForm = { ...formData, [fieldName]: filteredText };
    setFormData(updatedForm);
    saveToStorage(
      step,
      updatedForm,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const handleTamilNameChange = (text: string, fieldName: string) => {
    clearFieldError(fieldName);

    let filteredText = text.replace(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g,
      "",
    );
    if (filteredText.startsWith(" ")) filteredText = filteredText.trimStart();

    const updatedForm = { ...formData, [fieldName]: filteredText };
    setFormData(updatedForm);
    saveToStorage(
      step,
      updatedForm,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const validatePhoneNumber = (input: string) => /^7[0-9]{8}$/.test(input);

  const handlePhoneNumber1Change = (input: string) => {
    clearFieldError("phoneNumber1");
    let numbersOnly = input.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setPhoneNumber1(numbersOnly);
    saveToStorage(
      step,
      formData,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      numbersOnly,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );

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
      const token = store.getState().auth.token;
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
    } catch (err) {
      console.error("Error checking phone number:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePhoneNumber2Change = (input: string) => {
    let numbersOnly = input.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setPhoneNumber2(numbersOnly);
    saveToStorage(
      step,
      formData,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      numbersOnly,
      phoneCode1,
      phoneCode2,
      selectedImage
    );

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
      const token = store.getState().auth.token;
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
    } catch (err) {
      console.error("Error checking phone number 2:", err);
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
    const updatedForm = { ...formData, email: trimmedInput };
    setFormData(updatedForm);
    saveToStorage(
      step,
      updatedForm,
      formDataAddress,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );

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
      const token = store.getState().auth.token;
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
    } catch (err: any) {
      console.error("Error checking Email:", err);
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
        saveToStorage(
          step,
          formData,
          formDataAddress,
          type,
          preferredLanguages,
          jobRole,
          phoneNumber1,
          phoneNumber2,
          selectedCode,
          phoneCode2,
          selectedImage
        );
      } else {
        setPhoneCode2(selectedCode);
        setPhoneCode2ModalVisible(false);
        saveToStorage(
          step,
          formData,
          formDataAddress,
          type,
          preferredLanguages,
          jobRole,
          phoneNumber1,
          phoneNumber2,
          phoneCode1,
          selectedCode,
          selectedImage
        );
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

  // ─────────── Step 2 Logic ───────────

  const clearFieldErrorAddress = (fieldName: string) => {
    setFieldErrorsAddress((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleAddressInputChange = (key: string, value: string) => {
    clearFieldErrorAddress(key);
    const updatedForm = { ...formDataAddress, [key]: value };
    setFormDataAddress(updatedForm);
    saveToStorage(
      step,
      formData,
      updatedForm,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const handleAddressValidation = (key: string, value: string) => {
    const numbersOnly = value.replace(/[^0-9]/g, "");
    clearFieldErrorAddress(key);

    const updatedFormData = { ...formDataAddress, [key]: numbersOnly };
    setFormDataAddress(updatedFormData);

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

    saveToStorage(
      step,
      formData,
      updatedFormData,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
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

    clearFieldErrorAddress("province");
    clearFieldErrorAddress("district");

    const selectedProvince = (provincesData.provinces as Province[]).find(
      (p) => p.name.en === provinceName,
    );

    if (selectedProvince) {
      setDistricts(selectedProvince.districts);
      const updatedData = {
        ...formDataAddress,
        province: selectedProvince.name.en,
        district: "",
      };
      setFormDataAddress(updatedData);
      saveToStorage(
        step,
        formData,
        updatedData,
        type,
        preferredLanguages,
        jobRole,
        phoneNumber1,
        phoneNumber2,
        phoneCode1,
        phoneCode2,
        selectedImage
      );
    }
  };

  const handleDistrictSelect = (items: string[]) => {
    const districtName = items[0];
    if (!districtName) return;

    clearFieldErrorAddress("district");
    const updatedData = { ...formDataAddress, district: districtName };
    setFormDataAddress(updatedData);
    saveToStorage(
      step,
      formData,
      updatedData,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  // Branch JSON filtering
  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../../../../assets/jsons/branches.json");
          const rawBranches = data[selectedBank.ID] || [];
          const uniqueBranches = rawBranches.filter(
            (branch: any, index: number, self: any[]) =>
              index === self.findIndex((b) => b.name === branch.name),
          );
          setFilteredBranches(
            uniqueBranches.sort((a: { name: string }, b: { name: string }) =>
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

    clearFieldErrorAddress("bankName");
    clearFieldErrorAddress("branchName");
    setBankName(selected);

    const updatedData = { ...formDataAddress, bankName: selected, branchName: "" };
    setFormDataAddress(updatedData);
    saveToStorage(
      step,
      formData,
      updatedData,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const handleBranchSelect = (items: string[]) => {
    const selected = items[0];
    if (!selected) return;

    clearFieldErrorAddress("branchName");
    const updatedData = { ...formDataAddress, branchName: selected };
    setFormDataAddress(updatedData);
    saveToStorage(
      step,
      formData,
      updatedData,
      type,
      preferredLanguages,
      jobRole,
      phoneNumber1,
      phoneNumber2,
      phoneCode1,
      phoneCode2,
      selectedImage
    );
  };

  const validateAddressFields = () => {
    const errors: Record<string, string> = {};

    if (!formDataAddress.houseNumber.trim())
      errors.houseNumber = t("Error.House number is required");
    if (!formDataAddress.streetName.trim())
      errors.streetName = t("Error.Street name is required");
    if (!formDataAddress.city.trim()) errors.city = t("Error.City is required");
    if (!formDataAddress.province) errors.province = t("Error.Province is required");
    if (!formDataAddress.district) errors.district = t("Error.District is required");
    if (!formDataAddress.accountHolderName.trim())
      errors.accountHolderName = t("Error.Account holder name is required");
    if (!formDataAddress.accountNumber.trim())
      errors.accountNumber = t("Error.Account number is required");
    if (!formDataAddress.confirmAccountNumber.trim()) {
      errors.confirmAccountNumber = t(
        "Error.Confirm account number is required",
      );
    } else if (formDataAddress.accountNumber !== formDataAddress.confirmAccountNumber) {
      errors.confirmAccountNumber = t("Error.Account numbers do not match.");
    }
    if (!formDataAddress.bankName) errors.bankName = t("Error.Bank name is required");
    if (!formDataAddress.branchName)
      errors.branchName = t("Error.Branch name is required");

    setFieldErrorsAddress(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAddressFields()) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      setLoading(true);
      const token = store.getState().auth.token;

      let profileImageBase64 = "";
      const imageUri = formData.profileImage;
      if (imageUri) {
        const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        profileImageBase64 = `data:image/${ext};base64,${base64}`;
      }

      const combinedData = {
        ...formData,
        ...formDataAddress,
        jobRole,
        empType: type,
        languages: Object.keys(preferredLanguages)
          .filter(
            (lang) =>
              preferredLanguages[lang as keyof typeof preferredLanguages],
          )
          .join(", "),
        profileImage: profileImageBase64,
      };

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
        resetForm();
        if (jobRole === "Collection Officer") {
          navigation.navigate("Main", { screen: "CollectionOfficersList" });
        } else if (jobRole === "Distribution Officer") {
          navigation.navigate("Main", { screen: "DistributionOfficersList" });
        }
      }
    } catch (err) {
      console.error("Error submitting officer data:", err);
      setLoading(false);
      if (axios.isAxiosError(err) && err.response?.status === 400) {
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

  const provinceModalData = (provincesData.provinces as Province[])
    .map((p) => ({
      label: p.name[selectedLanguage as keyof typeof p.name] || p.name.en,
      value: p.name.en,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const districtModalData = districts
    .map((d) => ({
      label: (d[selectedLanguage as keyof typeof d] as string) || d.en,
      value: d.en,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

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
      } bg-[#F4F4F4] rounded-full px-4 h-[50px] flex-row items-center justify-between ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text
        className={value ? "text-gray-700" : "text-gray-400"}
        style={{ fontSize: 14 }}
      >
        {value || placeholder}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <CustomHeader
        title={
          step === 1
            ? t("AddOfficerBasicDetails.AddOfficer")
            : t("AddOfficerAddressDetails.AddOfficer")
        }
        showBackButton={true}
        navigation={navigation}
        onBackPress={async () => {
          if (step === 2) {
            setStep(1);
            saveToStorage(
              1,
              formData,
              formDataAddress,
              type,
              preferredLanguages,
              jobRole,
              phoneNumber1,
              phoneNumber2,
              phoneCode1,
              phoneCode2,
              selectedImage
            );
          } else {
            try {
              await AsyncStorage.removeItem("officerFormData");
              resetForm();
              navigation.navigate("Main", { screen: "DistributionOfficersList" });
            } catch (err) {
              console.error("Error clearing form data:", err);
            }
          }
        }}
      />

      {step === 1 ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="w-full max-w-[500px] mx-auto"
        >
          {/* Step 1: Basic Details View */}
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

          <View className="p-2">
            <View className="px-2 mt-6 items-center">
              <View className="flex flex-row items-center gap-2 justify-between">
                <Text className="text-base font-medium">
                  {t("AddOfficerBasicDetails.Type")}
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => handleTypeChange("Permanent")}
                >
                  <RadioButton
                    value="Permanent"
                    status={type === "Permanent" ? "checked" : "unchecked"}
                    onPress={() => handleTypeChange("Permanent")}
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
                  onPress={() => handleTypeChange("Temporary")}
                >
                  <RadioButton
                    value="Temporary"
                    status={type === "Temporary" ? "checked" : "unchecked"}
                    onPress={() => handleTypeChange("Temporary")}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.firstNameEnglish}
                  onChangeText={(text) =>
                    handleEnglishNameChange(text, "firstNameEnglish")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.firstNameEnglish ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.lastNameEnglish}
                  onChangeText={(text) =>
                    handleEnglishNameChange(text, "lastNameEnglish")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.lastNameEnglish ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.firstNameSinhala}
                  onChangeText={(text) =>
                    handleSinhalaNameChange(text, "firstNameSinhala")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.firstNameSinhala ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.lastNameSinhala}
                  onChangeText={(text) =>
                    handleSinhalaNameChange(text, "lastNameSinhala")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.lastNameSinhala ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.firstNameTamil}
                  onChangeText={(text) =>
                    handleTamilNameChange(text, "firstNameTamil")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.firstNameTamil ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.lastNameTamil}
                  onChangeText={(text) =>
                    handleTamilNameChange(text, "lastNameTamil")
                  }
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.lastNameTamil ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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

            {/* Divider */}
            <View className="border border-[#ADADAD] border-b-0 mt-4" />

            {/* Phone & Contact Fields */}
            <View className="px-4 mt-4 gap-4">
              {/* Phone Number 1 */}
              <View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="bg-[#F4F4F4] rounded-full px-3 h-[50px] w-24 flex-row justify-between items-center"
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
                      name="keyboard-arrow-down"
                      size={18}
                      color="#666"
                    />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <TextInput
                      placeholder="7XXXXXXXX"
                      placeholderTextColor="#ADADAD"
                      className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] flex-1 text-black ${
                        error1 || fieldErrors.phoneNumber1
                          ? "border border-red-500"
                          : ""
                      }`}
                      style={{ fontSize: 14, color: "#000000" }}
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
              <View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="bg-[#F4F4F4] rounded-full px-3 h-[50px] w-24 flex-row justify-between items-center"
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
                      name="keyboard-arrow-down"
                      size={18}
                      color="#666"
                    />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <TextInput
                      placeholder="7XXXXXXXX"
                      placeholderTextColor="#ADADAD"
                      className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] flex-1 text-black ${
                        error2 || fieldErrors.phoneNumber2Duplicate
                          ? "border border-red-500"
                          : ""
                      }`}
                      style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.nicNumber}
                  onChangeText={handleNicNumberChange}
                  maxLength={12}
                  keyboardType="default"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.nicNumber || error3 ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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
                  placeholderTextColor="#ADADAD"
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  className={`bg-[#F4F4F4] rounded-full px-4 h-[50px] text-black ${
                    fieldErrors.email || errorEmail ? "border border-red-500" : ""
                  }`}
                  style={{ fontSize: 14, color: "#000000" }}
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

            {/* Buttons */}
            <View className="px-4 flex-col w-full gap-4 mt-6">
              <TouchableOpacity
                className="bg-[#D9D9D9] rounded-full px-6 h-[50px] w-full justify-center items-center"
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem("officerFormData");
                    navigation.navigate("Main", { screen: "DistributionOfficersList" });
                  } catch (err) {
                    console.error("Error clearing form data:", err);
                  }
                }}
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
                className={`bg-black rounded-full px-6 h-[50px] w-full justify-center items-center ${
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
      ) : (
        <View className="flex-1 bg-white w-full max-w-[500px] mx-auto">
          <ScrollView
            className="flex-1 bg-white"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Step 2: Address Details View */}
            <View className="p-2">
              <View className="px-4 mt-4">
                {/* House Number */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.House")}
                  placeholderTextColor="#ADADAD"
                  value={formDataAddress.houseNumber}
                  onChangeText={(text) =>
                    handleAddressInputChange("houseNumber", text.replace(/^\s+/, ""))
                  }
                  className={`border ${
                    fieldErrorsAddress.houseNumber ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                />
                {fieldErrorsAddress.houseNumber ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.houseNumber}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* Street Name */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.Street Name")}
                  placeholderTextColor="#ADADAD"
                  value={formDataAddress.streetName}
                  onChangeText={(text) =>
                    handleAddressInputChange("streetName", formatText(text))
                  }
                  className={`border ${
                    fieldErrorsAddress.streetName ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                  autoCorrect={false}
                />
                {fieldErrorsAddress.streetName ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.streetName}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* City */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.City")}
                  placeholderTextColor="#ADADAD"
                  value={formDataAddress.city}
                  onChangeText={(text) => handleAddressInputChange("city", formatText(text))}
                  className={`border ${
                    fieldErrorsAddress.city ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                  autoCorrect={false}
                />
                {fieldErrorsAddress.city ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.city}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* Country */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.Country")}
                  placeholderTextColor="#ADADAD"
                  value={t("AddOfficerAddressDetails.Country")}
                  editable={false}
                  className="border-[#F4F4F4] bg-[#F4F4F4] p-3 px-4 rounded-full h-[50px] mb-4 text-black"
                  style={{ fontSize: 14, color: "#000000" }}
                />

                {/* Province */}
                <View className="mb-1">
                  <DropdownButton
                    placeholder={t("AddOfficerAddressDetails.Select Province")}
                    value={
                      formDataAddress.province
                        ? (() => {
                            const p = (provincesData.provinces as Province[]).find(
                              (pr) => pr.name.en === formDataAddress.province,
                            );
                            return p
                              ? p.name[selectedLanguage as keyof typeof p.name] ||
                                  p.name.en
                              : formDataAddress.province;
                          })()
                        : ""
                    }
                    hasError={!!fieldErrorsAddress.province}
                    onPress={() => setActiveModal("province")}
                  />
                </View>
                {fieldErrorsAddress.province ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.province}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* District */}
                {formDataAddress.province && (
                  <>
                    <View className="mb-1">
                      <DropdownButton
                        placeholder={t("AddOfficerAddressDetails.Select District")}
                        value={
                          formDataAddress.district
                            ? (() => {
                                const d = districts.find(
                                  (dis) => dis.en === formDataAddress.district,
                                );
                                return d
                                  ? (d[
                                      selectedLanguage as keyof typeof d
                                    ] as string) || d.en
                                  : formDataAddress.district;
                              })()
                            : ""
                        }
                        hasError={!!fieldErrorsAddress.district}
                        onPress={() => setActiveModal("district")}
                      />
                    </View>
                    {fieldErrorsAddress.district ? (
                      <Text className="text-red-500 text-sm mb-3 ml-3">
                        {fieldErrorsAddress.district}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}
                  </>
                )}
              </View>

              <View className="h-0.5 bg-[#ADADAD] my-4" />

              {/* Bank Details */}
              <View className="px-4 mt-4">
                {/* Account Holder Name */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.AccountName")}
                  placeholderTextColor="#ADADAD"
                  value={formDataAddress.accountHolderName}
                  onChangeText={(text) => {
                    let filtered = text.replace(/[^a-zA-Z\s]/g, "").trimStart();
                    const capitalized = filtered
                      .toLowerCase()
                      .split(" ")
                      .map((w) =>
                        w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w
                      )
                      .join(" ");
                    handleAddressInputChange("accountHolderName", capitalized);
                  }}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                  className={`border ${
                    fieldErrorsAddress.accountHolderName
                      ? "border-red-500"
                      : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                />
                {fieldErrorsAddress.accountHolderName ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.accountHolderName}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* Account Number */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.AccountNum")}
                  placeholderTextColor="#ADADAD"
                  keyboardType="numeric"
                  value={formDataAddress.accountNumber}
                  onChangeText={(text) => handleAddressValidation("accountNumber", text)}
                  className={`border ${
                    fieldErrorsAddress.accountNumber ? "border-red-500" : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                />
                {fieldErrorsAddress.accountNumber ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.accountNumber}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* Confirm Account Number */}
                <TextInput
                  placeholder={t("AddOfficerAddressDetails.Confirm AccountNum")}
                  placeholderTextColor="#ADADAD"
                  keyboardType="numeric"
                  value={formDataAddress.confirmAccountNumber}
                  onChangeText={(text) =>
                    handleAddressValidation("confirmAccountNumber", text)
                  }
                  className={`border ${
                    error || fieldErrorsAddress.confirmAccountNumber
                      ? "border-red-500"
                      : "border-[#F4F4F4] bg-[#F4F4F4]"
                  } p-3 rounded-full px-4 h-[50px] mb-1 text-black`}
                  style={{ fontSize: 14, color: "#000000" }}
                />
                {error || fieldErrorsAddress.confirmAccountNumber ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.confirmAccountNumber || error}
                  </Text>
                ) : (
                  <View className="mb-3" />
                )}

                {/* Bank Name */}
                <View className="mb-1">
                  <DropdownButton
                    placeholder={t("AddOfficerAddressDetails.BankName")}
                    value={formDataAddress.bankName}
                    hasError={!!fieldErrorsAddress.bankName}
                    onPress={() => setActiveModal("bank")}
                  />
                </View>
                {fieldErrorsAddress.bankName ? (
                  <Text className="text-red-500 text-sm mb-3 ml-3">
                    {fieldErrorsAddress.bankName}
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
                        value={formDataAddress.branchName}
                        hasError={!!fieldErrorsAddress.branchName}
                        onPress={() => setActiveModal("branch")}
                      />
                    </View>
                    {fieldErrorsAddress.branchName ? (
                      <Text className="text-red-500 text-sm mt-1 ml-3 mb-3">
                        {fieldErrorsAddress.branchName}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}
                  </>
                )}
              </View>

              {/* Buttons */}
              <View className="px-4 flex-col w-full gap-4 mt-5 mb-4">
                <TouchableOpacity
                  className="bg-[#D9D9D9] rounded-full px-6 h-[50px] w-full justify-center items-center"
                  onPress={async () => {
                    setStep(1);
                    await saveToStorage(
                      1,
                      formData,
                      formDataAddress,
                      type,
                      preferredLanguages,
                      jobRole,
                      phoneNumber1,
                      phoneNumber2,
                      phoneCode1,
                      phoneCode2,
                      selectedImage
                    );
                  }}
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
                    {t("AddOfficerAddressDetails.Go")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`bg-black rounded-full px-6 mb-20 h-[50px] justify-center w-full items-center ${
                    loading ? "opacity-50" : ""
                  }`}
                  onPress={handleSubmit}
                  disabled={loading}
                  style={{
                    shadowColor: "#070707",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
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
                      {t("AddOfficerBasicDetails.Submit")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Modals */}
      
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
          saveToStorage(
            step,
            formData,
            formDataAddress,
            type,
            preferredLanguages,
            jobRole,
            phoneNumber1,
            phoneNumber2,
            items[0] ?? "+94",
            phoneCode2,
            selectedImage
          );
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
          saveToStorage(
            step,
            formData,
            formDataAddress,
            type,
            preferredLanguages,
            jobRole,
            phoneNumber1,
            phoneNumber2,
            phoneCode1,
            newCode,
            selectedImage
          );

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

      {/* Province Modal */}
      <GlobalSearchModal
        visible={activeModal === "province"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.Select Province")}
        data={provinceModalData}
        selectedItems={formDataAddress.province ? [formDataAddress.province] : []}
        onSelect={(items) => {
          handleProvinceSelect(items);
          setActiveModal(null);
        }}
        searchPlaceholder={t("AddOfficerAddressDetails.Select Province")}
        multiSelect={false}
      />

      {/* District Modal */}
      <GlobalSearchModal
        visible={activeModal === "district"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.Select District")}
        data={districtModalData}
        selectedItems={formDataAddress.district ? [formDataAddress.district] : []}
        onSelect={(items) => {
          handleDistrictSelect(items);
          setActiveModal(null);
        }}
        searchPlaceholder={t("AddOfficerAddressDetails.Select District")}
        multiSelect={false}
      />

      {/* Bank Modal */}
      <GlobalSearchModal
        visible={activeModal === "bank"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.BankName")}
        data={bankModalData}
        selectedItems={formDataAddress.bankName ? [formDataAddress.bankName] : []}
        onSelect={(items) => {
          handleBankSelect(items);
          setActiveModal(null);
        }}
        searchPlaceholder={t("AddOfficerAddressDetails.BankName")}
        multiSelect={false}
      />

      {/* Branch Modal */}
      <GlobalSearchModal
        visible={activeModal === "branch"}
        onClose={() => setActiveModal(null)}
        title={t("AddOfficerAddressDetails.BranchName")}
        data={branchModalData}
        selectedItems={formDataAddress.branchName ? [formDataAddress.branchName] : []}
        onSelect={(items) => {
          handleBranchSelect(items);
          setActiveModal(null);
        }}
        searchPlaceholder={t("AddOfficerAddressDetails.BranchName")}
        multiSelect={false}
      />
    </KeyboardAvoidingView>
  );
};

export default DistributionAddOfficer;
