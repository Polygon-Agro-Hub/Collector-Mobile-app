import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
} from "react-native";
import { AntDesign, Entypo } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import i18n from "@/i18n/i18n";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReplaceRequestsScreen"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<
  RootStackParamList,
  "ReplaceRequestsScreen"
>;

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
  const [replaceRequests, setReplaceRequests] = useState<ReplaceRequestItem[]>(
    [],
  );
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
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const mappedData = response.data.data.map((item: any) => ({
          id: item.id.toString(),
          orderId: item.orderId ? item.orderId.toString() : "",
          orderPackageId: item.orderPackageId.toString(),
          productDisplayName: item.productDisplayName,
          createdAt: (() => {
            const d = new Date(item.createdAt);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12 || 12;
            return `${yyyy}/${mm}/${dd} ${hours}.${minutes} ${ampm}`;
          })(),
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
          replacePrice: item.replacePrice,
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
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("DistridutionaDashboard");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      fetchReplaceRequests();
    }, [fetchReplaceRequests]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReplaceRequests();
  }, [fetchReplaceRequests]);

  const handleNavigateToApprove = (item: ReplaceRequestItem) => {
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
        replacePrice: item.replacePrice,
      },
    });
  };

  const renderRequestItem = ({ item }: { item: ReplaceRequestItem }) => (
    <TouchableOpacity activeOpacity={1} onPress={() => handleNavigateToApprove(item)}>
      <View
        className="flex-row items-center bg-white p-3 px-4 mb-4 rounded-xl"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <View className="flex-1">
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="font-bold text-lg text-gray-900"
          >
            {t("ReplaceRequestsScreen.Order ID")} {item.invNo}
          </Text>
          <Text className="text-[#848484] text-base">
            {t("ReplaceRequestsScreen.Replacing Item")}{" "}
            <Text className="text-[#565559] text-base font-semibold">
              {item.replaceProductDisplayName}
            </Text>
          </Text>
          <Text className="text-[#848484] text-base">
            {t("ReplaceRequestsScreen.Requested Time")} : {item.createdAt}
          </Text>
        </View>
        <View className="p-1 rounded-full">
          <Entypo name="chevron-right" size={20} color="#848484" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View className="items-center justify-center py-10 mt-[40%]">
      <LottieView
        source={require("../../assets/lottie/no-data.json")}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
      <Text className="text-center text-gray-500 mt-[-5%]">
        {t("ReplaceRequestsScreen.No replace requests found")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <LottieView
          source={require("../../assets/lottie/loading.json")}
          autoPlay
          loop
          style={{ width: 150, height: 150 }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="my-6">
        <Text className="text-lg font-bold text-center">
          {t("ReplaceRequestsScreen.Replace Requests")}
        </Text>
      </View>
      <View className="flex-1 w-full max-w-[500px] mx-auto">
        <Text className="text-base pb-1 text-[#21202B] font-semibold mx-4 mb-2">
          {t("ReplaceRequestsScreen.All")} ({replaceRequests.length})
        </Text>
        <FlatList
          data={replaceRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 70 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

export default ReplaceRequestsScreen;
