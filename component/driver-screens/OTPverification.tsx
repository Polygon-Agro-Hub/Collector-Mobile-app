import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {environment }from '@/environment/environment';
import { useTranslation } from "react-i18next";
import { Dimensions } from "react-native";
import { Modal } from "react-native";
import { Animated } from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { ScrollView } from "react-native-gesture-handler";

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
  onComplete: () => void;
}
const ShowSuccessModal: React.FC<SuccessModalProps> = ({ visible, onClose , onComplete}) => {
  const progress = useRef(new Animated.Value(0)).current; // Start from 0
  const { t } = useTranslation();

  useEffect(() => {
    if (visible) {
      progress.setValue(0); // Reset progress
      Animated.timing(progress, {
        toValue: 100, // Full progress
        duration: 2000, // Adjust timing
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          onComplete(); // Trigger navigation or any completion action
        }, 500);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-2xl items-center w-72 h-80 shadow-lg relative">
          <Text className="text-xl font-bold mt-4 text-center"> {t("Otpverification.Success")}</Text>

          <Image source={require("../../assets/images/success.webp")} style={{ width: 100, height: 100 }} />

          <Text className="text-gray-500 mb-4">{t("Otpverification.Registration")}</Text>

          <TouchableOpacity className="bg-[#2AAD7A] px-6 py-2 rounded-full mt-6" onPress={() => { onClose(); onComplete(); }}>
            <Text className="text-white font-semibold">{t("Otpverification.OK")}</Text>
          </TouchableOpacity>

          {/* Progress Bar - Fixed to Bottom */}
          <View className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-2xl overflow-hidden">
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: "#2AAD7A",
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
    PreferdLanguage } = route.params;
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


const inputRefs = useRef<Array<TextInput | null>>([]);
  
  const handleSuccessCompletion = () => {
    // This function will handle navigation after success
    setModalVisible(false);
    navigation.navigate("SearchFarmerScreen" as any); // Navigate to main screen
  };

  
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
    }
  }, [timer, isVerified]);


  const handleOtpChange = (text: string, index: number) => {
    // Update the OTP code based on input change
    const updatedOtpCode = otpCode.split(""); 
    updatedOtpCode[index] = text; // Modify the specific index
    setOtpCode(updatedOtpCode.join(""));

    // Check if OTP is valid (all 5 digits filled)
    setIsOtpValid(updatedOtpCode.length === 5 && !updatedOtpCode.includes(""));

    // Move to next input field if text is entered
if (text && inputRefs.current[index + 1]) {
    inputRefs.current[index + 1]?.focus();
  }
    if(updatedOtpCode.length === 5){
      Keyboard.dismiss();
    }
  };

  const handleVerify = async () => {
    const code = otpCode;

    if (code.length !== 5) {
      Alert.alert(
        t("Error.Sorry"),
        t("Otpverification.completeOTP")
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
        PreferdLanguage: PreferdLanguage
      };
      // Shoutout verify endpoint
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
      const { statusCode } = response.data;

      if (statusCode === "1000") {
        setIsVerified(true);
        setModalVisible(true);

        const response1 = await axios.post(
          `${environment.API_BASE_URL}api/farmer/register-farmer`,
          data
        );
        await AsyncStorage.removeItem("referenceId");
        //Alert.alert("Success","Farmer Registration successful");
<ShowSuccessModal visible={modalVisible} onClose={() => setModalVisible(false)} onComplete={handleSuccessCompletion} />;
        navigation.navigate("SearchFarmerScreen" as any);     
       } else if (statusCode === "1001") {
        Alert.alert(
          t("Error.Sorry"),
          t("Otpverification.invalidOTP")
        );
      } else {
        Alert.alert(
          t("Error.Sorry"),
          t("Error.somethingWentWrong")
        );
      }
    } catch (error) {
      Alert.alert(
        t("Error.Sorry"),
        t("Error.somethingWentWrong")
      );
    }
  };

  
  // Resend OTP
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
      if(PreferdLanguage === "English"){
        companyName = (await AsyncStorage.getItem("companyNameSinhala")) || "AgroWorld";
        otpMessage = `Your OTP for bank detail verification with ${companyName} is: {{code}}
        
${accHolderName}
${accNumber}
${bankName}
${branchName}
        
If correct, share OTP only with the ${companyName} representative who contacts you.`;

      }else if(PreferdLanguage === "Sinhala"){
        companyName = (await AsyncStorage.getItem("companyNameSinhala")) || "AgroWorld";
        otpMessage = `${companyName} සමඟ බැංකු විස්තර සත්‍යාපනය සඳහා ඔබගේ OTP: {{code}}
        
${accHolderName}
${accNumber}
${bankName}
${branchName}
        
නිවැරදි නම්, ඔබව සම්බන්ධ කර ගන්නා ${companyName} නියෝජිතයා සමඟ පමණක් OTP අංකය බෙදා ගන්න.`;
      }else if(PreferdLanguage === "Tamil"){
        companyName = (await AsyncStorage.getItem("companyNameTamil")) || "AgroWorld";
        otpMessage = `${companyName} உடன் வங்கி விவர சரிபார்ப்புக்கான உங்கள் OTP: {{code}}
        
${accHolderName}
${accNumber}
${bankName}
${branchName}
        
சரியாக இருந்தால், உங்களைத் தொடர்பு கொள்ளும் ${companyName} பிரதிநிதியுடன் மட்டும் OTP ஐப் பகிரவும்.`;
      }
      const body = {
        source: "AgroWorld",
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
        Alert.alert(
          t("Otpverification.Success"),
          t("Error.otpResent")
        );
        setTimer(240);
        setDisabledResend(true);
      } else {
        Alert.alert(
          t("Error.Sorry"),
          t("Error.otpResendFailed")
        );
      }
    } catch (error) {
      Alert.alert(
        t("Error.Sorry"),
        t("Error.otpResendFailed")
      );
    }
  };

  // Format the timer for display
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
    <KeyboardAvoidingView 
            behavior={Platform.OS ==="ios" ? "padding" : "height"}
            enabled
            className="flex-1"
            >
    <ScrollView
      className="flex-1 "
      keyboardShouldPersistTaps="handled"
      style={{ paddingHorizontal: wp(4), paddingVertical: hp(2) }}
    >
      <View>
        <TouchableOpacity onPress={() => navigation.goBack()}  >
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
          source={require("../../assets/images/otp.webp")}
          style={{
            width: dynamicStyles.imageWidth,
            height: dynamicStyles.imageHeight,
          }}
        />

<View className="">
          <Text className="mt-3 text-lg text-black text-center">
          {t("Otpverification.EnterCode")}
          </Text>
        </View>
        {language === "en" ? (
          <View className="mt-5">
            <Text className="text-md text-gray-400">
              {/* {t("OtpVerification.OTPCode")} */}
            </Text>
            <Text className="text-md text-[#0085FF] text-center pt-1 ">
              {phoneNumber}
            </Text>
          </View>
        ) : (
          <View className="mt-5">
            <Text className="text-md text-[#0085FF] text-center ">
              {phoneNumber}
            </Text>

            <Text className="text-md text-gray-400 pt-1">
              {/* {t("OtpVerification.OTPCode")} */}
            </Text>
          </View>
        )}

        <View className="flex-row justify-center gap-3 mt-4 px-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <TextInput
              key={index}
   ref={(el: TextInput | null) => {
        inputRefs.current[index] = el; // assign to array
      }}              className={`w-12 h-12 text-lg text-center rounded-lg ${
                otpCode[index] ? "bg-[#FFFFFF] text-black pb-2" : "bg-[#FFFFFF] text-black"
              }`}
              keyboardType="numeric"
              maxLength={1}
              value={otpCode[index] || ""}
              onChangeText={(text) => handleOtpChange(text, index)}
              placeholder={maskedCode[index] || "_"}
              placeholderTextColor="lightgray"
              style={{
                borderColor: "#0CB783",
                borderWidth: 2, // Adjust thickness if needed
              }}
            />
          ))}
        </View>

        <View className="mt-5">
        <Text className="text-md text-[#707070] pt-1">
              {/* {t("OtpVerification.OTPCode")} */}
              {t("Otpverification.Didreceive")}
            </Text>
            </View>

        <View className="mt-1 mb-9">
          <Text
            className="mt-3 text-lg text-black text-center underline"
            onPress={disabledResend ? undefined : handleResendOTP}
            style={{ color: disabledResend ? "gray" : "blue" }}
          >
            {timer > 0
              ? `${t("Resend in ")} ${formatTime(timer)}`
              : `${t("Resend again")}`}
          </Text>
        </View>


        <ShowSuccessModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onComplete={handleSuccessCompletion} // Pass the navigation function
        />
        <View style={{ marginTop: dynamicStyles.margingTopForBtn }}>
          <TouchableOpacity
            style={{ height: hp(7), width: wp(80) }}
            className={`flex items-center justify-center mx-auto rounded-full mb-8 ${
              !isOtpValid || isVerified ? "bg-[#2AAD7A]" : "bg-[#2AAD7A]"
            }`}
            onPress={handleVerify}
            disabled={isVerified}
          >
            <Text className="text-white text-lg">
              {/* {t("OtpVerification.Verify")} */}
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
