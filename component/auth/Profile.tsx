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
import CustomHeader from "../common/CustomHeader;
import { environment } from "@/environment/environment";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { RouteProp, useRoute } from "@react-navigation/native";
import provincesData from "@/assets/jsons/sri-lanka-provinces.json";
import jobRolesData from "@/assets/jsons/job-roles.json";

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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
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
    } finally {
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    if (text.startsWith("0")) {
      text = text.replace(/^0+/, "");
    }
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
    if (text.startsWith("0")) {
      text = text.replace(/^0+/, "");
    }
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
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
      } finally {
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
    if (language === "si") {
      return {
        fontSize: 13,
        lineHeight: 20,
      };
    }
  };

  const fetchProfileData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }

      let response;

      if (
        jobRole === "Distribution Centre Manager" ||
        jobRole === "Distribution Officer"
      ) {
        response = await api.get("api/distribution-manager/user-profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await api.get("api/collection-officer/user-profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

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
      if (districtObj) {
        return districtObj[language];
      }
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
        if (cityObj) {
          return cityObj[language];
        }
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
    if (jobRoleObj) {
      return jobRoleObj[language];
    }
    return jobRole;
  };

  const getcompanyName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profileData.companyNameSinhala}`;
      case "ta":
        return `${profileData.companyNameTamil}`;
      default:
        return `${profileData.companyNameEnglish} `;
    }
  };

  const getfirstName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profileData.firstNameSinhala}`;
      case "ta":
        return `${profileData.firstNameTamil}`;
      default:
        return `${profileData.firstNameEnglish} `;
    }
  };

  const getlastName = () => {
    if (!profileData) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profileData.lastNameSinhala}`;
      case "ta":
        return `${profileData.lastNameTamil}`;
      default:
        return `${profileData.lastNameEnglish} `;
    }
  };

  return (
    <View
      className="flex-1 bg-white"
    >
      <CustomHeader
        title={t("Profile.MyProfile")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <View className="items-center mb-6">
        <View className="items-center mb-6 relative">
          <Image
            source={
              profileImage && profileImage.uri
                ? { uri: profileImage.uri }
                : require("../../assets/images/auth/my-profile.webp")
            }
            style={{ width: 100, height: 100, borderRadius: 50 }}
            defaultSource={require("../../assets/images/auth/my-profile.webp")}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
      >
        <View className="space-y-4 px-6 pb-6">
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {" "}
              {t("Profile.FirstName")}
            </Text>
            <View className="rounded-2xl border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getfirstName()}
                  editable={false}
                  style={[
                    { fontSize: 16, minWidth: 250 },
                    getTextStyle(selectedLanguage),
                  ]}
                  scrollEnabled={false}
                />
              </ScrollView>
            </View>
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {" "}
              {t("Profile.LastName")}
            </Text>
            <View className="rounded-2xl border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getlastName()}
                  editable={false}
                  style={[
                    { fontSize: 16, minWidth: 250 },
                    getTextStyle(selectedLanguage),
                  ]}
                  scrollEnabled={false}
                />
              </ScrollView>
            </View>
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Company")}
            </Text>
            <View className="rounded-2xl border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getcompanyName()}
                  editable={false}
                  style={[
                    { fontSize: 16, minWidth: 250 },
                    getTextStyle(selectedLanguage),
                  ]}
                  scrollEnabled={false}
                />
              </ScrollView>
            </View>
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.CenterCode")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={profileData.regcode}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.CenterName")}
            </Text>
            <View className="rounded-2xl border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={profileData.collectionCenterName}
                  editable={false}
                  style={[
                    { fontSize: 16, minWidth: 250 },
                    getTextStyle(selectedLanguage),
                  ]}
                  scrollEnabled={false}
                />
              </ScrollView>
            </View>
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Job")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={getTranslatedJobRole(
                profileData.jobRole,
                selectedLanguage,
              )}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.NIC")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={profileData.nicNumber}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Phone1")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={newPhoneNumber}
              placeholder="7XXXXXXXX"
              keyboardType="numeric"
              onChangeText={handlePhoneNumberChange}
              maxLength={9}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
            {errorMessage && (
              <Text className="text-red-500">{errorMessage}</Text>
            )}
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Phone2")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={newPhoneNumber2}
              placeholder="7XXXXXXXX"
              keyboardType="numeric"
              onChangeText={handlePhoneNumber2Change}
              maxLength={9}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
            {errorMessage2 && (
              <Text className="text-red-500">{errorMessage2}</Text>
            )}
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.House")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={profileData.houseNumber}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Street")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={profileData.streetName}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.City")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedCity(
                profileData.city,
                profileData.district,
                selectedLanguage,
              )}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.District")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedDistrict(
                profileData.district,
                selectedLanguage,
              )}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {t("Profile.Province")}
            </Text>
            <TextInput
              className="px-4 py-2 rounded-2xl border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedProvince(
                profileData.province,
                selectedLanguage,
              )}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          {showUpdateButton &&
            (newPhoneNumber !== profileData.phoneNumber ||
              newPhoneNumber2 !== profileData.phoneNumber2) && (
              <TouchableOpacity
                onPress={handleUpdatePhoneNumber}
                className="bg-[#000000] py-3 rounded-[30px] mb-4"
              >
                <Text
                  style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
                  className="text-center text-white font-semibold"
                >
                  {t("Profile.Update")}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
