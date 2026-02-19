import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
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
import AntDesign from "react-native-vector-icons/AntDesign";
import { ScrollView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";

const { width: screenWidth } = Dimensions.get("window");

type RootStackParamList = {
  OtpVerification: undefined;
  NextScreen: undefined;
};

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
        <View className="bg-white p-6 rounded-2xl items-center w-72 h-80 shadow-lg relative">
          <Text className="text-xl font-bold mt-4 text-center">
            {t("Otpverification.Success")}
          </Text>

          <Image
            source={require("../../assets/images/New/otpsuccess.png")}
            style={{ width: 100, height: 100 }}
          />

          <Text className="text-gray-500 mb-4">
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
      setIsOtpExpired(true); // Mark OTP as expired when timer reaches 0
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

    // Check if OTP is expired
    if (isOtpExpired) {
      Alert.alert(
        t("Error.Sorry"), 
        t("Otpverification.OTPExpired"),
        [
          {
            text: t("Otpverification.ResendOTP"),
            onPress: handleResendOTP
          },
          {
            text: t("Otpverification.Cancel"),
            style: "cancel"
          }
        ]
      );
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

      // Handle different OTP verification responses
      switch (statusCode) {
        case "1000": // Success
          setIsVerified(true);
          setModalVisible(true);
          
          const response1 = await axios.post(
            `${environment.API_BASE_URL}api/farmer/register-farmer`,
            data
          );
          await AsyncStorage.removeItem("referenceId");
          
          setTimeout(() => {
            navigation.navigate("FarmerQr" as any, {
              NICnumber: response1.data.NICnumber,
              userId: response1.data.userId,
            });
          }, 2000);
          break;

        case "1001": // Invalid or expired OTP
          setVerificationAttempts(prev => prev + 1);
          
          if (verificationAttempts >= 2) {
            // After multiple failed attempts, suggest resending
            Alert.alert(
              t("Error.Sorry"),
              t("Otpverification.OTPExpiredOrInvalid"),
              [
                {
                  text: t("Otpverification.ResendOTP"),
                  onPress: handleResendOTP
                },
                {
                  text: t("Otpverification.TryAgain"),
                  onPress: () => {
                    setOtpCode("");
                    setIsOtpValid(false);
                    // Focus first input
                    if (inputRefs.current[0]) {
                      inputRefs.current[0]?.focus();
                    }
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              t("Error.Sorry"), 
              t("Otpverification.invalidOTP")
            );
          }
          break;

        case "1002": // OTP expired
          setIsOtpExpired(true);
          Alert.alert(
            t("Error.Sorry"),
            t("Otpverification.OTPExpired"),
            [
              {
                text: t("Otpverification.ResendOTP"),
                onPress: handleResendOTP
              }
            ]
          );
          break;

        default:
          Alert.alert(t("Error.Sorry"), message || t("Error.somethingWentWrong"));
      }
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      
      if (error.response?.data?.statusCode === "1002") {
        // OTP expired
        setIsOtpExpired(true);
        Alert.alert(
          t("Error.Sorry"),
          t("Otpverification.OTPExpired"),
          [
            {
              text: t("Otpverification.ResendOTP"),
              onPress: handleResendOTP
            }
          ]
        );
      } else if (error.response?.data?.statusCode === "1001") {
        // Invalid OTP
        Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
      } else {
        Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
      }
    }
  };

  const handleResendOTP = async () => {
    await AsyncStorage.removeItem("referenceId");
    console.log("Phone Number:", phoneNumber);
    
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
        
        // Reset states for new OTP
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

  const dynamicStyles = {
    imageWidth: screenWidth < 400 ? wp(28) : wp(35),
    imageHeight: screenWidth < 400 ? wp(28) : wp(28),
    margingTopForImage: screenWidth < 400 ? wp(1) : wp(16),
    margingTopForBtn: screenWidth < 400 ? wp(0) : wp(10),
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      style={{ paddingHorizontal: wp(4), paddingVertical: hp(2) }}
    >
      <View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={22} color="#000" />
        </TouchableOpacity>
      </View>
      
      <View className="flex justify-center items-center mt-0">
        <Text className="text-black" style={{ fontSize: wp(8) }}>
          {/* {t("OtpVerification.OTPVerification")} */}
        </Text>
      </View>

      <View
        className="flex justify-center items-center"
        style={{ marginTop: dynamicStyles.margingTopForImage }}
      >
        <Image
          source={require("../../assets/images/New/opt.png")}
          style={{
            width: dynamicStyles.imageWidth,
            height: dynamicStyles.imageHeight,
          }}
        />

        <View className="">
          <Text className="mt-3 text-lg text-black text-center font-bold">
            {t("Otpverification.EnterCode")}
          </Text>
        </View>

        {language === "en" ? (
          <View className="mt-5">
            <Text className="text-md text-[#0085FF] text-center pt-1 ">
              {phoneNumber}
            </Text>
          </View>
        ) : (
          <View className="mt-5">
            <Text className="text-md text-[#0085FF] text-center ">
              {phoneNumber}
            </Text>
          </View>
        )}

       

        <View className="flex-row justify-center gap-3 mt-4 px-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <TextInput
              key={index}
              // ref={(el) => (inputRefs.current[index] = el as TextInput)}
                 ref={(el: TextInput | null) => {
        inputRefs.current[index] = el; // assign to array
      }}
              className={`w-12 h-12 text-lg text-center rounded-lg ${
                otpCode[index]
                  ? "bg-[#FFFFFF] text-black pb-2"
                  : "bg-[#FFFFFF] text-black"
              }`}
              keyboardType="numeric"
              maxLength={1}
              value={otpCode[index] || ""}
              onChangeText={(text) => handleOtpChange(text, index)}
              placeholder={maskedCode[index] || "_"}
              placeholderTextColor="lightgray"
              style={{
                borderColor: "#FFC738",
                borderWidth: 2, // Adjust thickness if needed
              }}
            />
          ))}
        </View>

        <View className="mt-5">
          <Text className="text-md text-[#707070] pt-1">
            {t("Otpverification.Didreceive")}
          </Text>
        </View>

        <View className="mt-1 mb-9">
          <Text
            className="mt-3 text-lg text-black text-center underline"
            onPress={disabledResend ? undefined : handleResendOTP}
            style={{ color: disabledResend ? "gray" : "black" }}
          >
            {timer > 0
              ? `${t("Otpverification.Resend in")} ${formatTime(timer)}`
              : `${t("Otpverification.Resend again")}`}
          </Text>
        </View>

        <ShowSuccessModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />

        <View style={{ marginTop: dynamicStyles.margingTopForBtn }}>
          <TouchableOpacity
            style={{ height: hp(7), width: wp(80) }}
            className={`flex items-center justify-center mx-auto rounded-full ${
              !isOtpValid || isVerified ? "bg-gray-400" : "bg-[#000000]"
            }`}
            onPress={handleVerify}
            disabled={!isOtpValid || isVerified}
          >
            <Text className="text-white text-lg">
              {t("Otpverification.Verify")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default Otpverification;