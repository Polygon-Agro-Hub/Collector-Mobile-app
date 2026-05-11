import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  BackHandler,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { scale } from "react-native-size-matters";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RootStackParamList } from "../types/types";
import { environment } from "@/environment/environment";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";

type TransactionListNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TransactionList"
>;
type TranscationListRouteProp = RouteProp<RootStackParamList, "OfficerSummary">;

interface TransactionListProps {
  navigation: TransactionListNavigationProp;
  route: TranscationListRouteProp;
}

interface Transaction {
  registeredFarmerId: number;
  userId: number;
  phoneNumber: string;
  address: string;
  bankAddress: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  branchName: string | null;
  id: number;
  firstName: string;
  lastName: string;
  NICnumber: string;
  totalAmount: number;
}

const TransactionList: React.FC<TransactionListProps> = ({
  route,
  navigation,
}) => {
  const {
    officerId,
    collectionOfficerId,
    phoneNumber1,
    phoneNumber2,
    officerName,
  } = route.params;

  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useFocusEffect(
    React.useCallback(() => {
      setSelectedDate(new Date());
      setShowDatePicker(false);
      return () => {};
    }, [])
  );

  const fetchTransactions = async (date: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/transaction-list?collectionOfficerId=${collectionOfficerId}&date=${date}`
      );
      const data = await response.json();

      if (response.ok) {
        const formattedData = data.map((transaction: any) => ({
          id: transaction.registeredFarmerId ?? Math.random(),
          registeredFarmerId: transaction.registeredFarmerId || 0,
          userId: transaction.userId || 0,
          firstName: transaction.firstName || "",
          lastName: transaction.lastName || "",
          phoneNumber: transaction.phoneNumber || "",
          address: transaction.address || "",
          NICnumber: transaction.NICnumber || "",
          totalAmount: parseFloat(transaction.totalAmount) || 0,
          bankAddress: transaction.bankAddress || null,
          accountNumber: transaction.accountNumber || null,
          accountHolderName: transaction.accountHolderName || null,
          bankName: transaction.bankName || null,
          branchName: transaction.branchName || null,
        }));

        setTransactions(formattedData);
        setFilteredTransactions(formattedData);
      } else {
        console.error("Error fetching transactions:", data.error);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");

    if (!normalizedQuery) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter((transaction: any) => {
      const firstName = (transaction.firstName || "").trim().toLowerCase();
      const lastName = (transaction.lastName || "").trim().toLowerCase();
      const nicNumber = (transaction.NICnumber || "")
        .replace(/[^\w\s]/gi, "")
        .toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");

      return (
        firstName.includes(normalizedQuery) ||
        lastName.includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        nicNumber.includes(normalizedQuery)
      );
    });

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    fetchTransactions(getCurrentDate());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      fetchTransactions(formattedDate);
    }
  }, [selectedDate]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions(getCurrentDate());
      setSearchQuery("");
    }, [])
  );

  const handleBackPress = useCallback(() => {
    navigation.navigate("OfficerSummary" as any, {
      collectionOfficerId,
      officerId,
      phoneNumber1,
      phoneNumber2,
      officerName,
    });
    return true;
  }, [navigation, collectionOfficerId, officerId, phoneNumber1, phoneNumber2, officerName]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress
      );
      return () => subscription.remove();
    }, [handleBackPress])
  );

  return (
    // ── Matches ManagerTransactions: SafeAreaView with dark header bg ──
    <SafeAreaView className="flex-1 bg-[#980775]">

      {/* ── Purple Header ── */}
      <View className="bg-[#980775] px-4 pt-2 pb-10">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("OfficerSummary" as any, {
                collectionOfficerId,
                officerId,
                phoneNumber1,
                phoneNumber2,
                officerName,
              })
            }
            className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10 items-center"
          >
            <AntDesign name="left" size={22} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-lg font-bold text-center flex-1">
            EMP {t("ManagerTransactions.ID")} : {officerId}
          </Text>

          <TouchableOpacity
            onPress={() => setShowDatePicker((prev) => !prev)}
            className="mr-2"
          >
            <Ionicons name="calendar-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-center mt-2 mb-4">
          <Text className="text-white" style={{ fontSize: 16 }}>
            {t("ManagerTransactions.Selected Date")}{" "}
            {selectedDate
              ? selectedDate.toISOString().split("T")[0].replace(/-/g, "/")
              : "N/A"}
          </Text>
        </View>
      </View>

      {/* ── White curved body — matches ManagerTransactions exactly ── */}
      <View className="flex-1 bg-white rounded-t-[40px] mt-[-20px]">

        {/* Floating search bar */}
        <View
          className="flex-row items-center bg-white px-4 py-2 rounded-full border border-[#444444] mx-4 shadow-md"
          style={{ marginTop: -22 }}
        >
          <TextInput
            style={{ flex: 1, fontSize: 16, fontStyle: "italic" }}
            placeholder={t("ManagerTransactions.Search")}
            placeholderTextColor="grey"
            value={searchQuery}
            onChangeText={(text) => {
              const cleanedText = text.replace(/[^a-zA-Z0-9\s]/g, "");
              const finalText = cleanedText.replace(/^\s+/, "");
              handleSearch(finalText);
            }}
          />
          <TouchableOpacity onPress={() => handleSearch(searchQuery)}>
            <Image
              source={require("../../assets/images/collection-manager/search-transaction.webp")}
              className="w-8 h-8"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Android date picker */}
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}

        {/* iOS date picker */}
        {showDatePicker && Platform.OS === "ios" && (
          <View className="justify-center items-center z-50 absolute ml-6 mt-[52%] bg-gray-100 rounded-lg">
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="inline"
              style={{ width: 320, height: 260 }}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          </View>
        )}

        {/* List header */}
        <View className="px-4 mt-4">
          <Text className="text-lg font-bold text-black mb-4">
            {t("ManagerTransactions.Transaction List")}{" "}
            <Text className="font-normal">
              ({t("ManagerTransactions.All")} {filteredTransactions.length})
            </Text>
          </Text>
        </View>

        {/* Content — wrapped in ScrollView like ManagerTransactions */}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 mb-2">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <LottieView
                  source={require("../../assets/lottie/loading.json")}
                  autoPlay
                  loop
                  style={{ width: 150, height: 150 }}
                />
                <Text className="text-gray-500 mt-4">
                  {t("ManagerTransactions.Loading")}
                </Text>
              </View>
            ) : (
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={filteredTransactions}
                keyExtractor={(item) =>
                  item.id ? item.id.toString() : Math.random().toString()
                }
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center p-4 mb-3 rounded-[35px] bg-gray-100 shadow-sm"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                    onPress={() => {
                      navigation.navigate("TransactionReport" as any, {
                        registeredFarmerId: item.registeredFarmerId,
                        userId: item.userId,
                        firstName: item.firstName,
                        lastName: item.lastName,
                        phoneNumber: item.phoneNumber,
                        address: item.address,
                        NICnumber: item.NICnumber,
                        totalAmount: item.totalAmount,
                        bankAddress: item.bankAddress,
                        accountNumber: item.accountNumber,
                        accountHolderName: item.accountHolderName,
                        bankName: item.bankName,
                        branchName: item.branchName,
                        selectedDate: selectedDate.toISOString().split("T")[0],
                        selectedTime: selectedDate
                          .toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .toUpperCase(),
                      });
                    }}
                  >
                    <View className="w-14 h-14 rounded-full overflow-hidden justify-center items-center mr-4 shadow-md">
                      <Image
                        source={require("../../assets/images/collection-manager/avetar.webp")}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[18px] font-semibold text-gray-900">
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {t("ManagerTransactions.NIC")} {item.NICnumber}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {t("ManagerTransactions.TotalRs")}
                        {item.totalAmount
                          ? item.totalAmount.toLocaleString()
                          : "N/A"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={scale(20)}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center mt-[40%]">
                    <LottieView
                      source={require("../../assets/lottie/no-data.json")}
                      autoPlay
                      loop
                      style={{ width: 150, height: 150 }}
                    />
                    <Text
                      style={{ fontSize: 14, marginTop: -20 }}
                      className="text-gray-500"
                    >
                      {t("ManagerTransactions.Notransactions")}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default TransactionList;