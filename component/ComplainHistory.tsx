import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  Platform,
  Dimensions,
  BackHandler,
} from "react-native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "./types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";

interface complainItem {
  id: number;
  createdAt: string;
  complain: string;
  language: string;
  complainCategory: string;
  status: "Opened" | "Closed";
  reply?: string;
  refNo: string;
  complainAssign?: string;
  replyTime?: string;
  replyByOfficerName?: string;
  replierCenterId?: string;
  companyName?: string;
  replyByFirstNameEnglish?: string;
  replyByFirstNameSinhala?: string;
  replyByFirstNameTamil?: string;
  replyByLastNameEnglish?: string;
  replyByLastNameSinhala?: string;
  replyByLastNameTamil?: string;
  companyNameEnglish?: string;
  companyNameSinhala?: string;
  companyNameTamil?: string;
  replierCenterName?: string;
  replierCenterRegCode?: string;
}

type ComplainHistoryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ComplainHistory"
>;

interface ComplainHistoryProps {
  navigation: ComplainHistoryNavigationProp;
  route?: {
    params?: {
      fullname?: string;
    };
  };
}

const ComplainHistory: React.FC<ComplainHistoryProps> = ({
  navigation,
  route,
}) => {
  const [complains, setComplains] = useState<complainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("en");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedComplain, setSelectedComplain] = useState<complainItem | null>(
    null,
  );
  const [userFullName, setUserFullName] = useState<string>("User");
  const [userFullNameSi, setUserFullNameSi] = useState<string>("");
  const [userFullNameTa, setUserFullNameTa] = useState<string>("");
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const LanguageSelect = (lang: string) => {
    setLanguage(lang);
  };

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

      if (i18n.language === "en") {
        LanguageSelect("en");
        setSelectedLanguage("en");
      } else if (i18n.language === "si") {
        LanguageSelect("si");
        setSelectedLanguage("si");
      } else if (i18n.language === "ta") {
        LanguageSelect("ta");
        setSelectedLanguage("ta");
      }
      fetchSelectedLanguage();
    }, [i18n.language]),
  );

  // Get user's full name from route params or AsyncStorage
  useEffect(() => {
    const getUserName = async () => {
      if (route?.params?.fullname) {
        setUserFullName(route.params.fullname);
      } else {
        const storedName = await AsyncStorage.getItem("fullname");
        const storedNameSi = await AsyncStorage.getItem("fullnameSi");
        const storedNameTa = await AsyncStorage.getItem("fullnameTa");

        if (storedName) setUserFullName(storedName);
        if (storedNameSi) setUserFullNameSi(storedNameSi);
        if (storedNameTa) setUserFullNameTa(storedNameTa);
      }
    };
    getUserName();
  }, [route?.params?.fullname]);

  // Get replier name based on APP language (not complaint language)
  const getReplierName = (complain: complainItem): string => {
    if (!complain.replyByFirstNameEnglish) {
      return "";
    }

    // Use app language from i18n
    const appLang = i18n.language || selectedLanguage;

    if (appLang === "si") {
      return `${complain.replyByFirstNameSinhala || ""} ${complain.replyByLastNameSinhala || ""}`.trim();
    } else if (appLang === "ta") {
      return `${complain.replyByFirstNameTamil || ""} ${complain.replyByLastNameTamil || ""}`.trim();
    } else {
      return `${complain.replyByFirstNameEnglish || ""} ${complain.replyByLastNameEnglish || ""}`.trim();
    }
  };

  // Get company name based on APP language (not complaint language)
  const getCompanyName = (complain: complainItem): string => {
    if (!complain.companyNameEnglish) {
      return "";
    }

    // Use app language from i18n
    const appLang = i18n.language || selectedLanguage;

    if (appLang === "si") {
      return complain.companyNameSinhala || "";
    } else if (appLang === "ta") {
      return complain.companyNameTamil || "";
    } else {
      return complain.companyNameEnglish || "";
    }
  };

  // Get officer name (recipient) based on APP language (not complaint language)
  const getOfficerName = (complain: complainItem): string => {
    // Use app language from i18n
    const appLang = i18n.language || selectedLanguage;

    if (appLang === "si") {
      return userFullNameSi || userFullName;
    } else if (appLang === "ta") {
      return userFullNameTa || userFullName;
    } else {
      return userFullName;
    }
  };

  const getSignature = (complain: complainItem): string => {
    const replierName = getReplierName(complain);
    const companyName = getCompanyName(complain);
    const centerRegCode = complain.replierCenterRegCode || "";

    // Use app language from i18n
    const appLang = i18n.language || selectedLanguage;

    if (complain.complainAssign === "Admin") {
      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      const teamName =
        appLang === "si"
          ? "Polygon පාරිභෝගික සහාය කණ්ඩායම"
          : appLang === "ta"
            ? "Polygon வாடிக்கையாளர் ஆதரவு குழு"
            : "Polygon Customer Support Team";

      return `${closingWord},\n${teamName}`;
    } else if (complain.complainAssign === "CCH") {
      // Collection Centre Head
      const headTitle =
        appLang === "si"
          ? "Collection Centre Head"
          : appLang === "ta"
            ? "Collection Centre Head"
            : "Collection Centre Head";

      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      if (companyName && centerRegCode) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${centerRegCode}\n${companyName}`;
      } else if (companyName) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${companyName}`;
      } else if (centerRegCode) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${centerRegCode}`;
      } else {
        return `${closingWord}, ${replierName}\n${headTitle}`;
      }
    } else if (complain.complainAssign === "DCH") {
      // Distribution Centre Head
      const headTitle =
        appLang === "si"
          ? "Distribution Centre Head"
          : appLang === "ta"
            ? "Distribution Centre Head"
            : "Distribution Centre Head";

      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      if (companyName && centerRegCode) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${centerRegCode}\n${companyName}`;
      } else if (companyName) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${companyName}`;
      } else if (centerRegCode) {
        return `${closingWord}, ${replierName}\n${headTitle}\n${centerRegCode}`;
      } else {
        return `${closingWord}, ${replierName}\n${headTitle}`;
      }
    } else if (complain.complainAssign === "CCM") {
      // Collection Centre Manager
      const managerTitle =
        appLang === "si"
          ? "Collection Centre Manager"
          : appLang === "ta"
            ? "Collection Centre Manager"
            : "Collection Centre Manager";

      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      const line1 = `${closingWord}, ${replierName}`;
      const line2 = centerRegCode
        ? `${managerTitle} of ${centerRegCode}`
        : `${managerTitle}`;

      if (companyName) {
        return `${line1}\n${line2}\n${companyName}`;
      } else {
        return `${line1}\n${line2}`;
      }
    } else {
      // DCM - Distribution Centre Manager
      const managerTitle =
        appLang === "si"
          ? "Distribution Centre Manager"
          : appLang === "ta"
            ? "Distribution Centre Manager"
            : "Distribution Centre Manager";

      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      const line1 = `${closingWord}, ${replierName}`;
      const line2 = centerRegCode
        ? `${managerTitle} of ${centerRegCode}`
        : `${managerTitle}`;

      if (companyName) {
        return `${line1}\n${line2}\n${companyName}`;
      } else {
        return `${line1}\n${line2}`;
      }
    }
  };

  // Reply templates based on APP language (not complaint language)
  const getReplyTemplate = (complain: complainItem): string => {
    const message = complain.reply || "";
    const officerName = getOfficerName(complain);
    const signature = getSignature(complain);
    const replyTime = complain.replyTime
      ? `\n\n${formatDateTime(complain.replyTime)}`
      : "";

    // Use app language from i18n (NOT complaint language)
    const appLang = i18n.language || selectedLanguage;

    console.log("Template language:", appLang, "(from i18n.language)");
    console.log("Complaint backend language:", complain.language, "(IGNORED)");

    const templates = {
      si: `හිතවත් ${officerName},

අපි ඔබේ පැමිණිල්ල විසඳා ඇති බව දැනුම් දීමට සතුටු වෙමු.

${message}

ඔබට තවත් ගැටළු හෝ ප්‍රශ්න තිබේ නම්, කරුණාකර අප හා සම්බන්ධ වන්න. ඔබේ ඉවසීම සහ අවබෝධය වෙනුවෙන් ස්තූතියි.

${signature}${replyTime}`,

      en: `Dear ${officerName},

We are pleased to inform you that your complaint has been resolved.

${message}

If you have any further concerns or questions, feel free to reach out. Thank you for your patience and understanding.

${signature}${replyTime}`,

      ta: `அன்புள்ள ${officerName},

நாங்கள் உங்கள் புகாரை தீர்க்கப்பட்டதாக தெரிவித்ததில் மகிழ்ச்சி அடைகிறோம்.

${message}

உங்களுக்கு மேலும் ஏதேனும் சிக்கல்கள் அல்லது கேள்விகள் இருந்தால், தயவுசெய்து எங்களைத் தொடர்பு கொள்ளவும். உங்கள் பொறுமைக்கும் புரிதலுக்கும் நன்றி.

${signature}${replyTime}`,
    };

    return templates[appLang as keyof typeof templates] || templates.en;
  };

  const fetchComplaints = async () => {
    try {
      setLanguage(t("MyCrop.LNG"));
      const token = await AsyncStorage.getItem("token");
      console.log(token);

      const res = await axios.get<complainItem[]>(
        `${environment.API_BASE_URL}api/complain/get-complains`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setComplains(res.data);
    } catch (err) {
      // Alert.alert(t("ReportHistory.sorry"), t("ReportHistory.noData"));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchComplaints();
    }, []),
  );

  const formatDateTime = (isoDate: string) => {
    const date = new Date(isoDate);

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, "0");
    const timeStr = `${hour12}.${minuteStr}${ampm}`;

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${timeStr}, ${day} ${month} ${year}`;
  };

  const handleViewReply = (complain: complainItem) => {
    if (complain.reply) {
      console.log("App language:", i18n.language);
      console.log("Complaint backend language (ignored):", complain.language);
      setSelectedComplain(complain);
      setModalVisible(true);
    } else {
      Alert.alert(t("ReportHistory.sorry"), t("ReportHistory.NoReply"));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("EngProfile");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View
        className="flex-row justify-between"
        style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("EngProfile")}
          className="bg-[#f3f3f380] rounded-full p-2 justify-center w-10"
        >
          <AntDesign name="left" size={24} color="#000502" />
        </TouchableOpacity>

        <Text className="font-bold text-lg mt-2">
          {t("ReportHistory.Complaints")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <LottieView
            source={require("../assets/lottie/newLottie.json")}
            autoPlay
            loop
            style={{ width: 300, height: 300 }}
          />
        </View>
      ) : complains.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <LottieView
            source={require("../assets/lottie/NoComplaints.json")}
            style={{ width: wp(50), height: hp(50) }}
            autoPlay
            loop
          />
          <Text className="text-center text-gray-600 mt-4">
            {t("ReportHistory.noData")}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="p-4 flex-1 mb-14"
          contentContainerStyle={{
            paddingBottom: hp(4),
            paddingHorizontal: wp(2),
          }}
        >
          {complains.map((complain) => (
            <View
              key={complain.id}
              className="bg-white p-6 my-2 rounded-xl shadow-md border border-[#CFCFCF]"
            >
              <Text className="self-start mb-4 font-semibold">
                {t("ReportHistory.RefNo")} : {complain.refNo}
              </Text>
              <Text className="self-start mb-4 text-[#6E6E6E]">
                {t("ReportHistory.Sent")} {formatDateTime(complain.createdAt)}
              </Text>

              <Text className="self-start mb-4">{complain.complain}</Text>
              <View className="flex-row justify-between items-center">
                {complain.status === "Closed" && (
                  <TouchableOpacity
                    className="bg-black px-3 py-2 rounded"
                    onPress={() => handleViewReply(complain)}
                  >
                    <Text className="text-white text-xs">
                      {t("ReportHistory.View")}
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text
                    className={`text-s font-semibold px-4 py-2 rounded ${
                      complain.status === "Opened"
                        ? "bg-blue-100 text-[#0051FF]"
                        : "bg-[#FFDFF7] text-[#980775]"
                    }`}
                  >
                    {complain.status === "Opened"
                      ? t("ReportHistory.Opened")
                      : t("ReportHistory.Closed")}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="flex-1 bg-[#FFFFFF]">
          <View
            className="flex-1"
            style={{
              paddingTop:
                Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
              paddingBottom: Platform.OS === "android" ? 20 : 0,
            }}
          >
            <View className="flex-1" style={{ padding: wp(4) }}>
              <View className="p-4 bg-white rounded-xl w-full mb-4">
                <Text className="text-lg font-bold">{t("Thank You")}</Text>

                {/* <ScrollView className="mt-8" style={{ maxHeight: hp(55) }}> */}
                <ScrollView
                  className="mt-8"
                  style={{ maxHeight: Dimensions.get("window").height * 0.7 }}
                >
                  <Text className="pb-4" style={{ lineHeight: 24 }}>
                    {selectedComplain
                      ? getReplyTemplate(selectedComplain)
                      : "Loading..."}
                  </Text>
                </ScrollView>
              </View>

              <View className="mt-auto" style={{ paddingBottom: 20 }}>
                <TouchableOpacity
                  className="bg-black py-4 rounded-lg items-center"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-white text-lg">
                    {t("ReportHistory.Closed")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ComplainHistory;
