import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import AddButton from "@/component/components/buttons/AddButton";
import { MaterialIcons } from "@expo/vector-icons";

type SentProductsTodayNavigationProps = StackNavigationProp<
  RootStackParamList,
  "SentProductsToday"
>;

interface SentProductsTodayProps {
  navigation: SentProductsTodayNavigationProps;
}

export interface SentProductItem {
  id: string;
  crates: number;
  weight: string;
  destination: string;
  time: string;
}

const DUMMY_SENT_PRODUCTS: SentProductItem[] = [
  {
    id: "1",
    crates: 20,
    weight: "200.78 kg",
    destination: "Colombo 02",
    time: "At 06:00 AM",
  },
  {
    id: "2",
    crates: 3,
    weight: "10.78 kg",
    destination: "Colombo 07",
    time: "At 06:30 AM",
  },
  {
    id: "3",
    crates: 10,
    weight: "5.00 kg",
    destination: "Colombo 02",
    time: "At 07:00 AM",
  },
  {
    id: "4",
    crates: 1,
    weight: "0.8 kg",
    destination: "Colombo 02",
    time: "At 07:30 AM",
  },
];

export default function SentProductsToday({ navigation }: SentProductsTodayProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<SentProductItem[]>(DUMMY_SENT_PRODUCTS);

  const handleAdd = () => {
    navigation.navigate("ScanDriverQR");
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
        {products.length === 0 ? (
          /* Empty State */
          <NoDataScreen message={t("SentProductsToday.NoLoadsToday", "- No loads today -")} />
        ) : (
          /* List of Sent Products Cards */
          <ScrollView
            className="flex-1 px-6 pt-4"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {products.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => {
                  navigation.navigate("LoadingToVehicleSummary", {
                    vehicleNo: "WP AB 1234",
                    loadCode: "L-DRV00001260911001",
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
