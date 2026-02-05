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
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { SelectList } from "react-native-dropdown-select-list";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";

type PassTargetBetweenOfficersScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "PassTargetBetweenOfficers"
>;

interface PassTargetBetweenOfficersScreenProps {
  navigation: PassTargetBetweenOfficersScreenNavigationProps;
  route: {
    params: {
      varietyId: number;
      varietyNameEnglish: string;
      varietyNameSinhala: string; // ✅ Added this
      varietyNameTamil: string; // ✅ Added this
      grade: string;
      target: string;
      todo: string;
      qty: string;
      collectionOfficerId: number;
      dailyTarget: number;
      officerId:string
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

const PassTargetBetweenOfficers: React.FC<
  PassTargetBetweenOfficersScreenProps
> = ({ navigation, route }) => {
  const [assignee, setAssignee] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [officers, setOfficers] = useState<{ key: string; value: string }[]>(
    []
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
    collectionOfficerId,
    varietyNameSinhala,
    varietyNameTamil,
    dailyTarget,
    officerId
  } = route.params;
  console.log(collectionOfficerId);
  const maxAmount = parseFloat(todo);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  console.log("officer id........................",officerId)

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

 // console.log("Max Amount:", maxAmount);

  // ✅ Set initial amount as max amount (`todo`)
  useEffect(() => {
    setAmount(maxAmount.toString());
  }, [maxAmount]);

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

  // ✅ Fixed: Enhanced save button disabling logic
  const isSaveDisabled = () => {
    const numericAmount = parseFloat(amount);
    
    return !assignee || 
           assignee === "0" || 
           submitting ||
           loading ||
           !amount || 
           isNaN(numericAmount) || 
           numericAmount <= 0 || 
           numericAmount > maxAmount ||
           error !== ""; // Also disable if there's an error
  };

  // Fetch officers from API
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
        }
      );

     // console.log("Officers:", response.data.data);

      if (response.data.status === "success") {
        const filteredOfficers = response.data.data.filter(
          (officer: any) => officer.collectionOfficerId !== collectionOfficerId
        );

        // Format the officers to be displayed
        const formattedOfficers = filteredOfficers.map((officer: any) => ({
          key: officer.collectionOfficerId.toString(),
          value: `${getOfficerName(officer)}  (${(officer.empId)})`,
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

  // Reload the officers list every time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchOfficers();
    }, [])
  );

  const handleAmountChange = (text: string) => {
    setAmount(text);
    const numericValue = parseFloat(text);
    if (numericValue > maxAmount) {
      setError(t("Error.You have exceeded the maximum amount."));
    } else {
      setError("");
    }
  };

  // ✅ Function to Pass Target
  const passTarget = async () => {
    if (!assignee || assignee === "0") {
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
        `${t("Error.You cannot transfer more than")} ${maxAmount}kg.`
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
        `${environment.API_BASE_URL}api/target/pass-target`,
        {
          fromOfficerId: collectionOfficerId,
          toOfficerId: assignee,
          varietyId: varietyId,
          grade,
          amount: numericAmount,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      

      if (response.status === 200) {
        Alert.alert(
          t("Error.Success"),
          t("Error.Target transferred successfully.")
        );
        navigation.navigate('DailyTargetListForOfficers'as any,{officerId:  officerId  , collectionOfficerId: collectionOfficerId});
     //   navigation.goBack();
      } else {
        Alert.alert(t("Error.error"), t("Error.Failed to transfer target."));
      }
    } catch (error: any) {
      console.error("Transfer Target Error:", error);
      Alert.alert(
        t("Error.error"),
        t("Error.An error occurred while transferring the target.")
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
      {/* ✅ Fixed Header */}
      <View className="flex-row items-center bg-[#313131] p-6 rounded-b-lg">
        <TouchableOpacity 
        onPress={() => navigation.goBack()}
        className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
        >
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>
        {/* <Text className="text-white text-lg font-semibold text-center w-full"> */}
          <Text className="flex-1 text-center text-xl font-semibold text-white mr-[6%]">
          {getvarietyName()}
        </Text>
      </View>

      {/* ✅ Scrollable Content */}
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
            <Text className="text-gray-700 mb-2 mt-[20%]">
              {t("PassTargetBetweenOfficers.Short Stock Assignee")}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#313131" />
            ) : errorMessage ? (
              <Text className="text-red-500">{errorMessage}</Text>
            ) : (
              <View className=" rounded-lg mb-4">
                <SelectList
                  setSelected={(value: string) => setAssignee(value)}
                  data={officers}
                  save="key"
                  defaultOption={{
                    key: "0",
                    value: t("PassTargetBetweenOfficers.Select an officer"),
                  }}
                  boxStyles={{
                    borderWidth: 1,
                    borderColor: "#CFCFCF",
                    backgroundColor: "white",
                  }}
                  inputStyles={{
                    color: assignee && assignee !== "0" ? "#000000" : "#848484",
                  }}
                  dropdownStyles={{
                    // Fixed: changed from dropDownStyles to dropdownStyles
                    borderColor: "#CFCFCF",
                    backgroundColor: "white",
                  }}
                />
              </View>
            )}

            <Text className="text-gray-700 mb-2">
              {t("PassTargetBetweenOfficers.Amount")}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800"
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
              isSaveDisabled() ? "bg-gray-400" : "bg-[#313131]"
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

export default PassTargetBetweenOfficers;