import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AlertModal } from "@/component/components/popup/AlertModal";

type UnloadingProductsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UnloadingProducts"
>;

type UnloadingProductsRouteProp = RouteProp<
  RootStackParamList,
  "UnloadingProducts"
>;

interface UnloadingProductsProps {
  navigation: UnloadingProductsNavigationProp;
  route: UnloadingProductsRouteProp;
}

export interface UnloadProductItem {
  id: string;
  name: string;
  image: string;
  weighed: boolean;
  expectedKg?: number;
  measuredKg?: number;
  expectedCrates?: number;
  receivedCrates?: number;
  grade?: string;
  hasMismatch?: boolean;
}

export interface MismatchItem {
  id: string;
  productName: string;
  grade: string;
  expectedKg: number;
  measuredKg: number;
  differenceKg: number;
  expectedCrates?: number;
  receivedCrates?: number;
}

const DEFAULT_UNLOAD_PRODUCTS: UnloadProductItem[] = [
  {
    id: "1",
    name: "Avacado",
    image:
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop&q=80",
    weighed: false,
    expectedKg: 20.0,
    measuredKg: 20.0,
    expectedCrates: 4,
    receivedCrates: 4,
    grade: "Grade A",
  },
  {
    id: "2",
    name: "Batana",
    image:
      "https://images.unsplash.com/photo-1506917728037-b6af01a7d403?w=200&auto=format&fit=crop&q=80",
    weighed: false,
    expectedKg: 20.0,
    measuredKg: 10.0,
    expectedCrates: 4,
    receivedCrates: 3,
    grade: "Grade A",
    hasMismatch: true,
  },
  {
    id: "3",
    name: "Cardamom",
    image:
      "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=200&auto=format&fit=crop&q=80",
    weighed: false,
    expectedKg: 15.0,
    measuredKg: 15.0,
    expectedCrates: 2,
    receivedCrates: 2,
    grade: "Grade A",
  },
  {
    id: "4",
    name: "Garlic",
    image:
      "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=200&auto=format&fit=crop&q=80",
    weighed: false,
    expectedKg: 20.0,
    measuredKg: 10.0,
    expectedCrates: 3,
    receivedCrates: 3,
    grade: "Grade B",
    hasMismatch: true,
  },
  {
    id: "5",
    name: "Sri Lankan Yellow Lemon",
    image:
      "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&auto=format&fit=crop&q=80",
    weighed: false,
    expectedKg: 18.0,
    measuredKg: 18.0,
    expectedCrates: 3,
    receivedCrates: 3,
    grade: "Grade A",
  },
];

const INITIAL_MISMATCHES: MismatchItem[] = [
  {
    id: "m-1",
    productName: "Batana",
    grade: "Grade A",
    expectedKg: 20.0,
    measuredKg: 10.0,
    differenceKg: 10.0,
    expectedCrates: 4,
    receivedCrates: 3,
  },
  {
    id: "m-2",
    productName: "Garlic",
    grade: "Grade B",
    expectedKg: 20.0,
    measuredKg: 10.0,
    differenceKg: 10.0,
  },
];

export default function UnloadingProducts({
  navigation,
  route,
}: UnloadingProductsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadCode = route.params?.loadCode || "L-DIO00001260912001";

  const [products, setProducts] = useState<UnloadProductItem[]>(
    DEFAULT_UNLOAD_PRODUCTS
  );
  const [mismatchReported, setMismatchReported] = useState<boolean>(false);
  const [showMismatchModal, setShowMismatchModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Split and sort alphabetically (A-Z)
  const toWeighProducts = useMemo(() => {
    return products
      .filter((p) => !p.weighed)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const weighedProducts = useMemo(() => {
    return products
      .filter((p) => p.weighed)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Check if mismatches should be shown (when there are weighed products with mismatches)
  const activeMismatches = useMemo(() => {
    const weighedMismatchNames = weighedProducts
      .filter((p) => p.hasMismatch)
      .map((p) => p.name);
    return INITIAL_MISMATCHES.filter((m) =>
      weighedMismatchNames.includes(m.productName)
    );
  }, [weighedProducts]);

  const hasPendingMismatch = activeMismatches.length > 0 && !mismatchReported;

  const handleToggleProduct = (item: UnloadProductItem) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, weighed: !p.weighed } : p))
    );
  };

  const handleReportMismatch = () => {
    setShowMismatchModal(true);
  };

  const handleCloseMismatchModal = () => {
    setShowMismatchModal(false);
    setMismatchReported(true);
  };

  const handleFinishUnloading = () => {
    if (hasPendingMismatch) return;
    navigation.navigate("WeighTheLoad", {
      loadCode,
    });
  };

  const handleProductPress = (item: UnloadProductItem) => {
    navigation.navigate("WeighTheLoad", {
      loadCode,
      product: {
        id: item.id,
        name: item.name,
        image: item.image,
        totalWeightKg: item.expectedKg || 90.0,
        totalCrates: item.expectedCrates || 14,
        grades: [
          {
            id: "g-1",
            gradeTitle: "A Grade",
            loadedWeightKg: (item.expectedKg || 90.0) * 0.67,
            loadedCrates: Math.round((item.expectedCrates || 14) * 0.7),
            unloadedWeightKg: null,
            unloadedCrates: null,
          },
          {
            id: "g-2",
            gradeTitle: "B Grade",
            loadedWeightKg: (item.expectedKg || 90.0) * 0.33,
            loadedCrates: Math.max(1, (item.expectedCrates || 14) - Math.round((item.expectedCrates || 14) * 0.7)),
            unloadedWeightKg: null,
            unloadedCrates: null,
          },
        ],
      },
    });
  };

  const renderProductCard = (item: UnloadProductItem, isWeighed: boolean) => (
    <View key={item.id} className="w-[48%] mb-6">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleProductPress(item)}
        className="w-full bg-white rounded-2xl border border-[#E5E7EB] p-4 items-center justify-center relative"
        style={{
          height: 140,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Image
          source={{ uri: item.image }}
          className="w-16 h-16 mb-2"
          resizeMode="contain"
        />
        <Text
          className="font-bold text-xs text-center text-[#17262C]"
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Floating action indicator */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleToggleProduct(item)}
          className={`w-7 h-7 rounded-full items-center justify-center absolute -bottom-3.5 ${
            isWeighed ? "bg-[#980775]" : "bg-black"
          }`}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          }}
        >
          {isWeighed ? (
            <MaterialCommunityIcons name="reload" size={16} color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <CustomHeader
        title={t("UnloadingProducts.Title", "Unloading Products")}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text className="text-center text-[#79747E] text-xs mb-4">
          {t(
            "UnloadingProducts.Subtitle",
            "Click on the product you want to unload."
          )}
        </Text>

        {/* SECTION: To Weigh */}
        {toWeighProducts.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-center my-3">
              <View className="flex-1 h-[1.5px] bg-[#2E3134]" />
              <Text className="mx-4 font-bold text-sm text-[#17262C]">
                {t("UnloadingProducts.ToWeigh", "To Weigh")}
              </Text>
              <View className="flex-1 h-[1.5px] bg-[#2E3134]" />
            </View>

            <View className="flex-row flex-wrap justify-between pt-1">
              {toWeighProducts.map((item) => renderProductCard(item, false))}
            </View>
          </View>
        )}

        {/* SECTION: Weighed */}
        {weighedProducts.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-center my-3">
              <View className="flex-1 h-[1.5px] bg-[#2E3134]" />
              <Text className="mx-4 font-bold text-sm text-[#17262C]">
                {t("UnloadingProducts.Weighed", "Weighed")}
              </Text>
              <View className="flex-1 h-[1.5px] bg-[#2E3134]" />
            </View>

            <View className="flex-row flex-wrap justify-between pt-1">
              {weighedProducts.map((item) => renderProductCard(item, true))}
            </View>
          </View>
        )}

        {/* SECTION: Mismatch Detected */}
        {activeMismatches.length > 0 && (
          <View className="mt-2 mb-4 gap-3">
            {activeMismatches.map((mismatch) => (
              <View
                key={mismatch.id}
                className="bg-[#FEECEB] rounded-2xl p-4"
              >
                {/* Warning Header */}
                <View className="flex-row items-center mb-2">
                  <MaterialCommunityIcons
                    name="alert"
                    size={18}
                    color="#FF3B30"
                  />
                  <Text className="ml-1.5 font-bold text-sm text-[#FF3B30]">
                    {t(
                      "UnloadingProducts.MismatchDetected",
                      "Mismatch Detected"
                    )}
                  </Text>
                </View>

                {/* Details */}
                <Text className="text-xs text-black mb-1 font-bold">
                  Product : {mismatch.productName}
                </Text>
                <Text className="text-xs text-black mb-2 font-bold">
                  Quality : {mismatch.grade}
                </Text>

                {/* Numbered Difference Points */}
                <Text className="text-xs text-black leading-5">
                  1. Expected{" "}
                  <Text className="font-bold">
                    {mismatch.expectedKg.toFixed(2)} kg
                  </Text>
                  , but measured{" "}
                  <Text className="font-bold">
                    {mismatch.measuredKg.toFixed(2)} kg
                  </Text>
                  . Difference is{" "}
                  <Text className="font-bold">
                    {mismatch.differenceKg.toFixed(2)} kg
                  </Text>
                  .
                </Text>

                {mismatch.expectedCrates !== undefined &&
                  mismatch.receivedCrates !== undefined && (
                    <Text className="text-xs text-[#17262C] leading-5 mt-1">
                      2. Expected crates count is{" "}
                      <Text className="font-bold">
                        {mismatch.expectedCrates}
                      </Text>
                      , but received crate count is{" "}
                      <Text className="font-bold">
                        {mismatch.receivedCrates}
                      </Text>
                      .
                    </Text>
                  )}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View className="pt-3 pb-2 gap-3">
          {/* Mismatch Action Button (if mismatches exist) */}
          {activeMismatches.length > 0 && (
            <TouchableOpacity
              onPress={handleReportMismatch}
              activeOpacity={0.8}
              className={`w-full h-[48px] rounded-full items-center justify-center ${mismatchReported
                  ? "bg-white border border-[#FF3B30]"
                  : "bg-[#FF3B30]"
                }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: mismatchReported ? 0 : 0.15,
                shadowRadius: 3,
                elevation: mismatchReported ? 0 : 3,
              }}
            >
              <Text
                className={`font-bold text-sm ${mismatchReported ? "text-[#FF3B30]" : "text-white"
                  }`}
              >
                {mismatchReported
                  ? t(
                    "UnloadingProducts.ReportedMismatch",
                    "Reported Mismatch"
                  )
                  : t("UnloadingProducts.ReportMismatch", "Report Mismatch")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Finish Unloading Button */}
          <TouchableOpacity
            onPress={handleFinishUnloading}
            disabled={hasPendingMismatch}
            activeOpacity={0.8}
            className={`w-full h-[48px] rounded-full items-center justify-center ${hasPendingMismatch ? "bg-[#A0A4A8]" : "bg-[#000000]"
              }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: hasPendingMismatch ? 0 : 0.2,
              shadowRadius: 4,
              elevation: hasPendingMismatch ? 0 : 3,
            }}
          >
            <Text className="text-white font-extrabold text-sm">
              {t("UnloadingProducts.FinishUnloading", "Finish Unloading")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* AlertModal for Mismatch Reported */}
      <AlertModal
        visible={showMismatchModal}
        title={t(
          "UnloadingProducts.MismatchReportedTitle",
          "Mismatch Reported!"
        )}
        message={t(
          "UnloadingProducts.MismatchReportedMessage",
          "Load mismatch has been successfully reported."
        )}
        type="success"
        onClose={handleCloseMismatchModal}
        duration={3000}
        autoClose={true}
      />

      {/* AlertModal for Unload Success */}
      <AlertModal
        visible={showSuccessModal}
        title={t("UnloadingProducts.SuccessTitle", "Success!")}
        message={
          <View className="items-center">
            <Text className="text-center text-[#4E5273] text-sm mb-1">
              {t(
                "UnloadingProducts.SuccessMessage",
                "Products unloaded successfully."
              )}
            </Text>
            <Text className="text-center font-bold text-sm text-[#17262C]">
              {loadCode}.
            </Text>
          </View>
        }
        type="success"
        onClose={handleCloseMismatchModal}
        duration={3000}
        autoClose={true}
      />
    </View>
  );
}
