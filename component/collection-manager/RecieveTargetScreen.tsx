import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { SelectList } from "react-native-dropdown-select-list";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";

// Define the navigation prop type
type RecieveTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "RecieveTargetScreen"
>;

interface RecieveTargetScreenProps {
  navigation: RecieveTargetScreenNavigationProps;
  route: {
    params: {
      varietyNameEnglish: string;
      varietyNameSinhala: string; // ✅ Added this
      varietyNameTamil: string; // ✅ Added this
      grade: string;
      target: string;
      todo: string;
      qty: string;
      varietyId: string;
      dailyTarget: string;
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

const RecieveTargetScreen: React.FC<RecieveTargetScreenProps> = ({
  navigation,
  route,
}) => {
  const [assignee, setAssignee] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [officers, setOfficers] = useState<{ key: string; value: string }[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingTarget, setFetchingTarget] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const { t } = useTranslation();

  const {
    varietyNameEnglish,
    grade,
    target,
    qty,
    dailyTarget,
    varietyId,
    varietyNameSinhala,
    varietyNameTamil,
  } = route.params;
  // console.log("Hittt the page 2");
  // console.log("Initial Max Amount:", maxAmount);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

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

  // ✅ Fetch officers dynamically
  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        //`${environment.API_BASE_URL}api/collection-manager/collection-officers`,
        `${environment.API_BASE_URL}api/collection-manager/collection-officers-recieve/${varietyId}/${grade}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // console.log("Officers:", response.data.data);

      if (response.data.status === "success") {
        const formattedOfficers = response.data.data.map((officer: any) => ({
          key: officer.collectionOfficerId.toString(),
          value: `${getOfficerName(officer)}  (${officer.empId})`,
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

  // ✅ Fetch Daily Target when officer is selected
  const fetchDailyTarget = async (officerId: string) => {
    // console.log("Selected Officer ID:", officerId);
    if (officerId === "0") {
      setAmount("");
      setMaxAmount(0);
      return;
    }

    try {
      setFetchingTarget(true);
      setErrorMessage(null);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/target/get-daily-todo-byvariety/${officerId}/${varietyId}/${grade}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      //  console.log("Daily Target Response:", response.data);

      if (response.data.status === "success" && response.data.data) {
        //  console.log("Daily Target Data:", response.data.data);
        const { target, complete } = response.data.data;
        const calculatedTodo = parseFloat(target) - parseFloat(complete);

        setMaxAmount(calculatedTodo > 0 ? calculatedTodo : 0); // Ensure todo is not negative
        setAmount(calculatedTodo.toString()); // Set default value
      } else {
        setErrorMessage(t("Error.No target data found for selected officer."));

        // ✅ Auto-refresh fields after 3 seconds
        setTimeout(() => {
          setErrorMessage(null);
          setMaxAmount(0);
          setAmount("");
          setAssignee("");
        }, 3000);
      }
    } catch (error: any) {
      setErrorMessage(t("Error.Failed to fetch daily target."));

      // ✅ Auto-refresh fields after 3 seconds
      setTimeout(() => {
        setErrorMessage(null);
        setMaxAmount(0);
        setAmount("");
        setAssignee("");
      }, 3000);
    } finally {
      setFetchingTarget(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleAmountChange = (text: string) => {
    setAmount(text);
    const numericValue = parseFloat(text);
    if (isNaN(numericValue) || numericValue <= 0) {
      setError(t("Error.Please enter a valid amount."));
    } else if (numericValue > maxAmount) {
      setError(t("Error.You have exceeded the maximum amount."));
    } else {
      setError("");
    }
  };

  const isSaveButtonDisabled = () => {
    const numericAmount = parseFloat(amount);
    return (
      !assignee ||
      assignee === "0" ||
      !amount ||
      isNaN(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > maxAmount ||
      loading ||
      fetchingTarget ||
      !!error
    );
  };

  const receiveTarget = async () => {
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
        `${t("Error.You cannot transfer more than")} ${maxAmount}kg.`,
      );
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      setFetchingTarget(true);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.put(
        `${environment.API_BASE_URL}api/target/manager/recieve-target`,
        {
          fromOfficerId: assignee, // The officer transferring the target
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
          t("Error.Target received successfully."),
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
        Alert.alert(t("Error.error"), t("Error.Failed to receive target."));
      }
    } catch (error: any) {
      console.error("Receive Target Error:", error);
      Alert.alert(
        t("Error.error"),
        t("Error.An error occurred while receiving the target."),
      );
    } finally {
      setFetchingTarget(false);
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
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        {/* ✅ Fixed Header */}
        <View className="flex-row items-center bg-[#313131] p-6 rounded-b-lg">
          <TouchableOpacity
            onPress={() => {
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
                        todo: route.params.todo,
                        qty,
                        varietyNameSinhala,
                        varietyNameTamil,
                        dailyTarget,
                      },
                    },
                  },
                ],
              });
            }}
            className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
          >
            <AntDesign name="left" size={22} color="white" />
          </TouchableOpacity>
          {/* <Text className="text-white text-lg font-semibold text-center w-full"> */}
          <Text className="flex-1 text-center text-xl font-semibold text-white mr-[6%]">
            {getvarietyName()}
          </Text>
        </View>

        <View className="bg-white rounded-lg p-4">
          <View className="p-5">
            <Text className="text-gray-700 mb-2">
              {t("PassTargetBetweenOfficers.Short Stock Assignee")}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#313131" />
            ) : errorMessage ? (
              <Text className="text-red-500">{errorMessage}</Text>
            ) : (
              <View className="mb-4">
                <SelectList
                  setSelected={(value: string) => {
                    setAssignee(value);
                    fetchDailyTarget(value); // Fetch daily target when an officer is selected
                  }}
                  data={officers}
                  save="key"
                  defaultOption={{
                    key: "0",
                    value: t("PassTargetBetweenOfficers.Select an officer"),
                  }}
                  boxStyles={{
                    borderWidth: 1,
                    borderColor: "#F4F4F4",
                    backgroundColor: "#F4F4F4",
                    borderRadius: 25,
                  }}
                  inputStyles={{
                    color: assignee && assignee !== "0" ? "#000000" : "#848484",
                  }}
                  dropdownStyles={{
                    // Fixed: changed from dropDownStyles to dropdownStyles
                    borderColor: "#F4F4F4",
                    backgroundColor: "#F4F4F4",
                  }}
                />
              </View>
            )}

            <View className="border-b border-gray-300 my-4" />

            <Text className="text-gray text-sm mb-2 text-center mt-4">
              {t("PassTargetBetweenOfficers.maximum amount receive")}
            </Text>
            {fetchingTarget ? (
              <ActivityIndicator size="small" color="#313131" />
            ) : (
              <Text className="text-xl font-bold text-center text-black mb-4">
                {maxAmount
                  ? `${maxAmount} ${t("PassTargetBetweenOfficers.kg")}`
                  : "--"}
              </Text>
            )}
          </View>

          <View className="p-5">
            <Text className="text-gray-700 mb-2">
              {t("PassTargetBetweenOfficers.Amount")}
            </Text>
            <TextInput
              className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full p-2 text-gray-800"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="--"
              editable={assignee === "0" || errorMessage ? false : true}
            />
            {error ? <Text className="text-red-500 mt-2">{error}</Text> : null}
          </View>
        </View>

        <View className="mt-6 items-center">
          <TouchableOpacity
            className={`rounded-full w-64 py-3 ${
              isSaveButtonDisabled() ? "bg-gray-400" : "bg-[#000000]"
            }`}
            onPress={receiveTarget}
            disabled={isSaveButtonDisabled()}
          >
            {fetchingTarget ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium">
                {t("PassTargetBetweenOfficers.Save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default RecieveTargetScreen;
