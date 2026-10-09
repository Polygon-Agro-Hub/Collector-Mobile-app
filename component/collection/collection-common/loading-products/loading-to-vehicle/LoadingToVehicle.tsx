import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import { ScaleWeightModal } from "@/component/components/popup/ScaleWeightModal";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import FinalizeConfirmationModal from "@/component/components/popup/FinalizeConfirmationModal";
import LoadingPage from "@/component/components/loading/LoadingPage";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome,
  AntDesign,
  Entypo,
} from "@expo/vector-icons";
import axios from "axios";
import environment from "@/environment/environment";
import store from "@/services/reducxStore";
import NetInfo from "@react-native-community/netinfo";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";

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

export interface ContainerTypeItem {
  id: number;
  labelName: string;
  weight: number;
}

interface CrateSet {
  id: string;
  setNumber: number;
  containerTypeId?: number;
  containerTypeName?: string;
  containerTypeWeight?: number;
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
  containerTypeId?: number;
  containerTypeName?: string;
  containerTypeWeight?: number;
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
  imageUri?: string;
  sets: SavedSet[];
}

interface OptionItem {
  label: string;
  value: string;
  image?: string;
  bgColor?: string;
}

const createInitialGrades = (defaultContainer?: ContainerTypeItem | null): GradeData[] => [
  {
    gradeKey: "A",
    title: "Grade A",
    isSelected: false,
    sets: [
      {
        id: `set-a-${Date.now()}-1`,
        setNumber: 1,
        containerTypeId: defaultContainer?.id,
        containerTypeName: defaultContainer?.labelName,
        containerTypeWeight: defaultContainer?.weight,
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
        containerTypeId: defaultContainer?.id,
        containerTypeName: defaultContainer?.labelName,
        containerTypeWeight: defaultContainer?.weight,
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
        containerTypeId: defaultContainer?.id,
        containerTypeName: defaultContainer?.labelName,
        containerTypeWeight: defaultContainer?.weight,
        crates: "",
        weight: null,
        isExpanded: true,
      },
    ],
  },
];

export default function LoadingToVehicle({
  navigation,
  route,
}: LoadingToVehicleProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const vehicleNo = route.params?.vehicleNo || store.getState().transport.vehicleNo || "N/A";

  // Redux state for restoring previously selected data
  const transportState = store.getState().transport;

  // Crops / Varieties fetched from API
  const [rawCrops, setRawCrops] = useState<any[]>([]);
  const [rawVarieties, setRawVarieties] = useState<Record<string, any[]>>({});
  const [cropsData, setCropsData] = useState<OptionItem[]>([]);
  const [varietiesData, setVarietiesData] = useState<Record<string, OptionItem[]>>({});
  const [cropsLoading, setCropsLoading] = useState<boolean>(true);

  // Restore current variety state from Redux if available
  const [varietyIndex, setVarietyIndex] = useState<number>(
    transportState.currentVariety?.varietyIndex ??
      (transportState.savedVarieties && transportState.savedVarieties.length > 0
        ? transportState.savedVarieties.length + 1
        : 1)
  );
  const [selectedCrop, setSelectedCrop] = useState<OptionItem | null>(
    transportState.currentVariety?.selectedCrop || null
  );
  const [selectedVariety, setSelectedVariety] = useState<OptionItem | null>(
    transportState.currentVariety?.selectedVariety || null
  );

  // Restore saved varieties from Redux
  const [savedVarieties, setSavedVarieties] = useState<SavedVariety[]>(
    transportState.savedVarieties || []
  );
  const [carouselIndex, setCarouselIndex] = useState<number>(
    transportState.savedVarieties && transportState.savedVarieties.length > 0
      ? transportState.savedVarieties.length - 1
      : 0
  );

  // Restore active form grades from Redux if available
  const [grades, setGrades] = useState<GradeData[]>(
    transportState.currentVariety?.grades && transportState.currentVariety.grades.length > 0
      ? transportState.currentVariety.grades
      : createInitialGrades()
  );

  // Container types state from collection_officer.creates (backend only)
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([]);
  const [containerSectionWidth, setContainerSectionWidth] = useState<number>(
    Dimensions.get("window").width - 80
  );

  // Synchronize saved varieties with Redux store
  useEffect(() => {
    store.dispatch({
      type: "transport/setSavedVarieties",
      payload: savedVarieties,
    });
  }, [savedVarieties]);

  const handleBack = () => {
    navigation.navigate("SelectDistributionCentre", {
      driverId: route.params?.driverId,
      driverEmpId: route.params?.driverEmpId,
      driverName: route.params?.driverName,
      driverNameEnglish: route.params?.driverNameEnglish,
      driverNameSinhala: route.params?.driverNameSinhala,
      driverNameTamil: route.params?.driverNameTamil,
      vehicleId: route.params?.vehicleId,
      vehicleNo: route.params?.vehicleNo,
      vType: route.params?.vType,
      vCapacity: route.params?.vCapacity,
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
      };
    }, [navigation, route.params]),
  );

  // Synchronize current working variety with Redux store
  useEffect(() => {
    store.dispatch({
      type: "transport/setCurrentVariety",
      payload: {
        varietyIndex,
        selectedCrop,
        selectedVariety,
        grades,
      },
    });
  }, [varietyIndex, selectedCrop, selectedVariety, grades]);

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
        Array.isArray(response.data.data)
      ) {
        const types: ContainerTypeItem[] = response.data.data;
        setContainerTypes(types);

        if (types.length > 0) {
          // Populate initial container type on any existing grades that lack containerTypeId
          setGrades((prev) =>
            prev.map((g) => ({
              ...g,
              sets: g.sets.map((s) => ({
                ...s,
                containerTypeId: s.containerTypeId || types[0].id,
                containerTypeName: s.containerTypeName || types[0].labelName,
                containerTypeWeight: s.containerTypeWeight ?? types[0].weight,
              })),
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Failed to fetch container types from backend:", err);
    }
  }, []);

  useEffect(() => {
    fetchContainerTypes();
  }, [fetchContainerTypes]);

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
        image: crop.image || crop.cropImage || "",
        bgColor: crop.bgColor || crop.cropBgColor || "",
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
        image: variety.image || variety.varietyImage || "",
        bgColor: variety.bgColor || variety.varietyBgColor || "",
      };
    },
    [i18n.language],
  );

  const [isCropModalVisible, setIsCropModalVisible] = useState(false);
  const [isVarietyModalVisible, setIsVarietyModalVisible] = useState(false);

  const [focusedSetId, setFocusedSetId] = useState<string | null>(null);

  // Delete Set Confirmation Modal State
  const [setToDelete, setSetToDelete] = useState<{
    id: string;
    gradeKey: "A" | "B" | "C";
    gradeTitle: string;
    setNumber: number;
  } | null>(null);

  // Delete Variety Confirmation Modal State (from carousel)
  const [varietyToDelete, setVarietyToDelete] = useState<SavedVariety | null>(null);

  // Delete Saved Grade Confirmation Modal State (from carousel)
  const [savedGradeToDelete, setSavedGradeToDelete] = useState<{
    varietyId: string;
    varietyLabel: string;
    gradeKey: "A" | "B" | "C";
  } | null>(null);

  // Clear & Delete Pending Variety Confirmation Modal State
  const [clearAndDeleteModalVisible, setClearAndDeleteModalVisible] = useState(false);

  // Finalize Confirmation Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Scale Connection State
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(
    wifiScaleService.getStatus()
  );
  const [isScaleSelectModalVisible, setIsScaleSelectModalVisible] =
    useState<boolean>(false);
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    const checkWifi = (state: any) => {
      const isWifi = state.type === "wifi" || (state.isWifiEnabled === true && state.isConnected === true);
      setIsWifiEnabled(!!isWifi);
    };

    NetInfo.fetch().then(checkWifi);
    const unsubscribeNetInfo = NetInfo.addEventListener(checkWifi);
    const interval = setInterval(() => {
      NetInfo.fetch().then(checkWifi);
    }, 3000);

    return () => {
      unsubscribe();
      unsubscribeNetInfo();
      clearInterval(interval);
    };
  }, []);

  // Active target for scale modal: { gradeKey, setId }
  const [scaleTarget, setScaleTarget] = useState<{
    gradeKey: "A" | "B" | "C";
    setId: string;
  } | null>(null);

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
    setGrades((prev) => {
      const targetGrade = prev.find((g) => g.gradeKey === gradeKey);
      const willBeSelected = !targetGrade?.isSelected;

      return prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const defaultC = containerTypes.length > 0 ? containerTypes[0] : undefined;
          const newSets =
            g.sets.length === 0
              ? [
                  {
                    id: `set-${gradeKey.toLowerCase()}-1`,
                    setNumber: 1,
                    containerTypeId: defaultC?.id,
                    containerTypeName: defaultC?.labelName,
                    containerTypeWeight: defaultC?.weight,
                    crates: "",
                    weight: null,
                    isExpanded: true,
                  },
                ]
              : g.sets;

          return {
            ...g,
            isSelected: willBeSelected,
            sets: willBeSelected
              ? newSets.map((s, idx) => ({ ...s, isExpanded: idx === 0 }))
              : g.sets.map((s) => ({ ...s, isExpanded: false })),
          };
        } else {
          return willBeSelected
            ? {
                ...g,
                sets: g.sets.map((s) => ({ ...s, isExpanded: false })),
              }
            : g;
        }
      });
    });
  };

  // Add new set to a grade (collapses all other sets across all grades)
  const handleAddSet = (gradeKey: "A" | "B" | "C") => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const nextSetNumber = g.sets.length + 1;
          const defaultC = containerTypes.length > 0 ? containerTypes[0] : undefined;
          const newSet: CrateSet = {
            id: `set-${gradeKey.toLowerCase()}-${Date.now()}`,
            setNumber: nextSetNumber,
            containerTypeId: defaultC?.id,
            containerTypeName: defaultC?.labelName,
            containerTypeWeight: defaultC?.weight,
            crates: "",
            weight: null,
            isExpanded: true,
          };
          const collapsedPrevSets = g.sets.map((s) => ({
            ...s,
            isExpanded: false,
          }));
          return {
            ...g,
            sets: [...collapsedPrevSets, newSet],
          };
        } else {
          return {
            ...g,
            sets: g.sets.map((s) => ({
              ...s,
              isExpanded: false,
            })),
          };
        }
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

  // Select container type for a specific set
  const handleSelectContainerType = (
    gradeKey: "A" | "B" | "C",
    setId: string,
    cType: ContainerTypeItem
  ) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === setId
                ? {
                    ...s,
                    containerTypeId: cType.id,
                    containerTypeName: cType.labelName,
                    containerTypeWeight: cType.weight,
                  }
                : s
            ),
          };
        }
        return g;
      })
    );
  };

  // Toggle set expansion (only 1 box open at a time across all grades)
  const handleToggleSetExpand = (gradeKey: "A" | "B" | "C", setId: string) => {
    setGrades((prev) => {
      const currentGrade = prev.find((g) => g.gradeKey === gradeKey);
      const currentSet = currentGrade?.sets.find((s) => s.id === setId);
      const isExpanding = !currentSet?.isExpanded;

      return prev.map((g) => ({
        ...g,
        sets: g.sets.map((s) => ({
          ...s,
          isExpanded:
            g.gradeKey === gradeKey && s.id === setId ? isExpanding : false,
        })),
      }));
    });
  };

  // Update crates value for a set (prevent typing 0 and remove leading zeros)
  const handleCratesChange = (
    gradeKey: "A" | "B" | "C",
    setId: string,
    crates: string
  ) => {
    const sanitized = crates.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) => {
              if (s.id === setId) {
                const isCratesChanged = s.crates !== sanitized;
                return {
                  ...s,
                  crates: sanitized,
                  weight: isCratesChanged ? null : s.weight,
                };
              }
              return s;
            }),
          };
        }
        return g;
      })
    );
  };

  // Set weight from scale modal
  const handleScaleContinue = (weight: number) => {
    if (!scaleTarget) {
      return;
    }
    const finalWeight = Math.max(0, weight || 0);
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

  // Selected grades
  const selectedGrades = grades.filter((g) => g.isSelected);
  const hasSelectedGrades = selectedGrades.length > 0;

  // Check if every set in every selected grade has valid positive crates and weight
  const allSelectedSetsComplete =
    hasSelectedGrades &&
    selectedGrades.every(
      (g) =>
        g.sets.length > 0 &&
        g.sets.every((s) => {
          const cratesNum = parseInt(s.crates, 10);
          return (
            !isNaN(cratesNum) &&
            cratesNum > 0 &&
            s.weight !== null &&
            s.weight > 0
          );
        })
    );

  // Check if any selected grade has empty or incomplete input fields in any of its sets
  const hasEmptyFieldsInSets =
    hasSelectedGrades &&
    selectedGrades.some((g) =>
      g.sets.some((s) => {
        const cratesNum = parseInt(s.crates, 10);
        return (
          isNaN(cratesNum) ||
          cratesNum <= 0 ||
          s.weight === null ||
          s.weight <= 0
        );
      })
    );

  // Has any active selection started in the current form?
  const hasActiveFormStarted =
    selectedCrop !== null || selectedVariety !== null || hasSelectedGrades;

  // Add more items is enabled only when a crop and variety are selected, all sets in selected grades are complete, and there are NO empty fields
  const canAddMoreItems =
    selectedCrop !== null &&
    selectedVariety !== null &&
    allSelectedSetsComplete &&
    !hasEmptyFieldsInSets;

  // Finish loading:
  // - If an active form is started: must have all fields filled without any empty sets (i.e. canAddMoreItems is true)
  // - If NO active form is started: enabled if savedVarieties.length > 0
  const canFinishLoading =
    (!hasActiveFormStarted && savedVarieties.length > 0) ||
    canAddMoreItems;

  // Handle Add More Items (save and reset for next variety)
  const handleAddMoreItems = () => {
    if (!canAddMoreItems) return;

    const completedSets: SavedSet[] = [];
    grades.forEach((g) => {
      if (g.isSelected) {
        g.sets.forEach((s) => {
          const cratesNum = parseInt(s.crates, 10);
          if (!isNaN(cratesNum) && cratesNum > 0 && s.weight !== null && s.weight > 0) {
            completedSets.push({
              id: s.id,
              gradeKey: g.gradeKey,
              setNumber: s.setNumber,
              containerTypeId: s.containerTypeId,
              containerTypeName: s.containerTypeName,
              containerTypeWeight: s.containerTypeWeight,
              crates: s.crates,
              weight: s.weight,
            });
          }
        });
      }
    });

    const imageUri =
      selectedVariety?.image ||
      selectedCrop?.image ||
      "";

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
      imageUri,
      sets: completedSets,
    };

    setSavedVarieties((prev) => {
      const nextList = [
        ...prev,
        {
          ...newSavedVariety,
          varietyNumber: prev.length + 1,
        },
      ];
      setCarouselIndex(nextList.length - 1);
      setVarietyIndex(nextList.length + 1);
      return nextList;
    });

    setSelectedCrop(null);
    setSelectedVariety(null);
    setGrades(createInitialGrades(containerTypes.length > 0 ? containerTypes[0] : null));
  };

  // Delete an entire saved variety from carousel
  const handleDeleteSavedVariety = (varietyId: string) => {
    setSavedVarieties((prev) => {
      const filtered = prev
        .filter((v) => v.id !== varietyId)
        .map((v, idx) => ({
          ...v,
          varietyNumber: idx + 1,
        }));

      if (carouselIndex >= filtered.length && filtered.length > 0) {
        setCarouselIndex(filtered.length - 1);
      } else if (filtered.length === 0) {
        setCarouselIndex(0);
      }

      setVarietyIndex(filtered.length + 1);

      return filtered;
    });
  };

  // Delete an individual grade from a saved variety (same as Collection Form)
  const handleDeleteSavedGrade = (
    varietyId: string,
    gradeKey: "A" | "B" | "C"
  ) => {
    setSavedVarieties((prev) => {
      const updated = prev
        .map((v) => {
          if (v.id === varietyId) {
            const filteredSets = v.sets.filter((s) => s.gradeKey !== gradeKey);
            return {
              ...v,
              sets: filteredSets,
            };
          }
          return v;
        })
        .filter((v) => v.sets.length > 0)
        .map((v, idx) => ({
          ...v,
          varietyNumber: idx + 1,
        }));

      if (carouselIndex >= updated.length && updated.length > 0) {
        setCarouselIndex(updated.length - 1);
      } else if (updated.length === 0) {
        setCarouselIndex(0);
      }

      setVarietyIndex(updated.length + 1);

      return updated;
    });
  };

  // Clear & Delete pending variety and restore previous variety into active form (same as Collection Form)
  const handleClearAndDeletePending = () => {
    if (savedVarieties.length === 0) return;

    const lastIndex = savedVarieties.length - 1;
    const lastVariety = savedVarieties[lastIndex];

    // Remove last variety from savedVarieties list
    const remaining = savedVarieties.slice(0, lastIndex);
    setSavedVarieties(remaining);
    setCarouselIndex(Math.max(0, remaining.length - 1));

    // Restore variety number
    setVarietyIndex(lastVariety.varietyNumber);

    // Restore crop
    const cropFound =
      cropsData.find((c) => c.value === lastVariety.cropId) ||
      (lastVariety.cropId
        ? {
            label: lastVariety.cropLabel,
            value: lastVariety.cropId,
            image: lastVariety.imageUri,
          }
        : null);
    setSelectedCrop(cropFound);

    // Restore variety
    const cropVarieties =
      (lastVariety.cropId && varietiesData[lastVariety.cropId]) || [];
    const varietyFound =
      cropVarieties.find((v) => v.value === lastVariety.varietyId) ||
      (lastVariety.varietyId
        ? {
            label: lastVariety.varietyLabel,
            value: lastVariety.varietyId,
            image: lastVariety.imageUri,
          }
        : null);
    setSelectedVariety(varietyFound);

    // Restore grades & sets
    const setsByGrade: Record<string, CrateSet[]> = {
      A: [],
      B: [],
      C: [],
    };

    (lastVariety.sets || []).forEach((s) => {
      if (setsByGrade[s.gradeKey]) {
        setsByGrade[s.gradeKey].push({
          id: s.id,
          setNumber: s.setNumber,
          containerTypeId: s.containerTypeId,
          containerTypeName: s.containerTypeName,
          containerTypeWeight: s.containerTypeWeight,
          crates: s.crates,
          weight: s.weight,
          isExpanded: false,
        });
      }
    });

    const defaultC = containerTypes.length > 0 ? containerTypes[0] : null;

    const restoredGrades: GradeData[] = (["A", "B", "C"] as const).map(
      (gradeKey) => {
        const gradeSets = setsByGrade[gradeKey];
        const isSelected = gradeSets.length > 0;
        return {
          gradeKey,
          title: `Grade ${gradeKey}`,
          isSelected,
          sets: isSelected
            ? gradeSets.map((s, idx) => ({ ...s, isExpanded: idx === 0 }))
            : [
                {
                  id: `set-${gradeKey.toLowerCase()}-${Date.now()}-1`,
                  setNumber: 1,
                  containerTypeId: defaultC?.id,
                  containerTypeName: defaultC?.labelName,
                  containerTypeWeight: defaultC?.weight,
                  crates: "",
                  weight: null,
                  isExpanded: true,
                },
              ],
        };
      }
    );

    setGrades(restoredGrades);
  };

  // Helper to resolve DB image for a variety/crop
  const getImageForVariety = (varietyId?: string, cropId?: string, explicitImage?: string) => {
    if (explicitImage && explicitImage.trim() !== "") return explicitImage;
    if (varietyId) {
      const allVarieties = Object.values(rawVarieties).flat();
      const varietyObj = allVarieties.find(
        (item: any) => String(item.varietyId || item.value || item.id) === String(varietyId)
      );
      if (varietyObj && (varietyObj.image || varietyObj.varietyImage)) {
        return varietyObj.image || varietyObj.varietyImage;
      }
    }
    if (cropId) {
      const cropObj = rawCrops.find(
        (item: any) => String(item.cropId || item.value || item.id) === String(cropId)
      );
      if (cropObj && (cropObj.image || cropObj.cropImage)) {
        return cropObj.image || cropObj.cropImage;
      }
    }
    return "";
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
          crateWeight: s.containerTypeWeight ?? null,
          containerTypeId: s.containerTypeId,
          containerTypeName: s.containerTypeName,
        };
      });

      const finalImageUri = getImageForVariety(v.varietyId, v.cropId, v.imageUri);

      summaryList.push({
        id: v.id,
        varietyNumber: v.varietyNumber,
        cropId: v.cropId,
        cropLabel: v.cropLabel,
        varietyId: v.varietyId,
        varietyLabel: v.varietyLabel,
        cropName: v.varietyLabel || v.cropLabel,
        imageUri: finalImageUri,
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
          const cratesNum = parseInt(s.crates, 10);
          const weightVal = s.weight;
          if (!isNaN(cratesNum) && cratesNum > 0 && weightVal !== null && weightVal > 0) {
            currentTotalWeight += weightVal;
            currentTotalCrates += cratesNum;
            currentGradeSets.push({
              gradeKey: g.gradeKey,
              grade: `Grade ${g.gradeKey}`,
              set: s.setNumber,
              crates: cratesNum,
              weightKg: weightVal,
              crateWeight: s.containerTypeWeight ?? null,
              containerTypeId: s.containerTypeId,
              containerTypeName: s.containerTypeName,
            });
          }
        });
      }
    });

    if (currentGradeSets.length > 0) {
      const finalImageUri = getImageForVariety(
        selectedVariety?.value,
        selectedCrop?.value,
        selectedVariety?.image || selectedCrop?.image
      );

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
        imageUri: finalImageUri,
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
      centreId: route.params?.centreId ?? store.getState().transport.centreId ?? undefined,
      disComCenId: route.params?.disComCenId ?? store.getState().transport.disComCenId ?? undefined,
      centreName: route.params?.centreName ?? store.getState().transport.centreName ?? undefined,
      driverId: route.params?.driverId ?? store.getState().transport.driverId ?? undefined,
      driverEmpId: route.params?.driverEmpId ?? store.getState().transport.driverEmpId ?? undefined,
      driverName: route.params?.driverName ?? store.getState().transport.driverName ?? undefined,
      driverNameEnglish: route.params?.driverNameEnglish ?? store.getState().transport.driverNameEnglish ?? undefined,
      driverNameSinhala: route.params?.driverNameSinhala ?? store.getState().transport.driverNameSinhala ?? undefined,
      driverNameTamil: route.params?.driverNameTamil ?? store.getState().transport.driverNameTamil ?? undefined,
      vehicleId: route.params?.vehicleId ?? store.getState().transport.vehicleId ?? undefined,
      items: summaryList.length > 0 ? summaryList : undefined,
    });
  };

  // Used variety IDs that have already been saved to the vehicle
  const usedVarietyIds = savedVarieties
    .map((v) => v.varietyId)
    .filter((id): id is string => Boolean(id));

  // Crops whose varieties are ALL already added -> hide from crop list (same as Collection Form)
  const fullyUsedCropIds = cropsData.reduce((acc: string[], c) => {
    const cropVarieties = varietiesData[c.value] || [];
    if (cropVarieties.length === 0) return acc;
    const allUsed = cropVarieties.every((v) => usedVarietyIds.includes(v.value));
    if (allUsed) acc.push(c.value);
    return acc;
  }, []);

  const filteredCropsData = cropsData.filter(
    (crop) => !fullyUsedCropIds.includes(crop.value)
  );

  const varietyOptions = selectedCrop
    ? (varietiesData[selectedCrop.value] || []).filter(
        (v) => !usedVarietyIds.includes(v.value)
      )
    : [];

  useEffect(() => {
    if (selectedVariety && usedVarietyIds.includes(selectedVariety.value)) {
      setSelectedVariety(null);
    }
  }, [savedVarieties]);

  if (cropsLoading) {
    return (
      <View className="flex-1 bg-white">
        <CustomHeader
          title={vehicleNo}
          navigation={navigation}
          onBackPress={handleBack}
        />
        <LoadingPage
          message={t("LoadingToVehicle.LoadingCrops", "Loading...")}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* Header without [] in vehicle number */}
      <CustomHeader
        title={vehicleNo}
        navigation={navigation}
        onBackPress={handleBack}
      />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Scale Status Card: Red (Wi-Fi Off), Blue (Wi-Fi On & Not Connected), Yellow (Connected) */}
          {!isWifiEnabled ? (
            /* State 1: Wi-Fi Off - #E91233 background, white text/icon */
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                Alert.alert(
                  "Wi-Fi is not enabled!",
                  "Please enable the Wi-Fi to connect with the Scale.",
                  [{ text: "OK" }],
                  { type: "error", autoClose: false, showOkButton: true } as any
                );
              }}
              style={{
                marginTop: 4,
                marginBottom: 12,
                backgroundColor: "#E91233",
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
                <MaterialCommunityIcons name="wifi" size={24} color="#E91233" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#FFFFFF",
                    letterSpacing: -0.2,
                  }}
                >
                  {t("ScaleSelectModal.WifiOffTitle", "Wi-Fi is Off")}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#FFFFFF",
                    fontWeight: "500",
                    marginTop: 1,
                    lineHeight: 16,
                    opacity: 0.9,
                  }}
                >
                  {t("ScaleSelectModal.WifiOffMessage", "Please turn on Wi-Fi on your phone to connect to the scale.")}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : !scaleStatus.connected ? (
            /* State 2: Wi-Fi On & Not Connected - #1266FD background, white text/icon */
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setIsScaleSelectModalVisible(true)}
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
          ) : scaleStatus.connected && scaleStatus.scale ? (
            /* State 3: Scale Connected - #FAE432 background, black text/icon */
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setIsScaleSelectModalVisible(true)}
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
                    fontSize: 17,
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
          ) : null}

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
                      <Text className="font-extrabold text-[#000000] text-sm flex-1 mr-2 flex-wrap">
                        ({String(savedVarieties[carouselIndex].varietyNumber).padStart(2, "0")}){" "}
                        {savedVarieties[carouselIndex].varietyLabel}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setVarietyToDelete(savedVarieties[carouselIndex])
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="delete" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Grades Table (same as Collection Form: Left Grade A/B/C, Center Weight in kg, Right Delete icon) */}
                    <View className="border border-[#000000] rounded-2xl overflow-hidden bg-white">
                      {(() => {
                        const currentVariety = savedVarieties[carouselIndex];
                        const availableGrades = (["A", "B", "C"] as const).filter((gKey) =>
                          currentVariety.sets.some(
                            (s) => s.gradeKey === gKey && s.weight !== null && s.weight > 0
                          )
                        );

                        return availableGrades.map((gradeKey, gIdx) => {
                          const gradeWeight = currentVariety.sets
                            .filter((s) => s.gradeKey === gradeKey)
                            .reduce((sum, s) => sum + (s.weight || 0), 0);

                          return (
                            <View
                              key={gradeKey}
                              className={`flex-row items-center justify-between px-4 py-2.5 ${
                                gIdx !== availableGrades.length - 1
                                  ? "border-b border-[#E2E8F0]"
                                  : ""
                              }`}
                            >
                              {/* Left: Grade A, B, or C */}
                              <Text
                                className="font-bold text-[#000000] text-sm w-8"
                                style={{ includeFontPadding: false }}
                              >
                                {gradeKey}
                              </Text>

                              {/* Center: Weight in kg (not grade or set text) */}
                              <Text
                                className="font-bold text-[#000000] text-sm flex-1 text-center"
                                style={{ includeFontPadding: false }}
                              >
                                {Number(gradeWeight || 0).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {t("PassTargetBetweenOfficers.kg", "kg")}
                              </Text>

                              {/* Right: Delete Icon */}
                              <TouchableOpacity
                                onPress={() =>
                                  setSavedGradeToDelete({
                                    varietyId: currentVariety.id,
                                    varietyLabel: currentVariety.varietyLabel,
                                    gradeKey,
                                  })
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
                          );
                        });
                      })()}
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
          <Text
            className="text-center font-bold text-[#0F172A] text-base mb-2"
            style={{ lineHeight: 22, includeFontPadding: false }}
          >
            {t("LoadingToVehicle.Variety", "Variety")} {varietyIndex}
          </Text>

          {/* Clear & Delete Button (Same as Collection Form) */}
          {savedVarieties.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setClearAndDeleteModalVisible(true)}
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 9999,
                paddingVertical: 8,
                paddingHorizontal: 24,
                alignSelf: "center",
                marginTop: 2,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: "#FF383C",
                  fontWeight: "600",
                  fontSize: 14,
                  lineHeight: 20,
                  includeFontPadding: false,
                }}
              >
                {t(
                  "LoadingToVehicle.ClearAndDelete",
                  t("UnregisteredCropDetails.ClearAndDelete", "Clear & Delete")
                )}
              </Text>
            </TouchableOpacity>
          )}

          {/* Crop Name Selector (50px height, rounded-full) */}
          <View className="mb-4">
            <Text
              className="text-xs font-bold text-[#1E293B] mb-1.5"
              style={{
                lineHeight: 18,
                paddingVertical: 2,
                includeFontPadding: true,
              }}
            >
              {t("LoadingToVehicle.CropName", "Crop Name")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCropModalVisible(true)}
              className="bg-[#F4F6F9] rounded-full min-h-[50px] px-4 py-2 flex-row items-center justify-between"
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className={`text-sm font-medium flex-1 mr-2 ${
                  selectedCrop ? "text-[#0F172A] font-bold" : "text-[#94A3B8]"
                }`}
                style={{
                  lineHeight: 22,
                  paddingVertical: 2,
                  includeFontPadding: true,
                }}
              >
                {selectedCrop?.label || t("LoadingToVehicle.SelectCrop", "--Select Crop--")}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" style={{ flexShrink: 0 }} />
            </TouchableOpacity>
          </View>

          {/* Variety Selector (50px height, rounded-full) */}
          <View className="mb-4">
            <Text
              className="text-xs font-bold text-[#1E293B] mb-1.5"
              style={{
                lineHeight: 18,
                paddingVertical: 2,
                includeFontPadding: true,
              }}
            >
              {t("LoadingToVehicle.VarietyLabel", "Variety")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => selectedCrop && setIsVarietyModalVisible(true)}
              disabled={!selectedCrop}
              className={`rounded-full min-h-[50px] px-4 py-2 flex-row items-center justify-between ${
                selectedCrop ? "bg-[#F4F6F9]" : "bg-[#F4F6F9] opacity-60"
              }`}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className={`text-sm font-medium flex-1 mr-2 ${
                  selectedVariety ? "text-[#0F172A] font-bold" : "text-[#94A3B8]"
                }`}
                style={{
                  lineHeight: 22,
                  paddingVertical: 2,
                  includeFontPadding: true,
                }}
              >
                {selectedVariety?.label ||
                  t("LoadingToVehicle.SelectVariety", "--Select Variety--")}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" style={{ flexShrink: 0 }} />
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                  }}
                >
                  {/* Checkbox */}
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: "#000000",
                      backgroundColor: grade.isSelected
                        ? "#000000"
                        : "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {grade.isSelected && (
                      <FontAwesome name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: "#0F172A",
                        fontSize: 15,
                        includeFontPadding: true,
                        paddingVertical: 2,
                      }}
                    >
                      {`${t("LoadingToVehicle.Grade", "Grade")}\u00A0${grade.gradeKey}`}
                    </Text>
                  </View>
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
                                  {t("LoadingToVehicle.Set", "Set")} : {set.setNumber}
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
                                        setSetToDelete({
                                          id: set.id,
                                          gradeKey: grade.gradeKey,
                                          gradeTitle: grade.title,
                                          setNumber: set.setNumber,
                                        })
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
                                      overflow: "hidden",
                                    }}
                                  >
                                    <ScrollView
                                      horizontal
                                      showsHorizontalScrollIndicator={false}
                                      style={{ borderRadius: 9999, overflow: "hidden" }}
                                      contentContainerStyle={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      {containerTypes.map((cType) => {
                                        const isSelected =
                                          set.containerTypeId === cType.id ||
                                          (!set.containerTypeId && cType.id === containerTypes[0]?.id);

                                        // Width of section minus 8px padding divided by 3 so max 3 are visible at once
                                        const itemWidth = Math.max(
                                          80,
                                          Math.floor((containerSectionWidth - 8) / 3)
                                        );

                                        return (
                                          <TouchableOpacity
                                            key={cType.id}
                                            activeOpacity={0.75}
                                            onPress={() =>
                                              handleSelectContainerType(grade.gradeKey, set.id, cType)
                                            }
                                            style={{
                                              width: itemWidth,
                                              height: 52,
                                              borderRadius: 9999,
                                              backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                                              justifyContent: "center",
                                              alignItems: "center",
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

                                {/* Crates Count Input (50px height, rounded-full, center text, placeholder clears on focus) */}
                                <TextInput
                                  placeholder={
                                    focusedSetId === set.id
                                      ? ""
                                      : `--${t("LoadingToVehicle.EnterTotalContainers", "Enter Total Containers Here")}--`
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
                                  className="bg-[#EEF2F6] rounded-full h-[50px] px-4 font-bold text-base text-[#0F172A] mb-3"
                                />

                                 {/* Weight Row */}
                                {(() => {
                                  const cratesNum = parseInt(set.crates, 10);
                                  const isCratesValid = !isNaN(cratesNum) && cratesNum > 0;

                                  return (
                                    <View className="flex-row items-center gap-3">
                                      {/* Weight Display Box (50px height, rounded-full) */}
                                      <TouchableOpacity
                                        disabled={!isCratesValid}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                          setScaleTarget({
                                            gradeKey: grade.gradeKey,
                                            setId: set.id,
                                          })
                                        }
                                        className="flex-1 bg-[#EEF2F6] rounded-full h-[50px] items-center justify-center"
                                      >
                                        <Text
                                          className={`font-bold text-base ${
                                            set.weight !== null
                                              ? "text-[#0F172A]"
                                              : "text-[#94A3B8]"
                                          }`}
                                        >
                                          {set.weight !== null
                                            ? `${set.weight.toFixed(2)} ${t("Common.kg", "kg")}`
                                            : t("Common.kg", "kg")}
                                        </Text>
                                      </TouchableOpacity>

                                      {/* Scale / Action Button (50px x 50px, rounded-full) */}
                                      <TouchableOpacity
                                        disabled={!isCratesValid}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                          setScaleTarget({
                                            gradeKey: grade.gradeKey,
                                            setId: set.id,
                                          })
                                        }
                                        className={`w-[50px] h-[50px] rounded-full items-center justify-center ${
                                          set.weight !== null && isCratesValid
                                            ? "bg-[#000000]"
                                            : isCratesValid
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
                                  );
                                })()}
                              </View>
                            )}
                          </View>

                          {/* Circular Add Set Button (+) vertically centered on bottom border line */}
                          {showAddButton && (() => {
                            const lastSetCratesNum = parseInt(set.crates, 10);
                            const isLastSetCompleted =
                              !isNaN(lastSetCratesNum) &&
                              lastSetCratesNum > 0 &&
                              set.weight !== null &&
                              set.weight > 0;

                            return (
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
                                  disabled={!isLastSetCompleted}
                                  activeOpacity={0.8}
                                  onPress={isLastSetCompleted ? () => handleAddSet(grade.gradeKey) : undefined}
                                  className={`w-11 h-11 rounded-full items-center justify-center shadow-lg ${
                                    isLastSetCompleted ? "bg-[#000000]" : "bg-[#ACB5BE]"
                                  }`}
                                  style={
                                    isLastSetCompleted
                                      ? {
                                          shadowColor: "#000000",
                                          shadowOffset: { width: 0, height: 2 },
                                          shadowOpacity: 0.25,
                                          shadowRadius: 4,
                                          elevation: 5,
                                        }
                                      : undefined
                                  }
                                >
                                  <Ionicons name="add" size={28} color="#FFFFFF" />
                                </TouchableOpacity>
                              </View>
                            );
                          })()}
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
            onPress={() => {
              if (!canFinishLoading) return;
              setShowFinalizeModal(true);
            }}
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
            <Text
              className="text-white font-extrabold text-base"
              style={{ includeFontPadding: false }}
            >
              {t("LoadingToVehicle.FinishLoading", "Finish Loading")}
            </Text>
          </TouchableOpacity>

          {/* Add More Items Button */}
          <TouchableOpacity
            disabled={!canAddMoreItems}
            onPress={handleAddMoreItems}
            activeOpacity={0.8}
            className={`w-full h-[50px] rounded-full items-center justify-center ${
              canAddMoreItems ? "bg-[#980775]" : "bg-[#ACB5BE]"
            }`}
            style={
              canAddMoreItems
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
            <Text
              className="text-white font-extrabold text-base"
              style={{ includeFontPadding: false }}
            >
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
        data={filteredCropsData}
        selectedItems={selectedCrop ? [selectedCrop.value] : []}
        onSelect={(selectedValues) => {
          if (selectedValues.length > 0) {
            const found = filteredCropsData.find((c) => c.value === selectedValues[0]);
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

      {/* Scale Select Modal */}
      <ScaleSelectModal
        visible={isScaleSelectModalVisible}
        onClose={() => setIsScaleSelectModalVisible(false)}
      />

      {/* Scale Weight Modal */}
      <ScaleWeightModal
        visible={scaleTarget !== null}
        onClose={() => setScaleTarget(null)}
        onContinue={handleScaleContinue}
        scaleName={scaleStatus.scale?.name || "Budry MFD - 300"}
        tareWeight={
          (() => {
            if (!scaleTarget) return 0;
            const targetGrade = grades.find(
              (g) => g.gradeKey === scaleTarget.gradeKey
            );
            const targetSet = targetGrade?.sets.find(
              (s) => s.id === scaleTarget.setId
            );
            const crateCount = parseInt(targetSet?.crates || "0", 10) || 0;
            const crateWeight = targetSet?.containerTypeWeight ?? 0;
            return crateCount * crateWeight;
          })()
        }
        initialWeight={
          (() => {
            if (!scaleTarget) return 0;
            const targetGrade = grades.find(
              (g) => g.gradeKey === scaleTarget.gradeKey
            );
            const targetSet = targetGrade?.sets.find(
              (s) => s.id === scaleTarget.setId
            );
            return targetSet?.weight ?? 0;
          })()
        }
      />

      {/* Delete Active Set Warning Confirmation Modal */}
      <WarningConfirmation
        visible={setToDelete !== null}
        message={t(
          "LoadingToVehicle.DeleteConfirmation",
          "Are you sure you want to delete added\n{{item}} - {{grade}} - {{set}}?",
          {
            item:
              selectedVariety?.label ||
              selectedCrop?.label ||
              t("LoadingToVehicle.Crop", "Crop"),
            grade: `${t("LoadingToVehicle.Grade", "Grade")}\u00A0${setToDelete?.gradeKey}`,
            set: `${t("LoadingToVehicle.Set", "Set")} ${setToDelete?.setNumber}`,
          }
        )}
        onConfirm={() => {
          if (setToDelete) {
            handleDeleteSet(setToDelete.gradeKey, setToDelete.id);
            setSetToDelete(null);
          }
        }}
        onCancel={() => setSetToDelete(null)}
        confirmText={t("LoadingToVehicle.Delete", "Delete")}
        cancelText={t("LoadingToVehicle.Cancel", "Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* Delete Saved Variety Warning Confirmation Modal */}
      <WarningConfirmation
        visible={varietyToDelete !== null}
        message={t(
          "UnregisteredCropDetails.Are you sure you want to delete previously added",
          "Are you sure you want to delete previously added {{varietyName}} ?",
          {
            varietyName: varietyToDelete?.varietyLabel || "",
          }
        )}
        onConfirm={() => {
          if (varietyToDelete) {
            handleDeleteSavedVariety(varietyToDelete.id);
            setVarietyToDelete(null);
          }
        }}
        onCancel={() => setVarietyToDelete(null)}
        confirmText={t("LoadingToVehicle.Delete", "Delete")}
        cancelText={t("LoadingToVehicle.Cancel", "Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* Delete Saved Grade Warning Confirmation Modal (same as Collection Form) */}
      <WarningConfirmation
        visible={savedGradeToDelete !== null}
        message={t(
          "UnregisteredCropDetails.Are you sure you want to delete grade",
          "Are you sure you want to delete previously added {{varietyName}} - Grade {{grade}} ?",
          {
            varietyName: savedGradeToDelete?.varietyLabel || "",
            grade: savedGradeToDelete?.gradeKey,
          }
        )}
        onConfirm={() => {
          if (savedGradeToDelete) {
            handleDeleteSavedGrade(
              savedGradeToDelete.varietyId,
              savedGradeToDelete.gradeKey
            );
            setSavedGradeToDelete(null);
          }
        }}
        onCancel={() => setSavedGradeToDelete(null)}
        confirmText={t("LoadingToVehicle.Delete", "Delete")}
        cancelText={t("LoadingToVehicle.Cancel", "Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* Clear & Delete Pending Variety Warning Confirmation Modal (same as Collection Form) */}
      <WarningConfirmation
        visible={clearAndDeleteModalVisible}
        message={t(
          "UnregisteredCropDetails.DeleteVarietyConfirmation",
          "Are you sure you want to delete {{varietyName}} form data?",
          {
            varietyName: `${t("LoadingToVehicle.Variety", "variety").toLowerCase()} ${varietyIndex}`,
          }
        )}
        onConfirm={() => {
          setClearAndDeleteModalVisible(false);
          handleClearAndDeletePending();
        }}
        onCancel={() => setClearAndDeleteModalVisible(false)}
        confirmText={t("LoadingToVehicle.Delete", "Delete")}
        cancelText={t("LoadingToVehicle.Cancel", "Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />

      {/* Finalize Confirmation Modal */}
      <FinalizeConfirmationModal
        visible={showFinalizeModal}
        title={t("Common.ReadyToFinalize", "Ready to Finalize?")}
        message={t(
          "LoadingToVehicle.FinalizeMessage",
          "Please review your loading details again before finalize."
        )}
        confirmText={t("LoadingToVehicle.ConfirmLoading", "Confirm Loading")}
        cancelText={t("Common.NoGoBack", "No, Go back")}
        onConfirm={() => {
          setShowFinalizeModal(false);
          handleFinishLoading();
        }}
        onCancel={() => setShowFinalizeModal(false)}
      />
    </KeyboardAvoidingView>
  );
}