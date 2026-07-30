import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/navigations/CustomHeader";
import LoadingPage from "@/component/commons/LoadingPage";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";

export interface ShortageProductItem {
  srtAssignId: number;
  mpItemId: number;
  name: string;
  kg: number;
  shortageQty: number;
  ceilingPrice: number;
  gradeAPrice?: number;
  image: string;
  reqStatus: "Pending" | "Completed" | null;
}

export default function PurchaseShortage({ navigation }: { navigation: any }) {
  const [products, setProducts] = useState<ShortageProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchShortages = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(
        `${environment.API_BASE_URL}api/purchase-shortage`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
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
    }, [])
  );

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header with title "Assigned Products" */}
      <CustomHeader
        title="Assigned Products"
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
      />

      {loading && !refreshing ? (
        <LoadingPage fullScreen message="Loading assign products..." />
      ) : products.length === 0 ? (
        /* Empty State */
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-56 h-56 justify-center items-center mb-6">
            <LottieView
              source={require("../../../../assets/lottie/no-data.json")}
              autoPlay
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <Text className="text-xs font-semibold text-[#676771] text-center italic px-6 leading-5">
            - You don't have any products assigned for purchase today. -
          </Text>
        </View>
      ) : (
        /* Active Product List State */
        <ScrollView
          className="flex-1 bg-white px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
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
                      className="text-xs font-semibold mt-0.5"
                    >
                      {item.kg} kg
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
