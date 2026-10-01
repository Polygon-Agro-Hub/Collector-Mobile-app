import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  AntDesign,
  FontAwesome6,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ScaleWeightModal } from "@/component/components/popup/ScaleWeightModal";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import store from "@/services/reducxStore";
import { updateVarietyGrades } from "@/store/unloadSlice";
import { extractGradeLetter } from "../weigh-the-load/WeighTheLoad";
import { getLocalizedProductName } from "../unloading-products/UnloadingProducts";
import axios from "axios";
import environment from "@/environment/environment";

type WeighGradeNavigationProp = StackNavigationProp<
  RootStackParamList,
  "WeighGrade"
>;

type WeighGradeRouteProp = RouteProp<
  RootStackParamList,
  "WeighGrade"
>;

interface WeighGradeProps {
  navigation: WeighGradeNavigationProp;
  route: WeighGradeRouteProp;
}

export interface ContainerTypeItem {
  id: number;
  labelName: string;
  weight: number;
}

export interface SetWeighItem {
  id: string;
  setNumber: number;
  containerTypeId?: number;
  containerTypeName?: string;
  containerTypeWeight?: number;
  crates: string;
  weight: number | null;
  isExpanded: boolean;
}

export default function WeighGrade({
  navigation,
  route,
}: WeighGradeProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const productObj = route.params?.product;
  const productName = productObj
    ? getLocalizedProductName(productObj, i18n.language)
    : (i18n.language.startsWith("si") && (route.params as any)?.varietyNameSinhala)
    ? (route.params as any).varietyNameSinhala
    : (i18n.language.startsWith("ta") && (route.params as any)?.varietyNameTamil)
    ? (route.params as any).varietyNameTamil
    : (route.params?.productName || "Carrot");

  const productImage = route.params?.productImage || "";
  const gradeTitle = route.params?.gradeTitle || "Grade A";
  const gradeId = route.params?.gradeId || "g-1";
  const varietyId = route.params?.varietyId || route.params?.productId || "";
  const loadedWeightKg = typeof route.params?.loadedWeightKg === "number" ? route.params.loadedWeightKg : 0;
  const loadedCrates = typeof route.params?.loadedCrates === "number" ? route.params.loadedCrates : 0;

  // Container types state from collection_officer.creates (backend only)
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([]);
  const [containerSectionWidth, setContainerSectionWidth] = useState<number>(
    Dimensions.get("window").width - 80
  );
  const [focusedSetId, setFocusedSetId] = useState<string | null>(null);

  // Initialize sets from Redux or route params if already weighed, otherwise 1 default set
  const [sets, setSets] = useState<SetWeighItem[]>(() => {
    try {
      const reduxVarieties = store.getState().unload.varieties;
      const currentVariety = reduxVarieties.find((v) => String(v.id) === String(varietyId));
      const currentGrade = currentVariety?.grades.find((g) => g.id === gradeId);
      if (currentGrade?.sets && currentGrade.sets.length > 0) {
        return currentGrade.sets.map((s, idx) => ({
          id: `set-${s.setIndex || idx + 1}`,
          setNumber: s.setIndex || idx + 1,
          containerTypeId: (s as any).containerTypeId,
          containerTypeName: (s as any).containerTypeName,
          containerTypeWeight: (s as any).containerTypeWeight ?? (s as any).crateWeight,
          crates: String(s.crates ?? ""),
          weight: typeof s.weightKg === "number" ? s.weightKg : null,
          isExpanded: true,
        }));
      }
      if (currentGrade?.unloadedWeightKg !== null && currentGrade?.unloadedWeightKg !== undefined) {
        return [
          {
            id: `set-1`,
            setNumber: 1,
            containerTypeId: undefined,
            containerTypeName: undefined,
            containerTypeWeight: undefined,
            crates:
              currentGrade.unloadedCrates !== null && currentGrade.unloadedCrates !== undefined
                ? String(currentGrade.unloadedCrates)
                : loadedCrates > 0
                ? String(loadedCrates)
                : "",
            weight: currentGrade.unloadedWeightKg,
            isExpanded: true,
          },
        ];
      }
    } catch (_) {}

    return [
      {
        id: `set-1`,
        setNumber: 1,
        containerTypeId: undefined,
        containerTypeName: undefined,
        containerTypeWeight: undefined,
        crates: loadedCrates > 0 ? String(loadedCrates) : "",
        weight: null,
        isExpanded: true,
      },
    ];
  });

  const [activeSetIdForScale, setActiveSetIdForScale] = useState<string | null>(
    null
  );
  const [isScaleModalVisible, setIsScaleModalVisible] = useState<boolean>(false);
  const [setToDelete, setSetToDelete] = useState<SetWeighItem | null>(null);

  // Fetch container types from API (collection_officer.creates)
  const fetchContainerTypes = useCallback(async () => {
    try {
      const authToken = store.getState().auth.token;
      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/container-types`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (
        response.data.success &&
        Array.isArray(response.data.data) &&
        response.data.data.length > 0
      ) {
        const types: ContainerTypeItem[] = response.data.data;
        setContainerTypes(types);

        setSets((prev) =>
          prev.map((s) => ({
            ...s,
            containerTypeId: s.containerTypeId || types[0].id,
            containerTypeName: s.containerTypeName || types[0].labelName,
            containerTypeWeight: s.containerTypeWeight ?? types[0].weight,
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to fetch container types, using defaults:", err);
    }
  }, []);

  useEffect(() => {
    fetchContainerTypes();
  }, [fetchContainerTypes]);

  // Select container type for a set
  const handleSelectContainerType = (setId: string, cType: ContainerTypeItem) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              containerTypeId: cType.id,
              containerTypeName: cType.labelName,
              containerTypeWeight: cType.weight,
            }
          : s
      )
    );
  };

  // Calculate allocated crates across other sets
  const getAllocatedCrates = (currentSetId: string) => {
    return sets
      .filter((s) => s.id !== currentSetId)
      .reduce((acc, s) => acc + (parseInt(s.crates, 10) || 0), 0);
  };

  // Handle crates change with max cap and prevent 0
  const handleCratesChange = (setId: string, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const otherAllocated = getAllocatedCrates(setId);
    const maxAllowedForThisSet = Math.max(0, loadedCrates - otherAllocated);

    if (!cleanText) {
      setSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, crates: "" } : s))
      );
      return;
    }

    let num = parseInt(cleanText, 10);
    if (isNaN(num) || num <= 0) {
      setSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, crates: "" } : s))
      );
      return;
    }

    if (num > maxAllowedForThisSet) {
      num = maxAllowedForThisSet;
      Alert.alert(
        t("WeighGrade.MaxContainersReached", "Maximum Containers Reached"),
        t(
          "WeighGrade.MaxContainersMessage",
          "Cannot exceed the total loaded containers of {{max}} for this grade.",
          { max: loadedCrates }
        )
      );
    }

    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, crates: String(num) } : s))
    );
  };

  const totalAllocatedCrates = sets.reduce(
    (acc, s) => acc + (parseInt(s.crates, 10) || 0),
    0
  );
  const allSetsCompleted =
    sets.length > 0 &&
    sets.every(
      (s) =>
        s.crates.trim() !== "" &&
        (parseInt(s.crates, 10) || 0) > 0 &&
        s.weight !== null &&
        s.weight > 0
    );
  const canAddMoreSets = totalAllocatedCrates < loadedCrates && allSetsCompleted;

  // Add new set
  const handleAddSet = () => {
    if (!canAddMoreSets) return;
    const remaining = Math.max(0, loadedCrates - totalAllocatedCrates);

    const defaultC = containerTypes.length > 0 ? containerTypes[0] : undefined;
    const nextSetNumber = sets.length + 1;
    const newSet: SetWeighItem = {
      id: `set-${Date.now()}`,
      setNumber: nextSetNumber,
      containerTypeId: defaultC?.id,
      containerTypeName: defaultC?.labelName,
      containerTypeWeight: defaultC?.weight,
      crates: remaining > 0 ? String(remaining) : "",
      weight: null,
      isExpanded: true,
    };
    setSets((prev) => [...prev, newSet]);
  };

  // Delete a set from grade
  const handleDeleteSet = (setId: string) => {
    setSets((prev) => {
      const filtered = prev.filter((s) => s.id !== setId);
      return filtered.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));
    });
  };

  // Toggle set expansion
  const handleToggleExpand = (setId: string) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );
  };

  // Open Scale Modal for a set
  const handleOpenScaleModal = (setId: string) => {
    setActiveSetIdForScale(setId);
    setIsScaleModalVisible(true);
  };

  const syncSetsToRedux = (currentSets: SetWeighItem[]) => {
    if (!varietyId) return;
    try {
      const currentVariety = store
        .getState()
        .unload.varieties.find((v) => String(v.id) === String(varietyId));
      if (currentVariety) {
        const totalW = currentSets.reduce((acc, s) => acc + (s.weight || 0), 0);
        const totalC = currentSets.reduce((acc, s) => acc + (parseInt(s.crates, 10) || 0), 0);
        const formattedSets = currentSets.map((s, idx) => ({
          setIndex: s.setNumber || idx + 1,
          crates: parseInt(s.crates, 10) || 0,
          weightKg: s.weight || 0,
          crateWeight: s.containerTypeWeight ?? null,
          containerTypeId: s.containerTypeId,
          containerTypeName: s.containerTypeName,
        }));

        const updatedGrades = currentVariety.grades.map((g) =>
          g.id === gradeId
            ? {
                ...g,
                unloadedWeightKg: totalW > 0 ? totalW : g.unloadedWeightKg,
                unloadedCrates: totalC > 0 ? totalC : g.unloadedCrates,
                sets: formattedSets,
              }
            : g
        );
        store.dispatch(
          updateVarietyGrades({
            varietyId: String(varietyId),
            grades: updatedGrades,
          })
        );
      }
    } catch (e) {
      console.warn("Could not sync sets to Redux:", e);
    }
  };

  // Receive weight from ScaleWeightModal (receives Net Total)
  const handleScaleContinue = (measuredWeight: number) => {
    if (!activeSetIdForScale) return;
    const finalWeight = measuredWeight >= 0 ? measuredWeight : 0;
    const updated = sets.map((s) =>
      s.id === activeSetIdForScale ? { ...s, weight: finalWeight } : s
    );
    setSets(updated);
    syncSetsToRedux(updated);
    setActiveSetIdForScale(null);
  };

  // Check if all sets have valid crates and measured weight
  const isFormComplete =
    sets.length > 0 &&
    sets.every(
      (s) => s.crates.trim() !== "" && s.weight !== null && s.weight > 0
    );

  // Continue action: pass back total measured weight and crates
  const handleContinue = () => {
    if (!isFormComplete) return;

    const totalUnloadedWeight = sets.reduce(
      (acc, s) => acc + (s.weight || 0),
      0
    );
    const totalUnloadedCrates = sets.reduce(
      (acc, s) => acc + (parseInt(s.crates, 10) || 0),
      0
    );

    const formattedSets = sets.map((s, idx) => ({
      setIndex: s.setNumber || idx + 1,
      crates: parseInt(s.crates, 10) || 0,
      weightKg: s.weight || 0,
      crateWeight: s.containerTypeWeight ?? null,
      containerTypeId: s.containerTypeId,
      containerTypeName: s.containerTypeName,
    }));

    if (varietyId) {
      const currentVariety = store
        .getState()
        .unload.varieties.find((v) => String(v.id) === String(varietyId));
      if (currentVariety) {
        const updatedGrades = currentVariety.grades.map((g) =>
          g.id === gradeId
            ? {
                ...g,
                unloadedWeightKg: totalUnloadedWeight,
                unloadedCrates: totalUnloadedCrates,
                sets: formattedSets,
              }
            : g
        );
        store.dispatch(
          updateVarietyGrades({
            varietyId: String(varietyId),
            grades: updatedGrades,
          })
        );
      }
    }

    navigation.navigate("WeighTheLoad", {
      varietyId,
      productId: varietyId,
      product: route.params?.product,
      updatedGrade: {
        varietyId,
        gradeId,
        unloadedWeightKg: totalUnloadedWeight,
        unloadedCrates: totalUnloadedCrates,
        sets: formattedSets,
      },
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <CustomHeader
        title={t("WeighGrade.Title", "Weigh the load")}
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
        {/* Product Image, Name & Grade Badge */}
        <View className="items-center justify-center my-3">
          <Image
            source={{ uri: productImage }}
            className="w-20 h-20 mb-2"
            resizeMode="contain"
          />
          <Text className="font-extrabold text-base text-[#17262C] mb-2">
            {productName}
          </Text>
          <View className="bg-[#E9ECF1] rounded-full px-5 py-1.5">
            <Text className="font-bold text-xs text-[#17262C]">
              {t("WeighGrade.Grade", "Grade")} {extractGradeLetter(gradeTitle)}
            </Text>
          </View>
        </View>

        {/* 2 Summary Cards in a row */}
        <View className="flex-row items-center justify-between gap-3 my-3">
          {/* Loaded Weight Card */}
          <View className="flex-1 bg-[#E9ECF1] rounded-2xl p-3.5 items-center justify-center">
            <FontAwesome6 name="weight-scale" size={20} color="black" />
            <Text className="text-[#4E5273] text-xs mt-1">
              {t("WeighGrade.LoadedWeight", "Loaded Weight")}
            </Text>
            <Text className="font-extrabold text-sm text-[#17262C] mt-0.5">
              {loadedWeightKg.toFixed(2)} {t("Common.kg", "kg")}
            </Text>
          </View>

          {/* Total Crates Card */}
          <View className="flex-1 bg-[#E9ECF1] rounded-2xl p-3.5 items-center justify-center">
            <FontAwesome5 name="boxes" size={17} color="#17262C" />
            <Text className="text-[#4E5273] text-xs mt-1">
              {t("WeighGrade.TotalContainers", "Total Containers")}
            </Text>
            <Text className="font-extrabold text-sm text-[#17262C] mt-0.5">
              {loadedCrates}
            </Text>
          </View>
        </View>

        {/* Set Cards List */}
        <View className="gap-6 my-4">
          {sets.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-2xl border border-[#C4C7C5] relative"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {/* Set Header Accordion (50px height, #E9ECF1 bg) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleToggleExpand(item.id)}
                className="flex-row items-center justify-between px-4 h-[50px] bg-[#E9ECF1] rounded-t-2xl border-b border-[#E5E7EB]"
              >
                <View className="bg-[#FEF08A] rounded-full px-4 py-1">
                  <Text className="font-bold text-xs text-[#000000]">
                    {t("WeighGrade.Set", "Set")} : {item.setNumber}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name={item.isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#17262C"
                  />
                </View>
              </TouchableOpacity>

              {/* Set Body */}
              {item.isExpanded && (
                <View className="p-4 pt-3 pb-8">
                  {/* Number of Containers Label & Delete Button (for 2nd card onward) */}
                  <View className="flex-row items-center justify-center relative mb-1.5 min-h-[28px]">
                    <Text className="text-center text-[#79747E] text-xs font-medium">
                      {t("WeighGrade.NoOfContainers", "--No. of Containers--")}
                    </Text>
                    {item.setNumber > 1 && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSetToDelete(item)}
                        className="w-8 h-8 rounded-full bg-[#EF4444] items-center justify-center absolute right-0"
                        style={{
                          shadowColor: "#EF4444",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Container Type Section (only shown when container types data exists) */}
                  {containerTypes.length > 0 && (
                  <View
                    className="mb-4"
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w > 0) setContainerSectionWidth(w);
                    }}
                  >
                    {/* Header Row */}
                    <View className="flex-row items-center justify-between mb-2 px-1">
                      <View className="flex-row items-center gap-1.5">
                        <MaterialCommunityIcons
                          name="view-column-outline"
                          size={18}
                          color="#475569"
                        />
                        <Text className="text-sm font-semibold text-[#334155]">
                          {t("LoadingToVehicle.ContainerType", "Container Type")}
                        </Text>
                      </View>
                      <Text className="text-xs text-[#64748B]">
                        {t("LoadingToVehicle.SelectSize", "Select size")}
                      </Text>
                    </View>

                    {/* Pill Selector Box (max 3 visible, horizontally scrollable if > 3) */}
                    <View
                      style={{
                        backgroundColor: "#EEF2F6",
                        borderRadius: 9999,
                        padding: 4,
                      }}
                    >
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {containerTypes.map((cType) => {
                          const isSelected =
                            item.containerTypeId === cType.id ||
                            (!item.containerTypeId && cType.id === containerTypes[0]?.id);

                          const itemWidth = Math.max(
                            80,
                            Math.floor((containerSectionWidth - 8) / 3)
                          );

                          return (
                            <TouchableOpacity
                              key={cType.id}
                              activeOpacity={0.75}
                              onPress={() => handleSelectContainerType(item.id, cType)}
                              style={{
                                width: itemWidth,
                                height: 52,
                                borderRadius: 9999,
                                backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                                justifyContent: "center",
                                alignItems: "center",
                                shadowColor: isSelected ? "#000000" : "transparent",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isSelected ? 0.08 : 0,
                                shadowRadius: 2,
                                elevation: isSelected ? 2 : 0,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: "#0F172A",
                                }}
                                numberOfLines={1}
                              >
                                {cType.labelName}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#64748B",
                                  marginTop: 2,
                                }}
                                numberOfLines={1}
                              >
                                {cType.weight != null ? `${cType.weight} ${t("Common.kg", "kg")}` : ""}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                  )}

                  {/* Containers Count Input */}
                  <TextInput
                    value={item.crates}
                    onChangeText={(val) => handleCratesChange(item.id, val)}
                    placeholder={
                      focusedSetId === item.id
                        ? ""
                        : `--${t("LoadingToVehicle.EnterTotalContainers", "Enter Total Containers Here")}--`
                    }
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setFocusedSetId(item.id)}
                    onBlur={() => setFocusedSetId(null)}
                    keyboardType="number-pad"
                    textAlign="center"
                    className="bg-[#EEF2F6] rounded-full h-[50px] px-4 font-bold text-base text-[#0F172A] mb-3"
                    style={{ textAlign: "center", textAlignVertical: "center", includeFontPadding: false }}
                  />

                  {/* Weight Row with Scale Arrow / Reload Button */}
                  {(() => {
                    const cratesNum = parseInt(item.crates, 10);
                    const isCratesValid = !isNaN(cratesNum) && cratesNum > 0;

                    return (
                      <View className="flex-row items-center gap-3">
                        {/* Weight Display Box (Clickable to open scale modal) */}
                        <TouchableOpacity
                          disabled={!isCratesValid}
                          activeOpacity={0.8}
                          onPress={() => handleOpenScaleModal(item.id)}
                          className="flex-1 bg-[#EEF2F6] rounded-full h-[50px] justify-center items-center px-4"
                        >
                          <Text
                            className={`font-bold text-base ${
                              item.weight !== null
                                ? "text-[#0F172A]"
                                : "text-[#94A3B8]"
                            }`}
                          >
                            {item.weight !== null
                              ? `${item.weight.toFixed(2)} ${t("Common.kg", "kg")}`
                              : t("Common.kg", "kg")}
                          </Text>
                        </TouchableOpacity>

                        {/* Scale Weight Button */}
                        <TouchableOpacity
                          disabled={!isCratesValid}
                          activeOpacity={0.8}
                          onPress={() => handleOpenScaleModal(item.id)}
                          className={`w-[50px] h-[50px] rounded-full items-center justify-center ${
                            isCratesValid ? "bg-black" : "bg-[#A0A4A8]"
                          }`}
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isCratesValid ? 0.2 : 0,
                            shadowRadius: 2,
                            elevation: isCratesValid ? 3 : 0,
                          }}
                        >
                          {item.weight !== null ? (
                            <AntDesign name="reload" size={18} color="#FFFFFF" />
                          ) : (
                            <Ionicons
                              name="arrow-forward"
                              size={18}
                              color="#FFFFFF"
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Floating Add Button overlapping bottom border */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddSet}
                disabled={!canAddMoreSets}
                className={`w-10 h-10 rounded-full items-center justify-center absolute -bottom-5 self-center z-10 ${
                  canAddMoreSets ? "bg-[#000000]" : "bg-[#A0A4A8]"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: canAddMoreSets ? 0.25 : 0.1,
                  shadowRadius: 3,
                  elevation: 4,
                }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isFormComplete}
          activeOpacity={0.8}
          className={`w-full h-[50px] rounded-full items-center justify-center mt-6 ${
            isFormComplete ? "bg-black" : "bg-[#A0A4A8]"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isFormComplete ? 0.2 : 0,
            shadowRadius: 5,
            elevation: isFormComplete ? 4 : 0,
          }}
        >
          <Text className="text-white font-bold text-base">
            {t("WeighGrade.Continue", "Continue")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Set Warning Confirmation Modal */}
      <WarningConfirmation
        visible={setToDelete !== null}
        message={t(
          "WeighGrade.DeleteConfirmation",
          "Are you sure you want to delete added\n{{productName}} - {{gradeLabel}} - {{setLabel}} {{setNumber}}?",
          {
            productName,
            gradeLabel: `${t("WeighGrade.Grade", "Grade")} ${extractGradeLetter(gradeTitle)}`,
            setLabel: t("WeighGrade.Set", "Set"),
            setNumber: setToDelete?.setNumber || 1,
            defaultValue: `Are you sure you want to delete added\n${productName} - ${t("WeighGrade.Grade", "Grade")} ${extractGradeLetter(gradeTitle)} - ${t("WeighGrade.Set", "Set")} ${setToDelete?.setNumber} ?`,
          }
        )}
        onConfirm={() => {
          if (setToDelete) {
            handleDeleteSet(setToDelete.id);
            setSetToDelete(null);
          }
        }}
        onCancel={() => setSetToDelete(null)}
        confirmText={t("WeighGrade.Delete", "Delete")}
        cancelText={t("WeighGrade.Cancel", "Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* ScaleWeightModal component */}
      <ScaleWeightModal
        visible={isScaleModalVisible}
        onClose={() => {
          setIsScaleModalVisible(false);
          setActiveSetIdForScale(null);
        }}
        onContinue={handleScaleContinue}
        scaleName="Budry MFD - 300"
        tareWeight={
          (() => {
            if (!activeSetIdForScale) return 0;
            const target = sets.find((s) => s.id === activeSetIdForScale);
            const crateCount = parseInt(target?.crates || "0", 10) || 0;
            const crateWeight = target?.containerTypeWeight ?? 0;
            return crateCount * crateWeight;
          })()
        }
        initialWeight={
          (() => {
            if (!activeSetIdForScale) return 0;
            const target = sets.find((s) => s.id === activeSetIdForScale);
            return target && typeof target.weight === "number"
              ? target.weight
              : target?.weight
              ? parseFloat(target.weight as any) || 0
              : 0;
          })()
        }
      />
    </View>
  );
}
