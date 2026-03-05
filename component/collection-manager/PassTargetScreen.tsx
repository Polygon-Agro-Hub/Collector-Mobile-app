import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import DropDownPicker from "react-native-dropdown-picker";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../common/CustomHeader";

type PassTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "PassTargetScreen"
>;

interface PassTargetScreenProps {
  navigation: PassTargetScreenNavigationProps;
  route: {
    params: {
      varietyId: number;
      varietyNameEnglish: string;
      varietyNameSinhala: string;
      varietyNameTamil: string;
      grade: string;
      target: string;
      todo: string;
      qty: string;
      dailyTarget: number;
    };
  };
}

interface Officer {
  collectionOfficerId: number;
  empId: string;
  fullNameEnglish: string;
  fullNameSinhala: string;
  fullNameTamil: string;
}

const PassTargetScreen: React.FC<PassTargetScreenProps> = ({
  navigation,
  route,
}) => {
  const [assignee, setAssignee] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [officers, setOfficers] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const {
    varietyNameEnglish,
    grade,
    target,
    todo,
    qty,
    varietyId,
    varietyNameSinhala,
    varietyNameTamil,
    dailyTarget,
  } = route.params;

  const maxAmount = parseFloat(todo);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const isSaveDisabled = () => {
    const numericAmount = parseFloat(amount);

    return (
      !assignee ||
      dropdownOpen ||
      submitting ||
      numericAmount > maxAmount ||
      isNaN(numericAmount) ||
      numericAmount <= 0
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      setAssignee("");

      fetchOfficers();

      setDropdownOpen(false);

      setAmount(maxAmount.toString());
    }, [maxAmount]),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language");
        if (lang) {
          setSelectedLanguage(lang);
        }
      } catch (error) {
        console.error("Error fetching language preference:", error);
      }
    };
    fetchData();
  }, []);

  const getOfficerName = (officer: Officer) => {
    switch (selectedLanguage) {
      case "si":
        return officer.fullNameSinhala;
      case "ta":
        return officer.fullNameTamil;
      default:
        return officer.fullNameEnglish;
    }
  };

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/collection-officers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.status === "success") {
        const formattedOfficers = response.data.data.map((officer: any) => ({
          label: `${getOfficerName(officer)} (${officer.empId})`,
          value: officer.collectionOfficerId.toString(),
        }));

        setOfficers([...formattedOfficers]);
      } else {
        setErrorMessage(t("Error.Failed to fetch officers."));
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setErrorMessage(t("Error.No officers available."));
      } else {
        setErrorMessage(t("Error.An error occurred while fetching officers."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (text: string) => {
    setAmount(text);
    const numericValue = parseFloat(text);
    if (numericValue > maxAmount) {
      setError(t("Error.You have exceeded the maximum amount."));
    } else {
      setError("");
    }
  };

  const passTarget = async () => {
    if (!assignee) {
      Alert.alert(t("Error.error"), t("Error.Please select an officer."));
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert(t("Error.error"), t("Error.Please enter a valid amount."));
      return;
    }

    if (numericAmount > maxAmount) {
      Alert.alert(
        t("Error.error"),
        `${t("Error.You cannot transfer the maximum amount of")} ${maxAmount}kg.`,
      );
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.put(
        `${environment.API_BASE_URL}api/target/manager/pass-target`,
        {
          toOfficerId: assignee,
          varietyId: varietyId,
          grade,
          amount: numericAmount,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        Alert.alert(
          t("Error.Success"),
          t("Error.Target transferred successfully."),
        );
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Main",
              params: {
                screen: "DailyTarget",
                params: {
                  varietyId,
                  varietyNameEnglish,
                  grade,
                  target,
                  todo,
                  qty,
                  varietyNameSinhala,
                  varietyNameTamil,
                  dailyTarget,
                },
              },
            },
          ],
        });
      } else {
        Alert.alert(t("Error.error"), t("Error.Failed to transfer target."));
      }
    } catch (error: any) {
      console.error("Transfer Target Error:", error);
      Alert.alert(
        t("Error.error"),
        t("Error.An error occurred while transferring the target."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getvarietyName = () => {
    switch (selectedLanguage) {
      case "si":
        return route.params.varietyNameSinhala;
      case "ta":
        return route.params.varietyNameTamil;
      default:
        return route.params.varietyNameEnglish;
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={getvarietyName() || ""}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "Main",
                params: {
                  screen: "EditTargetManager",
                  params: {
                    varietyId,
                    varietyNameEnglish,
                    grade,
                    target,
                    todo,
                    qty,
                    varietyNameSinhala,
                    varietyNameTamil,
                    dailyTarget,
                  },
                },
              },
            ],
          })
        }
        textColor="white"
        bgColor="#282828"
        iconBgColor="#FFFFFF1A"
      />

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-lg p-4">
          <Text className="text-gray text-sm mb-2 text-center mt-5">
            {t("PassTargetBetweenOfficers.maximum amount")}
          </Text>
          <Text className="text-xl font-bold text-center text-black mb-4">
            {maxAmount}
            {t("PassTargetBetweenOfficers.kg")}
          </Text>

          <View className="border-b border-gray-300 my-4" />

          <View className="p-5">
            <Text className="text-gray-700 mb-2 mt-[3%]">
              {t("PassTargetBetweenOfficers.Short Stock Assignee")}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#313131" />
            ) : errorMessage ? (
              <Text className="text-red-500">{errorMessage}</Text>
            ) : (
              <View className="mb-4 z-50">
                <DropDownPicker
                  open={dropdownOpen}
                  value={assignee}
                  items={officers}
                  setOpen={setDropdownOpen}
                  setValue={setAssignee}
                  setItems={setOfficers}
                  placeholder={t("PassTargetBetweenOfficers.Select an officer")}
                  style={{
                    borderColor: "#F4F4F4",
                    backgroundColor: "#F4F4F4",
                    borderRadius: 25,
                    borderWidth: 1,
                  }}
                  dropDownContainerStyle={{ borderColor: "#e5e7eb" }}
                  placeholderStyle={{ color: "#848484" }}
                  zIndex={3000}
                  zIndexInverse={1000}
                  listMode="SCROLLVIEW"
                />
              </View>
            )}

            <Text className="text-gray-700 mb-2">
              {t("PassTargetBetweenOfficers.Amount")}
            </Text>
            <TextInput
              className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full p-3.5 text-gray-800"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
            />
            {error ? <Text className="text-red-500 mt-2">{error}</Text> : null}
          </View>
        </View>

        <View className="mt-6 items-center">
          <TouchableOpacity
            className={`rounded-full w-64 py-3 ${
              isSaveDisabled() ? "bg-[#ABABAB]" : "bg-[#000000]"
            }`}
            onPress={passTarget}
            disabled={isSaveDisabled()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium">
                {t("PassTargetBetweenOfficers.Save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default PassTargetScreen;
