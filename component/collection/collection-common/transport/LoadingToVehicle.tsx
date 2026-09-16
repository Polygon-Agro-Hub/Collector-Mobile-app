import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import { ScaleWeightModal } from "@/component/components/popup/ScaleWeightModal";
import LoadingPage from "@/component/components/loading/LoadingPage";
import {
  MaterialIcons,
  Ionicons,
  FontAwesome,
  AntDesign,
  Entypo,
} from "@expo/vector-icons";
import axios from "axios";
import environment from "@/environment/environment";
import store from "@/services/reducxStore";

type LoadingToVehicleNavigationProps = StackNavigationProp<
  RootStackParamList,
  "LoadingToVehicle"
>;

type LoadingToVehicleRouteProps = RouteProp<
  RootStackParamList,
  "LoadingToVehicle"
>;

interface LoadingToVehicleProps {
  navigation: LoadingToVehicleNavigationProps;
  route: LoadingToVehicleRouteProps;
}

interface CrateSet {
  id: string;
  setNumber: number;
  crates: string;
  weight: number | null;
  isExpanded: boolean;
}

interface GradeData {
  gradeKey: "A" | "B" | "C";
  title: string;
  isSelected: boolean;
  sets: CrateSet[];
}

interface SavedSet {
  id: string;
  gradeKey: "A" | "B" | "C";
  setNumber: number;
  crates: string;
  weight: number;
}

interface SavedVariety {
  id: string;
  varietyNumber: number;
  cropId?: string;
  cropLabel: string;
  varietyId?: string;
  varietyLabel: string;
  sets: SavedSet[];
}

interface OptionItem {
  label: string;
  value: string;
}

export default function LoadingToVehicle({
  navigation,
  route,
}: LoadingToVehicleProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const vehicleNo = route.params?.vehicleNo || "N/A";

  // Crops / Varieties fetched from API
  const [rawCrops, setRawCrops] = useState<any[]>([]);
  const [rawVarieties, setRawVarieties] = useState<Record<string, any[]>>({});
  const [cropsData, setCropsData] = useState<OptionItem[]>([]);
  const [varietiesData, setVarietiesData] = useState<Record<string, OptionItem[]>>({});
  const [cropsLoading, setCropsLoading] = useState<boolean>(true);

  const [varietyIndex, setVarietyIndex] = useState(1);
  const [selectedCrop, setSelectedCrop] = useState<OptionItem | null>(null);
  const [selectedVariety, setSelectedVariety] = useState<OptionItem | null>(null);

  // Helper for localized naming
  const formatCropOption = useCallback(
    (crop: any): OptionItem => {
      const lang = (i18n.language || "en").toLowerCase();
      let label = crop.cropNameEnglish || crop.label || "";
      if (lang.startsWith("si") && crop.cropNameSinhala) {
        label = crop.cropNameSinhala;
      } else if (lang.startsWith("ta") && crop.cropNameTamil) {
        label = crop.cropNameTamil;
      }
      return {
        label: label || crop.cropNameEnglish || crop.label,
        value: String(crop.value || crop.cropId || crop.id),
      };
    },
    [i18n.language],
  );

  const formatVarietyOption = useCallback(
    (variety: any): OptionItem => {
      const lang = (i18n.language || "en").toLowerCase();
      let label = variety.varietyNameEnglish || variety.label || "";
      if (lang.startsWith("si") && variety.varietyNameSinhala) {
        label = variety.varietyNameSinhala;
      } else if (lang.startsWith("ta") && variety.varietyNameTamil) {
        label = variety.varietyNameTamil;
      }
      return {
        label: label || variety.varietyNameEnglish || variety.label,
        value: String(variety.value || variety.varietyId || variety.id),
      };
    },
    [i18n.language],
  );

  // Saved varieties for top carousel
  const [savedVarieties, setSavedVarieties] = useState<SavedVariety[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [isCropModalVisible, setIsCropModalVisible] = useState(false);
  const [isVarietyModalVisible, setIsVarietyModalVisible] = useState(false);

  const [focusedSetId, setFocusedSetId] = useState<string | null>(null);

  // Active target for scale modal: { gradeKey, setId }
  const [scaleTarget, setScaleTarget] = useState<{
    gradeKey: "A" | "B" | "C";
    setId: string;
  } | null>(null);

  const [grades, setGrades] = useState<GradeData[]>([
    {
      gradeKey: "A",
      title: "Grade A",
      isSelected: false,
      sets: [
        {
          id: "set-a-1",
          setNumber: 1,
          crates: "",
          weight: null,
          isExpanded: true,
        },
      ],
    },
    {
      gradeKey: "B",
      title: "Grade B",
      isSelected: false,
      sets: [
        {
          id: "set-b-1",
          setNumber: 1,
          crates: "",
          weight: null,
          isExpanded: true,
        },
      ],
    },
    {
      gradeKey: "C",
      title: "Grade C",
      isSelected: false,
      sets: [
        {
          id: "set-c-1",
          setNumber: 1,
          crates: "",
          weight: null,
          isExpanded: true,
        },
      ],
    },
  ]);

  // Fetch crops + varieties
  const fetchCropsAndVarieties = useCallback(async () => {
    try {
      setCropsLoading(true);
      const authToken = store.getState().auth.token;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/crops-varieties`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.data.success && response.data.data) {
        const cropsList: any[] = response.data.data.crops || [];
        const varietiesObj: Record<string, any[]> = response.data.data.varieties || {};

        setRawCrops(cropsList);
        setRawVarieties(varietiesObj);

        setCropsData(cropsList.map((c) => formatCropOption(c)));

        const formattedVarieties: Record<string, OptionItem[]> = {};
        Object.keys(varietiesObj).forEach((cropId) => {
          formattedVarieties[cropId] = (varietiesObj[cropId] || []).map((v) =>
            formatVarietyOption(v),
          );
        });
        setVarietiesData(formattedVarieties);
      } else {
        setCropsData([]);
        setVarietiesData({});
      }
    } catch (err) {
      console.error("Error fetching crops and varieties:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to fetch crops.", "Failed to fetch crops and varieties."),
      );
      setCropsData([]);
      setVarietiesData({});
    } finally {
      setCropsLoading(false);
    }
  }, [t, formatCropOption, formatVarietyOption]);

  useEffect(() => {
    fetchCropsAndVarieties();
  }, [fetchCropsAndVarieties]);

  // Re-format labels on language change
  useEffect(() => {
    if (rawCrops.length > 0) {
      setCropsData(rawCrops.map((c) => formatCropOption(c)));
    }
    if (Object.keys(rawVarieties).length > 0) {
      const formatted: Record<string, OptionItem[]> = {};
      Object.keys(rawVarieties).forEach((k) => {
        formatted[k] = (rawVarieties[k] || []).map((v) => formatVarietyOption(v));
      });
      setVarietiesData(formatted);
    }
  }, [i18n.language, rawCrops, rawVarieties, formatCropOption, formatVarietyOption]);

  // Toggle grade checkbox / row
  const handleToggleGrade = (gradeKey: "A" | "B" | "C") => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const newSelected = !g.isSelected;
          return {
            ...g,
            isSelected: newSelected,
            sets:
              g.sets.length === 0
                ? [
                    {
                      id: `set-${gradeKey.toLowerCase()}-1`,
                      setNumber: 1,
                      crates: "",
                      weight: null,
                      isExpanded: true,
                    },
                  ]
                : g.sets,
          };
        }
        return g;
      })
    );
  };

  // Add new set to a grade
  const handleAddSet = (gradeKey: "A" | "B" | "C") => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const nextSetNumber = g.sets.length + 1;
          const newSet: CrateSet = {
            id: `set-${gradeKey.toLowerCase()}-${Date.now()}`,
            setNumber: nextSetNumber,
            crates: "",
            weight: null,
            isExpanded: true,
          };
          return {
            ...g,
            sets: [...g.sets, newSet],
          };
        }
        return g;
      })
    );
  };

  // Delete a set from a grade
  const handleDeleteSet = (gradeKey: "A" | "B" | "C", setId: string) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const filtered = g.sets.filter((s) => s.id !== setId);
          const renumbered = filtered.map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          }));
          return {
            ...g,
            sets: renumbered,
            isSelected: renumbered.length > 0 ? g.isSelected : false,
          };
        }
        return g;
      })
    );
  };

  // Toggle set expansion
  const handleToggleSetExpand = (gradeKey: "A" | "B" | "C", setId: string) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === setId ? { ...s, isExpanded: !s.isExpanded } : s
            ),
          };
        }
        return g;
      })
    );
  };

  // Update crates value for a set
  const handleCratesChange = (
    gradeKey: "A" | "B" | "C",
    setId: string,
    crates: string
  ) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === setId ? { ...s, crates } : s
            ),
          };
        }
        return g;
      })
    );
  };

  // Set weight from scale modal
  const handleScaleContinue = (weight: number) => {
    if (!scaleTarget) return;
    const finalWeight = weight > 0 ? weight : 90.1;
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === scaleTarget.gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === scaleTarget.setId ? { ...s, weight: finalWeight } : s
            ),
          };
        }
        return g;
      })
    );
    setScaleTarget(null);
  };

  // Check if current variety has completed sets
  const hasCompletedSets = grades.some(
    (g) =>
      g.isSelected &&
      g.sets.some((s) => s.crates.trim() !== "" && s.weight !== null)
  );

  // Can finish loading if either saved items exist OR current variety is completed
  const canFinishLoading = savedVarieties.length > 0 || hasCompletedSets;

  // Handle Add More Items (save and reset for next variety)
  const handleAddMoreItems = () => {
    if (!hasCompletedSets) return;

    const completedSets: SavedSet[] = [];
    grades.forEach((g) => {
      if (g.isSelected) {
        g.sets.forEach((s) => {
          if (s.crates.trim() !== "" && s.weight !== null) {
            completedSets.push({
              id: s.id,
              gradeKey: g.gradeKey,
              setNumber: s.setNumber,
              crates: s.crates,
              weight: s.weight,
            });
          }
        });
      }
    });

    const newSavedVariety: SavedVariety = {
      id: `variety-${Date.now()}`,
      varietyNumber: varietyIndex,
      cropId: selectedCrop?.value,
      cropLabel: selectedCrop?.label || "Crop",
      varietyId: selectedVariety?.value,
      varietyLabel:
        selectedVariety?.label ||
        selectedCrop?.label ||
        `Variety ${varietyIndex}`,
      sets: completedSets,
    };

    setSavedVarieties((prev) => {
      const nextList = [...prev, newSavedVariety];
      setCarouselIndex(nextList.length - 1);
      return nextList;
    });

    setVarietyIndex((prev) => prev + 1);
    setSelectedCrop(null);
    setSelectedVariety(null);
    setGrades([
      {
        gradeKey: "A",
        title: "Grade A",
        isSelected: false,
        sets: [
          {
            id: `set-a-${Date.now()}-1`,
            setNumber: 1,
            crates: "",
            weight: null,
            isExpanded: true,
          },
        ],
      },
      {
        gradeKey: "B",
        title: "Grade B",
        isSelected: false,
        sets: [
          {
            id: `set-b-${Date.now()}-1`,
            setNumber: 1,
            crates: "",
            weight: null,
            isExpanded: true,
          },
        ],
      },
      {
        gradeKey: "C",
        title: "Grade C",
        isSelected: false,
        sets: [
          {
            id: `set-c-${Date.now()}-1`,
            setNumber: 1,
            crates: "",
            weight: null,
            isExpanded: true,
          },
        ],
      },
    ]);
  };

  // Delete an entire saved variety from carousel
  const handleDeleteSavedVariety = (varietyId: string) => {
    setSavedVarieties((prev) => {
      const filtered = prev.filter((v) => v.id !== varietyId);
      if (carouselIndex >= filtered.length && filtered.length > 0) {
        setCarouselIndex(filtered.length - 1);
      } else if (filtered.length === 0) {
        setCarouselIndex(0);
      }
      return filtered;
    });
  };

  // Delete an individual set from a saved variety
  const handleDeleteSavedSet = (varietyId: string, setId: string) => {
    setSavedVarieties((prev) => {
      const updated = prev
        .map((v) => {
          if (v.id === varietyId) {
            const filteredSets = v.sets.filter((s) => s.id !== setId);
            return {
              ...v,
              sets: filteredSets,
            };
          }
          return v;
        })
        .filter((v) => v.sets.length > 0);

      if (carouselIndex >= updated.length && updated.length > 0) {
        setCarouselIndex(updated.length - 1);
      } else if (updated.length === 0) {
        setCarouselIndex(0);
      }
      return updated;
    });
  };

  // Handle Finish Loading
  const handleFinishLoading = () => {
    const summaryList: any[] = [];

    // 1. Process saved varieties
    savedVarieties.forEach((v) => {
      let totalWeight = 0;
      let totalCratesCount = 0;
      const gradeSets = v.sets.map((s) => {
        const cratesNum = parseInt(s.crates, 10) || 0;
        const weightVal = s.weight || 0;
        totalWeight += weightVal;
        totalCratesCount += cratesNum;
        return {
          gradeKey: s.gradeKey,
          grade: `Grade ${s.gradeKey}`,
          set: s.setNumber,
          crates: cratesNum,
          weightKg: weightVal,
        };
      });

      summaryList.push({
        id: v.id,
        varietyNumber: v.varietyNumber,
        cropId: v.cropId,
        cropLabel: v.cropLabel,
        varietyId: v.varietyId,
        varietyLabel: v.varietyLabel,
        cropName: v.varietyLabel || v.cropLabel,
        imageUri:
          "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=150&auto=format&fit=crop&q=80",
        totalWeightKg: totalWeight,
        totalCrates: totalCratesCount,
        gradeSets,
      });
    });

    // 2. Process current variety if any sets exist
    const currentGradeSets: any[] = [];
    let currentTotalWeight = 0;
    let currentTotalCrates = 0;

    grades.forEach((g) => {
      if (g.isSelected) {
        g.sets.forEach((s) => {
          if (s.crates.trim() !== "" || s.weight !== null) {
            const cratesNum = parseInt(s.crates, 10) || 0;
            const weightVal = s.weight || 0;
            currentTotalWeight += weightVal;
            currentTotalCrates += cratesNum;
            currentGradeSets.push({
              gradeKey: g.gradeKey,
              grade: `Grade ${g.gradeKey}`,
              set: s.setNumber,
              crates: cratesNum,
              weightKg: weightVal,
            });
          }
        });
      }
    });

    if (currentGradeSets.length > 0) {
      summaryList.push({
        id: `current-variety-${Date.now()}`,
        varietyNumber: varietyIndex,
        cropId: selectedCrop?.value,
        cropLabel: selectedCrop?.label || "Crop",
        varietyId: selectedVariety?.value,
        varietyLabel:
          selectedVariety?.label ||
          selectedCrop?.label ||
          `Variety ${varietyIndex}`,
        cropName:
          selectedVariety?.label ||
          selectedCrop?.label ||
          `Variety ${varietyIndex}`,
        imageUri:
          "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=150&auto=format&fit=crop&q=80",
        totalWeightKg: currentTotalWeight,
        totalCrates: currentTotalCrates,
        gradeSets: currentGradeSets,
      });
    }

    // Save to Redux store
    store.dispatch({
      type: "transport/setLoadedVarieties",
      payload: summaryList,
    });

    navigation.navigate("LoadingToVehicleSummary", {
      vehicleNo,
      centreId: route.params?.centreId,
      centreName: route.params?.centreName,
      driverId: route.params?.driverId,
      driverEmpId: route.params?.driverEmpId,
      driverName: route.params?.driverName,
      vehicleId: route.params?.vehicleId,
      items: summaryList.length > 0 ? summaryList : undefined,
    });
  };

  const varietyOptions = selectedCrop
    ? varietiesData[selectedCrop.value] || []
    : [];

  if (cropsLoading) {
    return (
      <View className="flex-1 bg-white">
        <CustomHeader title={vehicleNo} navigation={navigation} />
        <LoadingPage
          message={t("LoadingToVehicle.LoadingCrops", "Loading...")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header without [] in vehicle number */}
      <CustomHeader
        title={vehicleNo}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Top Carousel of Saved Varieties (shown when items exist) */}
          {savedVarieties.length > 0 && (
            <View className="mb-2">
              <View className="flex-row items-center justify-between">
                {/* Left Arrow */}
                <TouchableOpacity
                  disabled={carouselIndex === 0}
                  onPress={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Entypo
                    name="chevron-left"
                    size={24}
                    color={carouselIndex === 0 ? "#CBD5E1" : "#000000"}
                  />
                </TouchableOpacity>

                {/* Current Variety Card Container */}
                {savedVarieties[carouselIndex] && (
                  <View className="flex-1 mx-2">
                    {/* Card Header: (01) Variety Name + Red Trash */}
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-extrabold text-[#000000] text-sm">
                        ({String(savedVarieties[carouselIndex].varietyNumber).padStart(2, "0")}){" "}
                        {savedVarieties[carouselIndex].varietyLabel}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteSavedVariety(
                            savedVarieties[carouselIndex].id
                          )
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="delete" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Sets Table */}
                    <View className="border border-[#000000] rounded-2xl overflow-hidden bg-white">
                      {savedVarieties[carouselIndex].sets.map((set, sIdx) => (
                        <View
                          key={set.id}
                          className={`flex-row items-center justify-between px-4 py-2.5 ${
                            sIdx !== savedVarieties[carouselIndex].sets.length - 1
                              ? "border-b border-[#E2E8F0]"
                              : ""
                          }`}
                        >
                          {/* Grade */}
                          <Text className="font-bold text-[#000000] text-sm w-8">
                            {set.gradeKey}
                          </Text>

                          {/* Set Label */}
                          <Text className="font-bold text-[#000000] text-sm flex-1 ml-4">
                            Set {set.setNumber}
                          </Text>

                          {/* Delete Set */}
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteSavedSet(
                                savedVarieties[carouselIndex].id,
                                set.id
                              )
                            }
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name="delete"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Right Arrow */}
                <TouchableOpacity
                  disabled={carouselIndex >= savedVarieties.length - 1}
                  onPress={() =>
                    setCarouselIndex((prev) =>
                      Math.min(savedVarieties.length - 1, prev + 1)
                    )
                  }
                  className="p-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Entypo
                    name="chevron-right"
                    size={24}
                    color={
                      carouselIndex >= savedVarieties.length - 1
                        ? "#CBD5E1"
                        : "#000000"
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Pink / Magenta Dashed Separator Line */}
              <View
                style={{
                  borderStyle: "dashed",
                  borderWidth: 1,
                  borderColor: "#E879F9",
                  marginHorizontal: -24,
                  marginTop: 16,
                  marginBottom: 16,
                }}
              />
            </View>
          )}

          {/* Variety Subtitle */}
          <Text className="text-center font-bold text-[#0F172A] text-base mb-4">
            {t("LoadingToVehicle.Variety", "Variety")} {varietyIndex}
          </Text>

          {/* Crop Name Selector (50px height, rounded-full) */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-[#1E293B] mb-1.5">
              {t("LoadingToVehicle.CropName", "Crop Name")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCropModalVisible(true)}
              className="bg-[#F4F6F9] rounded-full h-[50px] px-4 flex-row items-center justify-between"
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCrop ? "text-[#0F172A] font-bold" : "text-[#94A3B8]"
                }`}
              >
                {selectedCrop?.label || "--Select Crop--"}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Variety Selector (50px height, rounded-full) */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-[#1E293B] mb-1.5">
              {t("LoadingToVehicle.VarietyLabel", "Variety")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => selectedCrop && setIsVarietyModalVisible(true)}
              disabled={!selectedCrop}
              className={`rounded-full h-[50px] px-4 flex-row items-center justify-between ${
                selectedCrop ? "bg-[#F4F6F9]" : "bg-[#F4F6F9] opacity-60"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedVariety ? "text-[#0F172A] font-bold" : "text-[#94A3B8]"
                }`}
              >
                {selectedVariety?.label ||
                  (selectedCrop
                    ? "--Select Variety--"
                    : "--Select Crop First--")}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Edge-to-edge HR line in #747474 */}
          <View
            style={{
              height: 1,
              backgroundColor: "#747474",
              marginHorizontal: -24,
            }}
            className="my-3"
          />

          {/* Grade Sections: Grade A, Grade B, Grade C */}
          {grades.map((grade) => {
            return (
              <View key={grade.gradeKey}>
                {/* Grade Header Row (Whole row touchable) */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleToggleGrade(grade.gradeKey)}
                  className="flex-row items-center py-2 gap-3"
                >
                  {/* Checkbox */}
                  <View
                    className={`w-5 h-5 rounded-[4px] border items-center justify-center ${
                      grade.isSelected
                        ? "bg-[#000000] border-[#000000]"
                        : "border-[#000000] bg-white"
                    }`}
                  >
                    {grade.isSelected && (
                      <FontAwesome name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text className="font-bold text-[#0F172A] text-sm">
                    {grade.title}
                  </Text>
                </TouchableOpacity>

                {/* Expanded Grade Crate Sets: Separate Boxes */}
                {grade.isSelected && (
                  <View className="mt-2 mb-2">
                    {grade.sets.map((set, sIdx) => {
                      const isLastSet = sIdx === grade.sets.length - 1;
                      const showAddButton =
                        isLastSet && grade.sets.some((s) => s.isExpanded);

                      return (
                        <View
                          key={set.id}
                          className={`relative ${
                            showAddButton ? "mb-6" : "mb-3"
                          }`}
                        >
                          <View className="border border-[#000000] rounded-2xl overflow-hidden bg-white">
                            {/* Set Header Bar (50px height, #E9ECF1 bg) */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() =>
                                handleToggleSetExpand(grade.gradeKey, set.id)
                              }
                              className="bg-[#E9ECF1] px-4 h-[50px] flex-row items-center justify-between"
                            >
                              {/* Yellow Set Badge */}
                              <View className="bg-[#FEF08A] px-3 py-1 rounded-full">
                                <Text className="text-xs font-bold text-[#000000]">
                                  Set : {set.setNumber}
                                </Text>
                              </View>

                              <View className="flex-row items-center gap-3">
                                {/* Chevron Up/Down */}
                                <MaterialIcons
                                  name={
                                    set.isExpanded
                                      ? "keyboard-arrow-up"
                                      : "keyboard-arrow-down"
                                  }
                                  size={24}
                                  color="#000000"
                                />
                              </View>
                            </TouchableOpacity>

                            {/* Set Body (only rendered when expanded) */}
                            {set.isExpanded && (
                              <View className="pt-3 px-4 pb-7 bg-white">
                                {/* Red Circular Delete Button at top right (only for set > 1) */}
                                {set.setNumber > 1 && (
                                  <View className="flex-row justify-end mb-2">
                                    <TouchableOpacity
                                      activeOpacity={0.8}
                                      onPress={() =>
                                        handleDeleteSet(grade.gradeKey, set.id)
                                      }
                                      className="w-8 h-8 rounded-full bg-[#EF4444] items-center justify-center shadow-sm"
                                      style={{
                                        shadowColor: "#EF4444",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 2,
                                        elevation: 2,
                                      }}
                                      hitSlop={{
                                        top: 8,
                                        bottom: 8,
                                        left: 8,
                                        right: 8,
                                      }}
                                    >
                                      <MaterialIcons
                                        name="delete"
                                        size={18}
                                        color="#FFFFFF"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )}
                                {/* Crates Count Input (50px height, rounded-full, center text, placeholder clears on focus) */}
                                <TextInput
                                  placeholder={
                                    focusedSetId === set.id
                                      ? ""
                                      : "--Enter Total Crates Count Here--"
                                  }
                                  placeholderTextColor="#94A3B8"
                                  value={set.crates}
                                  onChangeText={(val) =>
                                    handleCratesChange(
                                      grade.gradeKey,
                                      set.id,
                                      val
                                    )
                                  }
                                  onFocus={() => setFocusedSetId(set.id)}
                                  onBlur={() => setFocusedSetId(null)}
                                  keyboardType="numeric"
                                  textAlign="center"
                                  className="bg-[#F4F6F9] rounded-full h-[50px] px-4 font-bold text-base text-[#0F172A] mb-3"
                                />

                                {/* Weight Row */}
                                <View className="flex-row items-center gap-3">
                                  {/* Weight Display Box (50px height, rounded-full) */}
                                  <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() =>
                                      setScaleTarget({
                                        gradeKey: grade.gradeKey,
                                        setId: set.id,
                                      })
                                    }
                                    className="flex-1 bg-[#F4F6F9] rounded-full h-[50px] items-center justify-center"
                                  >
                                    <Text
                                      className={`font-bold text-base ${
                                        set.weight !== null
                                          ? "text-[#0F172A]"
                                          : "text-[#94A3B8]"
                                      }`}
                                    >
                                      {set.weight !== null
                                        ? `${set.weight.toFixed(2)} kg`
                                        : "kg"}
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Scale / Action Button (50px x 50px, rounded-full) */}
                                  <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() =>
                                      setScaleTarget({
                                        gradeKey: grade.gradeKey,
                                        setId: set.id,
                                      })
                                    }
                                    className={`w-[50px] h-[50px] rounded-full items-center justify-center ${
                                      set.weight !== null
                                        ? "bg-[#000000]"
                                        : set.crates.trim() !== ""
                                        ? "bg-[#000000]"
                                        : "bg-[#ACB5BE]"
                                    }`}
                                  >
                                    {set.weight !== null ? (
                                      <AntDesign
                                        name="reload"
                                        size={20}
                                        color="#FFFFFF"
                                      />
                                    ) : (
                                      <MaterialIcons
                                        name="arrow-forward"
                                        size={22}
                                        color="#FFFFFF"
                                      />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>

                          {/* Circular Add Set Button (+) vertically centered on bottom border line */}
                          {showAddButton && (
                            <View
                              style={{
                                position: "absolute",
                                bottom: -22,
                                left: 0,
                                right: 0,
                                alignItems: "center",
                                zIndex: 20,
                              }}
                            >
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleAddSet(grade.gradeKey)}
                                className="w-11 h-11 rounded-full bg-[#000000] items-center justify-center shadow-lg"
                                style={{
                                  shadowColor: "#000000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 4,
                                  elevation: 5,
                                }}
                              >
                                <Ionicons name="add" size={28} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Edge-to-edge HR line in #747474 between grade sections */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#747474",
                    marginHorizontal: -24,
                  }}
                  className="my-3"
                />
              </View>
            );
          })}
        </View>

        {/* Bottom Action Buttons (scrolls with content or sits at bottom if data is low) */}
        <View className="pt-6 pb-2 gap-3">
          {/* Finish Loading Button */}
          <TouchableOpacity
            disabled={!canFinishLoading}
            onPress={handleFinishLoading}
            activeOpacity={0.8}
            className={`w-full h-[50px] rounded-full items-center justify-center ${
              canFinishLoading ? "bg-[#000000]" : "bg-[#ACB5BE]"
            }`}
            style={
              canFinishLoading
                ? {
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 5,
                  }
                : undefined
            }
          >
            <Text className="text-white font-extrabold text-base">
              {t("LoadingToVehicle.FinishLoading", "Finish Loading")}
            </Text>
          </TouchableOpacity>

          {/* Add More Items Button */}
          <TouchableOpacity
            disabled={!hasCompletedSets}
            onPress={handleAddMoreItems}
            activeOpacity={0.8}
            className={`w-full h-[50px] rounded-full items-center justify-center ${
              hasCompletedSets ? "bg-[#980775]" : "bg-[#ACB5BE]"
            }`}
            style={
              hasCompletedSets
                ? {
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 5,
                  }
                : undefined
            }
          >
            <Text className="text-white font-extrabold text-base">
              {t("LoadingToVehicle.AddMoreItems", "Add More Items")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Global Search Modal for Crop Name */}
      <GlobalSearchModal
        visible={isCropModalVisible}
        onClose={() => setIsCropModalVisible(false)}
        title={t("LoadingToVehicle.SelectCrop", "Select Crop")}
        data={cropsData}
        selectedItems={selectedCrop ? [selectedCrop.value] : []}
        onSelect={(selectedValues) => {
          if (selectedValues.length > 0) {
            const found = cropsData.find((c) => c.value === selectedValues[0]);
            if (found) {
              setSelectedCrop(found);
              setSelectedVariety(null);
            }
          }
        }}
      />

      {/* Global Search Modal for Variety */}
      <GlobalSearchModal
        visible={isVarietyModalVisible}
        onClose={() => setIsVarietyModalVisible(false)}
        title={t("LoadingToVehicle.SelectVariety", "Select Variety")}
        data={varietyOptions}
        selectedItems={selectedVariety ? [selectedVariety.value] : []}
        onSelect={(selectedValues) => {
          if (selectedValues.length > 0) {
            const found = varietyOptions.find((v) => v.value === selectedValues[0]);
            if (found) {
              setSelectedVariety(found);
            }
          }
        }}
      />

      {/* Scale Weight Modal */}
      <ScaleWeightModal
        visible={scaleTarget !== null}
        onClose={() => setScaleTarget(null)}
        onContinue={handleScaleContinue}
        scaleName="Budry MFD - 300"
        initialWeight={90.1}
      />
    </View>
  );
}