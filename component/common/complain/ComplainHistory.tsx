import store from "@/services/reducxStore";
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
  BackHandler,
} from "react-native";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { AntDesign } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedComplain, setSelectedComplain] = useState<complainItem | null>(
    null,
  );
  const [userFullName, setUserFullName] = useState<string>("User");
  const [userFullNameSi, setUserFullNameSi] = useState<string>("");
  const [userFullNameTa, setUserFullNameTa] = useState<string>("");
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [jobRole, setJobRole] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const getUserNameAndRole = async () => {
      const role = store.getState().auth.jobRole;
      setJobRole(role);

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
    getUserNameAndRole();
  }, [route?.params?.fullname]);

  const getReplierName = (complain: complainItem): string => {
    if (!complain.replyByFirstNameEnglish) {
      return "";
    }

    const appLang = i18n.language || selectedLanguage;

    if (appLang === "si") {
      return `${complain.replyByFirstNameSinhala || ""} ${complain.replyByLastNameSinhala || ""}`.trim();
    } else if (appLang === "ta") {
      return `${complain.replyByFirstNameTamil || ""} ${complain.replyByLastNameTamil || ""}`.trim();
    } else {
      return `${complain.replyByFirstNameEnglish || ""} ${complain.replyByLastNameEnglish || ""}`.trim();
    }
  };

  const getCompanyName = (complain: complainItem): string => {
    if (!complain.companyNameEnglish) {
      return "";
    }

    const appLang = i18n.language || selectedLanguage;

    if (appLang === "si") {
      return complain.companyNameSinhala || "";
    } else if (appLang === "ta") {
      return complain.companyNameTamil || "";
    } else {
      return complain.companyNameEnglish || "";
    }
  };

  const getOfficerName = (complain: complainItem): string => {
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
      const headTitle =
        appLang === "si"
          ? "Collection Centre Head"
          : appLang === "ta"
            ? "Collection Centre Head"
            : "Collection Centre Head";

      const closingWord =
        appLang === "si" ? "මෙයට" : appLang === "ta" ? "இதற்கு" : "Sincerely";

      if (companyName && centerRegCode) {
        return `${closingWord},\n${replierName},\n${headTitle},\n${centerRegCode}\n${companyName}`;
      } else if (companyName) {
        return `${closingWord},\n${replierName},\n${headTitle},\n${companyName}`;
      } else if (centerRegCode) {
        return `${closingWord},\n${replierName},\n${headTitle},\n${centerRegCode}`;
      } else {
        return `${closingWord},\n${replierName},\n${headTitle}`;
      }
    } else if (complain.complainAssign === "DCH") {
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

  const getReplyTemplate = (complain: complainItem): string => {
    const message = complain.reply || "";
    const officerName = getOfficerName(complain);
    const signature = getSignature(complain);
    const replyTime = complain.replyTime
      ? `\n\n${formatDateTime(complain.replyTime)}`
      : "";

    const appLang = i18n.language || selectedLanguage;

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
      const token = store.getState().auth.token;

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
    const timeStr = `${hour12}.${minuteStr} ${ampm}`;

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${timeStr}, ${day} ${month} ${year}`;
  };

  const handleViewReply = (complain: complainItem) => {
    if (complain.reply) {
      setSelectedComplain(complain);
      setModalVisible(true);
    } else {
      Alert.alert(t("ReportHistory.sorry"), t("ReportHistory.NoReply"));
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("SideMenu");
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

      <CustomHeader
        title={t("ReportHistory.Complaints")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.navigate("SideMenu")}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <LottieView
            source={require("../../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
        </View>
      ) : complains.length === 0 ? (
        <View className="flex-1 items-center mt-[-25%] justify-center">
          <LottieView
            source={require("../../../assets/lottie/no-data.json")}
            style={{ width: wp(50), height: hp(20) }}
            autoPlay
            loop
          />
          <Text className="text-center mt-[-5%] text-gray-600">
            {t("ReportHistory.noData")}
          </Text>
        </View>
      ) : (
        <ScrollView
          className=" flex-1  w-full max-w-[500px] mx-auto"
          contentContainerStyle={{
            paddingBottom: jobRole === "Distribution Officer" ? hp(4) : hp(12),
            paddingHorizontal: wp(4),
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
                    <Text className="text-white text-s">
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
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={false}
      >
        <View
          className="flex-1 items-center bg-white bg-opacity-50"
          style={{
            paddingTop: insets.top,
          }}
        >
          <ScrollView
            className="bg-white rounded-lg shadow-lg w-full max-w-md"
            contentContainerStyle={{ padding: 24, paddingBottom: 70 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              className="absolute top-3 right-3 bg-gray-200 p-1 rounded-full"
              onPress={() => setModalVisible(false)}
            >
              <AntDesign name="close" size={18} color="gray" />
            </TouchableOpacity>

            <View className="mt-4">
              <Text className="text-gray-800 text-base leading-relaxed text-left">
                {selectedComplain
                  ? getReplyTemplate(selectedComplain)
                  : "Loading..."}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ComplainHistory;
