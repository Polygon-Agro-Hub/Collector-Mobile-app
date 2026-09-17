import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { MaterialCommunityIcons, Ionicons, FontAwesome5, MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ScaleWeightModal } from "@/component/components/popup/ScaleWeightModal";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import store from "@/services/reducxStore";
import { updateVarietyGrades } from "@/store/unloadSlice";

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

export interface SetWeighItem {
  id: string;
  setNumber: number;
  crates: string;
  weight: number | null;
  isExpanded: boolean;
}

export default function WeighGrade({
  navigation,
  route,
}: WeighGradeProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const productName = route.params?.productName || "";
  const productImage = route.params?.productImage || "";
  const gradeTitle = route.params?.gradeTitle || "Grade A";
  const gradeId = route.params?.gradeId || "g-1";
  const varietyId = route.params?.varietyId || route.params?.productId || "";
  const loadedWeightKg = typeof route.params?.loadedWeightKg === "number" ? route.params.loadedWeightKg : 0;
  const loadedCrates = typeof route.params?.loadedCrates === "number" ? route.params.loadedCrates : 0;

  // Initialize with 1 set defaulted to loadedCrates count
  const [sets, setSets] = useState<SetWeighItem[]>([
    {
      id: `set-1`,
      setNumber: 1,
      crates: loadedCrates > 0 ? String(loadedCrates) : "",
      weight: null,
      isExpanded: true,
    },
  ]);

  const [activeSetIdForScale, setActiveSetIdForScale] = useState<string | null>(
    null
  );
  const [isScaleModalVisible, setIsScaleModalVisible] = useState<boolean>(false);
  const [setToDelete, setSetToDelete] = useState<SetWeighItem | null>(null);

  // Calculate allocated crates across other sets
  const getAllocatedCrates = (currentSetId: string) => {
    return sets
      .filter((s) => s.id !== currentSetId)
      .reduce((acc, s) => acc + (parseInt(s.crates, 10) || 0), 0);
  };

  // Handle crates change with max cap
  const handleCratesChange = (setId: string, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const otherAllocated = getAllocatedCrates(setId);
    const maxAllowedForThisSet = Math.max(0, loadedCrates - otherAllocated);

    let num = parseInt(cleanText, 10);
    if (isNaN(num)) {
      setSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, crates: "" } : s))
      );
      return;
    }

    if (num > maxAllowedForThisSet) {
      num = maxAllowedForThisSet;
      Alert.alert(
        t("WeighGrade.MaxCratesReached", "Maximum Crates Reached"),
        t(
          "WeighGrade.MaxCratesMessage",
          "Cannot exceed the total loaded crates of {{max}} for this grade.",
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

    const nextSetNumber = sets.length + 1;
    const newSet: SetWeighItem = {
      id: `set-${Date.now()}`,
      setNumber: nextSetNumber,
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

  // Receive weight from ScaleWeightModal
  const handleScaleContinue = (measuredWeight: number) => {
    if (!activeSetIdForScale) return;
    const finalWeight = measuredWeight >= 0 ? measuredWeight : 0;
    setSets((prev) =>
      prev.map((s) =>
        s.id === activeSetIdForScale ? { ...s, weight: finalWeight } : s
      )
    );
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
          paddingBottom: insets.bottom + 40,
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
              {gradeTitle}
            </Text>
          </View>
        </View>

        {/* 2 Summary Cards in a row */}
        <View className="flex-row items-center justify-between gap-3 my-3">
          {/* Loaded Weight Card */}
          <View className="flex-1 bg-[#E9ECF1] rounded-2xl p-3.5 items-center justify-center">
            <MaterialCommunityIcons
              name="scale"
              size={20}
              color="#17262C"
            />
            <Text className="text-[#4E5273] text-xs mt-1">
              {t("WeighGrade.LoadedWeight", "Loaded Weight")}
            </Text>
            <Text className="font-extrabold text-sm text-[#17262C] mt-0.5">
              {loadedWeightKg.toFixed(2)} kg
            </Text>
          </View>

          {/* Total Crates Card */}
          <View className="flex-1 bg-[#E9ECF1] rounded-2xl p-3.5 items-center justify-center">
            <FontAwesome5 name="boxes" size={17} color="#17262C" />
            <Text className="text-[#4E5273] text-xs mt-1">
              {t("WeighGrade.TotalCrates", "Total Crates")}
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
                <View className="bg-[#FAE432] rounded-full px-4 py-1">
                  <Text className="font-bold text-xs text-[#000000]">
                    Set : {item.setNumber}
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
                  {/* Number of Crates Label & Delete Button (for 2nd card onward) */}
                  <View className="flex-row items-center justify-center relative mb-1.5 min-h-[28px]">
                    <Text className="text-center text-[#79747E] text-xs font-medium">
                      --No. of Creates--
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
                  <TextInput
                    value={item.crates}
                    onChangeText={(val) => handleCratesChange(item.id, val)}
                    placeholder="0"
                    placeholderTextColor="#79747E"
                    keyboardType="number-pad"
                    textAlign="center"
                    className="bg-[#F3F4F6] rounded-full h-[50px] px-4 font-bold text-base text-[#17262C] mb-3 border border-[#E5E7EB]"
                    style={{ textAlign: "center", textAlignVertical: "center", includeFontPadding: false }}
                  />

                  {/* Weight Row with Scale Arrow / Reload Button */}
                  <View className="flex-row items-center gap-3">
                    {/* Weight Display Box (Clickable to open scale modal) */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenScaleModal(item.id)}
                      className="flex-1 bg-[#F3F4F6] rounded-full h-[50px] justify-center items-center px-4 border border-[#E5E7EB]"
                    >
                      <Text
                        className={`font-bold text-base ${
                          item.weight !== null
                            ? "text-[#17262C]"
                            : "text-[#79747E]"
                        }`}
                      >
                        {item.weight !== null
                          ? `${item.weight.toFixed(2)} kg`
                          : "kg"}
                      </Text>
                    </TouchableOpacity>

                    {/* Scale Weight Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenScaleModal(item.id)}
                      className="w-[50px] h-[50px] rounded-full bg-black items-center justify-center"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 3,
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

        {/* Bottom Continue Button */}
        <View className="pt-8 pb-2">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isFormComplete}
            activeOpacity={0.8}
            className={`w-full h-[50px] rounded-full items-center justify-center ${
              isFormComplete ? "bg-[#000000]" : "bg-[#A0A4A8]"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isFormComplete ? 0.2 : 0,
              shadowRadius: 5,
              elevation: isFormComplete ? 4 : 0,
            }}
          >
            <Text className="text-white font-extrabold text-base">
              {t("WeighGrade.Continue", "Continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Warning Confirmation Modal for Delete Set */}
      <WarningConfirmation
        visible={setToDelete !== null}
        message={`Are you sure you want to delete added\n${productName} - ${gradeTitle} - Set ${setToDelete?.setNumber} ?`}
        onConfirm={() => {
          if (setToDelete) {
            handleDeleteSet(setToDelete.id);
            setSetToDelete(null);
          }
        }}
        onCancel={() => setSetToDelete(null)}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* ScaleWeightModal component */}
      <ScaleWeightModal
        visible={isScaleModalVisible}
        onClose={() => setIsScaleModalVisible(false)}
        onContinue={handleScaleContinue}
        scaleName="Budry MFD - 300"
        initialWeight={30.0}
      />
    </View>
  );
}
