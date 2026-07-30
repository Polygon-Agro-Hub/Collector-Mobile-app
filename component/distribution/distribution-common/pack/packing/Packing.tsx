import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Feather, Ionicons, Entypo } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import Svg, { Path, Rect } from "react-native-svg";
import CustomHeader from "@/component/navigations/CustomHeader";

// Required exported constant for time ranges
export const TIME_SLOTS = [
  { label: "08:00 AM - 12:00 PM", value: "08:00 AM - 12:00 PM" },
  { label: "12:00 PM - 04:00 PM", value: "12:00 PM - 04:00 PM" },
  { label: "04:00 PM - 09:00 PM", value: "04:00 PM - 09:00 PM" },
];

interface PackingItem {
  id: number;
  name: string;
  weight: string;
  packType?: string;
  image: string;
  checked: boolean;
}

type PackingStatus = "waiting" | "no_items" | "has_items";

export default function Packing({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { orderNumber = "26050500001 (R)" } = route.params || {};

  // Status state tracking: "waiting", "no_items", or "has_items"
  const [status, setStatus] = useState<PackingStatus>("waiting");

  // Crop list items state for "has_items"
  const [items, setItems] = useState<PackingItem[]>([
    {
      id: 1,
      name: "Avacado",
      weight: "1.5 kg",
      checked: false,
      image:
        "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      name: "Sri Lankan Yellow Lemon",
      weight: "2.0 kg",
      checked: false,
      image:
        "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&auto=format&fit=crop&q=80",
    },
  ]);

  const handleToggleCheck = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const allItemsChecked = items.every((item) => item.checked);

  const handleCompletePress = () => {
    Alert.alert("Success", "Packing sequence completed!", [
      {
        text: "OK",
        onPress: () => {
          navigation.navigate("Main", { screen: "DistridutionaDashboard" });
        },
      },
    ]);
  };

  // State-specific helper to advance statuses sequentially
  const handleHeaderBadgePress = () => {
    if (status === "waiting") {
      setStatus("no_items");
    } else if (status === "no_items") {
      setStatus("has_items");
    } else {
      setStatus("waiting");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title={orderNumber}
        navigation={navigation}
        rightComponent={
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleHeaderBadgePress}
              className="px-2 py-1 rounded bg-slate-100"
              activeOpacity={0.7}
            >
              <Text className="text-[9px] font-bold text-slate-500 uppercase">
                {status}
              </Text>
            </TouchableOpacity>

            {status === "waiting" && (
              <TouchableOpacity
                onPress={() => setStatus("no_items")}
                className="w-7 h-7 rounded-full bg-[#FFB703] items-center justify-center shadow-sm"
                activeOpacity={0.7}
              >
                <Text className="text-black font-extrabold text-xs">N</Text>
              </TouchableOpacity>
            )}
            {status !== "waiting" && <View className="w-7" />}
          </View>
        }
      />

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-white px-6">
        {/* Scheduled Time Card (Present in all 3 states) */}
        <View className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 mb-8 shadow-sm">
          <View className="w-10 h-10 rounded-full bg-[#E9ECF1] items-center justify-center mr-4">
            <Feather name="shopping-bag" size={18} color="#030E25" />
          </View>
          <View>
            <Text className="text-gray-400 text-xs font-semibold">
              Scheduled Time :
            </Text>
            <Text className="text-[#030E25] font-extrabold text-sm mt-0.5">
              08:00 AM - 12:00 PM
            </Text>
          </View>
        </View>

        {/* STATUS 1: Waiting state */}
        {status === "waiting" && (
          <View className="items-center justify-center py-6 mt-4">
            {/* Lottie sand-clock-timer animation */}
            <View className="w-56 h-56 justify-center items-center mb-10">
              <LottieView
                source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>

            {/* Waiting Titles */}
            <Text className="text-[#030E25] font-extrabold text-lg text-center px-4 mb-2 leading-6">
              This order is still with the{"\n"}previous position
            </Text>
            <Text className="text-gray-400 text-sm font-medium text-center px-6">
              Please try reloading the page in a few seconds.
            </Text>
          </View>
        )}

        {/* STATUS 2: No items state */}
        {status === "no_items" && (
          <View className="items-center justify-center py-6 mt-4">
            {/* Lottie down-arrow animation rotated to the right */}
            <View style={{ transform: [{ rotate: "-90deg" }] }} className="w-40 h-40 justify-center items-center mb-10">
              <LottieView
                source={require("../../../../../assets/lottie/packing/down-arrow.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>

            {/* No Items Titles */}
            <Text className="text-[#030E25] font-extrabold text-lg text-center px-4 mb-3 leading-6">
              No items to pack for this order{"\n"}at your position
            </Text>
            <Text className="text-[#54617D] text-sm font-semibold text-center px-8 leading-5">
              There are no items assigned to the position in the current packing
              sequence.
            </Text>
          </View>
        )}

        {/* STATUS 3: Has items state */}
        {status === "has_items" && (
          <View className="px-1 gap-4">
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleToggleCheck(item.id)}
                className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm"
                activeOpacity={0.8}
              >
                {/* Product Image */}
                <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                  <Image
                    source={{ uri: item.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>

                {/* Details */}
                <View className="flex-1">
                  <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                    {item.name}
                  </Text>
                  <Text className="text-gray-900 font-bold text-sm mt-0.5">
                    {item.weight}
                  </Text>
                  <Text className="text-[#980775] font-semibold text-xs mt-0.5">
                    {item.packType}
                  </Text>
                </View>

                {/* Custom Checkbox on the right */}
                <View
                  className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                    item.checked
                      ? "bg-[#980775] border-[#980775]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {item.checked && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Button pinned to bottom */}
      {status === "no_items" && (
        <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
          <TouchableOpacity
            onPress={() => setStatus("has_items")}
            className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-base">Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "has_items" && allItemsChecked && (
        <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
          <TouchableOpacity
            onPress={handleCompletePress}
            className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-base">
              Complete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
