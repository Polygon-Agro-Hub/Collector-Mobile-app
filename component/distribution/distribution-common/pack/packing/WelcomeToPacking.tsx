import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

interface Product {
  id: number;
  name: string;
  image: string;
}



export default function WelcomeToPacking({ route, navigation }: { route: any; navigation: any }) {
  const { positionId, positionName = "Packing Position 1" } = route.params || {};

  const [products, setProducts] = useState<Product[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCrops = async () => {
      if (!positionId) {
        setLoading(false);
        setHasData(false);
        return;
      }
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Error", "Authentication token not found. Please log in again.");
          return;
        }

        const response = await axios.get(
          `${environment.API_BASE_URL}api/packing/positions/${positionId}/crops`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data && response.data.success) {
          const fetchedCrops = response.data.data;
          if (fetchedCrops.length > 0) {
            const mappedCrops = fetchedCrops.map((c: any) => ({
              id: c.id,
              name: c.name,
              image: c.image || "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80"
            }));
            // Sort A to Z (ascending alphabetical order by product name)
            mappedCrops.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
            setProducts(mappedCrops);
            setHasData(true);
          } else {
            setHasData(false);
          }
        } else {
          Alert.alert("Error", response.data.message || "Failed to fetch crops.");
          setHasData(false);
        }
      } catch (error) {
        console.error("Error fetching crops for position:", error);
        Alert.alert("Error", "An error occurred while fetching crops.");
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCrops();

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [positionId, navigation]);

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title=""
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
      />

      {/* Main Content scroll area */}
      <ScrollView className="flex-1 bg-white px-6" contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }}>
        {/* Page Title */}
        <View className="items-center mb-4 mt-4">
          <Text className="text-xl font-extrabold text-[#030E25] text-center">
            Welcome to {positionName}
          </Text>
        </View>

        {loading ? (
          <View className="flex-grow justify-center items-center py-20" style={{ flex: 1 }}>
            <ActivityIndicator size="large" color="#030E25" />
            <Text className="text-[#54617D] text-sm mt-3 font-semibold">Loading products...</Text>
          </View>
        ) : (
          <View className="flex-grow" style={{ flex: 1, justifyContent: hasData ? "flex-start" : "center" }}>
            {/* Subtitle depending on state */}
            <View className="items-center mb-8 px-4">
              {hasData ? (
                <Text className="text-sm font-medium text-[#54617D] text-center leading-5">
                  Before you begin make sure you have{"\n"}these products with you
                </Text>
              ) : (
                <Text className="text-sm font-medium text-[#54617D] text-center leading-5">
                  Please wait and check again.{"\n"}This position doesn't have any assigned products yet.
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
              <View className="flex-grow justify-center items-center py-6">
                <View className="w-56 h-56 justify-center items-center">
                  <LottieView
                    source={require("../../../../../assets/lottie/no-data.json")}
                    autoPlay
                    loop
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Start Working Button pinned to bottom (only shown in Data State) */}
      {!loading && hasData && (
        <View className="px-6 pt-3 pb-10 bg-white absolute bottom-0 left-0 right-0" style={{ paddingBottom: 10 }}>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Packing", {
                positionId: positionId,
                positionName: positionName,
                positionCrops: products,
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
