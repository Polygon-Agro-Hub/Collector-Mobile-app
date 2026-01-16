import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { AntDesign, Entypo, FontAwesome5, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import i18n from "@/i18n/i18n";
import DateTimePicker from "@react-native-community/datetimepicker";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedCashOfficer"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<RootStackParamList, "ReceivedCashOfficer">;

interface Transaction {
  id: string;
  orderId: string;
  cash: number;
  receivedTime: string;
  date: string;
  pickupOrderId: string;
  invNo: string;
  paymentMethod: string;
}

interface ApiTransaction {
  pickupOrderId: number;
  pickupOrderOrderId: number;
  orderIssuedOfficer: number;
  handOverOfficer: number | null;
  signature: string | null;
  handOverPrice: number | null;
  handOverTime: string | null;
  pickupCreatedAt: string;
  processOrderId: number;
  processOrderOrderId: number;
  invNo: string;
  transactionId: string;
  paymentMethod: string;
  isPaid: number;
  amount: number;
  processStatus: string;
  orderId: number;
  userId: number;
  orderApp: string;
  delivaryMethod: string;
  fullTotal: number;
  orderCreatedAt: string;
}

const ReceivedCashOfficer: React.FC<ReplaceRequestsProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Format date from API response
  const formatApiDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${year}/${month}/${day} ${formattedHours}:${minutes} ${ampm}`
    };
  };

  // Transform API data to Transaction format
  const transformApiData = (apiData: ApiTransaction[]): Transaction[] => {
    return apiData
      .filter(item => {
        // Only show Cash payments where handOverOfficer is null
        const isCash = item.paymentMethod?.toLowerCase() === 'cash';
        const notHandedOver = item.handOverOfficer === null;
        
        console.log('Filtering item:', {
          invNo: item.invNo,
          paymentMethod: item.paymentMethod,
          isCash,
          handOverOfficer: item.handOverOfficer,
          notHandedOver,
          shouldInclude: isCash && notHandedOver
        });
        
        return isCash && notHandedOver;
      })
      .map(item => {
        const { date, time } = formatApiDate(item.pickupCreatedAt);
        // Use fullTotal if handOverPrice is null
        const cashAmount = item.handOverPrice ?? parseFloat(item.fullTotal.toString()) ?? 0;
        
        console.log('Transforming item:', {
          invNo: item.invNo,
          handOverPrice: item.handOverPrice,
          fullTotal: item.fullTotal,
          cashAmount
        });
        
        return {
          id: item.pickupOrderId.toString(),
          orderId: item.invNo,
          cash: cashAmount,
          receivedTime: time,
          date: date,
          pickupOrderId: item.pickupOrderId.toString(),
          invNo: item.invNo,
          paymentMethod: item.paymentMethod,
        };
      });
  };

  // Fetch data from API
  const fetchReceivedCash = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/pickup/get-received-cash-officer`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data.success) {
        const transformedData = transformApiData(response.data.data);
        setTransactions(transformedData);
        console.log("Fetched transactions:", transformedData.length);
        console.log("Transformed data:", transformedData);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching received cash:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          Alert.alert("Session Expired", "Please login again.");
        } else {
          Alert.alert(
            "Error", 
            error.response?.data?.message || "Failed to fetch received cash data"
          );
        }
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReceivedCash();
  }, []);

  //  Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReceivedCash();
    }, [])
  );

  //  Calculate total cash
  const totalCash = transactions.reduce((sum, t) => sum + t.cash, 0);

  // Calculate selected total cash
  const selectedTotalCash = transactions
    .filter(t => selectedTransactions.has(t.id))
    .reduce((sum, t) => sum + t.cash, 0);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReceivedCash();
    setRefreshing(false);
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  // Select all transactions
  const handleSelectAll = () => {
    const allIds = new Set(transactions.map(t => t.id));
    setSelectedTransactions(allIds);
  };

  // Deselect all transactions
  const handleDeselectAll = () => {
    setSelectedTransactions(new Set());
  };

  // Handle hand over
  const handleHandOver = () => {
    console.log("Hand over selected transactions:", Array.from(selectedTransactions));
    
    // Get the selected transactions data
    const selectedTransactionsData = transactions
      .filter(t => selectedTransactions.has(t.id))
      .map(t => ({
        id: t.id,
        orderId: t.orderId,
        cash: t.cash,
        pickupOrderId: t.pickupOrderId,
        invNo: t.invNo,
      }));
    
    // Pass the selected transactions data to QR code screen
    navigation.navigate("ReceivedCashQrCode", {
      selectedTransactions: selectedTransactionsData,
      fromScreen: "ReceivedCashOfficer"
    });
  };

  // Check if all transactions are selected
  const allSelected = transactions.length > 0 && selectedTransactions.size === transactions.length;

  // Render transaction item
  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isSelected = selectedTransactions.has(item.id);
    
    return (
      <TouchableOpacity 
        onPress={() => toggleTransactionSelection(item.id)}
        activeOpacity={0.7}
      >
        <View className={`bg-[#ADADAD1A] mx-4 mb-3 p-4 rounded-xl border ${isSelected ? 'border-[#738FAE]' : 'border-[#738FAE]'} shadow-sm`}>
          <View className="flex-row items-start">
            {/* Checkbox */}
            <TouchableOpacity 
              onPress={() => toggleTransactionSelection(item.id)}
              className="mr-3 mt-0.5"
            >
              <View className={`w-5 h-5 rounded border ${isSelected ? 'bg-black border-black' : 'bg-white border-black'} items-center justify-center`}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
            </TouchableOpacity>

            {/* Transaction Details */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 mb-1">
                {t("ReceivedCash.Order ID")} : {item.orderId}
              </Text>
              <View className="flex-row">
                <Text className="text-sm text-[#848484] mb-1">
                  {t("ReceivedCash.Cash")} : 
                </Text>
                <Text className="text-sm text-black font-medium"> Rs.{item.cash.toFixed(2)}</Text>
              </View>
              <Text className="text-xs text-[#848484]">
                {t("ReceivedCash.Received Time")} : {item.receivedTime}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state
  const EmptyState = () => (
    <View className="flex-1 items-center justify-center mt-[50%]">
      <View className=" items-center justify-center mb-4">
         <LottieView
                   source={require('../../assets/lottie/NoComplaints.json')}
                   autoPlay
                   loop
                   style={{ width: 150, height: 150 }}
                 />
      </View>
      <Text className="text-[#828282] text-base italic">
        - {t("ReceivedCash.No cash was received recently")} -
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 flex-row items-center ">
        <TouchableOpacity
          className="absolute left-4 bg-[#F6F6F680] rounded-full p-2 z-50"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View className="flex-1 items-center justofy-center ml-2">
          <Text className="text-lg font-semibold text-gray-900">
            {t("ReceivedCash.Received Cash")}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-900">
          {t("ReceivedCash.All")} ({transactions.length})
        </Text>
      </View>

      {/* Total Card */}
     {transactions.length > 0 && (
        <View className="px-4 py-4">
          <View 
            style={{
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: '#980775',
              borderRadius: 12,
              backgroundColor: 'white',
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginHorizontal: 40,
            }}
          >
            <View className="flex-row items-center justify-center">
              <Text className=" font-medium text-black">
                {t("ReceivedCash.Full Total")} :   {" "}
              </Text>
              <Text className="text-xl font-bold text-[#980775]">
                Rs.{totalCash.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {transactions.length > 0 && (
        <View className="p-6">
          <TouchableOpacity 
            onPress={allSelected ? handleDeselectAll : handleSelectAll}
            className="flex-row items-center"
          >
            <View className={`w-4 h-4 rounded  ${allSelected ? '' : ' border bg-white border-black'} items-center justify-center mr-2`}>
              {allSelected && (
                <Entypo name="squared-minus" size={18} color="red" />
              )}
            </View>
            <Text className={`text-sm underline ${allSelected ? 'text-[#000000]' : 'text-[#000000]'} font-medium`}>
              {allSelected ? t("ReceivedCash.Deselect All") : t("ReceivedCash.Select All")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#980775" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: selectedTransactions.size > 0 ? 100 : 20 }}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#980775"
              colors={["#980775"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Hand Over Button - Only show when items are selected */}
      {selectedTransactions.size > 0 && transactions.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4">
          <TouchableOpacity
            onPress={handleHandOver}
            className="bg-[#980775] rounded-full py-3 flex-row items-center justify-center"
            activeOpacity={0.8}
          >
            <FontAwesome6 name="hand-holding-hand" size={18} color="white" />
            <Text className="text-white text-base font-semibold ml-4">
              {t("ReceivedCash.Hand Over")} (Rs.{selectedTotalCash.toFixed(2)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ReceivedCashOfficer;