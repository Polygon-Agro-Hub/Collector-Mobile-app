import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/navigations/CustomHeader";

interface ProductItem {
  id: string;
  name: string;
  kg: number;
  image: string;
}

export default function PurchaseShortage({ navigation }: { navigation: any }) {
  const [pageState, setPageState] = useState<"active" | "empty">("active");

  const products: ProductItem[] = [
    {
      id: "1",
      name: "Batana",
      kg: 20,
      image:
        "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: "2",
      name: "Garlic",
      kg: 1,
      image:
        "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: "3",
      name: "Ginger",
      kg: 10,
      image:
        "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: "4",
      name: "Onion",
      kg: 0,
      image:
        "https://images.unsplash.com/photo-1508747703725-719ae25db3e4?w=200&auto=format&fit=crop&q=80",
    },
  ];

  const togglePageState = () => {
    setPageState(pageState === "empty" ? "active" : "empty");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header with title "Assigned Products" */}
      <CustomHeader
        title="Assigned Products"
        navigation={navigation}
        onBackPress={() => navigation.navigate("DistridutionaDashboard")}
        rightComponent={
          <TouchableOpacity
            onPress={togglePageState}
            className="px-3 py-1.5 rounded-full bg-[#E9ECF1]"
            activeOpacity={0.7}
          >
            <Text className="text-[10px] font-extrabold text-[#030E25] uppercase tracking-wide">
              {pageState === "empty" ? "Show List" : "Show Empty"}
            </Text>
          </TouchableOpacity>
        }
      />

      {pageState === "empty" ? (
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
        >
          <View className="gap-4">
            {products.map((item) => {
              const isDisabled = item.kg === 0;
              const textColor = isDisabled ? "#4E52734D" : "#030E25";
              const subTextColor = isDisabled ? "#4E52734D" : "#676771";
              const chevronColor = isDisabled ? "#4E52734D" : "#030E25";

              return (
                <TouchableOpacity
                  key={item.id}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.8}
                  onPress={() => {
                    if (!isDisabled) {
                      navigation.navigate("PurchaseProduct", { product: item });
                    }
                  }}
                  style={{
                    borderColor: "#79747E33",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  className="flex-row items-center bg-white border rounded-2xl p-4"
                >
                  {/* Product Thumbnail (Shows image normally without opacity fade) */}
                  <Image
                    source={{ uri: item.image }}
                    className="w-12 h-12 rounded-xl mr-4 bg-gray-100"
                    resizeMode="cover"
                  />

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
                  <Feather name="chevron-right" size={22} color={chevronColor} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
