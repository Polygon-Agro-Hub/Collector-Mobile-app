import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";
import { LanguageContext } from "@/context/LanguageContext";
import LottieView from 'lottie-react-native';
import NetInfo from "@react-native-community/netinfo";

type EngProfileNavigationProp = StackNavigationProp<
  RootStackParamList,
  "EngProfile"
>;

interface EngProfileProps {
  navigation: EngProfileNavigationProp;
}

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

interface UserProfile {
  firstNameEnglish: string;
  lastNameEnglish: string;
  companyName: string;
  image: string;
  firstNameSinhala: string;
  lastNameSinhala: string;
  firstNameTamil: string;
  lastNameTamil: string;
  companyNameSinhala: string;
  companyNameEnglish: string;
  companyNameTamil: string;
  empId: string;
  jobRole: string
}


const icon = require("@/assets/images/New/engprofileicon.png")


const EngProfile: React.FC<EngProfileProps> = ({ navigation }) => {
  const [isLanguageDropdownOpen, setLanguageDropdownOpen] =
    useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [empid, setEmpid] = useState<string>("");
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(
    null
  );
  const [isComplaintDropdownOpen, setComplaintDropdownOpen] =
    useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false); // Add this state
  const { t ,  i18n} = useTranslation();
  const { changeLanguage } = useContext(LanguageContext);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  console.log("Selected language:", selectedLanguage);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };
   useFocusEffect(
    React.useCallback(() => {
      console.log("Current language:", i18n.language);
      setComplaintDropdownOpen(false)
      setLanguageDropdownOpen(false);
      if (i18n.language === "en") {
         LanguageSelect("en");
        setSelectedLanguage("ENGLISH");
      } else if (i18n.language === "si") {
        LanguageSelect("si");
        setSelectedLanguage("SINHALA");
      } else if (i18n.language === "ta") {
        LanguageSelect("ta");
        setSelectedLanguage("TAMIL");
      }
    }, [i18n.language]) // The effect will run when i18n.language changes
  );
  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const route = useRoute();
  const currentScreen = route.name;
  const handleBackPress = () => {
    if (currentScreen === "EngProfile" && profile?.jobRole === "Distribution Officer" || profile?.jobRole === "Distribution Centre Manager") {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" })
    } else if(currentScreen === "EngProfile" && profile?.jobRole === "Collection Officer" || profile?.jobRole === "Collection Centre Manager" ){
      navigation.navigate("Main", { screen: "Dashboard" })
    }else {
      navigation.goBack();
    }
  };

  const complaintOptions = [
    t("EngProfile.Report Complaint"),
    t("EngProfile.View Complaint History"),
  ];

  const handleComplaintSelect = (complaint: string) => {
    setComplaintDropdownOpen(false);

    if (complaint === t("EngProfile.Report Complaint")) {
      navigation.navigate("ComplainPage" as any, { userId: 0 });
    } else if (complaint === t("EngProfile.View Complaint History")) {
      navigation.navigate("Main", { screen: "ComplainHistory" ,params: {fullname: getFullName }} );
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          const response = await api.get(
            "api/collection-officer/user-profile",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setProfile(response.data.data);
      //    console.log("Profile data:", response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const HanldeAsynStorage = async (lng: string) => {
    console.log("Selected language:", lng);
    await AsyncStorage.setItem("@user_language", lng);
  };

  const LanguageSelect = async (language: string) => {
    try {
      await AsyncStorage.setItem("@user_language", language);
      changeLanguage(language);
    } catch (error) {}
  };

  const handleLanguageSelect = (language: string) => {
    console.log("Selected language:", language);
    setSelectedLanguage(language);
    setLanguageDropdownOpen(false);
    try {
      if (language === "ENGLISH") {
        LanguageSelect("en");
        HanldeAsynStorage("en");
      } else if (language === "TAMIL") {
        LanguageSelect("ta");
        HanldeAsynStorage("ta");
      } else if (language === "SINHALA") {
        LanguageSelect("si");
        HanldeAsynStorage("si");
      }
    } catch (error) {}
  };

  const handleCall = () => {
    const phoneNumber = "+1234567890";
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert(t("Error.error"), t("Error.Unable to open dialer."));
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };

  // Updated handleLogout function with Lottie animation
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // Show loading animation
      
      const empId = await AsyncStorage.getItem("empid");
      await status(empId!, false);

      // Remove the token and empId from AsyncStorage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("jobRole");
      await AsyncStorage.removeItem("companyNameEnglish");
      await AsyncStorage.removeItem("companyNameSinhala");
      await AsyncStorage.removeItem("companyNameTamil");
      await AsyncStorage.removeItem("empid");

      // Small delay to show the animation before navigation
      setTimeout(() => {
        setIsLoggingOut(false);
        navigation.navigate("Login");
      }, 2000); // 2 seconds delay to show animation

    } catch (error) {
      console.error("An error occurred during logout:", error);
      setIsLoggingOut(false); // Hide loading animation on error
      Alert.alert(t("Error.error"), t("Error.Failed to log out."));
    }
  };

  const handleEditClick = () => {
    navigation.navigate("Profile" as any, { jobRole: profile?.jobRole });
  };

  const status = async (empId: string, status: boolean) => {

    const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
    return; 
  }
  
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("Token not found");
        return;
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/online-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empId: empId,
            status: status,
          }),
        }
      );

      if (response) {
        console.log("User is marked as offline");
      } else {
        console.log("Failed to update online status");
      }
    } catch (error) {
      console.error("Online status error:", error);
    }
  };

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
    return {
      fontSize: 16,
      lineHeight: 25,
    };
  };

  const getFullName = () => {
    if (!profile) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profile.firstNameSinhala} ${profile.lastNameSinhala}`;
      case "ta":
        return `${profile.firstNameTamil} ${profile.lastNameTamil}`;
      default:
        return `${profile.firstNameEnglish} ${profile.lastNameEnglish}`;
    }
  };

  const getcompanyName = () => {
    if (!profile) return "Loading...";
    switch (selectedLanguage) {
      case "si":
        return `${profile.companyNameSinhala}`;
      case "ta":
        return `${profile.companyNameTamil}`;
      default:
        return `${profile.companyNameEnglish} `;
    }
  };

  return (
    <View
      className="flex-1 bg-white "
      style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
    >
      {/* Back Button */}
      <TouchableOpacity onPress={() => handleBackPress()} className="bg-[#f3f3f380] rounded-full p-2 justify-center w-10" >
        <AntDesign name="left" size={24} color="#000502" />
      </TouchableOpacity>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="flex-row items-center p-2 mt-4  mb-4">
          <Image
            source={
              profile?.image
                ? { uri: profile.image }
                : require("../../assets/images/mprofile.webp")
            }
            className="w-16 h-16 rounded-full mr-3"
          />

          <View className="flex-1">
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-lg font-bold"
            >
              {getFullName()}
            </Text>
            <Text className="text-gray-500">{profile?.empId}</Text>
          </View>
          
          <TouchableOpacity onPress={handleEditClick}>
            <Image 
              source={icon} 
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        

        <View className="flex-1 p-4 mt-[-30]">
         
          <View className="h-0.5 bg-[#D2D2D2] my-4" />

           <TouchableOpacity
    onPress={() => setLanguageDropdownOpen(!isLanguageDropdownOpen)}
    className="flex-row items-center py-3"
  >
    <Ionicons name="globe-outline" size={20} color="black" />
    <Text className="flex-1 text-lg ml-2">
      {t("EngProfile.Language")}
    </Text>
    <Ionicons
      name={isLanguageDropdownOpen ? "chevron-up" : "chevron-down"}
      size={20}
      color="black"
    />
  </TouchableOpacity>

  {/* Then render dropdown AFTER the trigger */}
  {isLanguageDropdownOpen && (
    <View className="pl-8 bg-white  rounded-lg mt-2">
      {["ENGLISH", "SINHALA", "TAMIL"].map((language) => {
        const displayLanguage =
          language === "SINHALA" ? "සිංහල" : language === "TAMIL" ? "தமிழ்" : language === "ENGLISH" ? "English" : language;
        return (
          <TouchableOpacity
            key={language}
            onPress={() => handleLanguageSelect(language)}
            className={`flex-row items-center py-2 px-4 rounded-lg my-1 ${
              selectedLanguage === language
              ? "bg-[#FFDFF7]"
              : "bg-transparent"
          }`}
        >
          <Text
            className={`text-base ${
              selectedLanguage === language
                ? "text-black"
                : "text-[#434343]"  // Fixed: Added "text-" prefix
            }`}
          >
            {displayLanguage}
          </Text>
          {selectedLanguage === language && (
            <View className="absolute right-4">
              <Ionicons name="checkmark" size={20} color="black" />
            </View>
          )}
        </TouchableOpacity>
           );
              })}
    </View>
  )}
  <View className="h-0.5 bg-[#D2D2D2] my-4" />


          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={() => navigation.navigate("OfficerQr")}
          >
            <Ionicons name="qr-code" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">{t("EngProfile.View")}</Text>
          </TouchableOpacity>

          {/* Horizontal Line */}
          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Change Password */}
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() =>
              navigation.navigate("ChangePassword")}
          >
            <Ionicons name="lock-closed-outline" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("EngProfile.ChangePassword")}
            </Text>
          </TouchableOpacity>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => navigation.navigate("PrivacyPolicy")}
          >
            <MaterialIcons name="privacy-tip" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("PrivacyPlicy.PrivacyPolicy")}
            </Text>
          </TouchableOpacity>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            onPress={() => setComplaintDropdownOpen(!isComplaintDropdownOpen)}
            className="flex-row items-center py-3"
          >
            <AntDesign name="warning" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("EngProfile.Complaints")}
            </Text>
            <Ionicons
              name={isComplaintDropdownOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="black"
            />
          </TouchableOpacity>

          {isComplaintDropdownOpen && (
            <View className="pl-8">
              {complaintOptions.map((complaint) => (
                <TouchableOpacity
                  key={complaint}
                  onPress={() => handleComplaintSelect(complaint)}
                  className={`flex-row items-center py-2 px-4 rounded-lg my-1 ${
                    selectedComplaint === complaint ? "bg-green-200" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedComplaint === complaint
                        ? "text-black"
                        : "#434343"
                    }`}
                  >
                    {complaint}
                  </Text>
                  {selectedComplaint === complaint && (
                    <View className="absolute right-4">
                      <Ionicons name="checkmark" size={20} color="black" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Logout Button */}
          <TouchableOpacity
            className="flex-row items-center py-3 mb-20"
            onPress={handleLogout}
            disabled={isLoggingOut} // Disable button while logging out
          >
            <Ionicons name="log-out-outline" size={20} color="red" />
            <Text className="flex-1 text-lg ml-2 text-red-500">
              {t("EngProfile.Logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Lottie Animation Overlay */}
      {isLoggingOut && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '120%',
            height: '100%',
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <LottieView
            source={require('../../assets/lottie/newLottie.json')}
            autoPlay
            loop
            style={{ width: 200, height: 200 }}
          />
          <Text 
            style={{
              fontSize: 18,
              color: '#374151',
              marginTop: 20,
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            {t("EngProfile.Logging out") }
          </Text>
        </View>
      )}
    </View>
  );
};

export default EngProfile;