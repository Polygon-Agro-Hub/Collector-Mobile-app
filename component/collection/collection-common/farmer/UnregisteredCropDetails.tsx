import store from "@/services/reducxStore";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { Modal } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import Entypo from "react-native-vector-icons/Entypo";
import MdIcons from "react-native-vector-icons/MaterialIcons";
import { MaterialIcons, MaterialCommunityIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "../../../../environment/environment";

import DashedLine from "react-native-dashed-line";
import generateInvoiceNumber from "@/utils/generateInvoiceNumber";
import CameraComponent from "@/utils/CameraComponent";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import { ScaleWeightModal } from "@/component/components/popup/ScaleWeightModal";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import {
  wifiScaleService,
  ScaleStatus,
} from "@/services/scale/wifiScaleService";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

export interface ContainerTypeItem {
  id: number;
  labelName: string;
  weight: number;
}

export interface CrateSet {
  id: string;
  setNumber: number;
  crates: string;
  weight: number | null;
  containerTypeId?: number;
  containerTypeName?: string;
  containerTypeWeight?: number;
  isExpanded: boolean;
}

export interface GradeState {
  gradeKey: "A" | "B" | "C";
  title: string;
  isSelected: boolean;
  sets: CrateSet[];
}

const createInitialSet = (
  gradeKey: "A" | "B" | "C",
  setNumber: number,
  containerType: ContainerTypeItem | null,
): CrateSet => {
  return {
    id: `set-${gradeKey.toLowerCase()}-${setNumber}-${Date.now()}`,
    setNumber,
    crates: "",
    weight: null,
    containerTypeId: containerType?.id,
    containerTypeName: containerType?.labelName,
    containerTypeWeight: containerType?.weight,
    isExpanded: true,
  };
};

const createInitialGrades = (
  defaultContainerType: ContainerTypeItem | null,
): GradeState[] => [
  {
    gradeKey: "A",
    title: "Grade A",
    isSelected: false,
    sets: [],
  },
  {
    gradeKey: "B",
    title: "Grade B",
    isSelected: false,
    sets: [],
  },
  {
    gradeKey: "C",
    title: "Grade C",
    isSelected: false,
    sets: [],
  },
];

interface Crop {
  id: string;
  cropNameEnglish: string;
  cropNameSinhala: string;
  cropNameTamil: string;
}

type UnregisteredCropDetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "UnregisteredCropDetails"
>;
type UnregisteredCropDetailsRouteProp = RouteProp<
  RootStackParamList,
  "UnregisteredCropDetails"
>;

interface UnregisteredCropDetailsProps {
  navigation: UnregisteredCropDetailsNavigationProp;
  route: UnregisteredCropDetailsRouteProp;
}

interface DeleteModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000040",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <View className="bg-white rounded-xl p-6 items-center min-w-[280px] max-w-[320px]">
          <View className="w-10 h-10 bg-[#F6F7F9] rounded-lg justify-center items-center mb-4">
            <Image
              source={require("../../../../assets/images/collection-common/error-center-target.webp")}
              style={{ width: 20, height: 20 }}
            />
          </View>
          <Text className="text-gray-700 text-base text-center leading-6 mb-6">
            {message}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-3 px-5 border border-gray-300 rounded-lg items-center justify-center min-w-[80px]"
              onPress={onCancel}
            >
              <Text className="text-gray-700 text-base font-medium">
                {t("UnregisteredCropDetails.Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 px-5 bg-red-500 rounded-lg items-center justify-center min-w-[80px]"
              onPress={onDelete}
            >
              <Text className="text-white text-base font-medium">
                {t("UnregisteredCropDetails.Delete")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const UnregisteredCropDetails: React.FC<UnregisteredCropDetailsProps> = ({
  navigation,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 134;
  const itemWidth = cardWidth + 10;
  const [cropCount, setCropCount] = useState(1);
  const [isPendingVarietyOpen, setIsPendingVarietyOpen] = useState(true);
  const [cropNames, setCropNames] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [varieties, setVarieties] = useState<{ id: string; variety: string }[]>(
    [],
  );
  const [selectedVariety, setSelectedVariety] = useState<string | null>(null);
  const [unitPrices, setUnitPrices] = useState<{
    [key: string]: number | null;
  }>({ A: null, B: null, C: null });

  const [quantities, setQuantities] = useState<{ [key: string]: string }>({
    A: "",
    B: "",
    C: "",
  });

  const [total, setTotal] = useState<number>(0);
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedVarietyName, setSelectedVarietyName] = useState<string | null>(
    null,
  );
  const [donebutton2visibale, setdonebutton2visibale] = useState(false);
  const [donebutton2disabale, setdonebutton2disabale] = useState(false);
  const [showCameraModels, setShowCameraModels] = useState(false);
  const [addbutton, setaddbutton] = useState(true);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [resetImage, setResetImage] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [usedVarietyIds, setUsedVarietyIds] = useState<string[]>([]);
  const [deletingVariety, setDeletingVariety] = useState<number | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<{
    cropIndex: number;
    grade: string;
  } | null>(null);

  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [varietyModalVisible, setVarietyModalVisible] = useState(false);
  const [loadingVarieties, setLoadingVarieties] = useState(false);

  const [deleteVarietyModal, setDeleteVarietyModal] = useState({
    visible: false,
    index: -1,
    varietyName: "",
  });

  const [deleteGradeModal, setDeleteGradeModal] = useState({
    visible: false,
    cropIndex: -1,
    varietyName: "",
    grade: "A" as "A" | "B" | "C",
  });

  const [isScaleConfigModalVisible, setIsScaleConfigModalVisible] =
    useState(false);
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(
    wifiScaleService.getStatus(),
  );
  const [isWifiOff, setIsWifiOff] = useState(false);

  const [containerTypes, setContainerTypes] =
    useState<ContainerTypeItem[]>([]);
  const [containerSectionWidth, setContainerSectionWidth] = useState(300);
  const [focusedSetId, setFocusedSetId] = useState<string | null>(null);
  const [setToDelete, setSetToDelete] = useState<{
    id: string;
    gradeKey: "A" | "B" | "C";
    gradeTitle: string;
    setNumber: number;
  } | null>(null);

  const [grades, setGrades] = useState<GradeState[]>(() =>
    createInitialGrades(null),
  );

  const [scaleTarget, setScaleTarget] = useState<{
    gradeKey: "A" | "B" | "C";
    setId: string;
  } | null>(null);

  useEffect(() => {
    const fetchContainerTypes = async () => {
      try {
        const token = store.getState().auth.token;
        const res = await axios.get(
          `${environment.API_BASE_URL}api/transport/container-types`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data?.success && Array.isArray(res.data.data)) {
          const types: ContainerTypeItem[] = res.data.data;
          setContainerTypes(types);
          if (types.length > 0) {
            setGrades((prev) =>
              prev.map((g) => ({
                ...g,
                sets: g.sets.map((s) => ({
                  ...s,
                  containerTypeId: s.containerTypeId ?? types[0].id,
                  containerTypeName: s.containerTypeName ?? types[0].labelName,
                  containerTypeWeight: s.containerTypeWeight ?? types[0].weight,
                })),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching container types:", err);
      }
    };
    fetchContainerTypes();
  }, []);

  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkWifi = (state: any) => {
      const isWifi =
        state.isWifiEnabled ??
        (state.type === "wifi" && Boolean(state.isConnected));
      setIsWifiOff(!isWifi);
    };

    NetInfo.fetch().then(checkWifi);
    const unsubNet = NetInfo.addEventListener(checkWifi);
    return () => unsubNet();
  }, []);

  const [images, setImages] = useState<{
    A: string | null;
    B: string | null;
    C: string | null;
  }>({ A: null, B: null, C: null });

  const route = useRoute<UnregisteredCropDetailsRouteProp>();
  const { userId, farmerPhone, farmerLanguage } = route.params;

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSelectedCrop(null);
      setSelectedVariety(null);
      setSelectedVarietyName(null);
      setVarieties([]);
      setUnitPrices({ A: null, B: null, C: null });
      setQuantities({ A: "", B: "", C: "" });
      setGrades(
        createInitialGrades(
          containerTypes.length > 0 ? containerTypes[0] : null,
        ),
      );
      setImages({ A: null, B: null, C: null });
      setTotal(0);
      setCrops([]);
      setUsedVarietyIds([]);
      setCropCount(1);
      setdonebutton2visibale(false);
      setdonebutton2disabale(false);
      setaddbutton(true);
      setShowCameraModels(false);
      setScrollPosition(0);
      setIsAtStart(true);
      setIsAtEnd(false);

      setResetImage(true);
      const timer = setTimeout(() => setResetImage(false), 100);

      NetInfo.fetch().then((state) => {
        const isWifi =
          state.isWifiEnabled ??
          (state.type === "wifi" && Boolean(state.isConnected));
        setIsWifiOff(!isWifi);
      });
      setScaleStatus(wifiScaleService.getStatus());

      return () => clearTimeout(timer);
    }, []),
  );

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const fetchCropNames = async () => {
        try {
          const token = store.getState().auth.token;
          const headers = { Authorization: `Bearer ${token}` };

          const response = await axios.get(
            `${environment.API_BASE_URL}api/unregisteredfarmercrop/get-crop-names`,
            { headers },
          );

          const uniqueCropNames = response.data.reduce(
            (
              acc: { cropNameEnglish: any }[],
              crop: { cropNameEnglish: any },
            ) => {
              if (
                !acc.some(
                  (item) => item.cropNameEnglish === crop.cropNameEnglish,
                )
              ) {
                acc.push(crop);
              }
              return acc;
            },
            [],
          );

          setCropNames(uniqueCropNames);
        } catch (error) {
          console.error("Error fetching crop names:", error);
        }
      };

      fetchCropNames();
    }, []),
  );

  const cropModalData = cropNames.map((crop) => ({
    label:
      selectedLanguage === "si"
        ? crop.cropNameSinhala
        : selectedLanguage === "ta"
          ? crop.cropNameTamil
          : crop.cropNameEnglish,
    value: crop.id,
  }));

  const varietyModalData = varieties
    .filter((v) => !usedVarietyIds.includes(v.id))
    .map((v) => ({ label: v.variety, value: v.id }));

  const scrollToNext = () => {
    if (scrollViewRef.current) {
      const newPosition = scrollPosition + itemWidth;
      scrollViewRef.current.scrollTo({ x: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const scrollToPrevious = () => {
    if (scrollViewRef.current) {
      const newPosition = scrollPosition - itemWidth;
      scrollViewRef.current.scrollTo({ x: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const onScroll = (event: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    setScrollPosition(contentOffsetX);
    const currentIndex = Math.round(contentOffsetX / itemWidth);
    const safeCurrentIndex = Math.max(
      0,
      Math.min(currentIndex, crops.length - 1),
    );
    setIsAtStart(safeCurrentIndex === 0);
    setIsAtEnd(safeCurrentIndex === crops.length - 1);
  };

  const handleCropChange = async (crop: Crop) => {
    setSelectedCrop({
      id: crop.id,
      name:
        selectedLanguage === "si"
          ? crop.cropNameSinhala
          : selectedLanguage === "ta"
            ? crop.cropNameTamil
            : crop.cropNameEnglish,
    });

    setSelectedVariety(null);
    setUnitPrices({ A: null, B: null, C: null });
    setQuantities({ A: "", B: "", C: "" });
    setGrades(
      createInitialGrades(
        containerTypes.length > 0 ? containerTypes[0] : null,
      ),
    );
    setLoadingVarieties(true);

    try {
      const token = store.getState().auth.token;
      const headers = { Authorization: `Bearer ${token}` };

      const varietiesResponse = await api.get(
        `api/unregisteredfarmercrop/crops/varieties/${crop.id}`,
        { headers },
      );

      if (varietiesResponse.data && Array.isArray(varietiesResponse.data)) {
        setVarieties(
          varietiesResponse.data.map(
            (variety: {
              id: string;
              varietyEnglish: string;
              varietySinhala: string;
              varietyTamil: string;
            }) => ({
              id: variety.id,
              variety:
                selectedLanguage === "si"
                  ? variety.varietySinhala
                  : selectedLanguage === "ta"
                    ? variety.varietyTamil
                    : variety.varietyEnglish,
            }),
          ),
        );
      } else {
        console.error("Varieties response is not an array or is empty.");
      }
    } catch (error) {
      console.error("Error fetching varieties:", error);
    } finally {
      setLoadingVarieties(false);
    }
  };

  const handleVarietyChange = async (varietyId: string) => {
    setSelectedVariety(varietyId);
    setQuantities({ A: "", B: "", C: "" });
    setGrades(
      createInitialGrades(
        containerTypes.length > 0 ? containerTypes[0] : null,
      ),
    );
    const found = varieties.find((variety) => variety.id === varietyId);
    if (found) {
      setSelectedVarietyName(found.variety);
    }

    try {
      const token = store.getState().auth.token;
      const pricesResponse = await api.get(
        `api/unregisteredfarmercrop/unitPrices/${varietyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (pricesResponse.status === 404) {
        Alert.alert(
          t("Error.No Prices Available"),
          t("Error.Prices for the selected variety were not found."),
        );
        setUnitPrices({});
        return;
      }

      if (pricesResponse.data && pricesResponse.data.length === 0) {
        Alert.alert(
          t("Error.No Prices Available"),
          t("Error.No prices are available for the selected variety."),
        );
        setUnitPrices({});
        return;
      }

      const prices = pricesResponse.data.reduce((acc: any, curr: any) => {
        acc[curr.grade] = curr.price;
        return acc;
      }, {});

      setUnitPrices(prices);
      setShowCameraModels(true);
      calculateTotal();
    } catch (error) {
      console.error("Error fetching unit prices for selected variety:", error);
      Alert.alert(t("Error.error"), t("Error.no any prices found"));
    }
  };

  // Synchronize quantities with selected grades and sets
  const syncQuantities = (updatedGrades: GradeState[]) => {
    const newQuantities: { [key: string]: string } = { A: "", B: "", C: "" };
    updatedGrades.forEach((g) => {
      if (g.isSelected) {
        const sumWeight = g.sets.reduce((sum, s) => sum + (s.weight || 0), 0);
        newQuantities[g.gradeKey] = sumWeight > 0 ? sumWeight.toFixed(2) : "";
      }
    });
    setQuantities(newQuantities);
  };

  // Toggle grade checkbox
  const handleToggleGrade = (gradeKey: "A" | "B" | "C") => {
    setGrades((prev) => {
      const targetGrade = prev.find((g) => g.gradeKey === gradeKey);
      const willBeSelected = !targetGrade?.isSelected;

      const updated = prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const defaultC =
            containerTypes.length > 0 ? containerTypes[0] : null;
          const newSets =
            g.sets.length === 0
              ? [createInitialSet(gradeKey, 1, defaultC)]
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
      syncQuantities(updated);
      return updated;
    });
  };

  // Add new set to a grade (collapses all other sets across all grades)
  const handleAddSet = (gradeKey: "A" | "B" | "C") => {
    setGrades((prev) => {
      const defaultC =
        containerTypes.length > 0 ? containerTypes[0] : null;

      return prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          const nextSetNumber = g.sets.length + 1;
          const newSet: CrateSet = createInitialSet(
            gradeKey,
            nextSetNumber,
            defaultC,
          );
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
      });
    });
  };

  // Delete a set from a grade
  const handleDeleteSet = (gradeKey: "A" | "B" | "C", setId: string) => {
    setGrades((prev) => {
      const updated = prev.map((g) => {
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
      });
      syncQuantities(updated);
      return updated;
    });
  };

  // Select container type for a specific set
  const handleSelectContainerType = (
    gradeKey: "A" | "B" | "C",
    setId: string,
    cType: ContainerTypeItem,
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
                : s,
            ),
          };
        }
        return g;
      }),
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
    crates: string,
  ) => {
    const sanitized = crates.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setGrades((prev) =>
      prev.map((g) => {
        if (g.gradeKey === gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === setId ? { ...s, crates: sanitized } : s,
            ),
          };
        }
        return g;
      }),
    );
  };

  // Set weight from scale modal (Net Total weight, cannot be 0)
  const handleScaleContinue = (weight: number) => {
    if (!scaleTarget || weight <= 0) {
      setScaleTarget(null);
      return;
    }
    const currentTarget = scaleTarget;
    setScaleTarget(null);
    setGrades((prev) => {
      const updated = prev.map((g) => {
        if (g.gradeKey === currentTarget.gradeKey) {
          return {
            ...g,
            sets: g.sets.map((s) =>
              s.id === currentTarget.setId ? { ...s, weight } : s,
            ),
          };
        }
        return g;
      });
      syncQuantities(updated);
      return updated;
    });
  };

  const handleQuantityChange = (grade: "A" | "B" | "C", value: string) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    const decimalCount = (cleanedValue.match(/\./g) || []).length;
    if (decimalCount > 1) return;

    if (cleanedValue.includes(".")) {
      const parts = cleanedValue.split(".");
      if (parts[1] && parts[1].length > 2) {
        const limitedValue = parts[0] + "." + parts[1].slice(0, 2);
        setQuantities((prev) => ({ ...prev, [grade]: limitedValue }));
        calculateTotal();
        return;
      }
    }

    setQuantities((prev) => ({ ...prev, [grade]: cleanedValue }));
    calculateTotal();
  };

  useEffect(() => {
    calculateTotal();
  }, [unitPrices, quantities]);

  const calculateTotal = () => {
    const totalPrice = Object.keys(unitPrices).reduce((acc, grade) => {
      const price = unitPrices[grade] || 0;
      const quantity = quantities[grade] ? parseFloat(quantities[grade]) : 0;
      return acc + price * quantity;
    }, 0);
    setTotal(totalPrice);
    setaddbutton(totalPrice === 0);
  };

  const handleClearAndDeletePending = () => {
    if (crops.length > 0) {
      const lastIndex = crops.length - 1;
      const lastCrop = crops[lastIndex];

      // Remove last crop from crops array (leaves the carousel)
      const remainingCrops = crops.slice(0, lastIndex);
      setCrops(remainingCrops);

      // Free the varietyId so it can be reselected / edited
      if (lastCrop.varietyId) {
        setUsedVarietyIds((prev) =>
          prev.filter((id) => id !== lastCrop.varietyId),
        );
      }

      // Reopen previous section in the form with all its data
      if (lastCrop.selectedCropObj) {
        setSelectedCrop(lastCrop.selectedCropObj);
      }
      if (lastCrop.varietiesList) {
        setVarieties(lastCrop.varietiesList);
      }
      setSelectedVariety(lastCrop.varietyId || null);
      setSelectedVarietyName(lastCrop.varietyName || null);
      setUnitPrices(
        lastCrop.unitPricesObj || {
          A: lastCrop.gradeAprice,
          B: lastCrop.gradeBprice,
          C: lastCrop.gradeCprice,
        },
      );
      setQuantities(
        lastCrop.quantitiesObj || {
          A: lastCrop.gradeAquan ? String(lastCrop.gradeAquan) : "",
          B: lastCrop.gradeBquan ? String(lastCrop.gradeBquan) : "",
          C: lastCrop.gradeCquan ? String(lastCrop.gradeCquan) : "",
        },
      );
      if (lastCrop.gradesObj) {
        setGrades(lastCrop.gradesObj);
      }
      if (lastCrop.imagesObj) {
        setImages(lastCrop.imagesObj);
      }
      const restoredTotal =
        lastCrop.totalVal ??
        ((lastCrop.gradeAprice || 0) * (lastCrop.gradeAquan || 0) +
          (lastCrop.gradeBprice || 0) * (lastCrop.gradeBquan || 0) +
          (lastCrop.gradeCprice || 0) * (lastCrop.gradeCquan || 0));
      setTotal(restoredTotal);
      setCropCount(crops.length);
      setIsPendingVarietyOpen(true);
      setShowCameraModels(true);
      setaddbutton(false);
    } else {
      resetCropEntry();
      setCropCount(1);
      setIsPendingVarietyOpen(true);
    }
  };

  const incrementCropCount = async () => {
    if (!isPendingVarietyOpen) {
      setIsPendingVarietyOpen(true);
      setCropCount(crops.length + 1);
      resetCropEntry();
      return;
    }

    if (!selectedCrop || !selectedVariety) {
      Alert.alert(
        t("UnregisteredCropDetails.Incomplete Seletcion"),
        t(
          "UnregisteredCropDetails.Please select both a crop and a variety before adding",
        ),
      );
      return;
    }

    if (total === 0) {
      Alert.alert(
        t("Error.error", "Error"),
        t("UnregisteredCropDetails.EnterQuantity", "Please enter quantity for at least one grade"),
      );
      return;
    }

    setaddbutton(true);
    setdonebutton2disabale(false);
    setdonebutton2visibale(true);
    setUsedVarietyIds((prev) => [...prev, selectedVariety]);

    const newCrop = {
      cropId: selectedCrop.id || "",
      varietyId: selectedVariety || "",
      varietyName: selectedVarietyName,
      gradeAprice: unitPrices.A || 0,
      gradeAquan: quantities.A ? parseFloat(quantities.A) : 0,
      gradeBprice: unitPrices.B || 0,
      gradeBquan: quantities.B ? parseFloat(quantities.B) : 0,
      gradeCprice: unitPrices.C || 0,
      gradeCquan: quantities.C ? parseFloat(quantities.C) : 0,
      selectedCropObj: selectedCrop,
      varietiesList: varieties,
      unitPricesObj: unitPrices,
      quantitiesObj: quantities,
      gradesObj: grades,
      imagesObj: images,
      totalVal: total,
    };

    setCrops((prevCrops) => [...prevCrops, newCrop]);
    resetCropEntry();
    setIsPendingVarietyOpen(true);
    setCropCount((prevCount) => prevCount + 1);
  };

  const resetCropEntry = () => {
    setSelectedCrop(null);
    setSelectedVariety(null);
    setUnitPrices({ A: null, B: null, C: null });
    setQuantities({ A: "", B: "", C: "" });
    setGrades(
      createInitialGrades(
        containerTypes.length > 0 ? containerTypes[0] : null,
      ),
    );
    setTotal(0);
    setShowCameraModels(false);
  };

  const hasUnsavedCropDetails = () => {
    const hasQuantities =
      (quantities.A ? parseFloat(quantities.A) : 0) > 0 ||
      (quantities.B ? parseFloat(quantities.B) : 0) > 0 ||
      (quantities.C ? parseFloat(quantities.C) : 0) > 0;
    return selectedCrop !== null || selectedVariety !== null || hasQuantities;
  };

  const refreshCropForms = () => {
    setSelectedCrop(null);
    setSelectedVariety(null);
    setUnitPrices({ A: null, B: null, C: null });
    setQuantities({ A: "", B: "", C: "" });
    setGrades(
      createInitialGrades(
        containerTypes.length > 0 ? containerTypes[0] : null,
      ),
    );
    setTotal(0);
    setCrops([]);
    setdonebutton2visibale(false);
    setdonebutton2disabale(false);
    setaddbutton(true);
    setCropCount(1);
    setIsPendingVarietyOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let finalCrops = [...crops];
      const isCurrentValid = Boolean(selectedCrop && selectedVariety && total > 0);

      if (isPendingVarietyOpen && isCurrentValid) {
        const newCrop = {
          cropId: selectedCrop?.id || "",
          varietyId: selectedVariety || "",
          varietyName: selectedVarietyName || "",
          gradeAprice: Number(unitPrices?.A) || 0,
          gradeAquan: quantities?.A ? parseFloat(quantities.A) || 0 : 0,
          gradeBprice: Number(unitPrices?.B) || 0,
          gradeBquan: quantities?.B ? parseFloat(quantities.B) || 0 : 0,
          gradeCprice: Number(unitPrices?.C) || 0,
          gradeCquan: quantities?.C ? parseFloat(quantities.C) || 0 : 0,
        };
        finalCrops.push(newCrop);
      } else if (isPendingVarietyOpen && hasUnsavedCropDetails()) {
        Alert.alert(
          t("Error.Unsaved Crop Details", "Unsaved Crop Details"),
          t(
            "Error.You have entered crop details but",
            "You have entered crop details that haven't been completed.",
          ),
        );
        return;
      }

      if (finalCrops.length === 0) {
        Alert.alert(
          t("Error.No Crops", "No Crops"),
          t(
            "Error.Please add at least one crop to proceed",
            "Please add at least one crop to proceed",
          ),
        );
        return;
      }

      setLoading(true);

      const token = store.getState().auth.token;
      const invoiceNumber = await generateInvoiceNumber();

      if (!invoiceNumber) {
        setLoading(false);
        Alert.alert(
          t("Error.error", "Error"),
          t(
            "Error.Failed to generate invoice number",
            "Failed to generate invoice number",
          ),
        );
        return;
      }

      let totalPrice = 0;
      finalCrops.forEach((crop) => {
        totalPrice +=
          (Number(crop.gradeAprice) || 0) * (Number(crop.gradeAquan) || 0);
        totalPrice +=
          (Number(crop.gradeBprice) || 0) * (Number(crop.gradeBquan) || 0);
        totalPrice +=
          (Number(crop.gradeCprice) || 0) * (Number(crop.gradeCquan) || 0);
      });

      const payload = {
        farmerId: userId,
        invoiceNumber,
        crops: finalCrops.map((crop) => ({
          varietyId: crop.varietyId || "",
          gradeAprice: crop.gradeAprice || 0,
          gradeAquan: crop.gradeAquan || 0,
          gradeBprice: crop.gradeBprice || 0,
          gradeBquan: crop.gradeBquan || 0,
          gradeCprice: crop.gradeCprice || 0,
          gradeCquan: crop.gradeCquan || 0,
        })),
      };

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post(
        `${environment.API_BASE_URL}api/unregisteredfarmercrop/add-crops`,
        payload,
        config,
      );

      const registeredFarmerId = response?.data?.registeredFarmerId;

      try {
        await sendSMS(farmerLanguage, farmerPhone, totalPrice, invoiceNumber);
      } catch (smsError) {
        console.error("Error sending SMS:", smsError);
      }

      setLoading(false);

      Alert.alert(
        t("BankDetailsUpdate.Success", "Success"),
        t(
          "Error.All crop details submitted successfully!",
          "All crop details submitted successfully!",
        ),
        [
          {
            text: t("UnregisteredCropDetails.OK", "OK"),
            onPress: () => {
              refreshCropForms();
              navigation.navigate("NewReport" as any, {
                userId,
                registeredFarmerId,
              });
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.error("Error submitting crop data:", error);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to submit crop details", "Failed to submit crop details"),
      );
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("FarmerQr", { userId } as any);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const sendSMS = async (
    language: string | null,
    farmerPhone: number,
    totalPrice: number,
    invoiceNumber: string,
  ) => {
    try {
      let formattedPrice = "0.00";
      try {
        formattedPrice = Number(totalPrice || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } catch {
        formattedPrice = (totalPrice || 0).toFixed(2);
      }

      const apiUrl = "https://api.getshoutout.com/coreservice/messages";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      let Message = "";
      let companyName = "";
      if (language === "Sinhala") {
        companyName = store.getState().auth.companyNameSinhala || "PolygonAgro";
        Message = `ඔබේ නිෂ්පාදන ${companyName} වෙත ලබා දීම ගැන ඔබට ස්තූතියි.\nපැය 48ක් ඇතුළත රු. ${formattedPrice} ඔබේ බැංකු ගිණුමට බැර කෙරේ.\nTID: ${invoiceNumber}`;
      } else if (language === "Tamil") {
        companyName = store.getState().auth.companyNameTamil || "PolygonAgro";
        Message = `உங்கள் விளைபொருட்களை ${companyName} நிறுவனத்திற்கு வழங்கியதற்கு நன்றி.\nரூ. ${formattedPrice} 48 மணி நேரத்திற்குள் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.\nTID: ${invoiceNumber}`;
      } else {
        companyName = store.getState().auth.companyNameEnglish || "PolygonAgro";
        Message = `Thank you for providing your produce to ${companyName}.\nRs. ${formattedPrice} will be credited to your bank account within 48 hours.\nTID: ${invoiceNumber}`;
      }

      const body = {
        source: "Polygon",
        destinations: [farmerPhone],
        content: { sms: Message },
        transports: ["sms"],
      };

      await axios.post(apiUrl, body, { headers });
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  };

  const isGradeACameraEnabled = !quantities.A || parseFloat(quantities.A) === 0;
  const isGradeBCameraEnabled = !quantities.B || parseFloat(quantities.B) === 0;
  const isGradeCCameraEnabled = !quantities.C || parseFloat(quantities.C) === 0;

  const deleteVariety = (index: number) => {
    setDeleteVarietyModal({
      visible: true,
      index,
      varietyName: crops[index].varietyName,
    });
  };

  const handleDeleteVariety = () => {
    const { index } = deleteVarietyModal;
    setDeletingVariety(index);
    setDeleteVarietyModal({ visible: false, index: -1, varietyName: "" });

    setTimeout(() => {
      const deletedVarietyId = crops[index].varietyId;
      setUsedVarietyIds((prev) => prev.filter((id) => id !== deletedVarietyId));

      const newCrops = [...crops];
      newCrops.splice(index, 1);
      setCrops(newCrops);

      if (scrollViewRef.current && newCrops.length > 0) {
        const currentIndex = Math.round(scrollPosition / itemWidth);

        if (currentIndex >= newCrops.length && newCrops.length > 0) {
          const newScrollPosition = (newCrops.length - 1) * itemWidth;
          scrollViewRef.current.scrollTo({
            x: newScrollPosition,
            animated: true,
          });
          setScrollPosition(newScrollPosition);
        } else if (index <= currentIndex && currentIndex > 0) {
          const newScrollPosition = (currentIndex - 1) * itemWidth;
          scrollViewRef.current.scrollTo({
            x: newScrollPosition,
            animated: true,
          });
          setScrollPosition(newScrollPosition);
        } else if (newCrops.length === 1) {
          scrollViewRef.current.scrollTo({ x: 0, animated: true });
          setScrollPosition(0);
        }
      }

      if (newCrops.length === 0) {
        setdonebutton2visibale(false);
        setaddbutton(true);
        setScrollPosition(0);
        setIsAtStart(true);
        setIsAtEnd(false);
      }

      setCropCount((prevCount) => prevCount - 1);
      setDeletingVariety(null);
    }, 1000);
  };

  const deleteGrade = (
    cropIndex: number,
    grade: "A" | "B" | "C",
    varietyName: string,
  ) => {
    setDeleteGradeModal({ visible: true, cropIndex, grade, varietyName });
  };

  const handleDeleteGrade = () => {
    const { cropIndex, grade } = deleteGradeModal;
    setDeletingGrade({ cropIndex, grade });
    setDeleteGradeModal({
      visible: false,
      cropIndex: -1,
      grade: "A",
      varietyName: "",
    });

    setTimeout(() => {
      const newCrops = [...crops];
      newCrops[cropIndex][`grade${grade}quan`] = 0;
      newCrops[cropIndex][`grade${grade}price`] = 0;

      const allGradesDeleted = ["A", "B", "C"].every(
        (gradeKey) => newCrops[cropIndex][`grade${gradeKey}quan`] === 0,
      );

      if (allGradesDeleted) {
        const deletedVarietyId = newCrops[cropIndex].varietyId;
        setUsedVarietyIds((prev) =>
          prev.filter((id) => id !== deletedVarietyId),
        );
        newCrops.splice(cropIndex, 1);
        setCrops(newCrops);
        setCropCount((prevCount) => prevCount - 1);

        if (scrollViewRef.current && newCrops.length > 0) {
          const currentIndex = Math.round(scrollPosition / itemWidth);

          if (currentIndex >= newCrops.length && newCrops.length > 0) {
            const newScrollPosition = (newCrops.length - 1) * itemWidth;
            scrollViewRef.current.scrollTo({
              x: newScrollPosition,
              animated: true,
            });
            setScrollPosition(newScrollPosition);
          } else if (cropIndex <= currentIndex && currentIndex > 0) {
            const newScrollPosition = (currentIndex - 1) * itemWidth;
            scrollViewRef.current.scrollTo({
              x: newScrollPosition,
              animated: true,
            });
            setScrollPosition(newScrollPosition);
          } else if (newCrops.length === 1) {
            scrollViewRef.current.scrollTo({ x: 0, animated: true });
            setScrollPosition(0);
          }
        }
      } else {
        setCrops(newCrops);
      }

      if (newCrops.length === 0) {
        setdonebutton2visibale(false);
        setaddbutton(true);
        setScrollPosition(0);
        setIsAtStart(true);
        setIsAtEnd(false);
      }

      setDeletingGrade(null);
    }, 1000);
  };

  const selectedCropLabel = selectedCrop?.name || null;
  const selectedVarietyLabel = selectedVariety
    ? varieties.find((v) => v.id === selectedVariety)?.variety || null
    : null;

  const isCurrentVarietyValid = Boolean(selectedCrop && selectedVariety && total > 0);
  const isAddMoreDisabled = loading || (isPendingVarietyOpen && !isCurrentVarietyValid);
  const isFinishDisabled =
    loading ||
    (crops.length === 0 && !isCurrentVarietyValid) ||
    (isPendingVarietyOpen && !isCurrentVarietyValid);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <ScrollView
        className="flex-1 bg-white mb-8"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
      >
        <View className="w-full ">
          <CustomHeader
            title={t("UnregisteredCropDetails.FillDetails")}
            showBackButton={true}
            navigation={navigation}
            onBackPress={() =>
              navigation.navigate("FarmerQr", { userId } as any)
            }
          />
          <View className="px-6 ">
            {/* ── Scale Status Card ── */}
            {/* State 1: Mobile Wi-Fi Off - #FDF0F1 background, #E91233 text/icon */}
            {
              isWifiOff ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setIsScaleConfigModalVisible(true)}
                  style={{
                    marginTop: 8,
                    marginBottom: 10,
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
                    <MaterialCommunityIcons
                      name="wifi"
                      size={24}
                      color="#E91233"
                    />
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
                      {selectedLanguage === "si"
                        ? "Wi-Fi අක්‍රියයි"
                        : selectedLanguage === "ta"
                          ? "Wi-Fi முடக்கப்பட்டுள்ளது"
                          : "Wi-Fi is Off"}
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
                      {selectedLanguage === "si"
                        ? "ඔබගේ දුරකථනයේ Wi-Fi ක්‍රියාත්මක කරන්න."
                        : selectedLanguage === "ta"
                          ? "உங்கள் தொலைபேசியில் Wi-Fi இயக்கவும்."
                          : "Please turn on Wi-Fi on your phone to connect to the scale."}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : !scaleStatus.connected ? (
                /* State 2: WiFi ON but scale not connected — show blue connect card */
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setIsScaleConfigModalVisible(true)}
                  style={{
                    marginTop: 8,
                    marginBottom: 10,
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
                    <MaterialCommunityIcons
                      name="wifi"
                      size={24}
                      color="#1266FD"
                    />
                  </View>

                  <Text
                    style={{
                      flex: 1,
                      fontSize: 17,
                      fontWeight: "bold",
                      color: "#FFFFFF",
                      letterSpacing: -0.2,
                    }}
                  >
                    {selectedLanguage === "si"
                      ? "තරාදිය සම්බන්ධ කරන්න"
                      : selectedLanguage === "ta"
                        ? "அளவுகோலை இணைக்கவும்"
                        : "Connect Scale"}
                  </Text>

                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              ) : null /* State 3: Scale connected — card hidden */
            }

            {/* ── Added-crops carousel ── */}
            {crops.length > 0 && (
              <View className="mb-2">
                {/* Row: left arrow | scrollable cards | right arrow */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {/* Left arrow – only rendered (and taking space) when there are multiple crops */}
                  {crops.length > 1 ? (
                    <TouchableOpacity
                      onPress={scrollToPrevious}
                      disabled={isAtStart}
                      style={{ paddingRight: 4, opacity: isAtStart ? 0.3 : 1 }}
                    >
                      <Entypo name="chevron-left" size={34} color="#374151" />
                    </TouchableOpacity>
                  ) : (
                    /* Reserve the same width so the card stays centred */
                    <View style={{ width: 38 }} />
                  )}

                  {/* Horizontally scrollable card list */}
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ alignItems: "center" }}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    snapToInterval={itemWidth}
                    decelerationRate="fast"
                    snapToAlignment="center"
                  >
                    {crops.map((crop, index) => {
                      const availableGrades = ["A", "B", "C"].filter(
                        (grade) => crop[`grade${grade}quan`] > 0,
                      );
                      const isVarietyDeleting = deletingVariety === index;

                      return (
                        <View
                          key={index}
                          style={{
                            width: cardWidth,
                            marginHorizontal: 5,
                            padding: 12,
                            opacity: isVarietyDeleting ? 0.6 : 1,
                            backgroundColor: isVarietyDeleting
                              ? "#f5f5f5"
                              : "transparent",
                          }}
                        >
                          {/* Card header: variety name + delete-variety button */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontWeight: "bold",
                                fontSize: 15,
                                flex: 1,
                                marginRight: 8,
                              }}
                              numberOfLines={1}
                            >
                              ({index + 1}){" "}
                              {crop.varietyName.length > 20
                                ? `${crop.varietyName.slice(0, 20)}...`
                                : crop.varietyName}
                            </Text>

                            {isVarietyDeleting ? (
                              <ActivityIndicator size="small" color="#ff0000" />
                            ) : (
                              <TouchableOpacity
                                onPress={() => deleteVariety(index)}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                              >
                                <MdIcons
                                  name="delete"
                                  size={22}
                                  style={{ color: "red" }}
                                />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Grade rows */}
                          <View
                            style={{
                              borderWidth: 1,
                              borderColor: "#d4d4d4",
                              borderRadius: 8,
                            }}
                          >
                            {availableGrades.map((grade, gIndex) => {
                              const isGradeDeleting =
                                deletingGrade?.cropIndex === index &&
                                deletingGrade?.grade === grade;

                              return (
                                <View
                                  key={grade}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderBottomWidth:
                                      gIndex !== availableGrades.length - 1
                                        ? 1
                                        : 0,
                                    borderBottomColor: "#d4d4d4",
                                    opacity: isGradeDeleting ? 0.6 : 1,
                                    backgroundColor: isGradeDeleting
                                      ? "#f5f5f5"
                                      : "transparent",
                                  }}
                                >
                                  {/* Grade label */}
                                  <Text
                                    style={{ fontWeight: "bold", width: 24 }}
                                  >
                                    {grade}
                                  </Text>

                                  {/* Quantity */}
                                  {/* Quantity */}
                                  <Text
                                    style={{
                                      fontWeight: "bold",
                                      flex: 1,
                                      textAlign: "center",
                                    }}
                                  >
                                    {crop[`grade${grade}quan`]}
                                    {t("PassTargetBetweenOfficers.kg")}
                                  </Text>

                                  {/* Delete-grade button / spinner */}
                                  {isGradeDeleting ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="#ff0000"
                                    />
                                  ) : (
                                    <TouchableOpacity
                                      onPress={() =>
                                        deleteGrade(
                                          index,
                                          grade as "A" | "B" | "C",
                                          crop.varietyName,
                                        )
                                      }
                                      hitSlop={{
                                        top: 8,
                                        bottom: 8,
                                        left: 8,
                                        right: 8,
                                      }}
                                    >
                                      <MdIcons
                                        name="delete"
                                        size={22}
                                        style={{ color: "red" }}
                                      />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* Right arrow */}
                  {crops.length > 1 ? (
                    <TouchableOpacity
                      onPress={scrollToNext}
                      disabled={isAtEnd}
                      style={{ paddingLeft: 4, opacity: isAtEnd ? 0.3 : 1 }}
                    >
                      <Entypo name="chevron-right" size={34} color="#000000" />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 38 }} />
                  )}
                </View>

                {/* Dashed separator below the carousel */}
                <View style={{ marginTop: 8, marginBottom: 4, marginHorizontal: -24 }}>
                  <DashedLine dashLength={5} dashGap={4} dashColor="#980775" />
                </View>
              </View>
            )}

            {/* ── Crop entry form ── */}
            {isPendingVarietyOpen && (
              <>
                <Text className="text-center text-xl font-bold mt-2 text-[#0F172A]">
                  {t("UnregisteredCropDetails.Variety", "Variety")} {cropCount}
                </Text>

                {/* Clear & Delete Button */}
                {crops.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleClearAndDeletePending}
                    style={{
                      backgroundColor: "#FEE2E2",
                      borderRadius: 9999,
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      alignSelf: "center",
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FF383C",
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {t("UnregisteredCropDetails.ClearAndDelete", "Clear & Delete")}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View className="mb-6 p-2 pb-6">
              {isPendingVarietyOpen && (
                <>
                  {/* Crop Name Selector */}
              <Text className="text-gray-600 mt-4">
                {t("UnregisteredCropDetails.CropName")}
              </Text>
              <TouchableOpacity
                onPress={() => setCropModalVisible(true)}
                style={{
                  height: 50,
                  backgroundColor: "#F4F4F4",
                  borderRadius: 50,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{
                    color: selectedCropLabel ? "#000" : "#9CA3AF",
                    fontSize: 14,
                    flex: 1,
                    marginRight: 8,
                    lineHeight: 18,
                  }}
                >
                  {selectedCropLabel ||
                    t("UnregisteredCropDetails.Select Crop")}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {/* Variety Selector */}
              <Text className="text-gray-600 mt-4">
                {t("UnregisteredCropDetails.Variety")}
              </Text>
              <TouchableOpacity
                disabled={loadingVarieties}
                onPress={() => {
                  if (!selectedCrop) {
                    Alert.alert(
                      t("Error.error"),
                      t("UnregisteredCropDetails.Select Crop"),
                    );
                    return;
                  }
                  setVarietyModalVisible(true);
                }}
                style={{
                  minHeight: 50,
                  backgroundColor: "#F4F4F4",
                  borderRadius: 25,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: loadingVarieties ? "center" : "space-between",
                  marginTop: 8,
                }}
              >
                {loadingVarieties ? (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="small" color="#980775" />
                  </View>
                ) : (
                  <>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={{
                        color: selectedVarietyLabel ? "#000" : "#9CA3AF",
                        fontSize: 14,
                        flex: 1,
                        marginRight: 8,
                        lineHeight: 18,
                      }}
                    >
                      {selectedVarietyLabel ||
                        t("UnregisteredCropDetails.Select Variety")}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={22}
                      color="#9CA3AF"
                      style={{ alignSelf: "center" }}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* HR line before Grade A */}
              <View style={{ height: 1, backgroundColor: "#747474", marginHorizontal: -32, marginTop: 20 }} />

              {/* Unit Grades */}
              {grades.map((grade) => {
                const price = unitPrices[grade.gradeKey];
                return (
                  <View key={grade.gradeKey}>
                    {/* Grade Header Row (Whole row touchable to toggle) */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => handleToggleGrade(grade.gradeKey)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 14,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
                            <FontAwesome
                              name="check"
                              size={12}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                        <Text style={{ fontWeight: "bold", color: "#0F172A", fontSize: 15 }}>
                          {t("LoadingToVehicle.Grade", "Grade")} {grade.gradeKey}
                        </Text>
                        {price !== null && price !== undefined ? (
                          <Text style={{ fontSize: 14, color: "#475569", fontWeight: "normal", marginLeft: 4 }}>
                            ({t("ReceivedCash.Rs", "Rs.")} {Number(price).toFixed(2)}/{t("PassTargetBetweenOfficers.kg", "kg")})
                          </Text>
                        ) : null}
                      </View>

                      {quantities[grade.gradeKey] ? (
                        <View className="bg-[#FEF08A] px-3 py-1 rounded-full">
                          <Text className="text-xs font-bold text-[#000000]">
                            {quantities[grade.gradeKey]} {t("PassTargetBetweenOfficers.kg", "kg")}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {/* Expanded Grade Crate Sets: Separate Boxes */}
                    {grade.isSelected && (
                      <View className="mt-2 mb-3">
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
                                {/* Set Header Bar */}
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

                                            const itemWidth = Math.max(
                                              80,
                                              Math.floor((containerSectionWidth - 8) / 3),
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

                                    {/* Crates Count Input */}
                                    <TextInput
                                      placeholder={
                                        focusedSetId === set.id
                                          ? ""
                                          : `--${t("LoadingToVehicle.EnterTotalContainers", "Enter Total Containers Here")}--`
                                      }
                                      placeholderTextColor="#000000"
                                      value={set.crates}
                                      onChangeText={(val) =>
                                        handleCratesChange(
                                          grade.gradeKey,
                                          set.id,
                                          val,
                                        )
                                      }
                                      onFocus={() => setFocusedSetId(set.id)}
                                      onBlur={() => setFocusedSetId(null)}
                                      keyboardType="numeric"
                                      textAlign="center"
                                      className="bg-[#EEF2F6] rounded-full h-[50px] px-4 text-base text-[#000000] mb-3"
                                      style={{
                                        textAlign: "center",
                                        textAlignVertical: "center",
                                        includeFontPadding: false,
                                        fontWeight: set.crates ? "bold" : "normal",
                                      }}
                                    />

                                    {/* Weight Row */}
                                    {(() => {
                                      const cratesNum = parseInt(set.crates, 10);
                                      const isCratesValid = !isNaN(cratesNum) && cratesNum > 0;

                                      return (
                                        <View className="flex-row items-center gap-3">
                                          {/* Weight Display Box */}
                                          <TouchableOpacity
                                            disabled={!isCratesValid}
                                            activeOpacity={0.8}
                                            onPress={() =>
                                              setScaleTarget({
                                                gradeKey: grade.gradeKey,
                                                setId: set.id,
                                              })
                                            }
                                            className="flex-1 bg-[#EEF2F6] rounded-full h-[50px] items-center justify-center px-4"
                                          >
                                            <Text
                                              className={`font-bold text-base ${
                                                set.weight !== null
                                                  ? "text-[#0F172A]"
                                                  : "text-[#94A3B8]"
                                              }`}
                                            >
                                              {set.weight !== null
                                                ? `${set.weight.toFixed(2)} ${t("PassTargetBetweenOfficers.kg", "kg")}`
                                                : t("PassTargetBetweenOfficers.kg", "kg")}
                                            </Text>
                                          </TouchableOpacity>

                                          {/* Scale Button */}
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
                                            {set.weight !== null ? (
                                              <MaterialIcons
                                                name="refresh"
                                                size={20}
                                                color="#FFFFFF"
                                              />
                                            ) : (
                                              <MaterialIcons
                                                name="arrow-forward"
                                                size={20}
                                                color="#FFFFFF"
                                              />
                                            )}
                                          </TouchableOpacity>
                                        </View>
                                      );
                                    })()}

                                    {/* Sub Total Box */}
                                    {(() => {
                                      const setWeight = set.weight;
                                      const gradePrice = price !== null && price !== undefined ? Number(price) : null;
                                      const hasSubTotal = setWeight !== null && gradePrice !== null && !isNaN(setWeight) && !isNaN(gradePrice);
                                      const subTotalAmount = hasSubTotal ? (setWeight * gradePrice) : null;

                                      return (
                                        <View
                                          style={{
                                            backgroundColor: "#EEF2F6",
                                            borderRadius: 9999,
                                            height: 50,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginTop: 12,
                                            paddingHorizontal: 16,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 16,
                                              fontWeight: hasSubTotal ? "bold" : "normal",
                                              color: hasSubTotal ? "#0F172A" : "#94A3B8",
                                            }}
                                          >
                                            {hasSubTotal
                                              ? `Rs. ${subTotalAmount!.toLocaleString("en-IN", {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })}`
                                              : `--${t("UnregisteredCropDetails.SubTotal", "Sub Total")}--`}
                                          </Text>
                                        </View>
                                      );
                                    })()}
                                  </View>
                                )}
                              </View>

                              {/* Floating Add Button overlapping bottom border */}
                              {showAddButton && (
                                <TouchableOpacity
                                  activeOpacity={0.8}
                                  onPress={() => handleAddSet(grade.gradeKey)}
                                  disabled={
                                    !set.crates ||
                                    parseInt(set.crates, 10) <= 0 ||
                                    set.weight === null
                                  }
                                  className={`w-10 h-10 rounded-full items-center justify-center absolute -bottom-5 self-center z-10 ${
                                    set.crates &&
                                    parseInt(set.crates, 10) > 0 &&
                                    set.weight !== null
                                      ? "bg-[#000000]"
                                      : "bg-[#A0A4A8]"
                                  }`}
                                  style={{
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3,
                                    elevation: 4,
                                  }}
                                >
                                  <MaterialIcons name="add" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* HR line after each grade */}
                    <View style={{ height: 1, backgroundColor: "#747474", marginHorizontal: -32 }} />
                  </View>
                );
              })}

              {/* ── Grade Total Summary (3 Pills: Grade A, Grade B, Grade C) ── */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
                {/* Grade A */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 }}>
                    {t("UnregisteredCropDetails.GradeA_Rs", "Grade A (Rs.)")}
                  </Text>
                  <View style={{ backgroundColor: "#EEF2F6", height: 46, borderRadius: 9999, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>
                      {!selectedVariety ? "----" : ((unitPrices.A || 0) * (quantities.A ? parseFloat(quantities.A) : 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Grade B */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 }}>
                    {t("UnregisteredCropDetails.GradeB_Rs", "Grade B (Rs.)")}
                  </Text>
                  <View style={{ backgroundColor: "#EEF2F6", height: 46, borderRadius: 9999, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>
                      {!selectedVariety ? "----" : ((unitPrices.B || 0) * (quantities.B ? parseFloat(quantities.B) : 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Grade C */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 6 }}>
                    {t("UnregisteredCropDetails.GradeC_Rs", "Grade C (Rs.)")}
                  </Text>
                  <View style={{ backgroundColor: "#EEF2F6", height: 46, borderRadius: 9999, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>
                      {!selectedVariety ? "----" : ((unitPrices.C || 0) * (quantities.C ? parseFloat(quantities.C) : 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Grand Total Box ── */}
              <View style={{ marginTop: 18 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", textAlign: "left", marginBottom: 8 }}>
                  {t("UnregisteredCropDetails.GrandTotal_Rs", "Grand Total (Rs.)")}
                </Text>
                <View style={{ backgroundColor: "#EEF2F6", height: 50, borderRadius: 9999, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: !selectedVariety ? "#94A3B8" : "#0F172A" }}>
                    {!selectedVariety
                      ? "--Auto Fill--"
                      : `Rs. ${total.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </Text>
                </View>
              </View>
                </>
              )}

              {/* ── Action Buttons: Add More & Finish Collection ── */}
              <TouchableOpacity
                onPress={incrementCropCount}
                disabled={isAddMoreDisabled}
                style={{
                  backgroundColor: isAddMoreDisabled ? "#A0A4A8" : "#000000",
                  borderRadius: 9999,
                  height: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: isPendingVarietyOpen ? 20 : 12,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isAddMoreDisabled ? 0 : 0.25,
                  shadowRadius: 10,
                  elevation: isAddMoreDisabled ? 0 : 6,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>
                  {t("UnregisteredCropDetails.AddMore", "Add More")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isFinishDisabled || loading}
                style={{
                  backgroundColor: isFinishDisabled || loading ? "#A0A4A8" : "#980775",
                  borderRadius: 9999,
                  height: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 12,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isFinishDisabled || loading ? 0 : 0.25,
                  shadowRadius: 10,
                  elevation: isFinishDisabled || loading ? 0 : 6,
                }}
              >
                {loading ? (
                  <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16, marginLeft: 8 }}>
                      {t("UnregisteredCropDetails.Processing...", "Processing...")}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>
                    {t("UnregisteredCropDetails.FinishCollection", "Finish Collection")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <DeleteModal
              visible={deleteVarietyModal.visible}
              title="Confirm Delete"
              message={t(
                "UnregisteredCropDetails.Are you sure you want to delete previously added",
                { varietyName: deleteVarietyModal.varietyName },
              )}
              onCancel={() =>
                setDeleteVarietyModal({
                  visible: false,
                  index: -1,
                  varietyName: "",
                })
              }
              onDelete={handleDeleteVariety}
            />

            <DeleteModal
              visible={deleteGradeModal.visible}
              title={t("UnregisteredCropDetails.ConfirmDelete")}
              message={t(
                "UnregisteredCropDetails.Are you sure you want to delete grade",
                {
                  varietyName: deleteGradeModal.varietyName,
                  grade: deleteGradeModal.grade,
                },
              )}
              onCancel={() =>
                setDeleteGradeModal({
                  visible: false,
                  cropIndex: -1,
                  grade: "A",
                  varietyName: "",
                })
              }
              onDelete={handleDeleteGrade}
            />
          </View>
        </View>
      </ScrollView>

      {/* Crop Modal */}
      <GlobalSearchModal
        visible={cropModalVisible}
        onClose={() => setCropModalVisible(false)}
        title={t("UnregisteredCropDetails.CropName")}
        data={cropModalData}
        selectedItems={selectedCrop ? [selectedCrop.id] : []}
        onSelect={(items) => {
          const id = items[0];
          if (!id) return;
          const found = cropNames.find((c) => c.id === id);
          if (found) handleCropChange(found);
        }}
        searchPlaceholder={t("GlobalSearchModal.SearchPlaceholder")}
        multiSelect={false}
      />

      {/* Variety Modal */}
      <GlobalSearchModal
        visible={varietyModalVisible}
        onClose={() => setVarietyModalVisible(false)}
        title={t("UnregisteredCropDetails.Variety")}
        data={varietyModalData}
        selectedItems={selectedVariety ? [selectedVariety] : []}
        onSelect={(items) => {
          const id = items[0];
          if (id) handleVarietyChange(id);
        }}
        searchPlaceholder={t("GlobalSearchModal.SearchPlaceholder")}
        multiSelect={false}
        isLoading={loadingVarieties}
      />

      {/* Real-time Scale Weight Modal */}
      {(() => {
        const activeGradeObj = grades.find(
          (g) => g.gradeKey === scaleTarget?.gradeKey,
        );
        const activeSetObj = activeGradeObj?.sets.find(
          (s) => s.id === scaleTarget?.setId,
        );
        const activeTareWeight =
          activeSetObj && activeSetObj.crates
            ? (parseInt(activeSetObj.crates, 10) || 0) *
              (activeSetObj.containerTypeWeight ?? 0)
            : 0;

        return (
          <ScaleWeightModal
            visible={!!scaleTarget}
            onClose={() => setScaleTarget(null)}
            initialWeight={activeSetObj?.weight || 0}
            tareWeight={activeTareWeight}
            onContinue={(weight) => {
              handleScaleContinue(weight);
            }}
          />
        );
      })()}

      {/* Delete Set Confirmation Modal */}
      <WarningConfirmation
        visible={!!setToDelete}
        message={t(
          "WeighGrade.DeleteConfirmation",
          "Are you sure you want to delete added\n{{productName}} - {{gradeLabel}} {{grade}} - {{setLabel}} {{setNumber}}?",
          {
            productName: selectedVarietyName || selectedCrop?.name || "",
            gradeLabel: t("LoadingToVehicle.Grade", "Grade"),
            grade: setToDelete?.gradeKey || "",
            setLabel: t("LoadingToVehicle.Set", "Set"),
            setNumber: setToDelete?.setNumber || 1,
          },
        )}
        onCancel={() => setSetToDelete(null)}
        onConfirm={() => {
          if (setToDelete) {
            handleDeleteSet(setToDelete.gradeKey, setToDelete.id);
            setSetToDelete(null);
          }
        }}
      />

      {/* Scale Setup / Connect Bottom Sheet Modal */}
      <ScaleSelectModal
        visible={isScaleConfigModalVisible}
        onClose={() => setIsScaleConfigModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default UnregisteredCropDetails;
