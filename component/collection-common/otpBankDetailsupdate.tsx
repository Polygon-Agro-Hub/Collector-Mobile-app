import React, { useState, useEffect, useRef } from "react";
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

const { width: screenWidth } = Dimensions.get("window");

type RootStackParamList = {
  OtpVerification: undefined;
  NextScreen: undefined;
};

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface FailModalProps {
  visible: boolean;
  onClose: () => void;
  onFail: () => void;
}
const ShowSuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  onClose,
  onComplete,
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
          onComplete();
        }, 500);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-2xl items-center w-72 h-80 shadow-lg relative">
          <Text className="text-xl font-bold mt-4 text-center">
            {" "}
            {t("BankDetailsUpdate.Success")}
          </Text>

          <Image
            source={require("../../assets/images/collection-common/otpsuccess.webp")}
            style={{ width: 100, height: 100 }}
          />

          <Text className="text-gray-500 mb-4">
            {t("BankDetailsUpdate.SuccessMessage")}
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

const ShowFailModal: React.FC<FailModalProps> = ({
  visible,
  onClose,
  onFail,
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
          onFail();
        }, 500);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-2xl items-center w-72 h-60 shadow-lg relative">
          <Text className="text-xl font-bold mt-4 text-center">
            {" "}
            {t("BankDetailsUpdate.Failed")}
          </Text>

          <Image
            source={require("../../assets/images/collection-common/error.webp")}
            style={{ width: 100, height: 100 }}
          />

          <Text className="text-gray-500 mb-4">
            {t("BankDetailsUpdate.FailedMessage")}
          </Text>

          <TouchableOpacity
            className="bg-[#ef4444] px-6 py-2 rounded-full mt-6"
            onPress={() => {
              onClose();
              onFail();
            }}
          >
            <Text className="text-white font-semibold">
              {t("Otpverification.OK")}
            </Text>
          </TouchableOpacity>

          <View className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-2xl overflow-hidden">
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: "#ef4444",
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

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (!isVerified) {
        setOtpCode("");
        setIsOtpValid(false);
        setTimer(240);
        setDisabledResend(true);

        inputRefs.current.forEach((ref) => ref?.clear());
      }
    });

    return unsubscribe;
  }, [navigation, isVerified]);

  const handleSuccessCompletion = () => {
    setModalVisible(false);

    if (officerRole === "COO") {
      navigation.navigate("FarmerQr" as any, {
        NICnumber,
        userId: farmerId,
      });
    } else if (officerRole === "CCM") {
      navigation.navigate("SearchFarmerScreen" as any);
    }
  };

  const handleFailCompletion = () => {
    setModalVisible(false);
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
      return;
    }

    try {
      const refId = referenceId;

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

        const response = await axios.post(
          `${environment.API_BASE_URL}api/farmer/FarmerBankDetails`,
          {
            accNumber: accNumber,
            accHolderName: accHolderName,
            bankName: bankName,
            branchName: branchName,
            userId: farmerId,
            NICnumber: NICnumber,
          },
        );

        if (response.status === 200) {
          await AsyncStorage.removeItem("referenceId");
          <ShowSuccessModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onComplete={handleSuccessCompletion}
          />;
        } else {
          <ShowFailModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onFail={handleFailCompletion}
          />;
        }
      } else if (statusCode === "1001") {
        Alert.alert(t("Error.Sorry"), t("Otpverification.invalidOTP"));
      } else {
        Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
      }
    } catch (error) {
      Alert.alert(t("Error.Sorry"), t("Error.somethingWentWrong"));
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

        Alert.alert(t("Otpverification.Success"), t("Error.otpResent"));
        setTimer(240);
        setDisabledResend(true);
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
      verticalSpacing: isTablet ? hp(3) : hp(5),
    };
  };

  const styles = getResponsiveStyles();

  useEffect(() => {
    const backAction = () => {
      navigation.navigate("UpdateFarmerBankDetails" as any, {
        id: farmerId,
        NICnumber: NICnumber,
        phoneNumber: phoneNumber,
        PreferdLanguage: PreferdLanguage,
        officerRole: "COO",
      });
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      className="bg-white"
      style={{ flex: 1 }}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
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
            })
          }
        />

        <View
          className="flex justify-center items-center"
          style={{
            paddingHorizontal: styles.containerPaddingHorizontal,
            paddingTop: styles.imageMarginTop,
            paddingVertical: hp(1),
          }}
        >
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

          <View className="mb-7">
            <Text
              className="text-black text-center font-bold"
              style={{ fontSize: styles.titleFontSize }}
            >
              {t("Otpverification.EnterCode")}
            </Text>
          </View>

          <View className="mb-5">
            <Text
              className="text-[#0085FF] text-center"
              style={{ fontSize: styles.phoneFontSize }}
            >
              {phoneNumber}
            </Text>
          </View>

          <View
            className="flex-row justify-center"
            style={{
              gap: wp(2.5),
              marginBottom: styles.verticalSpacing,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(el: TextInput | null) => {
                  inputRefs.current[index] = el;
                }}
                style={{
                  width: 51,
                  height: 48,
                  fontSize: styles.otpInputTextSize,
                  textAlign: "center",
                  borderRadius: 10,
                  borderColor: "#FFC738",
                  borderWidth: 1,
                  backgroundColor: "#FFFFFF",
                  color: "#000000",
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

          <View style={{ marginBottom: styles.verticalSpacing / 2 }}>
            <Text
              className="text-[#707070] text-center"
              style={{ fontSize: styles.phoneFontSize }}
            >
              {t("Otpverification.Didreceive")}
            </Text>
          </View>

          <View style={{ marginBottom: styles.verticalSpacing * 2 }}>
            <Text
              className="text-center underline"
              onPress={disabledResend ? undefined : handleResendOTP}
              style={{
                fontSize: styles.phoneFontSize,
                color: disabledResend ? "#9CA3AF" : "#000000",
                fontWeight: "600",
              }}
            >
              {timer > 0
                ? `${t("Otpverification.Resend in")} ${formatTime(timer)}`
                : `${t("Otpverification.Resend again")}`}
            </Text>
          </View>

          <ShowSuccessModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onComplete={handleSuccessCompletion}
          />

          <View className="w-full items-center" style={{ marginBottom: hp(4) }}>
            <TouchableOpacity
              style={{
                width: 281,
                height: 50,
                backgroundColor:
                  !isOtpValid || isVerified ? "#9CA3AF" : "#000000",
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
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
    </KeyboardAvoidingView>
  );
};

export default Otpverification;
