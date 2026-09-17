import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, MaterialIcons, AntDesign, FontAwesome6 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AlertModal } from "@/component/components/popup/AlertModal";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";
import NetInfo from "@react-native-community/netinfo";
import store from "@/services/reducxStore";
import { updateVarietyGrades } from "@/store/unloadSlice";
import { getLocalizedProductName } from "../unloading-products/UnloadingProducts";

type WeighTheLoadNavigationProp = StackNavigationProp<
  RootStackParamList,
  "WeighTheLoad"
>;

type WeighTheLoadRouteProp = RouteProp<
  RootStackParamList,
  "WeighTheLoad"
>;

interface WeighTheLoadProps {
  navigation: WeighTheLoadNavigationProp;
  route: WeighTheLoadRouteProp;
}

export interface GradeWeighItem {
  id: string;
  gradeTitle: string; // e.g. "A Grade", "B Grade"
  loadedWeightKg: number;
  loadedCrates: number;
  unloadedWeightKg: number | null;
  unloadedCrates: number | null;
}

export interface CropWeighData {
  id: string;
  name: string;
  varietyNameEnglish?: string;
  varietyNameSinhala?: string;
  varietyNameTamil?: string;
  cropNameEnglish?: string;
  cropNameSinhala?: string;
  cropNameTamil?: string;
  image: string;
  totalWeightKg: number;
  totalCrates: number;
  grades: GradeWeighItem[];
}

const EMPTY_CROP_DATA: CropWeighData = {
  id: "",
  name: "",
  image: "",
  totalWeightKg: 0,
  totalCrates: 0,
  grades: [],
};

export default function WeighTheLoad({
  navigation,
  route,
}: WeighTheLoadProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const passedProduct = route.params?.product;
  const targetVarietyId =
    passedProduct?.id ||
    route.params?.varietyId ||
    route.params?.productId ||
    route.params?.updatedGrade?.varietyId ||
    "";

  const getInitialCropData = (): CropWeighData => {
    if (targetVarietyId) {
      const reduxVariety = store
        .getState()
        .unload.varieties.find((v) => String(v.id) === String(targetVarietyId));
      if (reduxVariety) {
        return {
          id: reduxVariety.id,
          name: reduxVariety.name,
          varietyNameEnglish: reduxVariety.varietyNameEnglish,
          varietyNameSinhala: reduxVariety.varietyNameSinhala,
          varietyNameTamil: reduxVariety.varietyNameTamil,
          cropNameEnglish: reduxVariety.cropNameEnglish,
          cropNameSinhala: reduxVariety.cropNameSinhala,
          cropNameTamil: reduxVariety.cropNameTamil,
          image: reduxVariety.image,
          totalWeightKg: reduxVariety.expectedKg,
          totalCrates: reduxVariety.expectedCrates,
          grades: reduxVariety.grades,
        };
      }
    }
    return passedProduct || EMPTY_CROP_DATA;
  };

  const [cropData, setCropData] = useState<CropWeighData>(getInitialCropData);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [gradeToDelete, setGradeToDelete] = useState<GradeWeighItem | null>(null);

  // Sync on route parameter changes (e.g. returning with updatedGrade)
  useEffect(() => {
    const vId =
      route.params?.product?.id ||
      route.params?.varietyId ||
      route.params?.productId ||
      route.params?.updatedGrade?.varietyId ||
      cropData.id;

    if (vId) {
      const reduxVariety = store
        .getState()
        .unload.varieties.find((v) => String(v.id) === String(vId));

      if (reduxVariety) {
        let grades = reduxVariety.grades;

        if (route.params?.updatedGrade && route.params.updatedGrade.gradeId) {
          const { gradeId, unloadedWeightKg, unloadedCrates, sets: updatedSets } =
            route.params.updatedGrade;
          grades = grades.map((g) =>
            g.id === gradeId
              ? {
                  ...g,
                  unloadedWeightKg,
                  unloadedCrates,
                  sets: updatedSets || g.sets,
                }
              : g
          );
          store.dispatch(
            updateVarietyGrades({
              varietyId: reduxVariety.id,
              grades,
            })
          );
        }

        setCropData({
          id: reduxVariety.id,
          name: reduxVariety.name,
          varietyNameEnglish: reduxVariety.varietyNameEnglish,
          varietyNameSinhala: reduxVariety.varietyNameSinhala,
          varietyNameTamil: reduxVariety.varietyNameTamil,
          cropNameEnglish: reduxVariety.cropNameEnglish,
          cropNameSinhala: reduxVariety.cropNameSinhala,
          cropNameTamil: reduxVariety.cropNameTamil,
          image: reduxVariety.image,
          totalWeightKg: reduxVariety.expectedKg,
          totalCrates: reduxVariety.expectedCrates,
          grades,
        });
        return;
      }
    }

    if (route.params?.product) {
      setCropData(route.params.product);
    }
  }, [route.params]);

  // Sync on screen focus
  useFocusEffect(
    useCallback(() => {
      const vId =
        route.params?.product?.id ||
        route.params?.varietyId ||
        route.params?.productId ||
        route.params?.updatedGrade?.varietyId ||
        cropData.id;

      if (vId) {
        const reduxVariety = store
          .getState()
          .unload.varieties.find((v) => String(v.id) === String(vId));
        if (reduxVariety) {
          setCropData({
            id: reduxVariety.id,
            name: reduxVariety.name,
            varietyNameEnglish: reduxVariety.varietyNameEnglish,
            varietyNameSinhala: reduxVariety.varietyNameSinhala,
            varietyNameTamil: reduxVariety.varietyNameTamil,
            cropNameEnglish: reduxVariety.cropNameEnglish,
            cropNameSinhala: reduxVariety.cropNameSinhala,
            cropNameTamil: reduxVariety.cropNameTamil,
            image: reduxVariety.image,
            totalWeightKg: reduxVariety.expectedKg,
            totalCrates: reduxVariety.expectedCrates,
            grades: reduxVariety.grades,
          });
        }
      }
    }, [route.params, cropData.id])
  );

  // Scale Connection State
  const [isScaleModalVisible, setIsScaleModalVisible] = useState<boolean>(false);
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      setIsWifiEnabled(state.isConnected !== false && state.type !== "none");
    });
    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, []);

  const isAllUnloaded =
    cropData.grades.length > 0 &&
    cropData.grades.every(
      (g) => g.unloadedWeightKg !== null && g.unloadedCrates !== null
    );

  const activeMismatches = cropData.grades
    .filter(
      (g) =>
        g.unloadedWeightKg !== null &&
        g.unloadedCrates !== null &&
        (Math.abs(g.unloadedWeightKg - g.loadedWeightKg) > 0.01 ||
          g.unloadedCrates !== g.loadedCrates)
    )
    .map((g) => {
      const gradeLetter = (g.gradeTitle.replace(/^Grade\s*/i, "").replace(/\s*Grade$/i, "")).trim() || "A";
      return {
        id: g.id,
        productName: getLocalizedProductName(cropData, i18n.language) || cropData.name,
        grade: `${t("WeighTheLoad.Grade", "Grade")} ${gradeLetter}`,
        expectedKg: g.loadedWeightKg,
        measuredKg: g.unloadedWeightKg || 0,
        differenceKg: Math.abs((g.unloadedWeightKg || 0) - g.loadedWeightKg),
        expectedCrates: g.loadedCrates,
        receivedCrates: g.unloadedCrates || 0,
      };
    });

  const handleGradePress = (grade: GradeWeighItem) => {
    const gradeLetter = (grade.gradeTitle.replace(/^Grade\s*/i, "").replace(/\s*Grade$/i, "")).trim() || "A";
    navigation.navigate("WeighGrade", {
      varietyId: cropData.id,
      productId: cropData.id,
      productName: getLocalizedProductName(cropData, i18n.language) || cropData.name,
      productImage: cropData.image,
      gradeTitle: `${t("WeighTheLoad.Grade", "Grade")} ${gradeLetter}`,
      gradeId: grade.id,
      loadedWeightKg: grade.loadedWeightKg,
      loadedCrates: grade.loadedCrates,
    });
  };

  const handleGradeActionPress = (grade: GradeWeighItem) => {
    if (grade.unloadedWeightKg !== null) {
      // Prompt delete confirmation when retry icon is tapped on already weighed grade
      setGradeToDelete(grade);
    } else {
      handleGradePress(grade);
    }
  };

  const handleConfirmDeleteGrade = () => {
    if (!gradeToDelete) return;
    setCropData((prev) => {
      const updatedGrades = prev.grades.map((g) =>
        g.id === gradeToDelete.id
          ? { ...g, unloadedWeightKg: null, unloadedCrates: null }
          : g
      );
      if (prev.id) {
        store.dispatch(
          updateVarietyGrades({
            varietyId: prev.id,
            grades: updatedGrades,
          })
        );
      }
      return {
        ...prev,
        grades: updatedGrades,
      };
    });
    setGradeToDelete(null);
  };

  const handleMarkAsUnloaded = () => {
    if (!isAllUnloaded) return;
    if (cropData.id) {
      store.dispatch(
        updateVarietyGrades({
          varietyId: cropData.id,
          grades: cropData.grades,
        })
      );
    }
    const currentUnloadState = store.getState().unload;
    navigation.navigate("UnloadingProducts", {
      transportId: currentUnloadState.transportId || route.params?.loadCode,
      loadCode: currentUnloadState.loadCode || route.params?.loadCode,
    });
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    if (cropData.id) {
      store.dispatch(
        updateVarietyGrades({
          varietyId: cropData.id,
          grades: cropData.grades,
        })
      );
    }
    const currentUnloadState = store.getState().unload;
    navigation.navigate("UnloadingProducts", {
      transportId: currentUnloadState.transportId || route.params?.loadCode,
      loadCode: currentUnloadState.loadCode || route.params?.loadCode,
    });
  };

  const renderScaleSection = () => {
    if (!isWifiEnabled) {
      return (
        /* Mobile Wi-Fi Off State */
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsScaleModalVisible(true)}
          style={{
            marginTop: 4,
            marginBottom: 12,
            backgroundColor: "#FDF0F1",
            borderRadius: 28,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="wifi" size={24} color="#E91233" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#E91233",
                letterSpacing: -0.2,
              }}
            >
              {t("ScaleSelectModal.WifiOffTitle", "Wi-Fi is turned off")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#0F172A",
                fontWeight: "500",
                marginTop: 1,
                lineHeight: 16,
              }}
            >
              {t(
                "ScaleSelectModal.WifiOffMessage",
                "Turn on Wi-Fi in your device settings to connect to the scale."
              )}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (scaleStatus.connected && scaleStatus.scale) {
      return (
        /* Connected State */
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsScaleModalVisible(true)}
          style={{
            marginTop: 4,
            marginBottom: 12,
            backgroundColor: "#FAE432",
            borderRadius: 28,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#000000",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons name="wifi" size={24} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#000000",
                letterSpacing: -0.3,
              }}
            >
              {t("ScaleSelectModal.ScaleConnected", "Scale Connected")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: "#000000",
                marginTop: 1,
              }}
            >
              {scaleStatus.scale.name || "Wi-Fi Scale Pro"}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={26} color="#000000" />
        </TouchableOpacity>
      );
    }

    /* Not Connected State (Matches Dashboard Connect Scale banner) */
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setIsScaleModalVisible(true)}
        style={{
          marginTop: 4,
          marginBottom: 12,
          backgroundColor: "#1266FD",
          borderRadius: 28,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="wifi" size={24} color="#1266FD" />
        </View>

        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "bold",
            color: "#FFFFFF",
            letterSpacing: -0.2,
          }}
        >
          {t("ScaleSelectModal.ConnectScale", "Connect Scale")}
        </Text>

        <MaterialIcons name="chevron-right" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Custom Header */}
      <CustomHeader
        title={t("WeighTheLoad.Title", "Weigh the load")}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Scale Connection Section (Dashboard style) */}
        {renderScaleSection()}
        {/* Product Image & Name */}
        <View className="items-center justify-center my-3">
          <Image
            source={{ uri: cropData.image }}
            className="w-20 h-20 mb-2"
            resizeMode="contain"
          />
          <Text className="font-extrabold text-base text-[#17262C]">
            {getLocalizedProductName(cropData, i18n.language) || cropData.name}
          </Text>
        </View>

        {/* Total Summary Banner (Dark Card) */}
        <View
          className="bg-[#17262C] rounded-3xl p-5 my-3 flex-row items-center justify-between"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {/* Total Weight */}
          <View className="flex-1 pl-2">
            <FontAwesome6
              name="weight-scale"
              size={22}
              color="#FFFFFF"
            />
            <Text className="text-gray-300 text-xs mt-2 font-medium">
              {t("WeighTheLoad.TotalWeight", "Total Weight")}
            </Text>
            <Text className="text-white font-extrabold text-lg mt-0.5">
              {cropData.totalWeightKg.toFixed(2)} {t("Common.kg", "kg")}
            </Text>
          </View>

          {/* Vertical Divider */}
          <View className="w-[1px] h-12 bg-gray-600 mx-2" />

          {/* Total Crates */}
          <View className="flex-1 pl-4">
            <FontAwesome5 name="boxes" size={18} color="#FFFFFF" />
            <Text className="text-gray-300 text-xs mt-2 font-medium">
              {t("WeighTheLoad.TotalCrates", "Total Crates")}
            </Text>
            <Text className="text-white font-extrabold text-lg mt-0.5">
              {cropData.totalCrates}
            </Text>
          </View>
        </View>

        {/* Grade Cards List */}
        <View className="gap-4 my-2">
          {cropData.grades.map((grade) => (
            <View
              key={grade.id}
              className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              {/* Grade Header */}
              <View className="flex-row items-center justify-between p-4 bg-white">
                <Text className="font-extrabold text-base text-[#17262C]">
                  {t("WeighTheLoad.Grade", "Grade")} {(grade.gradeTitle.replace(/^Grade\s*/i, "").replace(/\s*Grade$/i, "")).trim() || "A"}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleGradeActionPress(grade)}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    grade.unloadedWeightKg !== null ? "bg-[#980775]" : "bg-black"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  {grade.unloadedWeightKg !== null ? (
                    <AntDesign name="reload" size={16} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Bottom Gray Table Section (Fitted to left, right, and bottom of card) */}
              <View className="bg-[#E9ECF1] p-4">
                {/* Row 1: Loaded Section */}
                <View className="flex-row items-center justify-between">
                  {/* Loaded Weight */}
                  <View className="flex-1">
                    <FontAwesome6
                      name="weight-scale"
                      size={18}
                      color="#17262C"
                    />
                    <Text className="text-[#4E5273] text-xs mt-1.5">
                      {t("WeighTheLoad.LoadedWeight", "Loaded Weight")}
                    </Text>
                    <Text className="font-bold text-base text-[#17262C] mt-0.5">
                      {grade.loadedWeightKg.toFixed(2)} {t("Common.kg", "kg")}
                    </Text>
                  </View>

                  {/* Vertical Divider Line */}
                  <View className="w-[1px] h-12 bg-gray-300 mx-2" />

                  {/* Loaded Crates */}
                  <View className="flex-1 pl-2">
                    <FontAwesome5 name="boxes" size={16} color="#17262C" />
                    <Text className="text-[#4E5273] text-xs mt-1.5">
                      {t("WeighTheLoad.LoadedCrates", "Loaded Crates")}
                    </Text>
                    <Text className="font-bold text-base text-[#17262C] mt-0.5">
                      {grade.loadedCrates}
                    </Text>
                  </View>
                </View>

                {/* Horizontal Solid Divider */}
                <View className="h-[1.5px] bg-[#17262C] my-3" />

                {/* Row 2: Unloaded Section */}
                <View className="flex-row items-center justify-between">
                  {/* Unloaded Weight */}
                  <View className="flex-1">
                    <FontAwesome6
                      name="weight-scale"
                      size={18}
                      color="#79747E"
                    />
                    <Text className="text-[#79747E] text-xs mt-1.5">
                      {t("WeighTheLoad.UnloadedWeight", "Unloaded Weight")}
                    </Text>
                    <Text
                      style={{
                        color:
                          grade.unloadedWeightKg === null
                            ? "#79747E"
                            : Math.abs(grade.unloadedWeightKg - grade.loadedWeightKg) > 0.01
                            ? "#FF383C"
                            : "#17262C",
                      }}
                      className={`text-base mt-0.5 ${
                        grade.unloadedWeightKg !== null
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {grade.unloadedWeightKg !== null
                        ? `${grade.unloadedWeightKg.toFixed(2)} ${t("Common.kg", "kg")}`
                        : `---- ${t("Common.kg", "kg")}`}
                    </Text>
                  </View>

                  {/* Vertical Divider Line */}
                  <View className="w-[1px] h-12 bg-gray-300 mx-2" />

                  {/* Unloaded Crates */}
                  <View className="flex-1 pl-2">
                    <FontAwesome5 name="boxes" size={16} color="#79747E" />
                    <Text className="text-[#79747E] text-xs mt-1.5">
                      {t("WeighTheLoad.UnloadedCrates", "Unloaded Crates")}
                    </Text>
                    <Text
                      style={{
                        color:
                          grade.unloadedCrates === null
                            ? "#79747E"
                            : grade.unloadedCrates !== grade.loadedCrates
                            ? "#FF383C"
                            : "#17262C",
                      }}
                      className={`text-base mt-0.5 ${
                        grade.unloadedCrates !== null
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {grade.unloadedCrates !== null
                        ? `${grade.unloadedCrates}`
                        : "--"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* SECTION: Mismatch Detected Warning Cards (No extra buttons) */}
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
                      "WeighTheLoad.MismatchDetected",
                      "Mismatch Detected"
                    )}
                  </Text>
                </View>

                {/* Details */}
                <Text className="text-xs text-black mb-1 font-bold">
                  {t("Mismatch.Product", "Product")} : {mismatch.productName}
                </Text>
                <Text className="text-xs text-black mb-2 font-bold">
                  {t("Mismatch.Quality", "Quality")} : {mismatch.grade}
                </Text>

                {/* Numbered Difference Points */}
                <Text className="text-xs text-black leading-5">
                  {t("Mismatch.Point1", "1.")} {t("Mismatch.Expected", "Expected")}{" "}
                  <Text className="font-bold">
                    {mismatch.expectedKg.toFixed(2)} {t("Common.kg", "kg")}
                  </Text>
                  {t("Mismatch.ButMeasured", ", but measured")}{" "}
                  <Text className="font-bold">
                    {mismatch.measuredKg.toFixed(2)} {t("Common.kg", "kg")}
                  </Text>
                  {t("Mismatch.DifferenceIs", ". Difference is")}{" "}
                  <Text className="font-bold">
                    {mismatch.differenceKg.toFixed(2)} {t("Common.kg", "kg")}
                  </Text>
                  .
                </Text>

                {mismatch.expectedCrates !== undefined &&
                  mismatch.receivedCrates !== undefined && (
                    <Text className="text-xs text-[#17262C] leading-5 mt-1">
                      {t("Mismatch.Point2", "2.")} {t("Mismatch.ExpectedCratesCountIs", "Expected crates count is")}{" "}
                      <Text className="font-bold">
                        {mismatch.expectedCrates}
                      </Text>
                      {t("Mismatch.ButReceivedCrateCountIs", ", but received crate count is")}{" "}
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
      </ScrollView>

      {/* Fixed Bottom Button: Mark as Unloaded */}
      <View
        className="px-6 pt-3 bg-white"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={handleMarkAsUnloaded}
          disabled={!isAllUnloaded}
          activeOpacity={0.8}
          className={`w-full h-[52px] rounded-full items-center justify-center ${
            isAllUnloaded ? "bg-[#000000]" : "bg-[#A0A4A8]"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isAllUnloaded ? 0.2 : 0,
            shadowRadius: 5,
            elevation: isAllUnloaded ? 4 : 0,
          }}
        >
          <Text className="text-white font-extrabold text-base">
            {t("WeighTheLoad.MarkAsUnloaded", "Mark as Unloaded")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning Confirmation Modal for Delete Grade Unloaded Weight */}
      <WarningConfirmation
        visible={gradeToDelete !== null}
        message={`Are you sure you want to delete added\n${getLocalizedProductName(cropData, i18n.language) || cropData.name} - ${t("WeighTheLoad.Grade", "Grade")} ${(gradeToDelete?.gradeTitle?.replace(/^Grade\s*/i, "")?.replace(/\s*Grade$/i, ""))?.trim() || "A"} ?`}
        onConfirm={handleConfirmDeleteGrade}
        onCancel={() => setGradeToDelete(null)}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* Wi-Fi Scale Selection Modal */}
      <ScaleSelectModal
        visible={isScaleModalVisible}
        onClose={() => setIsScaleModalVisible(false)}
      />
    </View>
  );
}
