import React, { useState , useCallback} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Keyboard,
  Modal,
  ActivityIndicator

} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useNavigation } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AntDesign from "react-native-vector-icons/AntDesign";
import { SelectList } from "react-native-dropdown-select-list";
import { useTranslation } from "react-i18next";
import DropDownPicker from "react-native-dropdown-picker";
import i18n from "@/i18n/i18n";
import NetInfo from "@react-native-community/netinfo";

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
  const [jobRole, setJobRole] = useState("Distribution Officer");
   const [empID, setEmpID] = useState("");
  const [officerFound, setOfficerFound] = useState(false);
  const [officerDetails, setOfficerDetails] = useState<OfficerDetails | null>(
    null
  );
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

 
  const empPrefix = "DIO";

  // Function to handle text input and prevent leading spaces
  const handleEmpIDChange = (text: string) => {
    // Remove any leading spaces
    const trimmedText = text.replace(/^\s+/, '');
    setEmpID(trimmedText);
    setOfficerFound(false);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();
    setSearchLoading(true);
    console.log(empID, jobRole);


      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
    return; 
  }
    try {
      const userToken = await AsyncStorage.getItem("token");

      if (!userToken) {
        Alert.alert(
          t("Error.error"),
          t("Error.User token not found. Please log in again.")
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
        }
      );

      const data = await response.json();
     // console.log("claim pfficer", data);

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
     //   console.log("officer details", officerDetails);
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
          t("Error.User token not found. Please log in again.")
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
        }
      );

      if (!response.ok) {
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to claim the officer. Please try again later.")
        );
        setModalVisible(false)
      } else {
        Alert.alert(
          t("Error.Success"),
          t("Error.Officer successfully claimed.")
        );
        setOfficerFound(false);
        setOfficerDetails(null);
        setEmpID("");
        setModalVisible(false);
        navigation.navigate("Main", { screen: "DistributionOfficersList" });
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false); // Close the modal without taking action
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
            <Text className="text-center text-sm font-semibold mb-4">
              {t("ClaimOfficer.Are you sure you want to claim this officer?")}
            </Text>

            <View className="flex-row  justify-center gap-4">
              <TouchableOpacity
                onPress={onCancel}
                className="p-2 py-2  border-[#95A1AC] border rounded-lg"
              >
                <Text className="text-sm text-[#6B7D8C]">
                  {t("ClaimOfficer.Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
             
                disabled={onLoading} // Disable the button when loading is true
                className={`p-2 py-2 rounded-lg ${
                  onLoading ? "bg-gray-400" : "bg-black"
                }`}
              >
                <Text className="text-sm text-white">
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
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator= {false}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white shadow-sm">
        <TouchableOpacity className="bg-[#F6F6F680] rounded-full p-2" onPress={() => navigation.navigate("DistributionOfficersList")} >
          <AntDesign name="left" size={24} color="#000" />
        </TouchableOpacity>
   
        <View className="flex-1 ">
          <Text className="text-lg font-bold text-center">
            {t("ClaimOfficer.ClaimOfficers")}
          </Text>
        </View>
      </View>

      {/* Form */}
      <View className="px-8 mt-7">
       
        <Text className="font-semibold text-gray-800  mb-2 text-center">
          {t("ClaimOfficer.EMPID")}
        </Text>
        <View className="flex-row items-center border border-gray-300 rounded-full mb-4">
          <View className="bg-[#D2DADD] px-6 py-3 rounded-full">
            <Text className="text-gray-600 font-semibold">{empPrefix}</Text>
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
          className={`py-4 rounded-full items-center mt-7 ${
            !empID || officerFound || searchLoading
              ? "bg-[#ABABAB]"
              : "bg-[#980775]"
          }`}
           style={{
    // iOS Shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 2,
    shadowRadius: 3.84,
    // Android Shadow
    elevation: 5,
  }}
          disabled={!empID || officerFound}
          onPress={handleSearch}
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

      {/* No Officer Found */}
      {!officerFound && empID && (
        <View className="flex items-center justify-center mt-24">
          <Image
            source={require("../../assets/images/dd.webp")} 
            className="w-28 h-28"
            resizeMode="contain" 
          />
          <Text className="text-gray-500 mt-2">
            {t("ClaimOfficer.No Disclaimed")}
          </Text>
        </View>
      )}


      {officerFound && (
        <View className=" mt-10 items-center">
    

          <Image
            source={
              officerDetails?.image
                ? { uri: officerDetails.image }
                : require("../../assets/images/pcprofile.webp")
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

      
          <TouchableOpacity
            className="mt-6 mb-10 bg-[#000000]    py-4 rounded-full"
            onPress={() => setModalVisible(true)}
                     style={{

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
 
    elevation: 5,
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