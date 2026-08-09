import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { useFocusEffect } from "@react-navigation/native";
import { AlertModal } from "@/component/components/popup/AlertModal";

const Otpverification: React.FC = ({ navigation, route }: any) => {
  const {
    farmerId,
    NICnumber,
    phoneNumber,
    accNumber,
    accHolderName,
    bankName,
    branchName,
    PreferdLanguage,
    officerRole,
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
  const [failModalVisible, setFailModalVisible] = useState(false);
  // const [verificationAttempts, setVerificationAttempts] = useState<number>(0);
  const [isOtpExpired, setIsOtpExpired] = useState<boolean>(false);
  const [farmerData, setFarmerData] = useState<{
    NICnumber: string;
    userId: string;
  } | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useFocusEffect(
    useCallback(() => {
      setOtpCode("");
      setIsOtpValid(false);
      setTimer(240);
      setDisabledResend(true);
      setIsVerified(false);
      setIsOtpExpired(false);
      //  setVerificationAttempts(0);
      setModalVisible(false);
      setFailModalVisible(false);
      inputRefs.current.forEach((ref) => ref?.clear());

      const fetchReferenceId = async () => {
        try {
          const refId = await AsyncStorage.getItem("referenceId");
          if (refId) setReferenceId(refId);
        } catch (error) {
          console.error("Failed to load referenceId:", error);
        }
      };
      fetchReferenceId();
    }, []),
  );

  useEffect(() => {
    const selectedLanguage = t("Otpverification.LNG");
    setLanguage(selectedLanguage);
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
    }
  }, [timer, isVerified]);

  useEffect(() => {
    const backAction = () => {
      navigation.navigate("UpdateFarmerBankDetails" as any, {
        id: farmerId,
        NICnumber: NICnumber,
        phoneNumber: phoneNumber,
        PreferdLanguage: PreferdLanguage,
        officerRole: "COO",
        comingFromOtp: true,
      });
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [navigation]);

  const handleSuccessCompletion = () => {
    setModalVisible(false);
    if (farmerData) {
      navigation.navigate("FarmerQr" as any, {
        NICnumber: farmerData.NICnumber,
        userId: farmerData.userId,
      });
    }
  };

  const handleFailCompletion = () => {
    setFailModalVisible(false);
  };

  const handleOtpChange = (text: string, index: number) => {
    const filtered = text.replace(/[^0-9]/g, "");
    if (!filtered && text.length > 0) return;

    const updatedOtpCode = otpCode.split("");
    updatedOtpCode[index] = filtered;

    for (let i = 0; i < 5; i++) {
      if (updatedOtpCode[i] === undefined) updatedOtpCode[i] = "";
    }

    setOtpCode(updatedOtpCode.join(""));
    setIsOtpValid(updatedOtpCode.every((c) => c !== ""));

    if (filtered && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
    if (updatedOtpCode.every((c) => c !== "")) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      const updatedOtpCode = otpCode.split("");

      if (updatedOtpCode[index]) {
        updatedOtpCode[index] = "";
        setOtpCode(updatedOtpCode.join(""));
        setIsOtpValid(false);
      } else if (index > 0) {
        updatedOtpCode[index - 1] = "";
        setOtpCode(updatedOtpCode.join(""));
        setIsOtpValid(false);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const code = otpCode;
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
      Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"));
      return;
    }

    try {
      const refId = referenceId;
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

          const saveResponse = await axios.post(
            `${environment.API_BASE_URL}api/farmer/FarmerBankDetails`,
            {
              accNumber,
              accHolderName,
              bankName,
              branchName,
              userId: farmerId,
              NICnumber,
            },
          );

          await AsyncStorage.removeItem("referenceId");

          if (saveResponse.status === 200) {
            setFarmerData({
              NICnumber: saveResponse.data.NICnumber,
              userId: saveResponse.data.userId,
            });
            setModalVisible(true);
          } else {
            setFailModalVisible(true);
          }
          break;
        // case "1001":
        //   setVerificationAttempts((prev: number) => prev + 1);

        //   if (verificationAttempts >= 2) {
        //     Alert.alert(
        //       t("Error.Sorry"),
        //       t("Otpverification.OTPExpiredOrInvalid"),
        //       [
        //         {
        //           text: t("Otpverification.ResendOTP"),
        //           onPress: handleResendOTP,
        //         },
        //         {
        //           text: t("Otpverification.TryAgain"),
        //           onPress: () => {
        //             setOtpCode("");
        //             setIsOtpValid(false);
        //             inputRefs.current.forEach((ref) => ref?.clear());
        //             inputRefs.current[0]?.focus();
        //           },
        //         },
        //       ],
        //     );
        //   } else {
        //     Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
        //   }
        //   break;

        case "1002":
          setIsOtpExpired(true);
          Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"));
          break;

        default:
          Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
      }
    } catch (error: any) {
      console.error("OTP Verification Error:", error);

      const errStatusCode = error.response?.data?.statusCode;

      if (errStatusCode === "1002") {
        setIsOtpExpired(true);
        Alert.alert(t("Error.Sorry"), t("Otpverification.OTPExpired"));
      } else if (errStatusCode === "1001") {
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
        otpMessage = `${companyName} සමඟ බැංකු විස්තර සත්‍යාපනය සඳහා ඔබගේ OTP: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nනිවැරදි නම්, ඔබව සම්බන්ධ කර ගන්නා ${companyName} නියෝජිතයා සමඟ පමණක් OTP අංකය බෙදා ගන්න.`;
      } else if (PreferdLanguage === "Tamil") {
        companyName =
          (await AsyncStorage.getItem("companyNameTamil")) || "PolygonAgro";
        otpMessage = `${companyName} உடன் வங்கி விவர சரிபார்ப்புக்கான உங்கள் OTP: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nசரியாக இருந்தால், உங்களைத் தொடர்பு கொள்ளும் ${companyName} பிரதிநிதியுடன் மட்டும் OTP ஐப் பகிரவும்.`;
      } else {
        companyName =
          (await AsyncStorage.getItem("companyNameEnglish")) || "PolygonAgro";
        otpMessage = `Your OTP for bank detail verification with ${companyName} is: {{code}}\n\n${accHolderName}\n${accNumber}\n${bankName}\n${branchName}\n\nIf correct, share OTP only with the ${companyName} representative who contacts you.`;
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
        Alert.alert(t("Otpverification.Success"), t("Error.otpResent"));
        setTimer(240);
        setDisabledResend(true);
        setIsOtpExpired(false);
        //  setVerificationAttempts(0);
        setOtpCode("");
        setIsOtpValid(false);
        inputRefs.current.forEach((ref) => ref?.clear());
        inputRefs.current[0]?.focus();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      className="bg-white"
      style={{ flex: 1 }}
    >
      <CustomHeader
        title={t("")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("UpdateFarmerBankDetails" as any, {
            id: farmerId,
            NICnumber: NICnumber,
            phoneNumber: phoneNumber,
            PreferdLanguage: PreferdLanguage,
            officerRole: "COO",
            comingFromOtp: true,
          })
        }
      />
      <ScrollView
        className="flex-1 bg-white w-full max-w-[500px] mx-auto"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 32,
          justifyContent: "center",
        }}
      >
        <View className="flex justify-center items-center px-[20px] pt-[15px]">
          <View className="mb-[32px]">
            <Image
              source={require("../../../../assets/images/collection-common/opt.webp")}
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

          <View className="flex-row justify-center gap-x-[10px] mb-[32px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(el: TextInput | null) => {
                  inputRefs.current[index] = el;
                }}
                className="w-[51px] h-[48px] text-[24px] text-center rounded-[10px] bg-white text-black border-[#FFC738] border-[1px]"
                style={{
                  height: 52,
                  paddingTop: 10,
                  paddingBottom: 10,
                  includeFontPadding: false,
                  textAlignVertical: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 4,
                }}
                keyboardType="numeric"
                maxLength={1}
                value={otpCode[index] || ""}
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
                  fontSize: 18,
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

          <AlertModal
            visible={modalVisible}
            title={t("BankDetailsUpdate.Success")}
            message={t("BankDetailsUpdate.SuccessMessage")}
            type="success"
            duration={2000}
            onClose={handleSuccessCompletion}
          />

          <AlertModal
            visible={failModalVisible}
            title={t("BankDetailsUpdate.Failed")}
            message={t("BankDetailsUpdate.FailedMessage")}
            type="error"
            duration={2000}
            onClose={handleFailCompletion}
          />

          <View className="w-full items-center" style={{ marginBottom: 52 }}>
            <TouchableOpacity
              className={`w-[281px] h-[50px] rounded-[20px] items-center justify-center ${
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
    </KeyboardAvoidingView>
  );
};

export default Otpverification;
