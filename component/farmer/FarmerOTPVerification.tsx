import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  BackHandler,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";
import { useFocusEffect } from "@react-navigation/native";
import { AlertModal } from "../commons/AlertModal";

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

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", ""]);
  const [maskedCode] = useState<string>("XXXXX");
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
  const pendingNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    const selectedLanguage = t("Otpverification.LNG");
    setLanguage(selectedLanguage);

    const fetchReferenceId = async () => {
      try {
        const refId = await AsyncStorage.getItem("referenceId");
        if (refId) setReferenceId(refId);
      } catch (error) {
        console.error("Failed to load referenceId:", error);
      }
    };

    fetchReferenceId();

    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    if (timer > 0 && !isVerified) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      setDisabledResend(true);
      return () => clearInterval(interval);
    } else if (timer === 0 && !isVerified) {
      setDisabledResend(false);
      setIsOtpExpired(true);
    }
  }, [timer, isVerified]);

  const handleOtpChange = (text: string, index: number) => {
    const sanitized = text.replace(/[^0-9]/g, "");

    const updated = [...otpDigits];
    updated[index] = sanitized;
    setOtpDigits(updated);

    const filled = updated.every((d) => d !== "");
    setIsOtpValid(filled);

    if (sanitized && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    if (filled) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otpDigits[index] !== "") {
        const updated = [...otpDigits];
        updated[index] = "";
        setOtpDigits(updated);
        setIsOtpValid(false);
      } else if (index > 0) {
        const updated = [...otpDigits];
        updated[index - 1] = "";
        setOtpDigits(updated);
        setIsOtpValid(false);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const code = otpDigits.join("");
    Keyboard.dismiss();

    if (code.length !== 5) {
      Alert.alert(t("Error.Sorry"), t("Otpverification.completeOTP"));
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(t("Error.Sorry"), t("Error.noInternet"));
      return;
    }

    if (isOtpExpired || timer === 0) {
      Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"), [
        { text: t("Otpverification.ResendOTP"), onPress: handleResendOTP },
        { text: t("Otpverification.Cancel"), style: "cancel" },
      ]);
      return;
    }

    try {
      const refId = referenceId;

      const data: userItem = {
        phoneNumber: parseInt(phoneNumber, 10),
        firstName,
        lastName,
        NICnumber,
        district,
        accNumber,
        accHolderName,
        bankName,
        branchName,
        PreferdLanguage,
      };

      const url = "https://api.getshoutout.com/otpservice/verify";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      const response = await axios.post(
        url,
        { code, referenceId: refId },
        { headers },
      );
      const { statusCode, message } = response.data;

      switch (statusCode) {
        case "1000":
          setIsVerified(true);

          const response1 = await axios.post(
            `${environment.API_BASE_URL}api/farmer/register-farmer`,
            data,
          );
          await AsyncStorage.removeItem("referenceId");

          setModalVisible(true);

          
          setTimeout(() => {
            setModalVisible(false);
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
                    setOtpDigits(["", "", "", "", ""]);
                    setIsOtpValid(false);
                    inputRefs.current[0]?.focus();
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
            { text: t("Otpverification.ResendOTP"), onPress: handleResendOTP },
          ]);
          break;

        default:
          Alert.alert(
            t("Error.Sorry"),
            t("Otpverification.invalidOTP"),
          );
      }
    } catch (error: any) {
      console.error("OTP Verification Error:", error);

      const errStatusCode = error.response?.data?.statusCode;

      if (errStatusCode === "1002") {
        setIsOtpExpired(true);
        Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"), [
          { text: t("Otpverification.ResendOTP"), onPress: handleResendOTP },
        ]);
      } else if (errStatusCode === "1001") {
        Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
      } else {
        Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
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
        content: { sms: otpMessage },
        destination: `${phoneNumber}`,
      };

      const response = await axios.post(apiUrl, body, { headers });

      if (response.data.referenceId) {
        await AsyncStorage.setItem("referenceId", response.data.referenceId);
        setReferenceId(response.data.referenceId);

        setIsOtpExpired(false);
        setVerificationAttempts(0);
        setOtpDigits(["", "", "", "", ""]);
        setIsOtpValid(false);
        setTimer(240);
        setDisabledResend(true);

        Alert.alert(t("Otpverification.Success"), t("Error.otpResent"));
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
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

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("UnregisteredFarmerDetails" as any, {
          NIC: NICnumber,
        });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  const hasLeftUnverified = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasLeftUnverified.current && !isVerified) {
        setOtpDigits(["", "", "", "", ""]);
        setIsOtpValid(false);
        setTimer(240);
        setDisabledResend(true);
        setIsOtpExpired(false);
        setVerificationAttempts(0);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }

      return () => {
        if (!isVerified) {
          hasLeftUnverified.current = true;
        }
      };
    }, [isVerified]),
  );

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("UnregisteredFarmerDetails" as any, {
            NIC: NICnumber,
          })
        }
      />

      <ScrollView
        className="flex-1 bg-white w-full max-w-[500px] mx-auto"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 32,
        }}
      >
        <View className="flex-1 justify-center items-center px-[20px] pt-[24px]">
          <View className="mb-[32px]">
            <Image
              source={require("../../assets/images/collection-common/opt.webp")}
              className="w-[180px] h-[160px]"
              resizeMode="contain"
            />
          </View>

          <View className="mb-7">
            <Text className="text-black text-center font-bold text-[22px]">
              {t("Otpverification.EnterCode")}
            </Text>
          </View>

          <View className="mb-5">
            <Text className="text-[#0085FF] text-center text-[16px]">
              {phoneNumber
                ? phoneNumber.replace(
                    /^(\+94|94|0)?(\d{2})(\d{3})(\d{4})$/,
                    "+94 $2 $3 $4",
                  )
                : phoneNumber}
            </Text>
          </View>

          {/* OTP Input Boxes */}
          <View className="flex-row justify-center gap-x-[10px] mb-[32px] pr-[16px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(el: TextInput | null) => {
                  inputRefs.current[index] = el;
                }}
                className="w-[51px] text-[20px] text-center rounded-[10px] bg-white text-black border-[#FFC738]"
                style={{
                  height: 52,
                  paddingTop: 10,
                  paddingBottom: 10,
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  borderWidth: otpDigits[index] !== "" ? 2 : 1,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
                keyboardType="number-pad"
                maxLength={1}
                autoCorrect={false}
                autoCapitalize="none"
                value={otpDigits[index]}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                placeholder={maskedCode[index] || "_"}
                placeholderTextColor="lightgray"
              />
            ))}
          </View>

          <View className="mb-[16px]">
            <Text className="text-[#707070] text-center text-base font-medium">
              {t("Otpverification.Didreceive")}
            </Text>
          </View>

          <View className="mb-[64px]">
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={disabledResend}
              activeOpacity={0.7}
            >
              <Text
                className="text-center underline"
                style={{
                  fontSize: 16,
                  color: disabledResend ? "#9CA3AF" : "#000000",
                  fontWeight: "600",
                }}
              >
                {timer > 0
                  ? `${t("Otpverification.Resend in")} ${formatTime(timer)}`
                  : `${t("Otpverification.Resend again")}`}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="w-full items-center" style={{ marginBottom: 8 }}>
            <TouchableOpacity
              className={`w-[281px] h-[50px] rounded-[20px] items-center justify-center mb-20 ${
                !isOtpValid || isVerified ? "bg-[#9CA3AF]" : "bg-black"
              }`}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 4,
              }}
              onPress={handleVerify}
              disabled={!isOtpValid || isVerified}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-[18px]">
                {t("Otpverification.Verify")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AlertModal
        type="success"
        visible={modalVisible}
        title={t("Otpverification.Success")}
        message={t("Otpverification.Registration")}
        duration={2000}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

export default Otpverification;