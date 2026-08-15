import store from "@/services/reducxStore";
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LoadingPage from "@/component/components/loading/LoadingPage";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ShortageProductItem {
  srtAssignId: number;
  mpItemId: number;
  name: string;
  kg: number;
  assignedQty: number;
  shortageQty: number;
  ceilingPrice: number;
  gradeAPrice?: number;
  image: string;
  reqStatus: "Pending" | "Completed" | null;
  assignStatus?: "Pending" | "Finalize";
}

const formatKg = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return "0";
  const rounded = Math.round(num * 1000) / 1000;
  return String(rounded);
};

export default function PurchaseShortage({ navigation }: { navigation: any }) {
  const [products, setProducts] = useState<ShortageProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Main", { screen: "DistridutionaDashboard" });
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [navigation]),
  );
  

  const fetchShortages = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
      const res = await axios.get(
        `${environment.API_BASE_URL}api/purchase-shortage`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (res.data && res.data.success) {
        setProducts(res.data.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching shortages:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchShortages();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchShortages();
    }, []),
  );

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header with title "Assigned Products" */}
      <CustomHeader
        title="Assigned Products"
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main", { screen: "DistridutionaDashboard" })
        }
      />

      {loading && !refreshing ? (
        <LoadingPage fullScreen message="Loading..." />
      ) : products.length === 0 ? (
        /* Empty State */
        <NoDataScreen message="- You don't have any products assigned for purchase today. -" />
      ) : (
        /* Active Product List State */
        <ScrollView
          className="flex-1 bg-white px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#030E25"]}
              tintColor="#030E25"
            />
          }
        >
          <View className="gap-4">
            {products.map((item) => {
              const isDisabled = item.kg === 0;
              const textColor = isDisabled ? "#4E52734D" : "#030E25";
              const subTextColor = isDisabled ? "#4E52734D" : "#676771";

              return (
                <TouchableOpacity
                  key={item.srtAssignId}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.8}
                  onPress={() => {
                    if (!isDisabled) {
                      navigation.navigate("PurchaseProduct", { product: item });
                    }
                  }}
                  style={{
                    borderColor: isDisabled ? "#4E52734D" : "#79747E33",
                    backgroundColor: isDisabled ? "#4E52734D" : "#FFFFFF",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: isDisabled ? 0 : 2 },
                    shadowOpacity: isDisabled ? 0 : 0.08,
                    shadowRadius: isDisabled ? 0 : 4,
                    elevation: isDisabled ? 0 : 3,
                  }}
                  className="flex-row items-center border rounded-2xl p-4"
                >
                  {/* Product Thumbnail with top layer overlay when disabled */}
                  <View className="relative w-12 h-12 rounded-xl mr-4 overflow-hidden">
                    <Image
                      source={{ uri: item.image }}
                      className="w-12 h-12 rounded-xl"
                      resizeMode="cover"
                    />
                    {isDisabled && (
                      <View className="absolute inset-0 rounded-xl z-10" />
                    )}
                  </View>

                  {/* Product Info */}
                  <View className="flex-1">
                    <Text
                      style={{ color: textColor }}
                      className="font-extrabold text-base"
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{ color: subTextColor }}
                      className="text-sm font-semibold mt-0.5"
                    >
                      {isDisabled ? `0 kg` : `${formatKg(item.kg)} kg`}
                    </Text>
                  </View>

                  {/* Arrow Chevron Right */}
                  <Feather name="chevron-right" size={22} color="black" />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
