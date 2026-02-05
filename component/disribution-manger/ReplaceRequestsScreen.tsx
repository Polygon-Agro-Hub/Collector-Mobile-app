import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp ,  useFocusEffect} from "@react-navigation/native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from '@/environment/environment';
import LottieView from 'lottie-react-native';
import i18n from "@/i18n/i18n";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReplaceRequestsScreen"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<RootStackParamList, "ReplaceRequestsScreen">;

interface ReplaceRequestItem {
  id: string;
  orderId: string;
  orderPackageId: string;
  productDisplayName: string;
  createdAt: string;
  status: string;
  price: string;
  qty: string;
  productTypeName: string;
  invNo: string;
  productType: string;
  productId: string;
  userId: string;
  packageId?: string;
  productNormalPrice?: string;
  productDiscountedPrice?: string;
  replaceProductDisplayName?: string;
  replaceQty?: string;
  replacePrice?: string;
}

const ReplaceRequestsScreen: React.FC<ReplaceRequestsProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const [replaceRequests, setReplaceRequests] = useState<ReplaceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReplaceRequests = useCallback(async () => {
    try {
      const authToken = await AsyncStorage.getItem("token");
      
      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/get-replacerequest`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

    //  console.log("bhdjaovm", response.data);

      if (response.data.success) {
   
        const mappedData = response.data.data.map((item: any) => ({
          id: item.id.toString(),
          orderId: item.orderId ? item.orderId.toString() : '',
          orderPackageId: item.orderPackageId.toString(),
          productDisplayName: item.productDisplayName,
          createdAt: new Date(item.createdAt).toLocaleString(),
          status: item.status,
          price: item.price,
          qty: item.qty,
          productTypeName: item.productTypeName,
          invNo: item.invNo,
          productType: item.productType,
          productId: item.productId,
          userId: item.userId,
          packageId: item.packageId,
          productNormalPrice: item.productNormalPrice,
          productDiscountedPrice: item.productDiscountedPrice,
          replaceProductDisplayName: item.replaceProductDisplayName,
          replaceQty: item.replaceQty,
          replacePrice: item.replacePrice
        }));
        
        setReplaceRequests(mappedData);
      }
    } catch (error) {
      console.error("Error fetching replace requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReplaceRequests();
  }, [fetchReplaceRequests]);

  useFocusEffect(
    useCallback(() => {
      fetchReplaceRequests();
    }, [fetchReplaceRequests])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReplaceRequests();
  }, [fetchReplaceRequests]);

  const handleNavigateToApprove = (item: ReplaceRequestItem) => {
     console.log("price================",   item.qty)
    navigation.navigate("ReplaceRequestsApprove" as any, {
     
      replaceRequestData: {
        id: item.id,
        orderId: item.orderId || item.invNo, 
        orderPackageId: item.orderPackageId,
        productDisplayName: item.productDisplayName,
        productTypeName: item.productTypeName,
        price: item.price,
        originalQty: item.qty,
        status: item.status,
        createdAt: item.createdAt,
        invNo: item.invNo,
        productType: item.productType,
        productId: item.productId,
        userId: item.userId,
        packageId: item.packageId,
        productNormalPrice: item.productNormalPrice,
        productDiscountedPrice: item.productDiscountedPrice,
        qty: item.qty,
        replaceProductDisplayName: item.replaceProductDisplayName,
        replaceQty: item.replaceQty,
        replacePrice: item.replacePrice
      }
      
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-orange-500';
      case 'approved':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const renderRequestItem = ({ item }: { item: ReplaceRequestItem }) => (
    <TouchableOpacity onPress={() => handleNavigateToApprove(item)}>
      <View className="flex-row items-center bg-[#ADADAD1A] p-3 px-4 mb-4 rounded-xl mx-3">
        <View className="flex-1">
          <Text 
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                ? { fontSize: 12 }
                : { fontSize: 15 }
            ]}
            className="font-bold text-base text-gray-900">
            {t("ReplaceRequestsScreen.Order ID")} {item.invNo}
          </Text>
          <Text className="text-gray-700 text-sm">
            {t("ReplaceRequestsScreen.Replacing Item")} {item.replaceProductDisplayName}
          </Text>
         
          <Text className="text-gray-500 text-sm">
            {t("ReplaceRequestsScreen.Requested Time")} : {item.createdAt}
          </Text>
        </View>
        <View className="p-2 rounded-full">
          <AntDesign name="right" size={20} color="#5f5c5cff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View className="p-4 bg-white">
      <View className="mb-6">
        <Text className="text-lg font-bold text-center">
          {t("ReplaceRequestsScreen.Replace Requests")}
        </Text>
      </View>
      <Text className="text-base pb-1 text-[#21202B] font-semibold">
        {t("ReplaceRequestsScreen.All")} ({replaceRequests.length})
      </Text>
    </View>
  );

  const renderEmptyComponent = () => (
    <View className="items-center justify-center py-10 mt-[40%]">
      <LottieView
        source={require('../../assets/lottie/NoComplaints.json')}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
      <Text className="text-center text-gray-500 mt-4">
        {t("ReplaceRequestsScreen.No replace requests found")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList 
        data={replaceRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 70 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ReplaceRequestsScreen;