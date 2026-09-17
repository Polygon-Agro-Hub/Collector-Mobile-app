import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import LoadingPage from "@/component/components/loading/LoadingPage";
import AddButton from "@/component/components/buttons/AddButton";
import { MaterialIcons } from "@expo/vector-icons";

type ReceivedProductsTodayNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedProductsToday"
>;

interface ReceivedProductsTodayProps {
  navigation: ReceivedProductsTodayNavigationProp;
}

export interface ReceivedProductItem {
  id: string;
  transferCode?: string;
  vehicleNo?: string;
  driverEmpId?: string;
  driverName?: string;
  crates: number;
  weight: string;
  origin: string;
  time: string;
}

export default function ReceivedProductsToday({
  navigation,
}: ReceivedProductsTodayProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ReceivedProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReceivedProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const authToken = store.getState().auth.token;

      let resData = null;
      try {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/distribution/received-today`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (response.data?.success) {
          resData = response.data.data;
        }
      } catch (distErr) {
        // Fallback to transport route if needed
        const response = await axios.get(
          `${environment.API_BASE_URL}api/transport/received-today`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (response.data?.success) {
          resData = response.data.data;
        }
      }

      if (resData) {
        setProducts(resData);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching received products:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t(
          "Error.Failed to fetch received products.",
          "Failed to fetch received products."
        )
      );
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchReceivedProducts();
    }, [fetchReceivedProducts])
  );

  const handleAdd = () => {
    navigation.navigate("ScanLoadQR");
  };

  const handleRefresh = () => {
    fetchReceivedProducts(true);
  };

  const handleCardPress = (item: ReceivedProductItem) => {
    navigation.navigate("ReceivedProductsSummary", {
      transportId: item.id,
      loadCode: item.transferCode,
      vehicleNo: item.vehicleNo,
      driverEmpId: item.driverEmpId,
      driverName: item.driverName,
      origin: item.origin,
      isUnloaded: true,
      title: "Unloaded Summery",
    });
  };

  const formatIndex = (index: number) => {
    return String(index + 1).padStart(2, "0");
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title={t("ReceivedProductsToday.Title", "Received Products Today")}
        navigation={navigation}
      />

      <View className="flex-1 relative">
        {loading ? (
          <LoadingPage
            message={t("ReceivedProductsToday.Loading", "Loading...")}
          />
        ) : products.length === 0 ? (
          /* Empty State */
          <NoDataScreen
            message={t(
              "ReceivedProductsToday.NoProductsReceivedToday",
              "- No products were received today -"
            )}
          />
        ) : (
          /* List of Received Products Cards */
          <ScrollView
            className="flex-1 px-6 pt-4"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#030E25"]}
                tintColor="#030E25"
              />
            }
          >
            {products.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => handleCardPress(item)}
                className="flex-row items-center bg-white border border-[#E1E7EE] rounded-2xl p-4 my-2"
                style={{
                  backgroundColor: "#ffffff",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                {/* Index Circle Badge */}
                <View className="w-12 h-12 rounded-full bg-[#F4F6F9] items-center justify-center mr-4">
                  <Text className="text-sm font-bold text-[#030E25]">
                    {formatIndex(index)}
                  </Text>
                </View>

                {/* Load Information */}
                <View className="flex-1">
                  <Text className="font-extrabold text-[#030E25] text-base">
                    {t("ReceivedProductsToday.Crates", "Crates")} : {item.crates} | {item.weight}
                  </Text>
                  <Text className="text-xs text-[#030E25] mt-1 font-medium">
                    {item.origin}
                  </Text>
                  <Text className="text-xs text-[#54617D] mt-0.5 font-medium">
                    {item.time}
                  </Text>
                </View>

                {/* Right Arrow */}
                <MaterialIcons name="chevron-right" size={26} color="#030E25" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Floating Add Button */}
        <AddButton onPress={handleAdd} />
      </View>
    </View>
  );
}
