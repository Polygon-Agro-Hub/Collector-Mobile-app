import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  Animated,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import bankNames from "../../assets/jsons/banks.json";
import { ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "../commons/GlobalSearchModal";
import { useFocusEffect } from "@react-navigation/native";

type UnregisteredFarmerDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UpdateFarmerBankDetails"
>;

interface UnregisteredFarmerDetailsProps {
  navigation: UnregisteredFarmerDetailsNavigationProp;
  route: any;
}

interface allBranches {
  bankID: number;
  ID: number;
  name: string;
}

const UnregisteredFarmerDetails: React.FC<UnregisteredFarmerDetailsProps> = ({
  navigation,
  route,
}) => {
  const { id, phoneNumber, PreferdLanguage, officerRole } = route.params;

  const [accNumber, setAccNumber] = useState("");
  const [accHolderName, setAccHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUnsuccessfulModalVisible, setIsUnsuccessfulModalVisible] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [progress] = useState(new Animated.Value(0));
  const [unsuccessfulProgress] = useState(new Animated.Value(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();
  const [filteredBranches, setFilteredBranches] = useState<allBranches[]>([]);
  const [selectedLanguage] = useState<string>("en");
  const [accNumberError, setAccNumberError] = useState("");

  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);

  const bankModalData = bankNames.map((bank) => ({
    label: bank.name,
    value: bank.name,
  }));

  const branchModalData = filteredBranches.map((branch) => ({
    label: branch.name,
    value: branch.name,
  }));

  useEffect(() => {
    if (bankName) {
      const selectedBank = bankNames.find((bank) => bank.name === bankName);
      if (selectedBank) {
        try {
          const data = require("../../assets/jsons/branches.json");
          const rawBranches = data[selectedBank.ID] || [];
          const uniqueBranches = rawBranches.filter(
            (branch: any, index: number, self: any[]) =>
              index === self.findIndex((b) => b.name === branch.name),
          );
          const sortedBranches = uniqueBranches.sort(
            (a: { name: string }, b: { name: any }) =>
              a.name.localeCompare(b.name),
          );
          setFilteredBranches(sortedBranches);
        } catch (error) {
          console.error("Error loading branches", error);
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        } finally {
          setLoading(false);
        }
      } else {
        setFilteredBranches([]);
      }
    } else {
      setFilteredBranches([]);
    }
  }, [bankName]);

  const handleNext = async () => {
    if (!accNumber || !accHolderName || !bankName || !branchName) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please fill in all required fields."),
      );
      setLoading(false);
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

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
      await AsyncStorage.setItem("referenceId", response.data.referenceId);

      navigation.navigate("otpBankDetailsupdate", {
        phoneNumber,
        accNumber,
        accHolderName,
        bankName,
        branchName,
        PreferdLanguage,
        farmerId: id,
        officerRole,
      });
      setLoading(false);
    } catch (error) {
      Alert.alert(t("Error.error"), t("Error.otpSendFailed"));
      setLoading(false);
    }
  };

  const loadingBarWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const unsuccessfulLoadingBarWidth = unsuccessfulProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const getTextStyle = (language: string) => {
    if (language === "si") return { fontSize: 14, lineHeight: 20 };
  };

  useFocusEffect(
    useCallback(() => {
      setAccNumber("");
      setAccHolderName("");
      setBankName("");
      setBranchName("");
      setAccNumberError("");

      const handleBackPress = () => {
        navigation.navigate("Main" as any, { screen: "SearchFarmer" });
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <CustomHeader
        title={t("UnregisteredFarmerDetails.FillDetails")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, {
            screen: "SearchFarmer",
          })
        }
      />
      <View className="flex-1 w-full max-w-[500px] mx-auto px-5 bg-white">
        <ScrollView className="flex-1 p-3 mt-4">
          {/* Account Number */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.AccountNum")}
            </Text>
            <TextInput
              className={`border ${
                accNumberError
                  ? "border-red-500"
                  : "border-[#F4F4F4] bg-[#F4F4F4]"
              } p-3 rounded-full h-[50px]`}
              keyboardType="numeric"
              value={accNumber}
              onChangeText={(text) => {
                const digitsOnly = text.replace(/[^\d]/g, "");
                setAccNumber(digitsOnly);
                setAccNumberError("");
              }}
            />
            {accNumberError ? (
              <Text className="text-red-500 text-sm mt-1">
                {accNumberError}
              </Text>
            ) : null}
          </View>

          {/* Account Holder's Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.AccountName")}
            </Text>
            <TextInput
              className="border border-[#F4F4F4] bg-[#F4F4F4] p-3 rounded-full h-[50px]"
              value={accHolderName}
              onChangeText={(text) => {
                const filteredText = text
                  .replace(/[^a-zA-Z\s]/g, "")
                  .trimStart();
                const capitalizedText = filteredText
                  .toLowerCase()
                  .split(" ")
                  .map((word) =>
                    word.length > 0
                      ? word.charAt(0).toUpperCase() + word.slice(1)
                      : word,
                  )
                  .join(" ");
                setAccHolderName(capitalizedText);
              }}
              keyboardType="default"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          {/* Bank Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Bank")}
            </Text>
            <TouchableOpacity
              onPress={() => setBankModalVisible(true)}
              style={{
                height: 50,
                backgroundColor: "#F4F4F4",
                borderRadius: 50,
                borderWidth: 1,
                borderColor: "#F4F4F4",
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ color: bankName ? "#000" : "#9CA3AF", fontSize: 14 }}
              >
                {bankName || "Select Bank"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Branch Name */}
          <View className="mb-4">
            <Text className="text-[#434343] mb-2">
              {t("UnregisteredFarmerDetails.Branch")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (!bankName) {
                  Alert.alert(
                    t("Error.error"),
                    t("UnregisteredFarmerDetails.SelectBank"),
                  );
                  return;
                }
                setBranchModalVisible(true);
              }}
              style={{
                height: 50,
                backgroundColor: "#F4F4F4",
                borderRadius: 50,
                borderWidth: 1,
                borderColor: "#F4F4F4",
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ color: branchName ? "#000" : "#9CA3AF", fontSize: 14 }}
              >
                {branchName || "Select Branch"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`py-4 rounded-full items-center mt-5 h-[50px] ${
              loading ? "bg-gray-400 opacity-50" : "bg-[#000000] "
            }`}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
            onPress={() => {
              if (!loading) {
                setLoading(true);
                handleNext();
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={[getTextStyle(selectedLanguage)]}
                className="text-center text-xl font-semibold text-white"
              >
                {t("UnregisteredFarmerDetails.Submit")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Success Modal */}
        <Modal
          transparent={true}
          visible={isModalVisible}
          animationType="slide"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#00000040",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Success")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/collection-common/tick.webp")}
                  className="w-24 h-24"
                />
              </View>
              <Text className="text-gray-700">
                {t("UnregisteredFarmerDetails.Successful")}
              </Text>
              <View className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mt-6">
                <Animated.View
                  className="h-full bg-green-500"
                  style={{ width: loadingBarWidth }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Unsuccessful Modal */}
        <Modal
          transparent={true}
          visible={isUnsuccessfulModalVisible}
          animationType="slide"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#00000040",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="bg-white rounded-lg w-72 p-6 items-center">
              <Text className="text-xl font-bold mb-4">
                {t("UnregisteredFarmerDetails.Oops")}
              </Text>
              <View className="mb-4">
                <Image
                  source={require("../../assets/images/collection-common/error-unregister.webp")}
                  className="w-24 h-24"
                />
              </View>
              <Text className="text-gray-700">
                {t("UnregisteredFarmerDetails.Unsuccessful")}
              </Text>
              {errorMessage && (
                <Text className="text-red-600 text-center mt-2">
                  {errorMessage}
                </Text>
              )}
              <View className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mt-6">
                <Animated.View
                  className="h-full bg-red-500"
                  style={{ width: unsuccessfulLoadingBarWidth }}
                />
              </View>
              <TouchableOpacity
                className="bg-red-500 p-2 rounded-full mt-4"
                onPress={() => {
                  setIsUnsuccessfulModalVisible(false);
                  setErrorMessage(null);
                  unsuccessfulProgress.setValue(0);
                }}
              >
                <Text className="text-white">
                  {t("UnregisteredFarmerDetails.Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      {/* Bank Modal */}
      <GlobalSearchModal
        visible={bankModalVisible}
        onClose={() => setBankModalVisible(false)}
        title={t("UnregisteredFarmerDetails.Bank")}
        data={bankModalData}
        selectedItems={bankName ? [bankName] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setBankName(val);
          setBranchName("");
        }}
        searchPlaceholder="Search bank..."
        multiSelect={false}
      />

      {/* Branch Modal */}
      <GlobalSearchModal
        visible={branchModalVisible}
        onClose={() => setBranchModalVisible(false)}
        title={t("UnregisteredFarmerDetails.Branch")}
        data={branchModalData}
        selectedItems={branchName ? [branchName] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setBranchName(val);
        }}
        searchPlaceholder="Search branch..."
        multiSelect={false}
      />
    </KeyboardAvoidingView>
  );
};

export default UnregisteredFarmerDetails;
