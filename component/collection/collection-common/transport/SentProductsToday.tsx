import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import AddButton from "@/component/components/buttons/AddButton";
import LoadingPage from "@/component/components/loading/LoadingPage";
import { MaterialIcons } from "@expo/vector-icons";
import environment from "@/environment/environment";

type SentProductsTodayNavigationProps = StackNavigationProp<
  RootStackParamList,
  "SentProductsToday"
>;

interface SentProductsTodayProps {
  navigation: SentProductsTodayNavigationProps;
}

export interface SentProductItem {
  id: string;
  transferCode?: string;
  vehicleNo?: string;
  driverEmpId?: string;
  driverName?: string;
  crates: number;
  weight: string;
  destination: string;
  time: string;
}

export default function SentProductsToday({ navigation }: SentProductsTodayProps) {
  const { t } = useTranslation();

  const [products, setProducts] = useState<SentProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchSentProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const authToken = store.getState().auth.token;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/sent-today`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.data.success) {
        setProducts(response.data.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching sent products:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to fetch sent products.", "Failed to fetch sent products."),
      );
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSentProducts();
  }, [fetchSentProducts]);

  const handleAdd = () => {
    navigation.navigate("ScanDriverQR");
  };

  const handleRefresh = () => {
    fetchSentProducts(true);
  };

  const formatIndex = (index: number) => {
    return String(index + 1).padStart(2, "0");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <CustomHeader
        title={t("SentProductsToday.Title", "Sent Products Today")}
        navigation={navigation}
      />

      <View className="flex-1 relative">
        {loading ? (
          /* Loading State */
          <LoadingPage
            message={t("SentProductsToday.Loading", "Loading...")}
          />
        ) : products.length === 0 ? (
          /* Empty State */
          <NoDataScreen
            message={t("SentProductsToday.NoLoadsToday", "- No loads today -")}
          />
        ) : (
          /* List of Sent Products Cards */
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
                onPress={() => {
                  navigation.navigate("LoadingToVehicleSummary", {
                    transportId: item.id,
                    loadCode: item.transferCode,
                    vehicleNo: item.vehicleNo,
                    driverEmpId: item.driverEmpId,
                    driverName: item.driverName,
                    centreName: item.destination,
                    isViewOnly: true,
                  });
                }}
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
                    {t("SentProductsToday.Crates", "Crates")} : {item.crates} | {item.weight}
                  </Text>
                  <Text className="text-xs text-[#030E25] mt-1 font-medium">
                    {item.destination}
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