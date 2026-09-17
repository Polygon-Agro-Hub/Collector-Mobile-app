import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import environment from "@/environment/environment";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import { LanguageContext } from "@/context/LanguageContext";

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
  const [rawOfficers, setRawOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [officerModalVisible, setOfficerModalVisible] = useState(false);
  const { t, i18n } = useTranslation();
  const { language } = useContext(LanguageContext);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

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

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      if (lang) setSelectedLanguage(lang);
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const getActiveLang = useCallback(() => {
    return (language || selectedLanguage || i18n.language || "en").toLowerCase();
  }, [language, selectedLanguage, i18n.language]);

  const getOfficerName = useCallback(
    (officer: Officer) => {
      if (!officer) return "";
      const lang = getActiveLang();
      if (lang.startsWith("si") && officer.fullNameSinhala?.trim()) {
        return officer.fullNameSinhala.trim();
      }
      if (lang.startsWith("ta") && officer.fullNameTamil?.trim()) {
        return officer.fullNameTamil.trim();
      }
      return (
        officer.fullNameEnglish?.trim() ||
        officer.fullNameSinhala?.trim() ||
        officer.fullNameTamil?.trim() ||
        officer.empId ||
        ""
      );
    },
    [getActiveLang],
  );

  const officers = useMemo(() => {
    return rawOfficers.map((officer) => ({
      label: `${getOfficerName(officer)} (${officer.empId})`,
      value: officer.collectionOfficerId.toString(),
    }));
  }, [rawOfficers, getOfficerName]);

  const isSaveDisabled = () => {
    const numericAmount = parseFloat(amount);
    return (
      !assignee ||
      submitting ||
      numericAmount > maxAmount ||
      isNaN(numericAmount) ||
      numericAmount <= 0
    );
  };

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = store.getState().auth.token;
      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-manager/collection-officers`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.status === "success") {
        setRawOfficers(response.data.data || []);
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

  useFocusEffect(
    React.useCallback(() => {
      setAssignee("");
      fetchSelectedLanguage();
      fetchOfficers();
      setAmount(maxAmount.toString());
    }, [maxAmount]),
  );

  useEffect(() => {
    fetchSelectedLanguage();
  }, []);

  const handleAmountChange = (text: string) => {
    let sanitized = text.replace(/[^0-9.]/g, "");

    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }

    setAmount(sanitized);

    const numericValue = parseFloat(sanitized);
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
    if (!netState.isConnected) return;

    try {
      setSubmitting(true);

      const token = store.getState().auth.token;
      const response = await axios.put(
        `${environment.API_BASE_URL}api/target/manager/pass-target`,
        {
          toOfficerId: assignee,
          varietyId,
          grade,
          amount: numericAmount,
        },
        { headers: { Authorization: `Bearer ${token}` } },
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
                screen: "DailyTargetList",
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
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const getvarietyName = useCallback(() => {
    const lang = getActiveLang();
    if (lang.startsWith("si") && route.params.varietyNameSinhala) {
      return route.params.varietyNameSinhala;
    }
    if (lang.startsWith("ta") && route.params.varietyNameTamil) {
      return route.params.varietyNameTamil;
    }
    return (
      route.params.varietyNameEnglish ||
      route.params.varietyNameSinhala ||
      route.params.varietyNameTamil ||
      ""
    );
  }, [getActiveLang, route.params]);

  const selectedOfficerLabel =
    officers.find((o) => o.value === assignee)?.label || null;

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={getvarietyName() || ""}
        subtitle={grade ? t("SetTargetScreen.GradeG", { grade }) : ""}
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-lg p-4 w-full max-w-[500px] mx-auto">
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
              <Text className="text-red-500 mb-4">{errorMessage}</Text>
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
                    color: selectedOfficerLabel ? "#000" : "#848484",
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

        <View className="mt-6 items-center w-full max-w-[500px] mx-auto">
          <TouchableOpacity
            className={`rounded-full w-64 py-3 h-[50px] justify-center ${isSaveDisabled() ? "bg-[#ABABAB]" : "bg-[#000000]"}`}
            onPress={passTarget}
            disabled={isSaveDisabled()}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium ">
                {t("PassTargetBetweenOfficers.Save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Officer Modal */}
      <GlobalSearchModal
        visible={officerModalVisible}
        onClose={() => setOfficerModalVisible(false)}
        title={t("PassTargetBetweenOfficers.Short Stock Assignee")}
        data={officers}
        selectedItems={assignee ? [assignee] : []}
        onSelect={(items) => setAssignee(items[0] ?? "")}
        searchPlaceholder={t("PassTargetBetweenOfficers.Search an officer")}
        multiSelect={false}
      />
    </View>
  );
};

export default PassTargetScreen;
