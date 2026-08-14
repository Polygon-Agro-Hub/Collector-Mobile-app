import store from "@/services/reducxStore";
import React, { useCallback, useState } from "react";
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
  BackHandler,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";

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
type ClaimDistributionNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ClaimDistribution"
>;

type ClaimDistributionRouteProp = RouteProp<
  RootStackParamList,
  "ClaimDistribution"
>;

interface Props {
  route: ClaimDistributionRouteProp;
}

const ClaimDistribution: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<ClaimDistributionNavigationProp>();

  const activeTab = route.params?.activeTab;
  const isDriver = activeTab === "Drivers";

  const [jobRole, setJobRole] = useState(
    isDriver ? "Driver" : "Distribution Officer",
  );
  const [empPrefix, setEmpPrefix] = useState(isDriver ? "DRV" : "DIO");
  const [empID, setEmpID] = useState("");
  const [officerFound, setOfficerFound] = useState(false);
  const [officerDetails, setOfficerDetails] = useState<OfficerDetails | null>(
    null,
  );
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const resetState = useCallback(() => {
    const currentTab = route.params?.activeTab;
    const currentIsDriver = currentTab === "Drivers";
    setJobRole(currentIsDriver ? "Driver" : "Distribution Officer");
    setEmpPrefix(currentIsDriver ? "DRV" : "DIO");
    setEmpID("");
    setOfficerFound(false);
    setOfficerDetails(null);
    setHasSearched(false);
  }, [route.params?.activeTab]);

  const handleEmpIDChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, "");
    setEmpID(numericOnly);
    setOfficerFound(false);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();
    setSearchLoading(true);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setSearchLoading(false);
      return;
    }
    try {
      const userToken = store.getState().auth.token;

      if (!userToken) {
        Alert.alert(
          t("Error.error"),
          t("Error.User token not found. Please log in again."),
        );
        return;
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/distribution-manager/get-claim-officer`,
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
        setHasSearched(true);
      } else {
        setOfficerFound(false);
        setHasSearched(true);
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
      const userToken = store.getState().auth.token;

      if (!userToken) {
        Alert.alert(
          t("Error.error"),
          t("Error.User token not found. Please log in again."),
        );
        return;
      }
      setLoading(true);

      const response = await fetch(
        `${environment.API_BASE_URL}api/distribution-manager/claim-officer`,
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
        setModalVisible(false);
      } else {
        Alert.alert(
          t("Error.Success"),
          t("Error.Employee successfully claimed."),
        );
        setModalVisible(false);
        resetState();
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
    setModalVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      resetState();

      const handleBackPress = () => {
        navigation.navigate("DistributionOfficersList");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation, resetState]),
  );



  return (
    <ScrollView
      className="flex-1 bg-white"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <CustomHeader
        title={t("ClaimOfficer.Claim Staff")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.navigate("DistributionOfficersList")}
      />

      {/* Form */}
      <View className="px-6 mt-7">
        <Text className="font-semibold text-gray-800 mb-2 text-center">
          {t("ClaimOfficer.EMPID")}
        </Text>
        <View className="flex-row items-center border border-gray-300 rounded-full mb-4">
          <View className="bg-[#D2DADD] px-6 h-[50px] justify-center rounded-full">
            <Text className="text-gray-600 font-semibold">{empPrefix}</Text>
          </View>
          <TextInput
            placeholder="ex: 00122"
            placeholderTextColor="#ADADAD"
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
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 2,
            shadowRadius: 3.84,
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

      {hasSearched && !searchLoading && (
        <View
          style={{
            height: 1,
            backgroundColor: "#ADADAD",
            marginTop: 28,
            marginHorizontal: 0,
          }}
        />
      )}

      {/* No Officer Found */}
      {!officerFound && hasSearched && empID && (
        <View className="flex items-center justify-center mt-24">
          <Image
            source={require("../../../../assets/images/collection-manager/delete-icon.webp")}
            className="w-28 h-28"
            resizeMode="contain"
          />
          <Text className="text-gray-500 mt-2">
            {t("ClaimOfficer.No Disclaimed")}
          </Text>
        </View>
      )}

      {officerFound && (
        <View className="mt-10 items-center">
          <Image
            source={
              officerDetails?.image
                ? { uri: officerDetails.image }
                : require("../../../../assets/images/collection-manager/pc-profile.webp")
            }
            className="w-28 h-28 rounded-full mb-4"
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
              <Text className="text-xl font-bold text-gray-800">
                {officerDetails?.firstNameEnglish}{" "}
                {officerDetails?.lastNameEnglish}
              </Text>
              <Text className="text-lg text-[#627189]">
                {t(`ClaimOfficer.${officerDetails?.jobRole}`)} -{" "}
                <Text className="font-bold text-black">
                  {officerDetails?.empId}
                </Text>
              </Text>
              <Text className="text-sm mt-1 text-gray-500">
                {officerDetails?.companyNameEnglish}
              </Text>
            </>
          )}

          <TouchableOpacity
            className="mt-6 mb-10 bg-[#000000] py-4 rounded-full"
            onPress={() => setModalVisible(true)}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Text
              className={`text-white text-lg ${
                i18n.language === "en" ? "px-28" : "px-24"
              } font-semibold text-center`}
              style={{ fontSize: 16 }}
            >
              {t("ClaimOfficer.Claim Officer")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <WarningConfirmation
        visible={modalVisible}
        message={t("ClaimOfficer.Are you sure you want to claim this employee?") || "Are you sure you want to claim this officer?"}
        confirmText={t("ClaimOfficer.Claim") || "Claim"}
        cancelText={t("ClaimOfficer.Cancel") || "Cancel"}
        confirmButtonBgClass="bg-black active:bg-gray-800"
        onConfirm={handleClaimOfficer}
        onCancel={handleCancel}
      />
    </ScrollView>
  );
};

export default ClaimDistribution;
