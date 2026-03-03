import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { scale } from "react-native-size-matters";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RootStackParamList } from "../types";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

type ManagerTransactionsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ManagerTransactions"
>;

interface ManagerTransactionsProps {
  navigation: ManagerTransactionsNavigationProp;
  route: any;
}

interface Transaction {
  id: number;
  registeredFarmerId: number;
  userId: number;
  phoneNumber: string;
  address: string;
  bankAddress: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  branchName: string | null;
  empId: string;
  firstName: string;
  lastName: string;
  NICnumber: string;
  totalAmount: number;
  image: string | null;
}

const ManagerTransactions: React.FC<ManagerTransactionsProps> = ({
  route,
  navigation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const { empId } = route.params;
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const sortTransactionsByName = (data: Transaction[]) => {
    return [...data].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const fetchTransactions = async (date: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        console.error("No token found. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/my-collection?date=${date}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Add the token here
          },
        },
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
          empId: transaction.empId || "",
          image: transaction.profileImage || null,
        }));

        const sortedData = sortTransactionsByName(formattedData);

        setTransactions(formattedData);
        setFilteredTransactions(sortedData);
      } else {
        console.error("Error fetching transactions:", data.error);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = transactions.filter((transaction) => {
      const searchTerm = query.toLowerCase();
      const firstName = transaction.firstName?.toLowerCase() || "";
      const lastName = transaction.lastName?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`;

      const nicNumberMatch = transaction.NICnumber?.replace(/[^\w\s]/gi, "")
        .toLowerCase()
        .includes(searchTerm);

      return (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        fullName.includes(searchTerm) ||
        nicNumberMatch
      );
    });

    setFilteredTransactions(sortTransactionsByName(filtered));
  };

  useEffect(() => {
    fetchTransactions(getCurrentDate());
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        await fetchSelectedLanguage();
        fetchTransactions(getCurrentDate());
        setSearchQuery("");
      };
      fetchData();
    }, []),
  );

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      fetchTransactions(formattedDate);
    }
  }, [selectedDate]);

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View>
        {/* Header */}
        <View className="bg-[#313131] p-4  rounded-b-[35px] shadow-md">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className=" bg-[#FFFFFF1A] rounded-full  p-2 justify-center w-10"
            >
              <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <Text className="text-white text-lg font-bold text-center flex-1">
              {t("ManagerDashboard.MyCollection")}
            </Text>

            <TouchableOpacity
              onPress={() => setShowDatePicker((prev) => !prev)}
              className="mr-2"
            >
              <Ionicons name="calendar-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-white text-lg ml-[20%]"
            >
              {t("ManagerTransactions.Selected Date")}{" "}
              {selectedDate
                ? selectedDate.toISOString().split("T")[0].replace(/-/g, "/")
                : "N/A"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center bg-[#F7F7F7] px-4 py-2  rounded-full border border-[#444444] mt-[-18] mx-auto w-[90%] shadow-sm">
          <TextInput
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            placeholder={t("ManagerTransactions.Search")}
            placeholderTextColor="grey"
            className="flex-1 text-sm text-gray-800"
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
        <Text
          style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
          className="text-lg font-bold text-black mb-4"
        >
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
          <View className="flex-1 mb-2">
            <FlatList
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
                  onPress={() => {
                    navigation.navigate("TransactionReport", {
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
                      empId: item.empId, // Pass empId to the FarmerReport screen
                    });
                  }}
                >
                  <View className="w-14 h-14 rounded-full overflow-hidden justify-center items-center mr-4 shadow-md">
                    <Image
                      source={
                        item.image
                          ? { uri: item.image }
                          : require("../../assets/images/collection-manager/avetar.webp")
                      }
                      className="w-16 h-16 rounded-full mr-3"
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
                    style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
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
  );
};

export default ManagerTransactions;
