import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Keyboard,
  Modal,
  ActivityIndicator,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { useNavigation } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";

interface OfficerDetails {
  id: number;
  jobRole: string;
  empId: string;
  companyNameEnglish: string;
  companyNameSinhala: string;
  companyNameTamil: string;
  firstNameEnglish: string;
  firstNameSinhala: string;
  firstNameTamil: string;
  lastNameEnglish: string;
  lastNameSinhala: string;
  lastNameTamil: string;
  image: string;
}
type ClaimOfficerNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ClaimOfficer"
>;

const ClaimOfficer: React.FC = () => {
  const navigation = useNavigation<ClaimOfficerNavigationProp>();
  const [jobRole, setJobRole] = useState("Collection Officer");

  const [empID, setEmpID] = useState("");
  const [officerFound, setOfficerFound] = useState(false);
  const [officerDetails, setOfficerDetails] = useState<OfficerDetails | null>(
    null,
  );
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const empPrefix =
    jobRole === "Collection Officer"
      ? "COO"
      : jobRole === "Customer Officer"
        ? "CUO"
        : "---";

  const handleEmpIDChange = (text: string) => {
    const trimmedText = text.replace(/^\s+/, "");
    const numericOnly = trimmedText.replace(/[^0-9]/g, "");
    setEmpID(numericOnly);
    setOfficerFound(false);
    setSearchPerformed(false);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();
    setSearchLoading(true);
    setSearchPerformed(true);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }
    try {
      const userToken = await AsyncStorage.getItem("token");

      if (!userToken) {
        Alert.alert(
          t("Error.error"),
          t("Error.User token not found. Please log in again."),
        );
        return;
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/get-claim-officer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ empID: `${empPrefix}${empID}`, jobRole }),
        },
      );

      const data = await response.json();

      if (response.ok && data.result && data.result.length > 0) {
        const officer = data.result[0];
        setOfficerDetails({
          companyNameEnglish: officer.companyNameEnglish,
          companyNameSinhala: officer.companyNameSinhala,
          companyNameTamil: officer.companyNameTamil,
          id: officer.id,
          jobRole: officer.jobRole,
          empId: officer.empId,
          image: officer.image,
          firstNameEnglish: officer.firstNameEnglish,
          firstNameSinhala: officer.firstNameSinhala,
          firstNameTamil: officer.firstNameTamil,
          lastNameEnglish: officer.lastNameEnglish,
          lastNameSinhala: officer.lastNameSinhala,
          lastNameTamil: officer.lastNameTamil,
        });

        setOfficerFound(true);
        setSearchLoading(false);
      } else {
        setOfficerFound(false);
        setSearchLoading(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClaimOfficer = async () => {
    try {
      const userToken = await AsyncStorage.getItem("token");

      if (!userToken) {
        Alert.alert(
          t("Error.error"),
          t("Error.User token not found. Please log in again."),
        );
        return;
      }
      setLoading(true);

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/claim-officer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ officerId: officerDetails?.id }),
        },
      );

      if (!response.ok) {
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to claim the officer. Please try again later."),
        );
      } else {
        Alert.alert(
          t("Error.Success"),
          t("Error.Officer successfully claimed."),
        );
        setOfficerFound(false);
        setOfficerDetails(null);
        setEmpID("");
        setSearchPerformed(false);
        setModalVisible(false);
        navigation.navigate("Main", { screen: "CollectionOfficersList" });
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const ConfirmationModal = ({
    visible,
    onConfirm,
    onCancel,
    onLoading,
  }: any) => {
    return (
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/60 bg-opacity-50">
          <View className="bg-white items-center rounded-lg w-80  p-6">
            <View className="flex items-center justify-center mb-4 rounded-lg bg-[#f7f8fa] p-2 w-12 h-12 ">
              <Ionicons name="warning" size={30} color="#6c7e8c" />
            </View>
            <Text className="text-center text-base font-semibold mb-4">
              {t("ClaimOfficer.Are you sure you want to claim this officer?")}
            </Text>

            <View className="flex-row  justify-center gap-4">
              <TouchableOpacity
                onPress={onCancel}
                className="p-2 py-3 px-8 bg-[#F6F7F9] border border-[#95A1AC] rounded-lg"
                style={{
                  shadowColor: "#8f8a8a",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text className="text-lg text-gray-700">
                  {t("ClaimOfficer.Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                disabled={onLoading}
                className={`p-2 py-3 px-9 rounded-lg ${
                  onLoading ? "bg-gray-400" : "bg-[#313131]"
                }`}
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text className="text-lg text-white">
                  {t("ClaimOfficer.Claim")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <CustomHeader
        title={t("ClaimOfficer.ClaimOfficers")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <View className="px-8 mt-2">
        <View className="px-8 mt-7"></View>

        {/* EMP ID Input */}
        <Text className="font-semibold text-gray-800  mb-2 text-center">
          {t("ClaimOfficer.EMPID")}
        </Text>
        <View className="flex-row items-center justify-center border border-[#CFCFCF] rounded-full mb-4">
          <View className="bg-[#D2DADD] px-4 h-[50px] rounded-full items-center justify-center">
            <Text className="text-gray-600 font-bold">{empPrefix}</Text>
          </View>
          <TextInput
            placeholder="ex: 0122"
            value={empID}
            keyboardType="numeric"
            onChangeText={handleEmpIDChange}
            className="flex-1 px-4 py-2 text-gray-700"
          />
        </View>

        <TouchableOpacity
          className={`py-2 rounded-full items-center mt-7 h-[50px] justify-center ${
            !empID || officerFound || searchLoading
              ? "bg-gray-300"
              : "bg-[#313131]"
          }`}
          disabled={!empID || officerFound}
          onPress={handleSearch}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white text-lg text-center font-semibold">
              {t("ClaimOfficer.Search")}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {searchPerformed && !searchLoading && (
        <View
          style={{
            height: 1,
            backgroundColor: "#ADADAD",

            marginTop: 24,
          }}
        />
      )}

      {!officerFound && searchPerformed && !searchLoading && (
        <View className="flex items-center justify-center mt-24">
          <Image
            source={require("../../assets/images/collection-manager/delete-icon.webp")}
            className="w-28 h-28"
            resizeMode="contain"
          />
          <Text className="text-gray-500 mt-2">
            {t("ClaimOfficer.No Disclaimed")}
          </Text>
        </View>
      )}

      {/* Officer Found */}
      {officerFound && (
        <View className=" mt-10 items-center">
          {/* Officer Avatar */}

          <Image
            source={
              officerDetails?.image
                ? { uri: officerDetails.image }
                : require("../../assets/images/collection-manager/pc-profile.webp")
            }
            className="w-20 h-20 rounded-full mb-4"
          />

          {i18n.language === "si" ? (
            <>
              <Text className="text-lg font-bold mb-1 text-gray-800">
                {officerDetails?.firstNameSinhala}{" "}
                {officerDetails?.lastNameSinhala}
              </Text>
              <Text className="text-sm mb-1 text-gray-500">
                {t(`ClaimOfficer.${officerDetails?.jobRole}`)} -{" "}
                <Text className="font-bold text-black">
                  {officerDetails?.empId}
                </Text>
              </Text>
              <Text className="text-sm text-gray-500">
                {officerDetails?.companyNameSinhala}
              </Text>
            </>
          ) : i18n.language === "ta" ? (
            <>
              <Text className="text-lg font-bold text-gray-800">
                {officerDetails?.firstNameTamil} {officerDetails?.lastNameTamil}
              </Text>
              <Text className="text-sm text-gray-500">
                {t(`ClaimOfficer.${officerDetails?.jobRole}`)} -{" "}
                <Text className="font-bold text-black">
                  {officerDetails?.empId}
                </Text>
              </Text>
              <Text className="text-sm text-gray-500">
                {officerDetails?.companyNameTamil}
              </Text>
            </>
          ) : (
            <>
              <Text className="text-lg font-bold text-gray-800">
                {officerDetails?.firstNameEnglish}{" "}
                {officerDetails?.lastNameEnglish}
              </Text>
              <Text className="text-sm text-gray-500">
                {t(`ClaimOfficer.${officerDetails?.jobRole}`)} -{" "}
                <Text className="font-bold text-black">
                  {officerDetails?.empId}
                </Text>
              </Text>
              <Text className="text-sm text-gray-500">
                {officerDetails?.companyNameEnglish}
              </Text>
            </>
          )}

          {/* Claim Officer Button */}
          <TouchableOpacity
            className="mt-6 mb-10 bg-[#313131]    py-4 rounded-full"
            onPress={() => setModalVisible(true)}
             style={{
                  shadowColor: "#0b0a0a",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
          >
            <Text
              className={`text-white text-lg ${
                i18n.language === "en" ? "px-28" : "px-24"
              } font-semibold text-center`}
              style={[{ fontSize: 16 }]}
            >
              {t("ClaimOfficer.Claim Officer")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <ConfirmationModal
        visible={modalVisible}
        onConfirm={handleClaimOfficer}
        onCancel={handleCancel}
        onLoading={loading}
      />
    </ScrollView>
  );
};

export default ClaimOfficer;
