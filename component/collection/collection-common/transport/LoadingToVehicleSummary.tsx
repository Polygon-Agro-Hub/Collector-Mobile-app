import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type LoadingToVehicleSummaryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LoadingToVehicleSummary"
>;

type LoadingToVehicleSummaryRouteProp = RouteProp<
  RootStackParamList,
  "LoadingToVehicleSummary"
>;

interface LoadingToVehicleSummaryProps {
  navigation: LoadingToVehicleSummaryNavigationProp;
  route: LoadingToVehicleSummaryRouteProp;
}

export interface GradeSetItem {
  grade: string;
  set: number;
  crates: number;
  weightKg: number;
}

export interface CropLoadData {
  id: string;
  cropName: string;
  imageUri: string;
  totalWeightKg: number;
  totalCrates: number;
  gradeSets: GradeSetItem[];
}

const DEFAULT_CROP_IMAGES: Record<string, string> = {
  bell_pepper:
    "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=150&auto=format&fit=crop&q=80",
  onion:
    "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=150&auto=format&fit=crop&q=80",
  tomato:
    "https://images.unsplash.com/photo-1546470427-e26264be0b11?w=150&auto=format&fit=crop&q=80",
  carrot:
    "https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=150&auto=format&fit=crop&q=80",
  cabbage:
    "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=150&auto=format&fit=crop&q=80",
  leeks:
    "https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=150&auto=format&fit=crop&q=80",
  beans:
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=150&auto=format&fit=crop&q=80",
  potato:
    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150&auto=format&fit=crop&q=80",
};

const MOCK_SUMMARY_ITEMS: CropLoadData[] = [
  {
    id: "red_bell_pepper",
    cropName: "Red Bell Pepper",
    imageUri:
      "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=150&auto=format&fit=crop&q=80",
    totalWeightKg: 25.92,
    totalCrates: 22,
    gradeSets: [
      { grade: "Grade A", set: 1, crates: 9, weightKg: 10.02 },
      { grade: "Grade A", set: 2, crates: 1, weightKg: 1.02 },
      { grade: "Grade B", set: 1, crates: 2, weightKg: 5.0 },
      { grade: "Grade C", set: 1, crates: 10, weightKg: 9.88 },
    ],
  },
  {
    id: "red_onion",
    cropName: "Red Onion",
    imageUri:
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=150&auto=format&fit=crop&q=80",
    totalWeightKg: 111.87,
    totalCrates: 9,
    gradeSets: [
      { grade: "Grade A", set: 1, crates: 8, weightKg: 111.67 },
      { grade: "Grade A", set: 2, crates: 1, weightKg: 0.2 },
    ],
  },
];

export default function LoadingToVehicleSummary({
  navigation,
  route,
}: LoadingToVehicleSummaryProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const vehicleNo = route.params?.vehicleNo || "BKH-5578";
  const loadCode = route.params?.loadCode || "L-DRV00001260914001";

  const passedItems = route.params?.items;
  const [items] = useState<CropLoadData[]>(
    passedItems && passedItems.length > 0 ? passedItems : MOCK_SUMMARY_ITEMS
  );

  const handleConfirmAndContinue = () => {
    navigation.navigate("LoadQR", {
      loadCode,
      vehicleNo,
      centreName: route.params?.centreName,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title={t("LoadingToVehicleSummary.Title", "Summery")}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {items.map((crop) => (
            <View
              key={crop.id}
              className="bg-white rounded-3xl p-4 mb-5"
              style={{
                borderWidth: 1,
                borderColor: "#9C9C9C",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {/* Crop Header */}
              <View className="flex-row items-center mb-3">
                <Image
                  source={{ uri: crop.imageUri || DEFAULT_CROP_IMAGES.bell_pepper }}
                  className="w-12 h-12 rounded-xl mr-3"
                  resizeMode="cover"
                />
                <Text className="text-base font-bold text-black">
                  {crop.cropName}
                </Text>
              </View>

              {/* Total Dark Card */}
              <View
                className="rounded-2xl p-4 flex-row items-center justify-between mb-4"
                style={{ backgroundColor: "#17262C" }}
              >
                {/* Total Weight */}
                <View className="flex-1 items-center">
                  <MaterialCommunityIcons
                    name="scale"
                    size={24}
                    color="#FFFFFF"
                    style={{ marginBottom: 4 }}
                  />
                  <Text className="text-gray-300 text-xs text-center">
                    Total{"\n"}Weight
                  </Text>
                  <Text className="text-white text-base font-bold mt-1">
                    {crop.totalWeightKg.toFixed(2)} kg
                  </Text>
                </View>

                {/* Divider */}
                <View className="w-[1px] h-14 bg-gray-600 mx-2" />

                {/* Total Crates */}
                <View className="flex-1 items-center">
                  <FontAwesome5
                    name="boxes"
                    size={22}
                    color="#FFFFFF"
                    style={{ marginBottom: 4 }}
                  />
                  <Text className="text-gray-300 text-xs text-center">
                    Total{"\n"}Crates
                  </Text>
                  <Text className="text-white text-base font-bold mt-1">
                    {crop.totalCrates}
                  </Text>
                </View>
              </View>

              {/* Grade Sets List */}
              <View className="gap-y-4">
                {crop.gradeSets.map((gs, idx) => (
                  <View key={idx} className="relative pt-3">
                    {/* Centered Pill Badge */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        zIndex: 10,
                      }}
                    >
                      <View className="bg-[#FFF6AD] px-4 py-0.5 rounded-full">
                        <Text className="text-[11px] font-bold text-gray-800">
                          {gs.grade}  |  Set : {gs.set}
                        </Text>
                      </View>
                    </View>

                    {/* Inner Box */}
                    <View
                      className="bg-[#FAFAFA] rounded-2xl p-3 flex-row items-center justify-around"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: "#19282F",
                      }}
                    >
                      {/* Crates Column */}
                      <View className="flex-row items-center gap-x-2">
                        <View className="w-8 h-8 rounded-full bg-[#E5E7EB] items-center justify-center">
                          <FontAwesome5 name="boxes" size={14} color="#000000" />
                        </View>
                        <View>
                          <Text className="text-[10px] text-black font-medium">
                            Crates
                          </Text>
                          <Text className="text-sm font-bold text-black">
                            {gs.crates}
                          </Text>
                        </View>
                      </View>

                      {/* Weight Column */}
                      <View className="flex-row items-center gap-x-2">
                        <View className="w-8 h-8 rounded-full bg-[#E5E7EB] items-center justify-center">
                          <MaterialCommunityIcons
                            name="scale"
                            size={16}
                            color="#000000"
                          />
                        </View>
                        <View>
                          <Text className="text-[10px] text-black font-medium">
                            Weight
                          </Text>
                          <Text className="text-sm font-bold text-black">
                            {gs.weightKg.toFixed(2)} kg
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Button: Only "Confirm & Continue" */}
        <View className="pt-4 pb-2">
          <TouchableOpacity
            onPress={handleConfirmAndContinue}
            activeOpacity={0.8}
            className="w-full h-[50px] bg-[#000000] rounded-full items-center justify-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 4,
            }}
          >
            <Text className="text-white font-extrabold text-base">
              {t("LoadingToVehicleSummary.ConfirmAndContinue", "Confirm & Continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
