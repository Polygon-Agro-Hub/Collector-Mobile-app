import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  RefreshControl,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SelectList } from "react-native-dropdown-select-list";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import CameraComponent from "@/utils/CamComponentForDrivers";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import DropDownPicker from "react-native-dropdown-picker";
import LottieView from "lottie-react-native";
import { useFocusEffect } from "@react-navigation/native";

type AddressDetails = {
  houseNumber: string;
  streetName: string;
  city: string;
  country: string;
  province: string;
  district: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
};

type AddVehicleDetailsRouteProp = RouteProp<
  RootStackParamList,
  "AddVehicleDetails"
> & {
  params: {
    basicDetails: any;
    jobRole: string;
    type: string;
    preferredLanguages: string[];
    addressDetails: AddressDetails;
  };
};
type AddVehicleDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "AddVehicleDetails"
>;

const AddVehicleDetails: React.FC = () => {
  const route = useRoute<AddVehicleDetailsRouteProp>();
  const navigation = useNavigation<AddVehicleDetailsNavigationProp>();

  // State for form fields
  const [drivingLicenseId, setDrivingLicenseId] = useState<string>("");
  const [insuranceNumber, setInsuranceNumber] = useState<string>("");
  const [insuranceExpireDate, setInsuranceExpireDate] = useState<Date | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [vehicleType, setVehicleType] = useState<string>("");
  console.log("vehicleType", vehicleType);
  const [vehicleCapacity, setVehicleCapacity] = useState<string>("");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] =
    useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

    useFocusEffect(
      React.useCallback(() => {
        setInsuranceExpireDate(new Date());
        setShowDatePicker(false);
  
        return () => {
        };
      }, []) 
    );
  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language"); // Get stored language
        setSelectedLanguage(lang || "en"); // Default to English if not set
      } catch (error) {
        console.error("Error fetching language preference:", error);
      }
    };
    fetchLanguage();
  }, []);
  // State to control image reset
  const [resetImages, setResetImages] = useState<{ [key: string]: boolean }>({
    Front: false,
    Back: false,
    InsuranceFront: false,
    InsuranceBack: false,
    VehicleFront: false,
    VehicleBack: false,
    "Side-1": false,
    "Side-2": false,
  });

  // State for image storage
  const [images, setImages] = useState<{ [key: string]: string }>({});

  // Vehicle types for dropdown
  const vehicleTypes = [
    { key: "1", value: "Car", label: t("VehicleDetails.Car") },
    { key: "2", value: "Truck", label: t("VehicleDetails.Truck") },
    { key: "3", value: "Motorcycle", label: t("VehicleDetails.Motorcycle") },
  ];

  // Handle image picking - map display names to backend keys
  const handleImagePicked = (base64Image: string | null, imageType: string) => {
    if (base64Image) {
      const imageMapping: { [key: string]: string } = {
        // Driving License
        Front: "Front", // This will be mapped to licFrontImg in submission
        Back: "Back", // This will be mapped to licBackImg in submission

        // Insurance
        InsuranceFront: "InsuranceFront",
        InsuranceBack: "InsuranceBack",

        // Vehicle
        VehicleFront: "VehicleFront",
        VehicleBack: "VehicleBack",
        "Side-1": "VehicleSide1",
        "Side-2": "VehicleSide2",
      };

      // Store image with the correct key for backend submission
      const backendKey = imageMapping[imageType] || imageType;
      setImages((prev) => ({
        ...prev,
        [backendKey]: base64Image,
      }));
    }
  };

  // Handle date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setInsuranceExpireDate(selectedDate);
  };

  // Submit handler
  const handleSubmit = async () => {
    // Validate required fields
    if (!drivingLicenseId || !vehicleType || !vehicleRegistrationNumber) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please fill in all required fields.")
      );
      return;
    }

    // Validate image capture
    const requiredImageTypes = [
      "Front",
      "Back",
      "InsuranceFront",
      "InsuranceBack",
      "VehicleFront",
      "VehicleBack",
      "VehicleSide1",
      "VehicleSide2",
    ];

    const missingImages = requiredImageTypes.filter((img) => !images[img]);
    const translatedMissingImages = missingImages
      .map((img) => t(`VehicleDetails.${img}`))
      .join(", ");
    // Uncomment if you want to enforce all images
    if (missingImages.length > 0) {
      Alert.alert(
        t("Error.error"),
        `${t(
          "VehicleDetails.Please capture all required images"
        )} , ${translatedMissingImages}`
      );
      return;
    }

    try {
      setLoading(true);
      // Get the data passed from the previous screen
      const {
        basicDetails,
        jobRole,
        type,
        preferredLanguages,
        addressDetails,
      } = route.params;

      console.log(
        "-------------------last page -------------------------------------"
      );
      console.log("addressDetails in last page", addressDetails);
      console.log("basicDetails in last page", basicDetails);
      console.log("jobRole in last page", jobRole);
      console.log("type in last page", type);
      console.log("preferredLanguages in last page", preferredLanguages);

      // Format the data to match the backend's expected structure

      const officerData = {
        // Basic details
        firstNameEnglish: basicDetails.firstNameEnglish,
        lastNameEnglish: basicDetails.lastNameEnglish,
        firstNameSinhala: basicDetails.firstNameSinhala,
        lastNameSinhala: basicDetails.lastNameSinhala,
        firstNameTamil: basicDetails.firstNameTamil,
        lastNameTamil: basicDetails.lastNameTamil,
        empId: basicDetails.userId,
        empType: type,
        nic: basicDetails.nicNumber,
        email: basicDetails.email,
        phoneCode01: basicDetails.phoneCode1,
        phoneNumber01: basicDetails.phoneNumber1,
        phoneCode02: basicDetails.phoneCode2,
        phoneNumber02: basicDetails.phoneNumber2,
        jobRole: jobRole,
        preferredLanguages: Object.keys(preferredLanguages)
          .filter(
            (lang) =>
              preferredLanguages[lang as keyof typeof preferredLanguages]
          )
          .join(", "),

        // Address details
        houseNumber: addressDetails.houseNumber,
        streetName: addressDetails.streetName,
        city: addressDetails.city,
        district: addressDetails.district,
        province: addressDetails.province,
        country: addressDetails.country,

        // Bank details
        accHolderName: addressDetails.accountHolderName,
        accNumber: addressDetails.accountNumber,
        bankName: addressDetails.bankName,
        branchName: addressDetails.branchName,

        // Profile image
        profileImageUrl: images.profileImage,

        // Vehicle details
        licNo: drivingLicenseId,
        insNo: insuranceNumber,
        insExpDate: insuranceExpireDate
          ? insuranceExpireDate.toISOString().split("T")[0]
          : null,
        vType: vehicleType,
        vCapacity: vehicleCapacity,
        vRegNo: vehicleRegistrationNumber,

        // License and insurance images - map to the correct backend field names
        licFrontImg: images.Front,
        licBackImg: images.Back,
        insFrontImg: images.InsuranceFront,
        insBackImg: images.InsuranceBack,

        // Vehicle images
        vehFrontImg: images.VehicleFront,
        vehBackImg: images.VehicleBack,
        vehSideImgA: images.VehicleSide1,
        vehSideImgB: images.VehicleSide2,
      };

      console.log("officerData before sending", officerData);

      // Get the auth token from AsyncStorage
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Authentication Error", "No authentication token found");
        return;
      }

      // Make the API call with authorization headers
      const response = await axios.post(
        `${environment.API_BASE_URL}api/collection-manager/driver/add`,
        officerData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        // Clear stored form data after successful submission
        await AsyncStorage.removeItem("driverFormData");

        // Refresh the form
        Alert.alert(
          t("Error.Success"),
          t(
            "VehicleDetails.Driver and vehicle information submitted successfully"
          )
        );
        setLoading(false);
        navigation.navigate("Main" as any);
      }
    } catch (error) {
      console.error("Error submitting driver and vehicle data:", error);
      setLoading(false);

      // More detailed error handling
      let errorMessage =
        "Failed to submit driver and vehicle information. Please try again.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }

      Alert.alert(
        t("Error.error"),
        t(
          "VehicleDetails.Failed to submit driver and vehicle information. Please try again."
        )
      );
    }
  };

  // Refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    // Reset all form fields
    setDrivingLicenseId("");
    setInsuranceNumber("");
    setInsuranceExpireDate(null);
    setVehicleType("");
    setVehicleCapacity("");
    setVehicleRegistrationNumber("");

    // Clear all images
    setImages({});

    // Trigger image reset for all camera components
    setResetImages((prev) => {
      const newResetState: { [key: string]: boolean } = {};
      Object.keys(prev).forEach((key) => {
        newResetState[key] = true;
      });
      return newResetState;
    });

    // Simulate a brief loading time
    setTimeout(() => {
      // Reset the reset flags
      setResetImages((prev) => {
        const newResetState: { [key: string]: boolean } = {};
        Object.keys(prev).forEach((key) => {
          newResetState[key] = false;
        });
        return newResetState;
      });

      setRefreshing(false);
      // Optional: Show a refresh confirmation
    }, 1000);
  }, []);

  const handleDismissDropdown = () => {
    setOpen(false);
    Keyboard.dismiss(); // Close the keyboard if it's open
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black/20 ">
        <LottieView
          source={require("../../assets/lottie/collector.json")} // Ensure you have a valid JSON file
          autoPlay
          loop
          style={{ width: 300, height: 300 }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#959595"]} // Customizable refresh indicator color
          tintColor="#959595"
          title="Pull to refresh"
        />
      }
    >
      <View className="flex-row items-center px-4 py-4 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
          <AntDesign name="left" size={24} color="#000502" />
        </TouchableOpacity>
        <Text className="text-lg font-bold ml-[23%]">
          {t("VehicleDetails.Driving Details")}
        </Text>
      </View>

      {/* Driving License Details Section */}
      <View className="p-8 items-center">
        {/* <Text className="text-[16px] font-bold mb-2">Driving License ID</Text> */}
        <TextInput
          placeholder={t("VehicleDetails.--Driving License ID--")}
          value={drivingLicenseId}
          onChangeText={setDrivingLicenseId}
          className="border border-gray-300 rounded-md p-3 mb-2 w-full"
        />
        <View className="flex-row space-x-2 mt-4">
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "Front")}
            imageType="Front"
            resetImage={resetImages["Front"]}
          />
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "Back")}
            imageType="Back"
            resetImage={resetImages["Back"]}
          />
        </View>
      </View>

      <View className="h-[2px] bg-gray-300 w-[100%] self-center mt-4"></View>

      {/* Vehicle Insurance Details Section */}
      <View className="p-8 items-center">
        <Text className="text-[16px] font-bold mb-2">
          {t("VehicleDetails.Vehicle Insurance Details")}
        </Text>
        <TextInput
          placeholder={t("VehicleDetails.--Insurance Number--")}
          value={insuranceNumber}
          onChangeText={setInsuranceNumber}
          className="border border-gray-300 rounded-md p-3 mb-2 w-full"
        />

        <TouchableOpacity
          onPress={() => setShowDatePicker((prev) => !prev)}
          className="border border-gray-300 rounded-md p-3 mb-2 flex-row justify-between items-center w-full"
        >
          <Text>
            {insuranceExpireDate
              ? insuranceExpireDate.toDateString()
              : t("VehicleDetails.--Insurance Expire Date--")}
          </Text>
          <Ionicons name="calendar" size={20} color="gray" />
        </TouchableOpacity>

        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={insuranceExpireDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {showDatePicker && Platform.OS === "ios" && (
          <>
            <View className=" justify-center items-center z-50 absolute ml-6 mt-[52%] bg-gray-100  rounded-lg">
              <DateTimePicker
                value={insuranceExpireDate || new Date()}
                mode="date"
                display="inline"
                style={{ width: 320, height: 260 }}
                onChange={handleDateChange}
              />
            </View>
          </>
        )}

        <View className="flex-row space-x-2 justify-center mt-4">
          <CameraComponent
            onImagePicked={(image) =>
              handleImagePicked(image, "InsuranceFront")
            }
            imageType="Front"
            resetImage={resetImages["InsuranceFront"]}
          />
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "InsuranceBack")}
            imageType="Back"
            resetImage={resetImages["InsuranceBack"]}
          />
        </View>
      </View>

      <View className="h-[2px] bg-gray-300 w-[100%] self-center mt-4"></View>

      {/* Vehicle Details Section */}
      <View className="p-8 items-center -z-10">
        <Text className="text-[16px] font-bold mb-2">
          {t("VehicleDetails.Vehicle Details")}
        </Text>
        <DropDownPicker
          open={open}
          setOpen={setOpen}
          value={vehicleType} // The value selected in the dropdown
          setValue={setVehicleType} // Function to update the selected value
          items={vehicleTypes} // The data for the dropdown (using value/label format)
          placeholder={t("VehicleDetails.--Vehicle Type--")} // Placeholder text
          containerStyle={{
            borderWidth: 1,
            borderColor: "#CFCFCF",
            borderRadius: 5,
            marginBottom: 8,
          }}
          dropDownDirection="BOTTOM"
          dropDownContainerStyle={{
            borderWidth: 1,
            borderColor: "#CFCFCF",
            borderRadius: 5,
          }}
          style={{
            backgroundColor: "#fff",
            borderWidth: 0,
            borderColor: "#CFCFCF",
          }}
          placeholderStyle={{
            fontSize: 14,
            color: "#888",
          }}
        />
        <TextInput
          placeholder={t("VehicleDetails.--Vehicle Capacity--")}
          value={vehicleCapacity}
          inputMode="numeric"
          onChangeText={setVehicleCapacity}
          className="border border-gray-300 rounded-md p-3 mb-2 w-full"
        />
        <TextInput
          placeholder={t("VehicleDetails.--Vehicle Registration Number--")}
          value={vehicleRegistrationNumber}
          onChangeText={setVehicleRegistrationNumber}
          className="border border-gray-300 rounded-md p-3 mb-2 w-full"
        />

        <View className="flex-row  space-x-4 mb-4 mt-4">
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "VehicleFront")}
            imageType="Front"
            resetImage={resetImages["VehicleFront"]}
          />
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "VehicleBack")}
            imageType="Back"
            resetImage={resetImages["VehicleBack"]}
          />
        </View>

        <View className="flex-row space-x-4">
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "Side-1")}
            imageType="Side-1"
            resetImage={resetImages["Side-1"]}
          />
          <CameraComponent
            onImagePicked={(image) => handleImagePicked(image, "Side-2")}
            imageType="Side-2"
            resetImage={resetImages["Side-2"]}
          />
        </View>
      </View>

      {/* Submit Buttons Section */}
      <View className="items-center p-2 mb-4">
        <View className="flex-row space-x-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-[#D9D9D9] px-6 py-3 w-40 items-center rounded-full "
          >
            <Text className="text-[#686868]">
              {t("VehicleDetails.Go Back")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-[#2AAD7A] px-6 py-3 w-40 rounded-full items-center "
          >
            <Text className="text-white">{t("VehicleDetails.Submit")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AddVehicleDetails;
