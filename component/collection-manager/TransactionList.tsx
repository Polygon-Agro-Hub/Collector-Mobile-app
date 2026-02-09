import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { s, scale } from "react-native-size-matters";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RootStackParamList } from "../types";
import { environment } from "@/environment/environment";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { ScrollView } from "react-native-gesture-handler";

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
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
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
   //   console.log("Transactions:", data);

      if (response.ok) {
        const formattedData = data.map((transaction: any) => ({
          id: transaction.registeredFarmerId ?? Math.random(), // Unique ID (fallback to random)
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
        setLoading(false);
      } else {
        console.error("Error fetching transactions:", data.error);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // const handleSearch = (query: string) => {
  //   setSearchQuery(query);
  //   const normalizedQuery = query.trim().toLowerCase();
  //   const filtered = transactions.filter((transaction: any) => {
  //     const firstNameMatch = transaction.firstName
  //       ?.toLowerCase()
  //       .includes(normalizedQuery);
  //     const lastNameMatch = transaction.lastName
  //       ?.toLowerCase()
  //       .includes(normalizedQuery);

  //     const nicMatch = transaction.NICnumber?.replace(/[^\w\s]/gi, "")
  //       .toLowerCase()
  //       .includes(normalizedQuery);

  //     return firstNameMatch || lastNameMatch || nicMatch;
  //   });

  //   setFilteredTransactions(filtered);
  // };

  const handleSearch = (query: string) => {
  setSearchQuery(query);
  // Normalize query: trim and replace multiple spaces with single space
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // If query is empty, show all transactions
  if (!normalizedQuery) {
    setFilteredTransactions(transactions);
    return;
  }
  
  const filtered = transactions.filter((transaction: any) => {
    // Get individual fields with fallbacks and normalize whitespace
    const firstName = (transaction.firstName || "").trim().toLowerCase();
    const lastName = (transaction.lastName || "").trim().toLowerCase();
    const nicNumber = (transaction.NICnumber || "").replace(/[^\w\s]/gi, "").toLowerCase();
    
    // Create full name and normalize multiple spaces to single space
    const fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ');
    
    // Check if query matches any of these:
    // 1. First name alone
    // 2. Last name alone  
    // 3. Full name (first + last)
    // 4. NIC number
    const firstNameMatch = firstName.includes(normalizedQuery);
    const lastNameMatch = lastName.includes(normalizedQuery);
    const fullNameMatch = fullName.includes(normalizedQuery);
    const nicMatch = nicNumber.includes(normalizedQuery);

    return firstNameMatch || lastNameMatch || fullNameMatch || nicMatch;
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
        const fetchData = async () => {
          fetchTransactions(getCurrentDate());
          setSearchQuery("");
        };
        fetchData();
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
        return true; // Prevent default back behavior
      }, [navigation, collectionOfficerId, officerId, phoneNumber1, phoneNumber2, officerName]);
    
       useFocusEffect(
        useCallback(() => {
          const onBackPress = () => handleBackPress();
    
          const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    
          return () => subscription.remove();
        }, [handleBackPress])
      );
    

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View>
          {/* Header */}
          <View className="bg-[#980775] p-4  rounded-b-[35px] shadow-md">
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
                className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
              >
                <AntDesign name="left" size={22} color="white" />
              </TouchableOpacity>

              {/* Center Text */}
              <Text className="text-white text-lg font-bold text-center flex-1">
                EMP {t("ManagerTransactions.ID")} : {officerId}
              </Text>

              {/* Right Calendar Icon */}
              <TouchableOpacity
                onPress={() => setShowDatePicker((prev) => !prev)}
                className="mr-2"
              >
                <Ionicons name="calendar-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-center mb-2">
              <Text
                className="text-white text-lg ju"
                style={[{ fontSize: 16 }]}
              >
                {t("ManagerTransactions.Selected Date")}{" "}
                {selectedDate
                  ? selectedDate.toISOString().split("T")[0].replace(/-/g, "/")
                  : "N/A"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-[#F7F7F7] px-4 py-2 rounded-full border border-[#444444] mt-[-18] mx-auto w-[90%] shadow-sm">
            <TextInput
              placeholder={t("ManagerTransactions.Search")}
              placeholderTextColor="grey"
              className="flex-1 text-sm text-gray-800"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              onPress={() => handleSearch(searchQuery)}
            >
              <Image
                source={require("../../assets/images/searchhh.webp")}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

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
          {showDatePicker && Platform.OS === "ios" && (
            <View className=" justify-center items-center z-50 absolute ml-6 mt-[52%] bg-gray-100  rounded-lg">
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
        </View>

        <View className="px-4 mt-4">
          <Text className="text-lg font-semibold text-black mb-4">
            {t("ManagerTransactions.Transaction List")}{" "}
            <Text className="font-normal">
              ({t("ManagerTransactions.All")} {filteredTransactions.length})
            </Text>
          </Text>
        </View>
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <LottieView
              source={require("../../assets/lottie/newLottie.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <Text className="text-gray-500 mt-4">
              {t("ManagerTransactions.Loading")}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 mb-14">
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={filteredTransactions}
                keyExtractor={(item) =>
                  item.id ? item.id.toString() : Math.random().toString()
                }
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  flexGrow: 1,
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center mb-4 p-4  rounded-[35px] bg-gray-100 shadow-sm"
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
                        source={require("../../assets/images/ava.webp")}
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
                  <View className="items-center mt-[50%]">
                    <LottieView
                      source={require("../../assets/lottie/NoComplaints.json")}
                      autoPlay
                      loop
                      style={{ width: 150, height: 150 }}
                    />
                    <Text
                      style={[{ fontSize: 16 }]}
                      className="text-gray-500 text-lg"
                    >
                      {t("ManagerTransactions.Notransactions")}
                    </Text>
                  </View>
                }
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};
export default TransactionList;
