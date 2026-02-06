import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { environment } from "../../environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../common/CustomHeader";
import { RouteProp, useRoute } from "@react-navigation/native";
import SuccessModal from "../common/SuccessModal";
import FailedModal from "../common/FailedModal";

interface GoviPensionFormProps {
  navigation: any;
  route: RouteProp<{
    GoviPensionForm: {
      farmerNIC: string;
      farmerName: string;
      farmerPhone: string;
      userId: number;
    };
  }>;
}

interface FormData {
  // Section 1: Applicant Details
  fullName: string;
  dateOfBirth: Date | null;
  nicNumber: string;
  nicFrontImage: string | null;
  nicBackImage: string | null;

  // Section 2: Successor Details
  successorFullName: string;
  successorRelationship: string;
  successorDateOfBirth: Date | null;
  successorNicNumber: string;
  successorNicFrontImage: string | null;
  successorNicBackImage: string | null;
  successorBirthCertFrontImage: string | null;
  successorBirthCertBackImage: string | null;
}

const CustomDatePicker = ({
  visible,
  onClose,
  onSelect,
  initialDate,
  maximumDate = new Date(),
  minimumDate,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  maximumDate?: Date;
  minimumDate?: Date;
}) => {
  const currentDate = initialDate || new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const { t } = useTranslation();

  // Generate years array (from 1900 to current year)
  const startYear = minimumDate ? minimumDate.getFullYear() : 1900;
  const endYear = maximumDate.getFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => endYear - i,
  );

  const months = [
    { label: t("GoviPensionForm.January") || "January", value: 0 },
    { label: t("GoviPensionForm.February") || "February", value: 1 },
    { label: t("GoviPensionForm.March") || "March", value: 2 },
    { label: t("GoviPensionForm.April") || "April", value: 3 },
    { label: t("GoviPensionForm.May") || "May", value: 4 },
    { label: t("GoviPensionForm.June") || "June", value: 5 },
    { label: t("GoviPensionForm.July") || "July", value: 6 },
    { label: t("GoviPensionForm.August") || "August", value: 7 },
    { label: t("GoviPensionForm.September") || "September", value: 8 },
    { label: t("GoviPensionForm.October") || "October", value: 9 },
    { label: t("GoviPensionForm.November") || "November", value: 10 },
    { label: t("GoviPensionForm.December") || "December", value: 11 },
  ];

  // Get days in selected month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Adjust day if it exceeds days in selected month
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedYear, selectedMonth]);

  const handleConfirm = () => {
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    onSelect(selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl">
          {/* Header */}
          <View className="px-5 py-4 border-b border-gray-200">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 text-base font-medium">
                {t("GoviPensionForm.Cancel") || "Cancel"}
              </Text>
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>

          {/* Date Pickers */}
          <View className="px-5 py-6">
            {/* Year Picker */}
            <View className="mb-4">
              <Text className="text-[#070707] mb-2 font-medium">
                {t("GoviPensionForm.Year") || "Year"}
              </Text>
              <ScrollView
                className="max-h-32 bg-[#F4F4F4] rounded-2xl"
                showsVerticalScrollIndicator={true}
              >
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    className={`py-3 px-4 ${selectedYear === year ? "bg-[#980775]" : ""}`}
                  >
                    <Text
                      className={`text-center ${selectedYear === year ? "text-white font-semibold" : "text-[#070707]"}`}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Picker */}
            <View className="mb-4">
              <Text className="text-[#070707] mb-2 font-medium">
                {t("GoviPensionForm.Month") || "Month"}
              </Text>
              <ScrollView
                className="max-h-32 bg-[#F4F4F4] rounded-2xl"
                showsVerticalScrollIndicator={true}
              >
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    onPress={() => setSelectedMonth(month.value)}
                    className={`py-3 px-4 ${selectedMonth === month.value ? "bg-[#980775]" : ""}`}
                  >
                    <Text
                      className={`text-center ${selectedMonth === month.value ? "text-white font-semibold" : "text-[#070707]"}`}
                    >
                      {month.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Picker */}
            <View className="mb-4">
              <Text className="text-[#070707] mb-2 font-medium">
                {t("GoviPensionForm.Day") || "Day"}
              </Text>
              <ScrollView
                className="max-h-32 bg-[#F4F4F4] rounded-2xl"
                showsVerticalScrollIndicator={true}
              >
                <View className="flex-row flex-wrap">
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      className={`w-1/7 py-3 px-2 ${selectedDay === day ? "bg-[#980775] rounded-xl" : ""}`}
                      style={{ width: "14.28%" }}
                    >
                      <Text
                        className={`text-center ${selectedDay === day ? "text-white font-semibold" : "text-[#070707]"}`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Preview */}
            <View className="bg-[#F4F4F4] rounded-2xl p-4 mt-2">
              <Text className="text-center text-[#070707] text-base font-medium">
                {t("GoviPensionForm.Selected Date") || "Selected Date"}:{" "}
                {`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
              </Text>
            </View>
            <View className="mt-3">
              <TouchableOpacity
                onPress={handleConfirm}
                className="bg-[#980775] rounded-2xl py-3 px-6"
              >
                <Text className="text-white text-center font-semibold text-base">
                  {t("GoviPensionForm.Save") || "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const GoviPensionForm: React.FC<GoviPensionFormProps> = ({ navigation }) => {
  const [currentSection, setCurrentSection] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get route params
  const route = useRoute<GoviPensionFormProps["route"]>();
  const { farmerNIC, farmerName, farmerPhone, userId } = route.params || {};

  const [formData, setFormData] = useState<FormData>({
    // Section 1
    fullName: "",
    dateOfBirth: null,
    nicNumber: "",
    nicFrontImage: null,
    nicBackImage: null,

    // Section 2
    successorFullName: "",
    successorRelationship: "",
    successorDateOfBirth: null,
    successorNicNumber: "",
    successorNicFrontImage: null,
    successorNicBackImage: null,
    successorBirthCertFrontImage: null,
    successorBirthCertBackImage: null,
  });

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState<string | React.ReactElement>(
    "",
  );

  // Custom date picker states
  const [showCustomDobPicker, setShowCustomDobPicker] = useState(false);
  const [showCustomSuccessorDobPicker, setShowCustomSuccessorDobPicker] =
    useState(false);

  const { t, i18n } = useTranslation();

  // Relationship options
  const relationshipOptions = [
    { label: t("GoviPensionForm.Wife"), value: "Wife" },
    { label: t("GoviPensionForm.Husband"), value: "Husband" },
    { label: t("GoviPensionForm.Son"), value: "Son" },
    { label: t("GoviPensionForm.Daughter"), value: "Daughter" },
  ];

  // Split relationship options into columns
  const leftColumnOptions = relationshipOptions.slice(0, 2);
  const rightColumnOptions = relationshipOptions.slice(2);

  // Initialize form with farmer data from params
  useEffect(() => {
    if (farmerNIC) {
      setFormData((prev) => ({
        ...prev,
        nicNumber: farmerNIC,
        fullName: farmerName || "",
      }));
    }
    setIsLoading(false);
  }, [farmerNIC, farmerName]);

  // Calculate age from date
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Check if successor is 18 or older
  const isSuccessorOver18 = (): boolean => {
    if (!formData.successorDateOfBirth) return false;
    return calculateAge(formData.successorDateOfBirth) >= 18;
  };

  // NIC validation function
  const validateNIC = (nic: string): boolean => {
    const cleanNIC = nic.trim();
    const oldNICPattern = /^[0-9]{9}[Vv]$/;
    const newNICPattern = /^[0-9]{12}$/;
    return oldNICPattern.test(cleanNIC) || newNICPattern.test(cleanNIC);
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Format date for API (MySQL timestamp format)
  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return "";
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  // Request permission and pick image from gallery
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to upload images!",
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async (
    imageType:
      | "nicFront"
      | "nicBack"
      | "successorNicFront"
      | "successorNicBack"
      | "successorBirthCertFront"
      | "successorBirthCertBack",
  ) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        switch (imageType) {
          case "nicFront":
            setFormData((prev) => ({
              ...prev,
              nicFrontImage: result.assets[0].uri,
            }));
            break;
          case "nicBack":
            setFormData((prev) => ({
              ...prev,
              nicBackImage: result.assets[0].uri,
            }));
            break;
          case "successorNicFront":
            setFormData((prev) => ({
              ...prev,
              successorNicFrontImage: result.assets[0].uri,
            }));
            break;
          case "successorNicBack":
            setFormData((prev) => ({
              ...prev,
              successorNicBackImage: result.assets[0].uri,
            }));
            break;
          case "successorBirthCertFront":
            setFormData((prev) => ({
              ...prev,
              successorBirthCertFrontImage: result.assets[0].uri,
            }));
            break;
          case "successorBirthCertBack":
            setFormData((prev) => ({
              ...prev,
              successorBirthCertBackImage: result.assets[0].uri,
            }));
            break;
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      console.error("Image picker error:", error);
    }
  };

  // Validation functions
  const isSection1Valid = () => {
    return (
      formData.fullName.trim() &&
      formData.dateOfBirth &&
      formData.nicNumber.trim() &&
      validateNIC(formData.nicNumber) &&
      formData.nicFrontImage &&
      formData.nicBackImage
    );
  };

  const isSection2Valid = () => {
    const isOver18 = isSuccessorOver18();

    // Check basic fields
    const basicFieldsValid =
      formData.successorFullName.trim() &&
      formData.successorRelationship &&
      formData.successorDateOfBirth;

    if (!basicFieldsValid) return false;

    // If over 18, validate NIC fields
    if (isOver18) {
      const nicValid =
        formData.successorNicNumber.trim() &&
        validateNIC(formData.successorNicNumber);
      const nicImagesValid =
        formData.successorNicFrontImage && formData.successorNicBackImage;
      return nicValid && nicImagesValid;
    } else {
      // Under 18, validate birth certificate fields
      return (
        formData.successorBirthCertFrontImage &&
        formData.successorBirthCertBackImage
      );
    }
  };

  const isFormComplete = () => {
    return isSection1Valid() && isSection2Valid();
  };

  const handleNext = () => {
    if (currentSection === 1) {
      if (!formData.fullName.trim()) {
        Alert.alert("Validation Error", "Please enter your full name");
        return;
      }
      if (!formData.dateOfBirth) {
        Alert.alert("Validation Error", "Please select your date of birth");
        return;
      }
      if (!formData.nicNumber.trim()) {
        Alert.alert("Validation Error", "NIC number is required");
        return;
      }
      if (!validateNIC(formData.nicNumber)) {
        Alert.alert(
          "Invalid NIC",
          "NIC must be either 9 digits followed by V/v (e.g., 123456789V) or 12 digits (e.g., 199912345678)",
        );
        return;
      }
      if (!formData.nicFrontImage) {
        Alert.alert("Validation Error", "Please upload NIC front image");
        return;
      }
      if (!formData.nicBackImage) {
        Alert.alert("Validation Error", "Please upload NIC back image");
        return;
      }
      setCurrentSection(2);
    }
  };

  const handlePrevious = () => {
    setCurrentSection(1);
  };

  // Handle navigation to FarmerQr page
  const handleNavigateToFarmerQr = () => {
    setShowSuccessModal(false);

    // Navigate to FarmerQr page with ALL required params
    navigation.navigate("FarmerQr", {
      cropCount: 1,
      userId: userId,
      NICnumber: farmerNIC,
    });
  };

  const handleSubmit = async () => {
    const isOver18 = isSuccessorOver18();

    // Validate basic fields
    if (!formData.successorFullName.trim()) {
      Alert.alert("Validation Error", "Please enter successor's full name");
      return;
    }
    if (!formData.successorRelationship) {
      Alert.alert("Validation Error", "Please select relationship");
      return;
    }
    if (!formData.successorDateOfBirth) {
      Alert.alert(
        "Validation Error",
        "Please select successor's date of birth",
      );
      return;
    }

    if (isOver18) {
      // Validate NIC for over 18
      if (!formData.successorNicNumber.trim()) {
        Alert.alert("Validation Error", "Please enter successor's NIC number");
        return;
      }
      if (!validateNIC(formData.successorNicNumber)) {
        Alert.alert(
          "Invalid NIC",
          "Successor's NIC must be either 9 digits followed by V/v (e.g., 123456789V) or 12 digits (e.g., 199912345678)",
        );
        return;
      }
      if (!formData.successorNicFrontImage) {
        Alert.alert(
          "Validation Error",
          "Please upload successor's NIC front image",
        );
        return;
      }
      if (!formData.successorNicBackImage) {
        Alert.alert(
          "Validation Error",
          "Please upload successor's NIC back image",
        );
        return;
      }
    } else {
      // Validate birth certificate for under 18
      if (!formData.successorBirthCertFrontImage) {
        Alert.alert(
          "Validation Error",
          "Please upload successor's birth certificate front image",
        );
        return;
      }
      if (!formData.successorBirthCertBackImage) {
        Alert.alert(
          "Validation Error",
          "Please upload successor's birth certificate back image",
        );
        return;
      }
    }

    if (!isFormComplete()) {
      Alert.alert("Error", "Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart/form-data request
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setModalTitle("Session Expired");
        setModalMessage("Please login again to continue.");
        setShowErrorModal(true);
        setIsSubmitting(false);
        return;
      }

      const formDataToSend = new FormData();

      // Add text fields - NIC is automatically filled from backend, but we send it anyway
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("nic", formData.nicNumber);
      formDataToSend.append("dob", formatDateForAPI(formData.dateOfBirth));
      formDataToSend.append("sucFullName", formData.successorFullName);
      formDataToSend.append("sucType", formData.successorRelationship);
      formDataToSend.append(
        "sucdob",
        formatDateForAPI(formData.successorDateOfBirth),
      );

      if (formData.successorNicNumber.trim()) {
        formDataToSend.append("sucNic", formData.successorNicNumber);
      }

      // Helper function to add images to FormData
      const addImageToFormData = (uri: string | null, fieldName: string) => {
        if (uri) {
          const uriParts = uri.split(".");
          const fileType = uriParts[uriParts.length - 1];

          formDataToSend.append(fieldName, {
            uri,
            name: `${fieldName}_${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
          } as any);
        }
      };

      // Add applicant NIC images
      addImageToFormData(formData.nicFrontImage, "nicFront");
      addImageToFormData(formData.nicBackImage, "nicBack");

      // Add successor images based on age
      if (isOver18) {
        addImageToFormData(formData.successorNicFrontImage, "sucNicFront");
        addImageToFormData(formData.successorNicBackImage, "sucNicBack");
      } else {
        addImageToFormData(
          formData.successorBirthCertFrontImage,
          "birthCrtFront",
        );
        addImageToFormData(
          formData.successorBirthCertBackImage,
          "birthCrtBack",
        );
      }

      console.log("Submitting pension request...");

      // Submit form
      const response = await axios.post(
        `${environment.API_BASE_URL}api/pension/pension-request/submit`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      console.log("Response:", response.data);

      if (response.data.status || response.data.success) {
        setModalTitle("Success!");
        setModalMessage(
          <View className="items-center">
            <Text className="text-center text-[#000000] text-base">
              Pension Request Submitted Successfully!
            </Text>
          </View>,
        );
        setShowSuccessModal(true);
      } else {
        setModalTitle("Submission Failed");
        setModalMessage(
          response.data.message ||
            "Failed to submit request. Please try again.",
        );
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Error submitting pension request:", error);
      let errorMessage =
        "An error occurred while submitting your request. Please try again.";

      if (error.response) {
        errorMessage =
          error.response.data?.message || error.response.statusText;
        console.log("Error response:", error.response.data);
      } else if (error.request) {
        errorMessage =
          "No response from server. Please check your internet connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setModalTitle("Submission Error");
      setModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Render Section 1: Applicant Details
  const renderSection1 = () => (
    <ScrollView
      className="flex-1 px-5"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* 1. Your Full Name */}
      <View className="mb-5 mt-4">
        <Text className="text-[#070707] mb-2">
          {t("GoviPensionForm.Your Full Name")} *
        </Text>
        <TextInput
          value={formData.fullName}
          onChangeText={(text) => updateFormData("fullName", text)}
          placeholder={t("GoviPensionForm.--Type here--")}
          placeholderTextColor="#585858"
          className="bg-[#F4F4F4] rounded-2xl px-4 py-3 text-[#070707] text-sm"
          editable={!farmerName}
        />
      </View>

      {/* 2. Your Date of Birth */}
      <View className="mb-5">
        <Text className="text-[#070707] mb-2">
          {t("GoviPensionForm.Your Date of Birth")} *
        </Text>
        <TouchableOpacity
          onPress={() => setShowCustomDobPicker(true)}
          className="bg-[#F4F4F4] rounded-2xl px-4 py-3 flex-row justify-between items-center border border-gray-100"
        >
          <Text
            className={`text-sm ${formData.dateOfBirth ? "text-[#070707]" : "text-[#585858]"}`}
          >
            {formData.dateOfBirth
              ? formatDate(formData.dateOfBirth)
              : t("GoviPensionForm.--Select Date--")}
          </Text>
          <FontAwesome6 name="calendar-days" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* 3. Your NIC Number */}
      <View className="mb-5">
        <Text className="text-[#070707] mb-2">
          {t("GoviPensionForm.Your NIC Number")} *
        </Text>
        <View className="bg-[#F4F4F4] rounded-2xl px-4 py-3">
          <Text className="text-[#070707] text-sm">
            {formData.nicNumber || farmerNIC}
          </Text>
        </View>
      </View>

      {/* 4. NIC Front Image */}
      <View className="mb-5">
        <Text className="text-[#070707] mb-2">
          {t("GoviPensionForm.NIC Front Image")} *
        </Text>
        <TouchableOpacity
          onPress={() => pickImageFromGallery("nicFront")}
          className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
        >
          <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
          <Text className="text-gray-900 ml-2 font-medium text-sm">
            {formData.nicFrontImage
              ? t("GoviPensionForm.Re-upload image")
              : t("GoviPensionForm.Upload Image")}
          </Text>
        </TouchableOpacity>
        {formData.nicFrontImage && (
          <View className="mb-3">
            <View className="relative justify-center items-center">
              <Image
                source={{ uri: formData.nicFrontImage }}
                className="w-full h-48 rounded-lg"
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => updateFormData("nicFrontImage", null)}
                className="absolute right-2 top-2"
              >
                <Ionicons name="close-circle" size={28} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 5. NIC Back Image */}
      <View className="mb-8">
        <Text className="text-[#070707] mb-2">
          {t("GoviPensionForm.NIC Back Image")} *
        </Text>
        <TouchableOpacity
          onPress={() => pickImageFromGallery("nicBack")}
          className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
        >
          <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
          <Text className="text-gray-900 ml-2 font-medium text-sm">
            {formData.nicBackImage
              ? t("GoviPensionForm.Re-upload image")
              : t("GoviPensionForm.Upload Image")}
          </Text>
        </TouchableOpacity>
        {formData.nicBackImage && (
          <View className="mb-3">
            <View className="relative">
              <Image
                source={{ uri: formData.nicBackImage }}
                className="w-full h-48 rounded-lg"
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => updateFormData("nicBackImage", null)}
                className="absolute right-2 top-2"
              >
                <Ionicons name="close-circle" size={28} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Render Section 2: Successor Details
  const renderSection2 = () => {
    const isOver18 = isSuccessorOver18();
    const age = formData.successorDateOfBirth
      ? calculateAge(formData.successorDateOfBirth)
      : 0;

    return (
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* 6. Successor's Full Name */}
        <View className="mb-5 mt-4">
          <Text className="text-[#070707] mb-2">
            {t("GoviPensionForm.Successor's Full Name")} *
          </Text>
          <TextInput
            value={formData.successorFullName}
            onChangeText={(text) => updateFormData("successorFullName", text)}
            placeholder={t("GoviPensionForm.--Type here--")}
            placeholderTextColor="#585858"
            className="bg-[#F4F4F4] rounded-2xl px-4 py-3 text-[#070707] text-sm"
          />
        </View>

        {/* 7. Successor Relationship */}
        <View className="mb-5">
          <Text className="text-[#070707] mb-2">
            {t("GoviPensionForm.Relationship")} *
          </Text>
          <View className="px-2">
            <View className="flex-row justify-between">
              {/* Left Column */}
              <View className="flex-1">
                {leftColumnOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      updateFormData("successorRelationship", option.value)
                    }
                    className="flex-row items-center py-2"
                  >
                    <View className="w-5 h-5 rounded-2xl border-2 border-gray-400 mr-3 justify-center items-center">
                      {formData.successorRelationship === option.value && (
                        <View className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </View>
                    <Text className="text-gray-700">{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Right Column */}
              <View className="flex-1">
                {rightColumnOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      updateFormData("successorRelationship", option.value)
                    }
                    className="flex-row items-center py-2"
                  >
                    <View className="w-5 h-5 rounded-2xl border-2 border-gray-400 mr-3 justify-center items-center">
                      {formData.successorRelationship === option.value && (
                        <View className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </View>
                    <Text className="text-gray-700">{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 8. Successor's Date of Birth */}
        <View className="mb-5">
          <Text className="text-[#070707] mb-2">
            {t("GoviPensionForm.Successor's Date of Birth")} *
          </Text>
          <TouchableOpacity
            onPress={() => setShowCustomSuccessorDobPicker(true)}
            className="bg-[#F4F4F4] rounded-2xl px-4 py-3 flex-row justify-between items-center border border-gray-100"
          >
            <Text
              className={`text-sm ${formData.successorDateOfBirth ? "text-[#070707]" : "text-[#585858]"}`}
            >
              {formData.successorDateOfBirth
                ? formatDate(formData.successorDateOfBirth)
                : t("GoviPensionForm.--Select Date--")}
            </Text>
            <FontAwesome6 name="calendar-days" size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Conditionally render NIC or Birth Certificate fields */}
        {formData.successorDateOfBirth ? (
          isOver18 ? (
            <>
              {/* Successor's NIC Number */}
              <View className="mb-5">
                <Text className="text-[#070707] mb-2">
                  {t("GoviPensionForm.Successor's NIC Number")} *
                </Text>
                <TextInput
                  value={formData.successorNicNumber}
                  onChangeText={(text) =>
                    updateFormData("successorNicNumber", text)
                  }
                  placeholder={t("GoviPensionForm.--Type here--")}
                  placeholderTextColor="#585858"
                  className="bg-[#F4F4F4] rounded-2xl px-4 py-3 text-[#070707] text-sm"
                  keyboardType="default"
                  maxLength={12}
                />
                {formData.successorNicNumber.trim() &&
                  !validateNIC(formData.successorNicNumber) && (
                    <Text className="text-red-500 text-xs mt-1 ml-4">
                      NIC must be 9 digits + V/v or 12 digits
                    </Text>
                  )}
              </View>

              {/* Successor's NIC Front Image */}
              <View className="mb-5">
                <Text className="text-[#070707] mb-2">
                  {t("GoviPensionForm.Successor's NIC Front Image")} *
                </Text>
                <TouchableOpacity
                  onPress={() => pickImageFromGallery("successorNicFront")}
                  className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
                >
                  <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
                  <Text className="text-gray-900 ml-2 font-medium text-sm">
                    {formData.successorNicFrontImage
                      ? t("GoviPensionForm.Re-upload image")
                      : t("GoviPensionForm.Upload Image")}
                  </Text>
                </TouchableOpacity>
                {formData.successorNicFrontImage && (
                  <View className="mb-3">
                    <View className="relative">
                      <Image
                        source={{ uri: formData.successorNicFrontImage }}
                        className="w-full h-48 rounded-lg"
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          updateFormData("successorNicFrontImage", null)
                        }
                        className="absolute right-2 top-2"
                      >
                        <Ionicons name="close-circle" size={28} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Successor's NIC Back Image */}
              <View className="mb-8">
                <Text className="text-[#070707] mb-2">
                  {t("GoviPensionForm.Successor's NIC Back Image")} *
                </Text>
                <TouchableOpacity
                  onPress={() => pickImageFromGallery("successorNicBack")}
                  className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
                >
                  <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
                  <Text className="text-gray-900 ml-2 font-medium text-sm">
                    {formData.successorNicBackImage
                      ? t("GoviPensionForm.Re-upload image")
                      : t("GoviPensionForm.Upload Image")}
                  </Text>
                </TouchableOpacity>
                {formData.successorNicBackImage && (
                  <View className="mb-3">
                    <View className="relative">
                      <Image
                        source={{ uri: formData.successorNicBackImage }}
                        className="w-full h-48 rounded-lg"
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          updateFormData("successorNicBackImage", null)
                        }
                        className="absolute right-2 top-2"
                      >
                        <Ionicons name="close-circle" size={28} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Successor's Birth Certificate Front Image */}
              <View className="mb-5">
                <Text className="text-[#070707] mb-2">
                  {t("GoviPensionForm.Successor's Birth Certificate (Front)")} *
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    pickImageFromGallery("successorBirthCertFront")
                  }
                  className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
                >
                  <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
                  <Text className="text-gray-900 ml-2 font-medium text-sm">
                    {formData.successorBirthCertFrontImage
                      ? t("GoviPensionForm.Re-upload image")
                      : t("GoviPensionForm.Upload Image")}
                  </Text>
                </TouchableOpacity>
                {formData.successorBirthCertFrontImage && (
                  <View className="mb-3">
                    <View className="relative">
                      <Image
                        source={{ uri: formData.successorBirthCertFrontImage }}
                        className="w-full h-48 rounded-lg"
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          updateFormData("successorBirthCertFrontImage", null)
                        }
                        className="absolute right-2 top-2"
                      >
                        <Ionicons name="close-circle" size={28} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Successor's Birth Certificate Back Image */}
              <View className="mb-8">
                <Text className="text-[#070707] mb-2">
                  {t("GoviPensionForm.Successor's Birth Certificate (Back)")} *
                </Text>
                <TouchableOpacity
                  onPress={() => pickImageFromGallery("successorBirthCertBack")}
                  className="bg-white border border-gray-300 rounded-2xl px-6 py-3 flex-row justify-center items-center mb-4"
                >
                  <FontAwesome6 name="cloud-arrow-up" size={22} color="black" />
                  <Text className="text-gray-900 ml-2 font-medium text-sm">
                    {formData.successorBirthCertBackImage
                      ? t("GoviPensionForm.Re-upload image")
                      : t("GoviPensionForm.Upload Image")}
                  </Text>
                </TouchableOpacity>
                {formData.successorBirthCertBackImage && (
                  <View className="mb-3">
                    <View className="relative">
                      <Image
                        source={{ uri: formData.successorBirthCertBackImage }}
                        className="w-full h-48 rounded-lg"
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          updateFormData("successorBirthCertBackImage", null)
                        }
                        className="absolute right-2 top-2"
                      >
                        <Ionicons name="close-circle" size={28} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          )
        ) : (
          <></>
        )}
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#980775" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <CustomHeader
        title={t("GoviPensionForm.GoViPension")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      {/* Custom Date Pickers */}
      <CustomDatePicker
        visible={showCustomDobPicker}
        onClose={() => setShowCustomDobPicker(false)}
        onSelect={(date) => updateFormData("dateOfBirth", date)}
        initialDate={formData.dateOfBirth || new Date()}
        maximumDate={new Date()}
      />

      <CustomDatePicker
        visible={showCustomSuccessorDobPicker}
        onClose={() => setShowCustomSuccessorDobPicker(false)}
        onSelect={(date) => updateFormData("successorDateOfBirth", date)}
        initialDate={formData.successorDateOfBirth || new Date()}
        maximumDate={new Date()}
      />

      {/* Modal Components */}
      <SuccessModal
        visible={showSuccessModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleNavigateToFarmerQr}
        onNavigate={handleNavigateToFarmerQr}
        showNavigateButton={true}
        autoClose={true}
        duration={5000}
      />

      <FailedModal
        visible={showErrorModal}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setShowErrorModal(false)}
        showRetryButton={false}
        autoClose={true}
        duration={4000}
      />

      {/* Form Content */}
      {currentSection === 1 ? renderSection1() : renderSection2()}

      {/* Action Buttons */}
      <View className="px-5 pb-6 pt-4 bg-white">
        {currentSection === 1 ? (
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleCancel}
              className="flex-1 bg-[#ECECEC] rounded-2xl py-4"
              disabled={isSubmitting}
            >
              <Text className="text-[#8E8E8E] text-center font-medium text-base">
                {t("GoviPensionForm.Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              className={`flex-1 rounded-2xl py-4 ${isSection1Valid() ? "bg-[#980775]" : "bg-[#C6C6C6]"}`}
              disabled={!isSection1Valid() || isSubmitting}
            >
              <Text className="text-white text-center font-medium text-base">
                {t("GoviPensionForm.Next")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handlePrevious}
              className="flex-1 bg-[#ECECEC] rounded-2xl py-4"
              disabled={isSubmitting}
            >
              <Text className="text-[#8E8E8E] text-center font-medium text-base">
                {t("GoviPensionForm.Back")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              className={`flex-1 rounded-2xl py-4 ${isSection2Valid() && !isSubmitting ? "bg-[#980775]" : "bg-[#C6C6C6]"}`}
              disabled={!isSection2Valid() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-medium text-base">
                  {t("GoviPensionForm.Submit")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default GoviPensionForm;
