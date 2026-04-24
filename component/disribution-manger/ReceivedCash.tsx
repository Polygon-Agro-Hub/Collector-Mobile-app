import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedCash"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<RootStackParamList, "ReceivedCash">;

interface Transaction {
  id: string;
  orderId: string;
  cash: number;
  fullTotal: string;
  receivedTime: string;
  date: string;
  pickupOrderId?: string;
  invoiceNo?: string;
  paymentMethod?: string;
  transactionId?: string;
}

const ReceivedCash: React.FC<ReplaceRequestsProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const totalCash = transactions.reduce((sum, t) => sum + t.cash, 0);

  const hasTransactions = transactions.length > 0;

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const formatDateForComparison = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${year}/${month}/${day} ${displayHours}:${minutes} ${ampm}`;
  };

  const extractDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchReceivedCash = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/pickup/get-received-cash`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success) {
        const mappedData: Transaction[] = response.data.data.map(
          (item: any) => ({
            id:
              item.pickupOrderId?.toString() || item.processOrderId?.toString(),
            orderId:
              item.processOrderOrderId || item.pickupOrderOrderId || "N/A",
            cash: parseFloat(item.fullTotal) || 0,
            receivedTime: item.handOverTime
              ? formatDateTime(item.handOverTime)
              : formatDateTime(item.pickupCreatedAt),
            date: item.handOverTime
              ? extractDate(item.handOverTime)
              : extractDate(item.pickupCreatedAt),
            pickupOrderId: item.pickupOrderId?.toString(),
            invoiceNo: item.invNo,
            paymentMethod: item.paymentMethod,
            transactionId: item.transactionId,
          }),
        );

        setAllTransactions(mappedData);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch data");
      }
    } catch (error: any) {
      console.error("Error fetching received cash:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to fetch received cash data",
      );
    } finally {
      setLoading(false);
    }
  };

  const filterTransactionsByDate = useCallback(() => {
    setFilterLoading(true);

    setTimeout(() => {
      const selectedDateStr = formatDateForComparison(selectedDate);
      const filtered = allTransactions.filter(
        (transaction) => transaction.date === selectedDateStr,
      );
      setTransactions(filtered);

      setFilterLoading(false);
    }, 300);
  }, [selectedDate, allTransactions]);

  useEffect(() => {
    filterTransactionsByDate();
  }, [filterTransactionsByDate]);

  useEffect(() => {
    fetchReceivedCash();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedDate(new Date());

      fetchReceivedCash();
    }, []),
  );

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCalendarPress = () => {
    setShowDatePicker(true);
  };

  const handleCalendarClose = () => {
    setShowDatePicker(false);
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReceivedCash();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 flex-row items-center ">
        <TouchableOpacity
          className="absolute left-4 bg-[#F6F6F680] rounded-full p-3 z-50"
          onPress={() => navigation.goBack()}
        >
          <Entypo name="chevron-left" size={25} color="#000" />
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center ml-2">
          <Text className="text-lg font-semibold text-gray-900">
            {t("ReceivedCash.Received Cash")}
          </Text>
          <Text className="text-sm text-black">
            {t("ReceivedCash.On")}{" "}
            <Text className="font-bold">{formatDate(selectedDate)}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCalendarPress}
          className="active:opacity-70"
        >
          <Ionicons name="calendar-clear" size={26} color="black" />
        </TouchableOpacity>
      </View>

      <View className="bg-white px-4 py-3 flex-row items-center ">
        <Text className="text-sm font-medium text-gray-900">
          {t("ReceivedCash.All")} (
          {transactions.length.toString().padStart(2, "0")})
        </Text>
      </View>

      {loading || filterLoading ? (
        <View className="flex-1 justify-center items-center">
          <LottieView
            source={require("../../assets/lottie/loading.json")}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
        </View>
      ) : hasTransactions ? (
        <>
          <View className="px-4 py-4">
            <View
              style={{
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: "#980775",
                borderRadius: 12,
                backgroundColor: "white",
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginHorizontal: 40,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Text className=" font-medium text-black">
                  {t("ReceivedCash.Full Total")} :{" "}
                </Text>
                <Text className="text-xl font-bold text-[#980775]">
                  {t("ReceivedCash.Rs")}
                  {totalCash.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Transactions List */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#EF4444"
                colors={["#EF4444"]}
              />
            }
            contentContainerStyle={{
              paddingBottom: 16,
              flexGrow: 1,
            }}
          >
            {transactions.map((item) => (
              <View
                key={item.id}
                className="bg-[#ADADAD1A] mx-4 mb-3 p-4 rounded-xl border border-[#738FAE] shadow-sm"
              >
                <Text className="text-sm font-medium text-gray-900 mb-1">
                  {t("ReceivedCash.Order ID")} : {item.invoiceNo}
                </Text>
                <View className="flex-row">
                  <Text className="text-sm text-[#848484] mb-1">
                    {t("ReceivedCash.Cash")} :
                  </Text>
                  <Text className="text-sm text-black font-medium">
                    {" "}
                    {t("ReceivedCash.Rs")}
                    {item.cash.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <Text className="text-xs text-[#848484]">
                  {t("ReceivedCash.Received Time")} : {item.receivedTime}
                </Text>
              </View>
            ))}

            <View className="h-20" />
          </ScrollView>
        </>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EF4444"
              colors={["#EF4444"]}
            />
          }
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View className="items-center justify-center py-20">
            <View className="flex items-center justify-center mb-4">
              <LottieView
                source={require("../../assets/lottie/no-data.json")}
                autoPlay
                loop
                style={{ width: 150, height: 150 }}
              />
            </View>
            <Text className="text-[#828282] text-base italic">
              - {t("ReceivedCash.No cash was received today")} -
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={handleCalendarClose}
            >
              <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl">
                  <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                    <TouchableOpacity onPress={handleCalendarClose}>
                      <Text className="text-red-600 text-base font-medium">
                        {t("ReceivedCash.Cancel")}
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-base font-semibold text-gray-900">
                      {t("ReceivedCash.Select Date")}
                    </Text>
                    <TouchableOpacity onPress={handleDateConfirm}>
                      <Text className="text-blue-600 text-base font-medium">
                        {t("ReceivedCash.Done")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    textColor="#000"
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </>
      )}
    </View>
  );
};

export default ReceivedCash;
