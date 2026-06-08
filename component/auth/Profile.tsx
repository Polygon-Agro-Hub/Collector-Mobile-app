import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../navigations/CustomHeader";
import { environment } from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { useTranslation } from "react-i18next";
import { RouteProp, useRoute } from "@react-navigation/native";
import provincesData from "@/assets/jsons/sri-lanka-provinces.json";
import jobRolesData from "@/assets/jsons/job-roles.json";
import LoadingPage from "../commons/LoadingPage";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type ProfileNavigationProps = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

interface ProfileProps {
  navigation: ProfileNavigationProps;
}

const Profile: React.FC<ProfileProps> = ({ navigation }) => {
  const route = useRoute<RouteProp<RootStackParamList, "Profile">>();
  const { jobRole } = route.params;

  const [profileData, setProfileData] = useState({
    firstNameEnglish: "",
    lastNameEnglish: "",
    regcode: "",
    jobRole: "",
    nicNumber: "",
    phoneCode01: "",
    phoneCode02: "",
    phoneNumber: "",
    phoneNumber2: "",
    houseNumber: "",
    streetName: "",
    city: "",
    province: "",
    district: "",
    profileImage: "",
    firstNameSinhala: "",
    lastNameSinhala: "",
    firstNameTamil: "",
    lastNameTamil: "",
    companyNameSinhala: "",
    companyNameEnglish: "",
    companyNameTamil: "",
    collectionCenterName: "",
  });
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneNumber2, setNewPhoneNumber2] = useState("");
  const [showUpdateButton, setShowUpdateButton] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMessage2, setErrorMessage2] = useState<string | null>(null);
  const { t } = useTranslation();
  const [profileImage, setProfileImage] = useState({ uri: "" });
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "si" | "ta">(
    "en",
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      if (lang === "en" || lang === "si" || lang === "ta") {
        setSelectedLanguage(lang);
      } else {
        setSelectedLanguage("en");
      }
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useEffect(() => {
    fetchSelectedLanguage();
  }, []);

  const checkPhoneExists = async (
    newPhoneNumber: string,
    phoneCode1: string,
  ) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode1}${newPhoneNumber}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data.exists && newPhoneNumber !== profileData.phoneNumber) {
        setErrorMessage(
          t("Error.This phone number is already registered in the system."),
        );
      } else {
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Error checking phone number:", error);
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    if (text.startsWith("0")) text = text.replace(/^0+/, "");
    setNewPhoneNumber(text);
    if (text.length < 9) {
      setErrorMessage(t("Error.Phone number 1 must be at least 9 digits."));
    } else if (text.length > 9) {
      setErrorMessage(t("Error.Phone number cannot exceed 9 digits."));
    } else {
      setErrorMessage("");
      checkPhoneExists(text, profileData.phoneCode01);
    }
    toggleUpdateButton(text, newPhoneNumber);
  };

  const handlePhoneNumber2Change = (text: string) => {
    if (text.startsWith("0")) text = text.replace(/^0+/, "");
    setNewPhoneNumber2(text);
    if (text.length < 9 && text.length > 0) {
      setErrorMessage2(t("Error.Phone number 2 must be at least 9 digits."));
    } else if (text.length > 9) {
      setErrorMessage2(t("Error.Phone number cannot exceed 9 digits."));
    } else {
      setErrorMessage2("");
      checkPhone2Exists(text, profileData.phoneCode02);
    }
    toggleUpdateButton(newPhoneNumber2, text);
  };

  const checkPhone2Exists = async (
    newPhoneNumber2: string,
    phoneCode02: string,
  ) => {
    if (newPhoneNumber2.length !== 0) {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await axios.get(
          `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode02}${newPhoneNumber2}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (response.data.exists && newPhoneNumber2 !== "0") {
          setErrorMessage2(
            t("Error.This phone number is already registered in the system."),
          );
        } else {
          setErrorMessage2("");
        }
      } catch (error) {
        console.error("Error checking phone number 2:", error);
      }
    }
  };

  const toggleUpdateButton = (phone1: string, phone2: string) => {
    setShowUpdateButton(
      (phone1 !== "" && phone1 !== profileData.phoneNumber) ||
      (phone2 !== "" && phone2 !== profileData.phoneNumber2),
    );
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const getTextStyle = (language: string) => {
    if (language === "si") return { fontSize: 13, lineHeight: 20 };
  };

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      let apiCall;

      if (
        jobRole === "Distribution Centre Manager" ||
        jobRole === "Distribution Officer"
      ) {
        apiCall = api.get("api/distribution-manager/user-profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        apiCall = api.get("api/collection-officer/user-profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const [response] = await Promise.all([
        apiCall,
        new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);

      const data = response.data.data;

      setProfileData({
        firstNameEnglish: data.firstNameEnglish,
        lastNameEnglish: data.lastNameEnglish,
        regcode: data.regCode,
        jobRole: data.jobRole,
        nicNumber: data.nic,
        houseNumber: data.houseNumber,
        streetName: data.streetName,
        city: data.city,
        phoneNumber: data.phoneNumber01,
        phoneCode01: data.phoneCode01,
        phoneCode02: data.phoneCode02,
        phoneNumber2: data.phoneNumber02,
        province: data.province,
        district: data.district,
        profileImage: data.image,
        firstNameSinhala: data.firstNameSinhala,
        lastNameSinhala: data.lastNameSinhala,
        firstNameTamil: data.firstNameTamil,
        lastNameTamil: data.lastNameTamil,
        companyNameSinhala: data.companyNameSinhala,
        companyNameEnglish: data.companyNameEnglish,
        companyNameTamil: data.companyNameTamil,
        collectionCenterName: data.collectionCenterName,
      });
      setProfileImage({ uri: data.image });
      setNewPhoneNumber(data.phoneNumber01);
      setNewPhoneNumber2(data.phoneNumber02);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to load profile data"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePhoneNumber = async () => {
    Keyboard.dismiss();
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }
      if (newPhoneNumber.length === 0) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 cannot be empty"),
        );
        return;
      }
      if (newPhoneNumber.length < 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 must be at least 9 digits."),
        );
        return;
      } else if (newPhoneNumber.length > 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 must be at most 9 digits."),
        );
        return;
      } else if (newPhoneNumber2.length > 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 2 must be at most 9 digits."),
        );
        return;
      } else if (newPhoneNumber === newPhoneNumber2) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone numbers cannot be the same."),
        );
        return;
      } else if (errorMessage) {
        Alert.alert(t("Error.error"), errorMessage);
        return;
      } else if (errorMessage2 && newPhoneNumber2.length > 0) {
        Alert.alert(t("Error.error"), errorMessage2);
        return;
      }

      const payload = {
        phoneNumber: newPhoneNumber,
        phoneNumber2: newPhoneNumber2,
      };

      await api.put("api/collection-officer/update-phone", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfileData((prevData) => ({
        ...prevData,
        phoneNumber: newPhoneNumber,
        phoneNumber2: newPhoneNumber2,
      }));
      setShowUpdateButton(false);
      Alert.alert(
        t("Error.Success"),
        t("Error.Phone numbers updated successfully"),
      );
      setErrorMessage("");
      setErrorMessage2("");
    } catch (error) {
      console.error("Error updating phone numbers:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to update phone numbers"));
    }
  };

  const getTranslatedDistrict = (
    district: string,
    language: "en" | "si" | "ta",
  ) => {
    for (const province of provincesData.provinces) {
      const districtObj = province.districts.find((d) => d.en === district);
      if (districtObj) return districtObj[language];
    }
    return district;
  };

  const getTranslatedProvince = (
    province: string,
    language: "en" | "si" | "ta",
  ) => {
    const provinceObj = provincesData.provinces.find(
      (p) => p.name.en === province,
    );
    return provinceObj ? provinceObj.name[language] : province;
  };

  const getTranslatedCity = (
    city: string,
    district: string,
    language: "en" | "si" | "ta",
  ) => {
    for (const province of provincesData.provinces) {
      const districtObj = province.districts.find((d) => d.en === district);
      if (districtObj) {
        const cityObj = districtObj.cities.find((c) => c.en === city);
        if (cityObj) return cityObj[language];
      }
    }
    return city;
  };

  const getTranslatedJobRole = (
    jobRole: string,
    language: "en" | "si" | "ta",
  ) => {
    const jobRoleObj = jobRolesData.jobRoles.find(
      (role) => role.en === jobRole,
    );
    return jobRoleObj ? jobRoleObj[language] : jobRole;
  };

  const getcompanyName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return profileData.companyNameSinhala;
      case "ta":
        return profileData.companyNameTamil;
      default:
        return profileData.companyNameEnglish;
    }
  };

  const getfirstName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return profileData.firstNameSinhala;
      case "ta":
        return profileData.firstNameTamil;
      default:
        return profileData.firstNameEnglish;
    }
  };

  const getlastName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return profileData.lastNameSinhala;
      case "ta":
        return profileData.lastNameTamil;
      default:
        return profileData.lastNameEnglish;
    }
  };

  return (
    <View className="flex-1 bg-white px-1">
      <CustomHeader
        title={t("Profile.MyProfile")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <LoadingPage fullScreen />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 70 }}
        >
          <View className="items-center mb-6 mt-4 max-w-[500px] w-full mx-auto">
            <View className="items-center relative">
              <Image
                source={
                  profileImage && profileImage.uri
                    ? { uri: profileImage.uri }
                    : require("../../assets/images/auth/my-profile.webp")
                }
                className="w-[100px] h-[100px] rounded-full"
                defaultSource={require("../../assets/images/auth/my-profile.webp")}
              />
            </View>
          </View>

          <View className="gap-y-4 px-4 pb-6 max-w-[500px] w-full mx-auto">
            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.FirstName")}
              </Text>
              <View className="rounded-3xl border border-[#F4F4F4] bg-[#F4F4F4]">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TextInput
                    className="px-4 text-black min-w-[250px] h-[50px] text-base"
                    value={getfirstName()}
                    editable={false}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.LastName")}
              </Text>
              <View className="rounded-3xl border border-[#F4F4F4] bg-[#F4F4F4]">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TextInput
                    className="px-4 text-black min-w-[250px] h-[50px] text-base"
                    value={getlastName()}
                    editable={false}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Company")}
              </Text>
              <View className="rounded-3xl border border-[#F4F4F4] bg-[#F4F4F4]">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TextInput
                    className="px-4 text-black min-w-[250px] h-[50px] text-base"
                    value={getcompanyName()}
                    editable={false}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.CenterCode")}
              </Text>
              <TextInput
                className="px-4 border border-[#F4F4F4] text-black bg-[#F4F4F4] rounded-3xl h-[50px] text-base"
                value={profileData.regcode}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.CenterName")}
              </Text>
              <View className="rounded-3xl border border-[#F4F4F4] bg-[#F4F4F4]">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TextInput
                    className="px-4 text-black min-w-[250px] h-[50px] text-base"
                    value={profileData.collectionCenterName}
                    editable={false}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </View>
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Job")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={getTranslatedJobRole(
                  profileData.jobRole,
                  selectedLanguage,
                )}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.NIC")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={profileData.nicNumber}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Phone1")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={newPhoneNumber}
                placeholder="7XXXXXXXX"
                keyboardType="numeric"
                onChangeText={handlePhoneNumberChange}
                maxLength={9}
                editable={false}
              />
              {errorMessage && (
                <Text className="text-red-500 text-sm mt-1">
                  {errorMessage}
                </Text>
              )}
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Phone2")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={newPhoneNumber2}
                placeholder="7XXXXXXXX"
                keyboardType="numeric"
                onChangeText={handlePhoneNumber2Change}
                maxLength={9}
                editable={false}
              />
              {errorMessage2 && (
                <Text className="text-red-500 text-sm mt-1">
                  {errorMessage2}
                </Text>
              )}
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.House")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={profileData.houseNumber}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Street")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={profileData.streetName}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.City")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={getTranslatedCity(
                  profileData.city,
                  profileData.district,
                  selectedLanguage,
                )}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.District")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={getTranslatedDistrict(
                  profileData.district,
                  selectedLanguage,
                )}
                editable={false}
              />
            </View>

            <View>
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-gray-500 mb-2 text-base"
              >
                {t("Profile.Province")}
              </Text>
              <TextInput
                className="px-4 rounded-3xl border border-[#F4F4F4] text-black bg-[#F4F4F4] h-[50px] text-base"
                value={getTranslatedProvince(
                  profileData.province,
                  selectedLanguage,
                )}
                editable={false}
              />
            </View>

            {showUpdateButton &&
              (newPhoneNumber !== profileData.phoneNumber ||
                newPhoneNumber2 !== profileData.phoneNumber2) && (
                <TouchableOpacity
                  onPress={handleUpdatePhoneNumber}
                  className="bg-black rounded-3xl mb-4 h-[50px] items-center justify-center"
                >
                  <Text className="text-center text-white font-semibold text-lg">
                    {t("Profile.Update")}
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default Profile;
