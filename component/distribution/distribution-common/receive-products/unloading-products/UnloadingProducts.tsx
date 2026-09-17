import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LoadingPage from "@/component/components/loading/LoadingPage";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AlertModal } from "@/component/components/popup/AlertModal";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import {
  initUnloadTransfer,
  clearUnloadState,
  UnloadVarietyItem,
  UnloadedGradeItem,
} from "@/store/unloadSlice";

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

const mapRawItemsToProducts = (rawItems: any[]): UnloadVarietyItem[] => {
  return (rawItems || []).map((item, idx) => {
    const gradesMap: Record<
      string,
      { gradeTitle: string; gradeKey: string; loadedWeightKg: number; loadedCrates: number }
    > = {};

    if (Array.isArray(item.gradeSets) && item.gradeSets.length > 0) {
      item.gradeSets.forEach((gs: any) => {
        const gKey = (gs.gradeKey || gs.grade || "A").replace(/^Grade\s*/i, "").trim().toUpperCase();
        const gTitle = gs.grade || `Grade ${gKey}`;
        if (!gradesMap[gTitle]) {
          gradesMap[gTitle] = {
            gradeTitle: gTitle,
            gradeKey: gKey,
            loadedWeightKg: 0,
            loadedCrates: 0,
          };
        }
        gradesMap[gTitle].loadedWeightKg +=
          parseFloat(gs.weightKg ?? gs.weight) || 0;
        gradesMap[gTitle].loadedCrates +=
          parseInt(gs.crates, 10) || 0;
      });
    }

    const gradesList: UnloadedGradeItem[] = Object.keys(gradesMap).map(
      (key, gIdx) => ({
        id: `g-${gIdx + 1}`,
        gradeTitle: gradesMap[key].gradeTitle,
        gradeKey: gradesMap[key].gradeKey,
        loadedWeightKg: gradesMap[key].loadedWeightKg,
        loadedCrates: gradesMap[key].loadedCrates,
        unloadedWeightKg: null,
        unloadedCrates: null,
      })
    );

    return {
      id: String(item.varietyId || item.id || `prod-${idx}`),
      loadedItemId: item.loadedItemId || item.id,
      varietyId: item.varietyId ? String(item.varietyId) : undefined,
      name:
        item.cropName ||
        item.varietyLabel ||
        item.cropLabel ||
        "Crop Item",
      image: item.imageUri || item.image || "",
      weighed: false,
      expectedKg: parseFloat(item.totalWeightKg) || 0,
      measuredKg: 0,
      expectedCrates: parseInt(item.totalCrates, 10) || 0,
      receivedCrates: 0,
      grades:
        gradesList.length > 0
          ? gradesList
          : [
              {
                id: "g-1",
                gradeTitle: "Grade A",
                gradeKey: "A",
                loadedWeightKg: parseFloat(item.totalWeightKg) || 0,
                loadedCrates: parseInt(item.totalCrates, 10) || 0,
                unloadedWeightKg: null,
                unloadedCrates: null,
              },
            ],
      hasMismatch: false,
    };
  });
};

export default function UnloadingProducts({
  navigation,
  route,
}: UnloadingProductsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadCode = route.params?.loadCode || "";
  const transportId = route.params?.transportId;
  const passedItems = route.params?.items;

  const [products, setProducts] = useState<UnloadVarietyItem[]>(() => {
    const reduxVarieties = store.getState().unload.varieties;
    if (reduxVarieties && reduxVarieties.length > 0) {
      return reduxVarieties;
    }
    if (Array.isArray(passedItems) && passedItems.length > 0) {
      return mapRawItemsToProducts(passedItems);
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Sync with Redux state on every screen focus
  useFocusEffect(
    useCallback(() => {
      const reduxVarieties = store.getState().unload.varieties;
      if (reduxVarieties && reduxVarieties.length > 0) {
        setProducts(reduxVarieties);
      }
    }, [])
  );

  const fetchLoadDetails = useCallback(async () => {
    const identifier = transportId || loadCode;
    if (!identifier) return;

    try {
      setLoading(true);
      const authToken = store.getState().auth.token;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/load/${identifier}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if (Array.isArray(data.items)) {
          const mapped = mapRawItemsToProducts(data.items);
          store.dispatch(
            initUnloadTransfer({
              transportId,
              loadCode: data.transferCode || loadCode,
              vehicleNo: data.vehicleNo,
              driverEmpId: data.driverEmpId,
              driverName: data.driverName,
              varieties: mapped,
            })
          );
          setProducts(store.getState().unload.varieties);
        }
      }
    } catch (err) {
      console.error("Error fetching transfer items in UnloadingProducts:", err);
    } finally {
      setLoading(false);
    }
  }, [transportId, loadCode]);

  useEffect(() => {
    const reduxState = store.getState().unload;
    const isAlreadyInitialized =
      reduxState.varieties &&
      reduxState.varieties.length > 0 &&
      ((transportId && String(reduxState.transportId) === String(transportId)) ||
        (loadCode && reduxState.loadCode === loadCode));

    if (!isAlreadyInitialized) {
      if (Array.isArray(passedItems) && passedItems.length > 0) {
        const mapped = mapRawItemsToProducts(passedItems);
        store.dispatch(
          initUnloadTransfer({
            transportId,
            loadCode,
            vehicleNo: route.params?.vehicleNo,
            varieties: mapped,
          })
        );
        setProducts(store.getState().unload.varieties);
      } else if (transportId || loadCode) {
        fetchLoadDetails();
      }
    }
  }, [passedItems, transportId, loadCode, route.params?.vehicleNo, fetchLoadDetails]);

  // Split and sort alphabetically in A to Z order
  const toWeighProducts = useMemo(() => {
    return [...products]
      .filter((p) => !p.weighed)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
  }, [products]);

  const weighedProducts = useMemo(() => {
    return [...products]
      .filter((p) => p.weighed)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
  }, [products]);

  // Check if mismatches exist among weighed products
  const activeMismatches: MismatchItem[] = useMemo(() => {
    const mismatches: MismatchItem[] = [];
    weighedProducts.forEach((p) => {
      (p.grades || []).forEach((g) => {
        if (
          g.unloadedWeightKg !== null &&
          g.unloadedCrates !== null &&
          (Math.abs(g.unloadedWeightKg - g.loadedWeightKg) > 0.01 ||
            g.unloadedCrates !== g.loadedCrates)
        ) {
          mismatches.push({
            id: `${p.id}-${g.id}`,
            productName: p.name,
            grade: g.gradeTitle,
            expectedKg: g.loadedWeightKg,
            measuredKg: g.unloadedWeightKg,
            differenceKg: Math.abs(g.unloadedWeightKg - g.loadedWeightKg),
            expectedCrates: g.loadedCrates,
            receivedCrates: g.unloadedCrates,
          });
        }
      });
    });
    return mismatches;
  }, [weighedProducts]);

  // Report mismatch button clicked: per user request, do nothing for now
  const handleReportMismatch = () => {
    // No-op for now as requested
  };

  const handleProductPress = (item: UnloadVarietyItem) => {
    const currentUnload = store.getState().unload;
    const finalTransportId = transportId || currentUnload.transportId;
    const finalLoadCode = loadCode || currentUnload.loadCode;

    navigation.navigate("WeighTheLoad", {
      transportId: finalTransportId,
      loadCode: finalLoadCode,
      varietyId: item.id,
      productId: item.id,
      product: {
        id: item.id,
        name: item.name,
        image: item.image,
        totalWeightKg: item.expectedKg || 0,
        totalCrates: item.expectedCrates || 0,
        grades: item.grades || [
          {
            id: "g-1",
            gradeTitle: "Grade A",
            loadedWeightKg: item.expectedKg || 0,
            loadedCrates: item.expectedCrates || 0,
            unloadedWeightKg: null,
            unloadedCrates: null,
          },
        ],
      },
    });
  };

  const allWeighed = useMemo(() => {
    return products.length > 0 && products.every((p) => p.weighed);
  }, [products]);

  const handleFinishUnloading = async () => {
    if (submitting) return;

    if (!allWeighed) {
      Alert.alert(
        t("Warning", "Warning"),
        t(
          "UnloadingProducts.PleaseWeighAllProducts",
          "Please weigh all products before finishing unloading."
        )
      );
      return;
    }

    const currentUnload = store.getState().unload;
    const finalTransportId = transportId || currentUnload.transportId || null;
    const finalLoadCode = loadCode || currentUnload.loadCode || null;

    if (!finalTransportId && !finalLoadCode) {
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.TransportID or Load Code is required", "Transport ID or Load Code is required.")
      );
      return;
    }

    const currentVarieties =
      store.getState().unload.varieties.length > 0
        ? store.getState().unload.varieties
        : products;

    const unloadedItems = currentVarieties.map((prod) => ({
      loadedItemId: prod.loadedItemId || prod.id,
      varietyId: prod.varietyId || prod.id,
      grades: (prod.grades || []).flatMap((g) => {
        const gradeLetter = (
          g.gradeKey ||
          g.gradeTitle.replace(/^Grade\s*/i, "") ||
          "A"
        )
          .trim()
          .toUpperCase();

        if (Array.isArray(g.sets) && g.sets.length > 0) {
          return g.sets.map((s) => ({
            grade: gradeLetter,
            crateIndex: s.setIndex,
            crateCount: s.crates,
            qty: s.weightKg,
          }));
        }

        return [
          {
            grade: gradeLetter,
            crateIndex: 1,
            crateCount: g.unloadedCrates || 0,
            qty: g.unloadedWeightKg || 0,
          },
        ];
      }),
    }));

    try {
      setSubmitting(true);
      const authToken = store.getState().auth.token;

      let success = false;
      let errorMsg = "";

      try {
        const response = await axios.post(
          `${environment.API_BASE_URL}api/distribution/finish-unloading`,
          {
            transportId: finalTransportId,
            loadCode: finalLoadCode,
            unloadedItems,
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (response.data.success) {
          success = true;
        } else {
          errorMsg = response.data.message;
        }
      } catch (distErr: any) {
        // Fallback endpoint if needed
        try {
          const resp2 = await axios.post(
            `${environment.API_BASE_URL}api/transport/finish-unloading`,
            {
              transportId: finalTransportId,
              loadCode: finalLoadCode,
              unloadedItems,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          );
          if (resp2.data.success) {
            success = true;
          } else {
            errorMsg = resp2.data.message;
          }
        } catch (transErr: any) {
          errorMsg =
            transErr?.response?.data?.message ||
            distErr?.response?.data?.message ||
            transErr?.message ||
            "Failed to finish unloading";
        }
      }

      if (success) {
        store.dispatch(clearUnloadState());
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          t("Error.error", "Error"),
          errorMsg || t("Error.Failed to finish unloading", "Failed to finish unloading.")
        );
      }
    } catch (err: any) {
      console.error("Error finishing unloading:", err);
      Alert.alert(
        t("Error.error", "Error"),
        err?.response?.data?.message ||
          t("Error.Failed to finish unloading", "Failed to finish unloading.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigation.navigate("ReceivedProductsToday");
  };

  const renderProductCard = (item: UnloadVarietyItem, isWeighed: boolean) => (
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
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-16 h-16 mb-2"
            resizeMode="contain"
          />
        ) : (
          <View className="w-16 h-16 mb-2 items-center justify-center bg-gray-100 rounded-xl">
            <MaterialCommunityIcons name="sprout" size={32} color="#54617D" />
          </View>
        )}
        <Text
          className="font-bold text-xs text-center text-[#17262C]"
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Floating action indicator */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleProductPress(item)}
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

      {loading ? (
        <LoadingPage message={t("Loading", "Loading...")} />
      ) : products.length === 0 ? (
        <NoDataScreen
          message={t("UnloadingProducts.NoItems", "- No items found for this transfer -")}
        />
      ) : (
        <View className="flex-1 justify-between">
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: 24,
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

            {/* Mismatch Action Button (if mismatches exist) */}
            {activeMismatches.length > 0 && (
              <View className="pt-2 pb-2">
                <TouchableOpacity
                  onPress={handleReportMismatch}
                  activeOpacity={0.8}
                  className="w-full h-[48px] rounded-full items-center justify-center bg-[#FF3B30]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  <Text className="font-bold text-sm text-white">
                    {t("UnloadingProducts.ReportMismatch", "Report Mismatch")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Fixed Bottom Container for Finish Unloading */}
          <View
            className="px-6 pt-3 bg-white border-t border-gray-100"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity
              onPress={handleFinishUnloading}
              disabled={!allWeighed || submitting}
              activeOpacity={0.8}
              className={`w-full h-[52px] rounded-full items-center justify-center ${
                !allWeighed || submitting ? "bg-[#A0A4A8]" : "bg-[#000000]"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: !allWeighed || submitting ? 0.05 : 0.2,
                shadowRadius: 5,
                elevation: !allWeighed || submitting ? 1 : 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-extrabold text-base">
                  {t("UnloadingProducts.FinishUnloading", "Finish Unloading")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            {loadCode ? (
              <Text className="text-center font-bold text-sm text-[#17262C]">
                {loadCode}.
              </Text>
            ) : null}
          </View>
        }
        type="success"
        onClose={handleCloseSuccessModal}
        duration={3000}
        autoClose={true}
      />
    </View>
  );
}
