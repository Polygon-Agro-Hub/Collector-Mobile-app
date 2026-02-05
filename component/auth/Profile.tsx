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
import AntDesign from "react-native-vector-icons/AntDesign";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import * as ImageManipulator from "expo-image-manipulator";
import { useTranslation } from "react-i18next";
import { RouteProp, useRoute } from "@react-navigation/native";

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

type District = {
  en: string;
  si: string;
  ta: string;
};

const Profile: React.FC<ProfileProps> = ({ navigation }) => {
    const route =
      useRoute<RouteProp<RootStackParamList, "Profile">>();
  const {jobRole} = route.params
  console.log("josfefd", jobRole)
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
  // const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "si" | "ta">(
    "en"
  );

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      if (lang === "en" || lang === "si" || lang === "ta") {
        setSelectedLanguage(lang);
      } else {
        setSelectedLanguage("en"); // Default to English if not found or invalid
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
    phoneCode1: string
  ) => {
    console.log("Checking phone number:", newPhoneNumber, phoneCode1);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode1}${newPhoneNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.exists && newPhoneNumber !== profileData.phoneNumber) {
        setErrorMessage(
          t("Error.This phone number is already registered in the system.")
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
   // console.log("Phone number changed:", text);
   if (text.startsWith("0")) {
    text = text.replace(/^0+/, ""); // remove all leading zeros
  }
      setNewPhoneNumber(text);

    if (text.length < 9) {
      setErrorMessage(t("Error.Phone number 1 must be at least 9 digits.")); // Tamil error message
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
    text = text.replace(/^0+/, ""); // remove all leading zeros
  }
    setNewPhoneNumber2(text);
    if (text.length < 9 && text.length > 0) {
      setErrorMessage2(t("Error.Phone number 2 must be at least 9 digits.")); // Tamil error message
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
    phoneCode02: string
  ) => {
    console.log("Checking phone number:", newPhoneNumber2, phoneCode02);
    if(newPhoneNumber2.length !== 0) {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(

        `${environment.API_BASE_URL}api/collection-manager/driver/check-phone/${phoneCode02}${newPhoneNumber2}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.exists && newPhoneNumber2 !== "0") {
        setErrorMessage2(
          t("Error.This phone number is already registered in the system.")
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
        (phone2 !== "" && phone2 !== profileData.phoneNumber2)
    );
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 13, // Smaller text size for Sinhala
        lineHeight: 20, // Space between lines
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

      
      // const response = await api.get("api/collection-officer/user-profile", {
      //   headers: { Authorization: `Bearer ${token}` },
      // });

      // const data = response.data.data;
      // console.log(data);
          let response;
    // Check jobRole before making the API call
    if (jobRole === "Distribution Centre Manager" || jobRole === "Distribution Officer") {
      response = await api.get("api/distribution-manager/user-profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      response = await api.get("api/collection-officer/user-profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const data = response.data.data;
//    console.log(data);

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
    console.log("Updating phone number...");
    console.log("rrror 2", errorMessage2)
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.No token found"));
        return;
      }
      if (newPhoneNumber.length === 0) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 cannot be empty")
        );
        return;
      }
      if (newPhoneNumber.length < 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 must be at least 9 digits.")
        );
        return;
      } 
      else if (newPhoneNumber.length > 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 1 must be at most 9 digits.")
        );
        return;
      } 
      else if (newPhoneNumber2.length > 9) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone number 2 must be at most 9 digits.")
        );
        return;
      } else if (newPhoneNumber === newPhoneNumber2) {
        Alert.alert(
          t("Error.error"),
          t("Error.Phone numbers cannot be the same.")
        );
        return;
      } else if (errorMessage) {
        Alert.alert(t("Error.error"), errorMessage);
        return;
      } else if (errorMessage2 && newPhoneNumber2.length > 0) {
        Alert.alert(t("Error.error"), errorMessage2);
        return;
      }
      // Always send both phone numbers
      const payload = {
        phoneNumber: newPhoneNumber,
        phoneNumber2: newPhoneNumber2,
      };

      console.log(payload);

      await api.put("api/collection-officer/update-phone", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(payload);

      // Update local state with the new values
      setProfileData((prevData) => ({
        ...prevData,
        phoneNumber: newPhoneNumber,
        phoneNumber2: newPhoneNumber2,
      }));
      setShowUpdateButton(false);
      Alert.alert(
        t("Error.Success"),
        t("Error.Phone numbers updated successfully")
      );
      setErrorMessage("");
      setErrorMessage2("");
    } catch (error) {
      console.error("Error updating phone numbers:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to update phone numbers"));
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("Error.error"), t("Error.Permission required"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      let imageUri = result.assets[0].uri;

      const resizedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 500 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log("Resized and compressed image:", resizedImage);
      setProfileImage({ uri: resizedImage.uri });
      await uploadImage(resizedImage.uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    console.log("Uploading image...");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        return;
      }
      const formData = new FormData();
      if (imageUri) {
        const fileName = imageUri.split("/").pop();
        const fileType = fileName?.split(".").pop()
          ? `image/${fileName.split(".").pop()}`
          : "image/jpeg";

        formData.append("profileImage", {
          uri: imageUri,
          name: fileName,
          type: fileType,
        } as any);
      }
    //  console.log(formData);
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/upload-profile-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status === "success") {
      } else {
        Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
      }
    } catch (error) {
      Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
    }
  };

  const getTranslatedDistrict = (
    district: string,
    language: "en" | "si" | "ta"
  ) => {
    for (const province of jsonData.provinces) {
      const districtObj = province.districts.find((d) => d.en === district);
      if (districtObj) {
        return districtObj[language]; // Return translated district name
      }
    }
    return district; // Return original if not found
  };

  const getTranslatedProvince = (
    province: string,
    language: "en" | "si" | "ta"
  ) => {
    const provinceObj = jsonData.provinces.find((p) => p.name.en === province);
    return provinceObj ? provinceObj.name[language] : province; // Return translated province name
  };

  const getTranslatedCity = (
    city: string,
    district: string,
    language: "en" | "si" | "ta"
  ) => {
    for (const province of jsonData.provinces) {
      const districtObj = province.districts.find((d) => d.en === district);
      if (districtObj) {
        const cityObj = districtObj.cities.find((c) => c.en === city);
        if (cityObj) {
          return cityObj[language]; // Return translated city name
        }
      }
    }
    return city; // Return original if not found
  };
  const getTranslatedJobRole = (
    jobRole: string,
    language: "en" | "si" | "ta"
  ) => {
    const jobRoleObj = jsonData1.jobRoles.find((role) => role.en === jobRole);
    if (jobRoleObj) {
      return jobRoleObj[language]; // Return translated job role
    }
    return jobRole; // Return original if not found
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

  const jsonData = {
    provinces: [
      {
        name: { en: "Western", si: "බටහිර", ta: "மேற்கு" },
        districts: [
          {
            en: "Colombo",
            si: "කොළඹ",
            ta: "கொழும்பு",
            cities: [
              {
                en: "Colombo",
                si: "කොළඹ",
                ta: "கொழும்பு",
              },
              {
                en: "Dehiwala",
                si: "දෙහිවල",
                ta: "தேவிவளை",
              },
              {
                en: "Moratuwa",
                si: "මොරටුව",
                ta: "மோரட்டுவ",
              },
            ],
          },
          {
            en: "Gampaha",
            si: "ගම්පහ",
            ta: "கம்பஹா",
            cities: [
              {
                en: "Gampaha",
                si: "ගම්පහ",
                ta: "கம்பஹா",
              },
              {
                en: "Negombo",
                si: "මීගමුව",
                ta: "நெகொம்போ",
              },
              {
                en: "Kelaniya",
                si: "කැලණිය",
                ta: "கெளலாணிய",
              },
            ],
          },
          {
            en: "Kalutara",
            si: "කළුතර",
            ta: "களுத்துறை",
            cities: [
              {
                en: "Kalutara",
                si: "කළුතර",
                ta: "களுத்துறை",
              },
              {
                en: "Beruwala",
                si: "බෙරුවල",
                ta: "பெருவளை",
              },
              {
                en: "Aluthgama",
                si: "අලුත්ගම",
                ta: "அலுத்த்கம",
              },
            ],
          },
        ],
      },
      {
        name: { en: "Central", si: "මධ්‍යම", ta: "மத்திய" },
        districts: [
          {
            en: "Kandy",
            si: "මහනුවර",
            ta: "கண்டி",
            cities: [
              {
                en: "Kandy",
                si: "මහනුවර",
                ta: "கண்டி",
              },
              {
                en: "Peradeniya",
                si: "පේරාදෙණිය",
                ta: "பேரடினியா",
              },
              {
                en: "Gampola",
                si: "ගම්පොල",
                ta: "கம்போலா",
              },
            ],
          },
          {
            en: "Matale",
            si: "මාතලේ",
            ta: "மாதளை",
            cities: [
              {
                en: "Matale",
                si: "මාතලේ",
                ta: "மாதளை",
              },
              {
                en: "Dambulla",
                si: "දඹුල්ල",
                ta: "தம்புள்ள",
              },
              {
                en: "Rattota",
                si: "රත්තොට",
                ta: "ரத்தொட்டா",
              },
            ],
          },
          {
            en: "Nuwara Eliya",
            si: "නුවරඑළිය",
            ta: "நுவரேலியா",
            cities: [
              {
                en: "Nuwara Eliya",
                si: "නුවරඑළිය",
                ta: "நுவரேலியா",
              },
              {
                en: "Hatton",
                si: "හැටන්",
                ta: "ஹாட்டன்",
              },
              {
                en: "Balangoda",
                si: "බලංගොඩ",
                ta: "பலங்கோடா",
              },
            ],
          },
        ],
      },

      {
        name: { en: "Southern", si: "දකුණ", ta: "தெற்கு" },
        districts: [
          {
            en: "Galle",
            si: "ගාල්ල",
            ta: "காலி",
            cities: [
              {
                en: "Galle",
                si: "ගාල්ල",
                ta: "காலி",
              },
              {
                en: "Unawatuna",
                si: "උණවටුන",
                ta: "உணவதுனா",
              },
              {
                en: "Hikkaduwa",
                si: "හික්කඩුව",
                ta: "ஹிக்கடுவா",
              },
            ],
          },
          {
            en: "Matara",
            si: "මාතර",
            ta: "மாத்தறை",
            cities: [
              {
                en: "Matara",
                si: "මාතර",
                ta: "மாத்தறை",
              },
              {
                en: "Tangalle",
                si: "තංගල්ල",
                ta: "தங்கல்ல",
              },
              {
                en: "Dikwella",
                si: "දික්වැල්ල",
                ta: "டிக்வேல்ல",
              },
            ],
          },
          {
            en: "Hambantota",
            si: "හම්බන්තොට",
            ta: "ஹம்பாந்தோட்டை",
            cities: [
              {
                en: "Hambantota",
                si: "හම්බන්තොට",
                ta: "ஹம்பாந்தோட்டை",
              },
              {
                en: "Tissamaharama",
                si: "තිස්සමහාරාම",
                ta: "திச்ஸமஹாராமா",
              },
              {
                en: "Kataragama",
                si: "කතරගම",
                ta: "கடாரகாம",
              },
            ],
          },
        ],
      },

      {
        name: { en: "Eastern", si: "නැගෙනහිර", ta: "கிழக்கு" },
        districts: [
          {
            en: "Ampara",
            si: "අම්පාර",
            ta: "அம்பாறை",
            cities: [
              {
                en: "Ampara",
                si: "අම්පාර",
                ta: "அம்பாறை",
              },
              {
                en: "Kalmunai",
                si: "කල්මුණේ",
                ta: "கல்முனை",
              },
              {
                en: "Pottuvil",
                si: "පොතුවිල්",
                ta: "பொத்துவில்",
              },
            ],
          },
          {
            en: "Batticaloa",
            si: "මඩකලපුව",
            ta: "பாட்டிக்கோடை",
            cities: [
              {
                en: "Batticaloa",
                si: "මඩකලපුව",
                ta: "பாட்டிக்கோடை",
              },
              {
                en: "Kallady",
                si: "කල්ලඩි",
                ta: "கல்லாடி",
              },
              {
                en: "Eravur",
                si: "එරාවුර්",
                ta: "இராவூர்",
              },
            ],
          },
          {
            en: "Trincomalee",
            si: "ත්‍රිකුණාමලය",
            ta: "திருகோணமலை",
            cities: [
              {
                en: "Trincomalee",
                si: "ත්‍රිකුණාමලය",
                ta: "திருகோணமலை",
              },
              {
                en: "Nilaveli",
                si: "නිලාවේලි",
                ta: "நிலவேலி",
              },
              {
                en: "Kuchchaveli",
                si: "කුච්චවේලි",
                ta: "குச்சவெலி",
              },
            ],
          },
        ],
      },

      {
        name: { en: "Northern", si: " උතුරු", ta: "வடக்கு" },
        districts: [
          {
            en: "Jaffna",
            si: "යාපනය",
            ta: "யாழ்ப்பாணம்",
            cities: [
              {
                en: "Jaffna",
                si: "යාපනය",
                ta: "யாழ்ப்பாணம்",
              },
              {
                en: "Chavakachcheri",
                si: "චාවකච්චේරි",
                ta: "சாவகச்சேரி",
              },
              {
                en: "Point Pedro",
                si: "පේදුරුතුඩුව",
                ta: "பாயிண்ட் பேட்ரோ",
              },
            ],
          },
          {
            en: "Kilinochchi",
            si: "කිලිනොච්චි",
            ta: "கில்லினோச்சி",
            cities: [
              {
                en: "Kilinochchi",
                si: "කිලිනොච්චි",
                ta: "கில்லினோச்சி",
              },
              {
                en: "Pooneryn",
                si: "පුනරීන්",
                ta: "பூனேரின்",
              },
              {
                en: "Vavuniya",
                si: "වවුනියාව",
                ta: "வவுனியா",
              },
            ],
          },
          {
            en: "Mullaitivu",
            si: "මුලතිව්",
            ta: "முல்லைத்தீவு",
            cities: [
              {
                en: "Mullaitivu",
                si: "මුලතිව්",
                ta: "முல்லைத்தீவு",
              },
              {
                en: "Puthukudiyiruppu",
                si: "පුදුකුඩිඉරිප්පු",
                ta: "புத்துக்குடியிருப்பு",
              },
              {
                en: "Vallipunam",
                si: "වල්ලිපුනම්",
                ta: "வல்லிபுணம்",
              },
            ],
          },
        ],
      },

      {
        name: { en: "North Western", si: "උතුරු මැද", ta: "வடமேல்" },
        districts: [
          {
            en: "Kurunegala",
            si: "කුරුණෑගල",
            ta: "குருநாகல்",
            cities: [
              {
                en: "Kurunegala",
                si: "කුරුණෑගල",
                ta: "குருநாகல்",
              },
              {
                en: "Maho",
                si: "මහෝ",
                ta: "மாஹோ",
              },
              {
                en: "Dambulla",
                si: "දඹුල්ල",
                ta: "தம்புள்ளா",
              },
            ],
          },
          {
            en: "Puttalam",
            si: "පුත්තලම",
            ta: "புத்தளம்",
            cities: [
              {
                en: "Puttalam",
                si: "පුත්තලම",
                ta: "புத்தளம்",
              },
              {
                en: "Chilaw",
                si: "හලාවත",
                ta: "சிலவ்",
              },
              {
                en: "Mannar",
                si: "මන්නාරම",
                ta: "மன்னார்",
              },
            ],
          },
        ],
      },

      {
        name: { en: "North Central", si: "උතුරු මධ්‍යම", ta: "வட மத்திய" },
        districts: [
          {
            en: "Anuradhapura",
            si: "අනුරාධපුර",
            ta: "அனுராதபுரம்",
            cities: [
              {
                en: "Anuradhapura",
                si: "අනුරාධපුර",
                ta: "அனுராதபுரம்",
              },
              {
                en: "Rambawewa",
                si: "රඹවැව",
                ta: "ரம்பாவேவ",
              },
              {
                en: "Tissa",
                si: "තිස්ස",
                ta: "திசா",
              },
            ],
          },
          {
            en: "Polonnaruwa",
            si: "පොලොන්නරුව",
            ta: "பொலன்னருவ",
            cities: [
              {
                en: "Polonnaruwa",
                si: "පොලොන්නරුව",
                ta: "பொலன்னருவ",
              },
              {
                en: "Dimbulagala",
                si: "දිඹුලාගල",
                ta: "டிம்புலகல",
              },
              {
                en: "Giritale",
                si: "ගිරිතලේ",
                ta: "கிரிதலே",
              },
            ],
          },
        ],
      },

      {
        name: { en: "Uva", si: "උව", ta: "உவா" },
        districts: [
          {
            en: "Badulla",
            si: "බදුල්ල",
            ta: "பதுளை",
            cities: [
              {
                en: "Badulla",
                si: "බදුල්ල",
                ta: "பதுளை",
              },
              {
                en: "Ella",
                si: "ඇල්ල",
                ta: "எல்லா",
              },
              {
                en: "Haputale",
                si: "හපුතලේ",
                ta: "ஹபுதலை",
              },
            ],
          },
          {
            en: "Moneragala",
            si: "මොනරාගල",
            ta: "முனரகலை",
            cities: [
              {
                en: "Moneragala",
                si: "මොණරාගල",
                ta: "முனரகலை",
              },
              {
                en: "Bibile",
                si: "බිබිල",
                ta: "பிபிலே",
              },
              {
                en: "Medagama",
                si: "මැදගම",
                ta: "மேதகம",
              },
            ],
          },
        ],
      },

      {
        name: { en: "Sabaragamuwa", si: "සබරගමුව", ta: "சபரகமுவ" },
        districts: [
          {
            en: "Rathnapura",
            si: "රත්නපුර",
            ta: "ரத்நாபுர",
            cities: [
              {
                en: "Rathnapura",
                si: "රත්නපුර",
                ta: "ரத்நாபுர",
              },
              {
                en: "Elapatha",
                si: "ඇලපාත",
                ta: "எலபத",
              },
              {
                en: "Opanayaka",
                si: "ඕපනායක",
                ta: "ஒபனயக",
              },
            ],
          },
          {
            en: "Kegalle",
            si: "කැගල්ල",
            ta: "கெகலே",
            cities: [
              {
                en: "Kegalle",
                si: "කැගල්ල",
                ta: "கெகலே",
              },
              {
                en: "Rambukkana",
                si: "රඹුක්කන",
                ta: "ரம்புக்கன",
              },
              {
                en: "Mawanella",
                si: "මාවනැල්ල",
                ta: "மாவனெல்ல",
              },
            ],
          },
        ],
      },
    ],
  };

  const jsonData1 = {
    jobRoles: [
      {
        en: "Collection Centre Manager",
        si: "එකතු කිරීමේ මධ්‍යස්ථාන කළමනාකරු",
        ta: "சேகரிப்பு மைய மேலாளர்",
      },
      {
        en: "Collection Officer",
        si: "එකතු කිරීමේ නිලධාරී",
        ta: "வசூல் அதிகாரி",
      },
    ],
  };

 return (
    <View
      className="flex-1 bg-white"
      style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
    >
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#F6F6F680] rounded-full p-2">
          <AntDesign name="left" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-bold text-black mr-[6%]">
          {t("Profile.MyProfile")}
        </Text>
      </View>

     <View className="items-center mb-6">
      <View className="items-center mb-6 relative">
        <Image
          source={
            profileImage && profileImage.uri
              ? { uri: profileImage.uri }
              : require("../../assets/images/mprofile.webp")
          }
          style={{ width: 100, height: 100, borderRadius: 50 }}
          defaultSource={require("../../assets/images/mprofile.webp")}
        />
        {/* <View className="absolute right-0 bottom-0 p-1 bg-white rounded-full">
          <Image
            source={require("../assets/images/Pencil.webp")}
            style={{ width: 17, height: 17, tintColor: "black" }}
          />
        </View> */}
      </View>
    </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="space-y-4">
          <View>
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-gray-500 mb-2"
            >
              {" "}
              {t("Profile.FirstName")}
            </Text>
            <View className="rounded-[35px] border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getfirstName()}
                  editable={false}
                  style={[{ fontSize: 16, minWidth: 250 }, getTextStyle(selectedLanguage)]}
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
            <View className="rounded-[35px] border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getlastName()}
                  editable={false}
                  style={[{ fontSize: 16, minWidth: 250 }, getTextStyle(selectedLanguage)]}
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
            <View className="rounded-[35px] border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={getcompanyName()}
                  editable={false}
                  style={[{ fontSize: 16, minWidth: 250 }, getTextStyle(selectedLanguage)]}
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
            <View className="rounded-[35px] border border-[#F4F4F4] bg-[#F4F4F4]">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TextInput
                  className="px-4 py-2 text-black min-w-full"
                  value={profileData.collectionCenterName}
                  editable={false}
                  style={[{ fontSize: 16, minWidth: 250 }, getTextStyle(selectedLanguage)]}
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
              value={getTranslatedJobRole(
                profileData.jobRole,
                selectedLanguage
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4]"
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedCity(
                profileData.city,
                profileData.district,
                selectedLanguage
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedDistrict(
                profileData.district,
                selectedLanguage
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
              className="px-4 py-2 rounded-[35px] border border-[#F4F4F4] text-black bg-[#F4F4F4] mb-2"
              value={getTranslatedProvince(
                profileData.province,
                selectedLanguage
              )}
              editable={false}
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            />
          </View>

          {showUpdateButton  && (newPhoneNumber !== profileData.phoneNumber || newPhoneNumber2 !== profileData.phoneNumber2) && (
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
