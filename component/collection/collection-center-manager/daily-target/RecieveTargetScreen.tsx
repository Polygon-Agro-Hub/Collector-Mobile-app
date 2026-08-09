import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import { useFocusEffect } from "@react-navigation/native";

type RecieveTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "RecieveTargetScreen"
>;

interface RecieveTargetScreenProps {
  navigation: RecieveTargetScreenNavigationProps;
  route: {
    params: {
      varietyNameEnglish: string;
      varietyNameSinhala: string;
      varietyNameTamil: string;
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
  const [officers, setOfficers] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingTarget, setFetchingTarget] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [officerModalVisible, setOfficerModalVisible] = useState(false);
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

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language");
        if (lang) setSelectedLanguage(lang);
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
        `${environment.API_BASE_URL}api/collection-manager/collection-officers-recieve/${varietyId}/${grade}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.status === "success") {
        const formattedOfficers = response.data.data.map((officer: any) => ({
          label: `${getOfficerName(officer)}  (${officer.empId})`,
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

  const fetchDailyTarget = async (officerId: string) => {
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
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.status === "success" && response.data.data) {
        const { target, complete } = response.data.data;
        const calculatedTodo = parseFloat(target) - parseFloat(complete);
        setMaxAmount(calculatedTodo > 0 ? calculatedTodo : 0);
        setAmount(calculatedTodo.toString());
      } else {
        setErrorMessage(t("Error.No target data found for selected officer."));
        setTimeout(() => {
          setErrorMessage(null);
          setMaxAmount(0);
          setAmount("");
          setAssignee("");
        }, 3000);
      }
    } catch (error: any) {
      setErrorMessage(t("Error.Failed to fetch daily target."));
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
    let sanitized = text.replace(/[^0-9.]/g, "");

    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }

    setAmount(sanitized);

    const numericValue = parseFloat(sanitized);
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
    if (!netState.isConnected) return;

    try {
      setFetchingTarget(true);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.put(
        `${environment.API_BASE_URL}api/target/manager/recieve-target`,
        {
          fromOfficerId: assignee,
          varietyId,
          grade,
          amount: numericAmount,
        },
        { headers: { Authorization: `Bearer ${token}` } },
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

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
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
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

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

  const selectedOfficerLabel =
    officers.find((o) => o.value === assignee)?.label || null;

  return (
    <>
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 bg-white">
          <CustomHeader
            title={getvarietyName() || ""}
            subtitle={grade ? `Grade : ${grade}` : ""}
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
                        todo: route.params.todo,
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

          <View className="bg-white rounded-lg p-4 w-full max-w-[500px] mx-auto">
            <View className="p-5">
              <Text className="text-gray-700 mb-2">
                {t("PassTargetBetweenOfficers.Short Stock Assignee")}
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="#313131" />
              ) : errorMessage ? (
                <Text className="text-red-500 mb-4">{t(
                    "Error.No targets have been assigned today for the selected crop.",
                  )}</Text>
              ) : (
                <TouchableOpacity
                  onPress={() => setOfficerModalVisible(true)}
                  style={{
                    height: 50,
                    backgroundColor: "#F4F4F4",
                    borderRadius: 25,
                    borderWidth: 1,
                    borderColor: "#F4F4F4",
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: selectedOfficerLabel ? "#000000" : "#848484",
                      fontSize: 14,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {selectedOfficerLabel ||
                      t("PassTargetBetweenOfficers.Select an officer")}
                  </Text>
                  <MaterialIcons
                    name="keyboard-arrow-down"
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
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

              <View className="border-b border-gray-300 my-4" />
            </View>

            <View className="p-5">
              <Text className="text-gray-700 mb-2">
                {t("PassTargetBetweenOfficers.Amount")}
              </Text>
              <TextInput
                className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full p-2 px-5 text-gray-800 h-[50px]"
                keyboardType="numeric"
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="--"
                editable={assignee === "0" || !!errorMessage ? false : true}
              />
              {error ? (
                <Text className="text-red-500 mt-2">{error}</Text>
              ) : null}
            </View>
          </View>

          <View className="mt-6 items-center w-full max-w-[500px] mx-auto">
            <TouchableOpacity
              className={`rounded-full w-64 py-3 h-[50px] justify-center ${isSaveButtonDisabled() ? "bg-gray-400" : "bg-[#000000]"}`}
              onPress={receiveTarget}
              disabled={isSaveButtonDisabled()}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
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

      {/* Officer Modal */}
      <GlobalSearchModal
        visible={officerModalVisible}
        onClose={() => setOfficerModalVisible(false)}
        title={t("PassTargetBetweenOfficers.Short Stock Assignee")}
        data={officers}
        selectedItems={assignee ? [assignee] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          setAssignee(val);
          if (val) fetchDailyTarget(val);
        }}
        searchPlaceholder={t("PassTargetBetweenOfficers.Select an officer")}
        multiSelect={false}
        noResultsText={t("Error.No officers available.")}
      />
    </>
  );
};

export default RecieveTargetScreen;
