import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

import CustomHeader from "@/component/navigations/CustomHeader";

interface Product {
  id: number;
  name: string;
  image: string;
}

export default function WelcomeToPacking({ route, navigation }: { route: any; navigation: any }) {
  const { positionName = "Packing Position 1" } = route.params || {};

  // Testing helper: toggle state between Data state and No-Data state
  const [hasData, setHasData] = useState<boolean>(true);

  // High quality Unsplash crop/product images for absolute visual premium look
  const products: Product[] = [
    {
      id: 1,
      name: "Avacado",
      image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      name: "Batana",
      image: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 3,
      name: "Cardamom",
      image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 4,
      name: "Garlic",
      image: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 5,
      name: "Sri Lankan Yellow Lemon",
      image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title=""
        navigation={navigation}
        rightComponent={
          <TouchableOpacity
            onPress={() => setHasData(!hasData)}
            className="px-3 py-1.5 rounded-full bg-[#E9ECF1]"
            activeOpacity={0.7}
          >
            <Text className="text-[10px] font-extrabold text-[#030E25] uppercase tracking-wide">
              {hasData ? "Mock Empty" : "Mock Data"}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Main Content scroll area */}
      <ScrollView className="flex-1 bg-white px-6">
        {/* Page Title */}
        <View className="items-center mb-4">
          <Text className="text-xl font-extrabold text-[#030E25] text-center">
            Welcome to {positionName}
          </Text>
        </View>

        {/* Subtitle depending on state */}
        <View className="items-center mb-8 px-4">
          {hasData ? (
            <Text className="text-sm font-medium text-[#54617D] text-center leading-5">
              Before you begin make sure you have{"\n"}these products with you
            </Text>
          ) : (
            <Text className="text-sm font-medium text-[#54617D] text-center leading-5">
              Please wait and check again.{"\n"}This row doesn't have a daily target yet.
            </Text>
          )}
        </View>

        {/* Body content based on Data state */}
        {hasData ? (
          /* DATA STATE: 2-column Grid of crop items */
          <View className="flex-row flex-wrap justify-between px-1">
            {products.map((product) => (
              <View
                key={product.id}
                className="w-[47%] bg-white border border-[#E9ECF1] rounded-3xl p-5 mb-5 items-center justify-center shadow-sm"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.02,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                {/* Crop image with clean border wrapper */}
                <View className="w-20 h-20 mb-4 items-center justify-center rounded-full overflow-hidden">
                  <Image
                    source={{ uri: product.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                {/* Crop label */}
                <Text className="text-[#030E25] font-bold text-center text-sm leading-4">
                  {product.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          /* NO DATA STATE: Centered Lottie animation */
          <View className="flex-1 justify-center items-center py-12">
            <View className="w-56 h-56 justify-center items-center">
              <LottieView
                source={require("../../../assets/lottie/no-data.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Working Button pinned to bottom (only shown in Data State) */}
      {hasData && (
        <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Packing", {
                orderNumber: "26050500001 (R)",
                category: "Pickup Order",
              });
            }}
            className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text className="text-white font-extrabold text-base">
              Start Working
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
