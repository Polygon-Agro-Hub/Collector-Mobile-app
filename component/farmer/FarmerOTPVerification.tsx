import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  SafeAreaView,
  Platform,
} from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { Dimensions } from "react-native";
import { Modal } from "react-native";
import { Animated } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface userItem {
  firstName: string;
  lastName: string;
  phoneNumber: number;
  NICnumber: string;
  district: string;
  accNumber: string;
  accHolderName: string;
  bankName: string;
  branchName: string;
  PreferdLanguage: string;
}

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const ShowSuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  onClose,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 100,
        duration: 2000,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          onClose();
        }, 500);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-2xl items-center w-80 h-96 shadow-lg relative">
          <Text className="text-xl font-bold mt-4 text-center">
            {t("Otpverification.Success")}
          </Text>

          <Image
            source={require("../../assets/images/collection-common/otpsuccess.webp")}
            style={{ width: wp(20), height: wp(20), marginVertical: hp(2) }}
            resizeMode="contain"
          />

          <Text className="text-gray-500 mb-6 text-center">
            {t("Otpverification.Registration")}
          </Text>

          <View className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-2xl overflow-hidden">
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: "#980775",
                width: progress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Otpverification: React.FC = ({ navigation, route }: any) => {
  const {
    firstName,
    lastName,
    NICnumber,
    phoneNumber,
    district,
    accNumber,
    accHolderName,
    bankName,
    branchName,
    PreferdLanguage,
  } = route.params;

  const [otpCode, setOtpCode] = useState<string>("");
  const [maskedCode, setMaskedCode] = useState<string>("XXXXX");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(240);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [disabledResend, setDisabledResend] = useState<boolean>(true);
  const { t } = useTranslation();
  const [language, setLanguage] = useState("en");
  const [isOtpValid, setIsOtpValid] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState<number>(0);
  const [isOtpExpired, setIsOtpExpired] = useState<boolean>(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const selectedLanguage = t("Otpverification.LNG");
    setLanguage(selectedLanguage);
    const fetchReferenceId = async () => {
      try {
        const refId = await AsyncStorage.getItem("referenceId");
        if (refId) {
          setReferenceId(refId);
        }
      } catch (error) {
        console.error("Failed to load referenceId:", error);
      }
    };

    fetchReferenceId();
  }, []);

  useEffect(() => {
    if (timer > 0 && !isVerified) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);

      setDisabledResend(true);

      return () => clearInterval(interval);
    } else if (timer === 0 && !isVerified) {
      setDisabledResend(false);
      setIsOtpExpired(true);
    }
  }, [timer, isVerified]);

  const handleOtpChange = (text: string, index: number) => {
    const updatedOtpCode = otpCode.split("");
    updatedOtpCode[index] = text;
    setOtpCode(updatedOtpCode.join(""));

    setIsOtpValid(updatedOtpCode.length === 5 && !updatedOtpCode.includes(""));

    if (text && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
    if (updatedOtpCode.length === 5) {
      Keyboard.dismiss();
    }
  };

  const handleVerify = async () => {
    const code = otpCode;
    Keyboard.dismiss();

    if (code.length !== 5) {
      Alert.alert(t("Error.Sorry"), t("Otpverification.completeOTP"));
      return;
    }

    if (isOtpExpired) {
      Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"), [
        {
          text: t("Otpverification.ResendOTP"),
          onPress: handleResendOTP,
        },
        {
          text: t("Otpverification.Cancel"),
          style: "cancel",
        },
      ]);
      return;
    }

    try {
      const refId = referenceId;

      const data: userItem = {
        phoneNumber: parseInt(phoneNumber, 10),
        firstName: firstName,
        lastName: lastName,
        NICnumber: NICnumber,
        district: district,
        accNumber: accNumber,
        accHolderName: accHolderName,
        bankName: bankName,
        branchName: branchName,
        PreferdLanguage: PreferdLanguage,
      };

      const url = "https://api.getshoutout.com/otpservice/verify";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      const body = {
        code: code,
        referenceId: refId,
      };

      const response = await axios.post(url, body, { headers });
      const { statusCode, message } = response.data;

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      switch (statusCode) {
        case "1000":
          setIsVerified(true);
          setModalVisible(true);

          const response1 = await axios.post(
            `${environment.API_BASE_URL}api/farmer/register-farmer`,
            data,
          );
          await AsyncStorage.removeItem("referenceId");

          setTimeout(() => {
            navigation.navigate("FarmerQr" as any, {
              NICnumber: response1.data.NICnumber,
              userId: response1.data.userId,
            });
          }, 2000);
          break;

        case "1001":
          setVerificationAttempts((prev) => prev + 1);

          if (verificationAttempts >= 2) {
            Alert.alert(
              t("Error.Sorry"),
              t("Otpverification.OTPExpiredOrInvalid"),
              [
                {
                  text: t("Otpverification.ResendOTP"),
                  onPress: handleResendOTP,
                },
                {
                  text: t("Otpverification.TryAgain"),
                  onPress: () => {
                    setOtpCode("");
                    setIsOtpValid(false);

                    if (inputRefs.current[0]) {
                      inputRefs.current[0]?.focus();
                    }
                  },
                },
              ],
            );
          } else {
            Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
          }
          break;

        case "1002":
          setIsOtpExpired(true);
          Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"), [
            {
              text: t("Otpverification.ResendOTP"),
              onPress: handleResendOTP,
            },
          ]);
          break;

        default:
          Alert.alert(
            t("Error.Sorry"),
            message || t("Error.somethingWentWrong"),
          );
      }
    } catch (error: any) {
      console.error("OTP Verification Error:", error);

      if (error.response?.data?.statusCode === "1002") {
        setIsOtpExpired(true);
        Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"), [
          {
            text: t("Otpverification.ResendOTP"),
            onPress: handleResendOTP,
          },
        ]);
      } else if (error.response?.data?.statusCode === "1001") {
        Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
      } else {
        Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
      }
    }
  };

  const handleResendOTP = async () => {
    await AsyncStorage.removeItem("referenceId");

    try {
      const apiUrl = "https://api.getshoutout.com/otpservice/send";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      let otpMessage = "";
      let companyName = "";

      if (PreferdLanguage === "Sinhala") {
        companyName =
          (await AsyncStorage.getItem("companyNameSinhala")) || "PolygonAgro";
        otpMessage = `${companyName} සමඟ බැංකු විස්තර සත්‍යාපනය සඳහා ඔබගේ OTP: {{code}}
          
  ${accHolderName}
  ${accNumber}
  ${bankName}
  ${branchName}
          
  නිවැරදි නම්, ඔබව සම්බන්ධ කර ගන්නා ${companyName} නියෝජිතයා සමඟ පමණක් OTP අංකය බෙදා ගන්න.`;
      } else if (PreferdLanguage === "Tamil") {
        companyName =
          (await AsyncStorage.getItem("companyNameTamil")) || "PolygonAgro";
        otpMessage = `${companyName} உடன் வங்கி விவர சரிபார்ப்புக்கான உங்கள் OTP: {{code}}
          
  ${accHolderName}
  ${accNumber}
  ${bankName}
  ${branchName}
          
  சரியாக இருந்தால், உங்களைத் தொடர்பு கொள்ளும் ${companyName} பிரதிநிதியுடன் மட்டும் OTP ஐப் பகிரவும்.`;
      } else {
        companyName =
          (await AsyncStorage.getItem("companyNameEnglish")) || "PolygonAgro";
        otpMessage = `Your OTP for bank detail verification with ${companyName} is: {{code}}
          
  ${accHolderName}
  ${accNumber}
  ${bankName}
  ${branchName}
          
  If correct, share OTP only with the ${companyName} representative who contacts you.`;
      }

      const body = {
        source: "PolygonAgro",
        transport: "sms",
        content: {
          sms: otpMessage,
        },
        destination: `${phoneNumber}`,
      };

      const response = await axios.post(apiUrl, body, { headers });

      if (response.data.referenceId) {
        await AsyncStorage.setItem("referenceId", response.data.referenceId);
        setReferenceId(response.data.referenceId);

        setIsOtpExpired(false);
        setVerificationAttempts(0);
        setOtpCode("");
        setIsOtpValid(false);
        setTimer(240);
        setDisabledResend(true);

        Alert.alert(t("Otpverification.Success"), t("Error.otpResent"));
      } else {
        Alert.alert(t("Error.Sorry"), t("Error.otpResendFailed"));
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert(t("Error.Sorry"), t("Error.otpResendFailed"));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  // Responsive sizing based on screen dimensions
  const getResponsiveStyles = () => {
    const isSmallDevice = screenWidth < 380;
    const isTablet = screenWidth >= 768;

    return {
      imageWidth: isTablet ? wp(45) : isSmallDevice ? wp(60) : wp(50),
      imageHeight: isTablet ? hp(25) : isSmallDevice ? hp(20) : hp(22),
      imageMarginTop: isTablet ? hp(4) : isSmallDevice ? hp(2) : hp(3),
      otpInputSize: isTablet ? wp(8) : isSmallDevice ? wp(12) : wp(14),
      otpInputTextSize: isTablet ? wp(4) : isSmallDevice ? wp(5) : wp(6),
      titleFontSize: isTablet ? wp(5) : isSmallDevice ? wp(5.5) : wp(6),
      phoneFontSize: isTablet ? wp(3.5) : isSmallDevice ? wp(4) : wp(4.5),
      buttonWidth: (isTablet ? "50%" : "70%") as any,
      buttonHeight: isTablet ? hp(7) : hp(6),
      buttonBorderRadius: isTablet ? wp(5) : wp(10),
      containerPaddingHorizontal: isTablet ? wp(8) : wp(5),
      verticalSpacing: isTablet ? hp(3) : hp(2),
    };
  };

  const styles = getResponsiveStyles();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <CustomHeader
        title={t("")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(3),
        }}
      >
        <View
          className="flex-1 justify-center items-center"
          style={{
            paddingHorizontal: styles.containerPaddingHorizontal,
            paddingTop: styles.imageMarginTop,
          }}
        >
          {/* Image Section */}
          <View style={{ marginBottom: styles.verticalSpacing }}>
            <Image
              source={require("../../assets/images/collection-common/opt.webp")}
              style={{
                width: styles.imageWidth,
                height: styles.imageHeight,
              }}
              resizeMode="contain"
            />
          </View>

          {/* Title Section */}
          <View style={{ marginBottom: styles.verticalSpacing }}>
            <Text
              className="text-black text-center font-bold"
              style={{ fontSize: styles.titleFontSize }}
            >
              {t("Otpverification.EnterCode")}
            </Text>
          </View>

          {/* Phone Number Section */}
          <View style={{ marginBottom: styles.verticalSpacing }}>
            <Text
              className="text-[#0085FF] text-center"
              style={{ fontSize: styles.phoneFontSize }}
            >
              {phoneNumber}
            </Text>
          </View>

          {/* OTP Input Section */}
          <View
            className="flex-row justify-center"
            style={{
              gap: wp(3),
              marginBottom: styles.verticalSpacing,
              paddingHorizontal: wp(2),
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(el: TextInput | null) => {
                  inputRefs.current[index] = el;
                }}
                style={{
                  width: styles.otpInputSize,
                  height: styles.otpInputSize,
                  fontSize: styles.otpInputTextSize,
                  textAlign: "center",
                  borderRadius: wp(3),
                  borderColor: "#FFC738",
                  borderWidth: 2,
                  backgroundColor: "#FFFFFF",
                  color: otpCode[index] ? "#000000" : "#000000",
                }}
                keyboardType="numeric"
                maxLength={1}
                value={otpCode[index] || ""}
                onChangeText={(text) => handleOtpChange(text, index)}
                placeholder={maskedCode[index] || "_"}
                placeholderTextColor="lightgray"
              />
            ))}
          </View>

          {/* Resend Instructions */}
          <View style={{ marginBottom: styles.verticalSpacing / 2 }}>
            <Text
              className="text-md text-[#707070] text-center"
              style={{ fontSize: wp(3.5) }}
            >
              {t("Otpverification.Didreceive")}
            </Text>
          </View>

          {/* Resend Button/Timer */}
          <View style={{ marginBottom: styles.verticalSpacing * 2 }}>
            <Text
              className="text-center underline"
              onPress={disabledResend ? undefined : handleResendOTP}
              style={{
                fontSize: wp(4),
                color: disabledResend ? "#9CA3AF" : "#000000",
                fontWeight: "600",
              }}
            >
              {timer > 0
                ? `${t("Otpverification.Resend in")} ${formatTime(timer)}`
                : `${t("Otpverification.Resend again")}`}
            </Text>
          </View>

          {/* Verify Button */}
          <View
            className="w-full items-center"
            style={{ marginBottom: hp(2) }}
          >
            <TouchableOpacity
              style={{
                width: styles.buttonWidth,
                height: styles.buttonHeight,
                backgroundColor: !isOtpValid || isVerified ? "#9CA3AF" : "#000000",
                borderRadius: styles.buttonBorderRadius,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleVerify}
              disabled={!isOtpValid || isVerified}
              activeOpacity={0.8}
            >
              <Text
                className="text-white font-semibold"
                style={{ fontSize: styles.phoneFontSize }}
              >
                {t("Otpverification.Verify")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ShowSuccessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default Otpverification;