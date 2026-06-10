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
} from "react-native";
import { Modal } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import Entypo from "react-native-vector-icons/Entypo";
import MdIcons from "react-native-vector-icons/MaterialIcons";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "../../environment/environment";

import DashedLine from "react-native-dashed-line";
import generateInvoiceNumber from "@/utils/generateInvoiceNumber";
import CameraComponent from "@/utils/CameraComponent";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "../commons/GlobalSearchModal";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

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
              source={require("../../assets/images/collection-common/error-center-target.webp")}
              style={{ width: 20, height: 20 }}
            />
          </View>
          <Text className="text-gray-700 text-base text-center leading-6 mb-6">
            {message}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-3 px-5 border border-gray-300 rounded-lg items-center min-w-[80px]"
              onPress={onCancel}
            >
              <Text className="text-gray-700 text-base font-medium">
                {t("UnregisteredCropDetails.Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 px-5 bg-red-500 rounded-lg items-center min-w-[80px]"
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
  const [cropCount, setCropCount] = useState(1);
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
      setResetImage(false);
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
          const token = await AsyncStorage.getItem("token");
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
      const newPosition = scrollPosition + 220 + 20;
      scrollViewRef.current.scrollTo({ x: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const scrollToPrevious = () => {
    if (scrollViewRef.current) {
      const newPosition = scrollPosition - (220 + 20);
      scrollViewRef.current.scrollTo({ x: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const onScroll = (event: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    setScrollPosition(contentOffsetX);
    const itemWidth = 220 + 20;
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
    setLoadingVarieties(true);

    try {
      const token = await AsyncStorage.getItem("token");
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
    const found = varieties.find((variety) => variety.id === varietyId);
    if (found) {
      setSelectedVarietyName(found.variety);
    }

    try {
      const token = await AsyncStorage.getItem("token");
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

    const numericValue =
      cleanedValue === "" ? 0 : parseFloat(cleanedValue) || 0;

    if (numericValue === 0) {
      setImages((prev) => ({ ...prev, [grade]: null }));
    }

    const gradesWithQuantityButNoImage = (["A", "B", "C"] as const).filter(
      (g) => {
        const otherGradeValue =
          g === grade ? numericValue : parseFloat(quantities[g]) || 0;
        return otherGradeValue > 0 && !images[g] && g !== grade;
      },
    );

    if (gradesWithQuantityButNoImage.length > 0 && numericValue > 0) {
      Alert.alert(
        t("Error.Upload Image First"),
        t("UnregisteredCropDetails.Please upload image for Grade", {
          grade,
          gradesWithQuantityButNoImage: gradesWithQuantityButNoImage[0],
        }),
        [{ text: t("Error.Ok") }],
      );
      return;
    }

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
    if (totalPrice !== 0) setaddbutton(false);
  };

  const incrementCropCount = async () => {
    const missingImages = [];
    if ((quantities.A ? parseFloat(quantities.A) : 0) > 0 && !images.A)
      missingImages.push("Grade A");
    if ((quantities.B ? parseFloat(quantities.B) : 0) > 0 && !images.B)
      missingImages.push("Grade B");
    if ((quantities.C ? parseFloat(quantities.C) : 0) > 0 && !images.C)
      missingImages.push("Grade C");

    if (missingImages.length > 0) {
      Alert.alert(
        t("UnregisteredCropDetails.Images Required"),
        t("UnregisteredCropDetails.Please upload images for", {
          missingImages: missingImages.join(", "),
        }),
      );
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

    setaddbutton(true);
    setSelectedCrop(null);
    setSelectedVariety(null);
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
      imageA: images.A || null,
      imageB: images.B || null,
      imageC: images.C || null,
    };

    setCrops((prevCrops) => [...prevCrops, newCrop]);
    resetCropEntry();
    setCropCount((prevCount) => prevCount + 1);
  };

  const resetCropEntry = () => {
    setSelectedCrop(null);
    setSelectedVariety(null);
    setUnitPrices({ A: null, B: null, C: null });
    setImages({ A: null, B: null, C: null });
    setQuantities({ A: "", B: "", C: "" });
    setShowCameraModels(false);
  };

  const handleImagePick = (
    base64Image: string | null,
    grade: "A" | "B" | "C",
  ) => {
    const quantityValue = quantities[grade] ? parseFloat(quantities[grade]) : 0;
    if (quantityValue <= 0) {
      Alert.alert(
        t("UnregisteredCropDetails.Add Quantity First"),
        t("UnregisteredCropDetails.Please enter quantity", { grade }),
        [{ text: t("Error.Ok") }],
      );
      return;
    }
    setImages((prevImages) => ({ ...prevImages, [grade]: base64Image }));
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
    setImages({ A: null, B: null, C: null });
    setResetImage(true);
    setTotal(0);
    setCrops([]);
    setdonebutton2visibale(false);
    setdonebutton2disabale(false);
    setaddbutton(true);
    setCropCount(1);
  };

  const handleSubmit = async () => {
    if (hasUnsavedCropDetails()) {
      Alert.alert(
        t("Error.Unsaved Crop Details"),
        t("Error.You have entered crop details but"),
        [
          { text: t("Error.No"), style: "cancel" },
          {
            text: t("Error.Yes"),
            style: "default",
            onPress: () => proceedWithSubmit(),
          },
        ],
      );
      return;
    }
    proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      if (crops.length === 0) {
        Alert.alert(
          t("Error.No Crops"),
          t("Error.Please add at least one crop to proceed"),
        );
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const invoiceNumber = await generateInvoiceNumber();

      if (!invoiceNumber) {
        Alert.alert(
          t("Error.error"),
          t("Error.Failed to generate invoice number"),
        );
        return;
      }

      let totalPrice = 0;
      crops.forEach((crop) => {
        totalPrice += crop.gradeAprice * crop.gradeAquan || 0;
        totalPrice += crop.gradeBprice * crop.gradeBquan || 0;
        totalPrice += crop.gradeCprice * crop.gradeCquan || 0;
      });

      setLoading(true);

      const payload = {
        farmerId: userId,
        invoiceNumber,
        crops: crops.map((crop) => ({
          varietyId: crop.varietyId || "",
          gradeAprice: crop.gradeAprice || 0,
          gradeAquan: crop.gradeAquan || 0,
          gradeBprice: crop.gradeBprice || 0,
          gradeBquan: crop.gradeBquan || 0,
          gradeCprice: crop.gradeCprice || 0,
          gradeCquan: crop.gradeCquan || 0,
          imageA: crop.imageA || null,
          imageB: crop.imageB || null,
          imageC: crop.imageC || null,
        })),
      };

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post(
        `${environment.API_BASE_URL}api/unregisteredfarmercrop/add-crops`,
        payload,
        config,
      );

      const { registeredFarmerId } = response.data;

      Alert.alert(
        t("BankDetailsUpdate.Success"),
        t("Error.All crop details submitted successfully!"),
      );
      await sendSMS(farmerLanguage, farmerPhone, totalPrice, invoiceNumber);
      refreshCropForms();
      setLoading(false);
      navigation.navigate("NewReport" as any, { userId, registeredFarmerId });
    } catch (error) {
      console.error("Error submitting crop data:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to submit crop details"));
      setLoading(false);
    } finally {
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
    const formattedPrice = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalPrice);

    try {
      const apiUrl = "https://api.getshoutout.com/coreservice/messages";
      const headers = {
        Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
        "Content-Type": "application/json",
      };

      let Message = "";
      let companyName = "";
      if (language === "Sinhala") {
        companyName =
          (await AsyncStorage.getItem("companyNameSinhala")) || "PolygonAgro";
        Message = `ඔබේ නිෂ්පාදන ${companyName} වෙත ලබා දීම ගැන ඔබට ස්තූතියි.\nපැය 48ක් ඇතුළත රු. ${formattedPrice} ඔබේ බැංකු ගිණුමට බැර කෙරේ.\nTID: ${invoiceNumber}`;
      } else if (language === "Tamil") {
        companyName =
          (await AsyncStorage.getItem("companyNameTamil")) || "PolygonAgro";
        Message = `உங்கள் விளைபொருட்களை ${companyName} நிறுவனத்திற்கு வழங்கியதற்கு நன்றி.\nரூ. ${formattedPrice} 48 மணி நேரத்திற்குள் உங்கள் வங்கிக் கணக்கில் வரவு வைக்கப்படும்.\nTID: ${invoiceNumber}`;
      } else {
        companyName =
          (await AsyncStorage.getItem("companyNameEnglish")) || "PolygonAgro";
        Message = `Thank you for providing your produce to ${companyName}.\nRs. ${formattedPrice} will be credited to your bank account within 48 hours.\nTID: ${invoiceNumber}`;
      }

      const body = {
        source: "PolygonAgro",
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
        const itemWidth = 220 + 20;
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
      newCrops[cropIndex][`image${grade}`] = null;

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
          const itemWidth = 220 + 20;
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1 ,backgroundColor:'white' }}
    >
      <ScrollView
        className="flex-1 bg-white mb-8"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
      >
        <View className="w-full max-w-[500px]">
          <CustomHeader
            title={t("UnregisteredCropDetails.FillDetails")}
            showBackButton={true}
            navigation={navigation}
            onBackPress={() =>
              navigation.navigate("FarmerQr", { userId } as any)
            }
          />
          <View className="px-6 ">
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
                    snapToInterval={220 + 10}
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
                            width: 220,
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
<Text style={{ fontWeight: "bold", flex: 1, textAlign: "center" }}>
  {crop[`grade${grade}quan`]}kg
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
                <View style={{ marginTop: 8, marginBottom: 4 }}>
                  <DashedLine dashLength={5} dashGap={4} dashColor="#980775" />
                </View>
              </View>
            )}

            {/* ── Crop entry form ── */}
            <Text className="text-center text-md font-medium mt-2">
              {t("UnregisteredCropDetails.Crop")} {cropCount}
            </Text>

            <View className="mb-6 p-2 pb-6">
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
                  style={{
                    color: selectedCropLabel ? "#000" : "#9CA3AF",
                    fontSize: 14,
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
                {loadingVarieties ? (
                  <ActivityIndicator size="small" color="#2AAD7A" />
                ) : (
                  <Text
                    style={{
                      color: selectedVarietyLabel ? "#000" : "#9CA3AF",
                      fontSize: 14,
                    }}
                  >
                    {selectedVarietyLabel ||
                      t("UnregisteredCropDetails.Select Variety")}
                  </Text>
                )}
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {/* Unit Grades */}
              <Text className="text-gray-600 mt-4">
                {t("UnregisteredCropDetails.UnitGrades")}
              </Text>
              <View className="border border-gray-300 rounded-lg mt-2 p-4">
                {["A", "B", "C"].map((grade) => (
                  <View key={grade} className="flex-row items-center mb-3">
                    <Text className="w-8 text-gray-600">{grade}</Text>
                    <TextInput
                      placeholder="Rs."
                      keyboardType="numeric"
                      className="flex-1 rounded-full p-2 mx-2 text-gray-600 bg-[#F4F4F4] text-center"
                      value={unitPrices[grade]?.toString() || ""}
                      editable={false}
                    />
                    <TextInput
                      placeholder="kg"
                      keyboardType="decimal-pad"
                      className="flex-1 rounded-full p-2 mx-2 text-gray-600 bg-[#F4F4F4] text-center"
                      value={quantities[grade]}
                      onChangeText={(value) =>
                        handleQuantityChange(grade as "A" | "B" | "C", value)
                      }
                      autoComplete="off"
                      importantForAutofill="no"
                      autoCorrect={false}
                    />
                  </View>
                ))}
              </View>

              {showCameraModels && (
                <View className="flex-row items-center justify-between">
                  <CameraComponent
                    onImagePicked={(image) => handleImagePick(image, "A")}
                    grade="A"
                    resetImage={resetImage}
                    disabled={isGradeACameraEnabled}
                  />
                  <CameraComponent
                    onImagePicked={(image) => handleImagePick(image, "B")}
                    grade="B"
                    resetImage={resetImage}
                    disabled={isGradeBCameraEnabled}
                  />
                  <CameraComponent
                    onImagePicked={(image) => handleImagePick(image, "C")}
                    grade="C"
                    resetImage={resetImage}
                    disabled={isGradeCCameraEnabled}
                  />
                </View>
              )}

              <Text className="text-gray-600 mt-4">
                {t("UnregisteredCropDetails.Total")}
              </Text>
              <View className="bg-[#F4F4F4] h-[50px] items-center justify-center rounded-full mt-2 ">
                <TextInput
                  placeholder="--Auto Fill--"
                  editable={false}
                  value={` ${total.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  className="text-gray-600 text-center"
                />
              </View>

              <TouchableOpacity
                onPress={incrementCropCount}
                disabled={addbutton || loading}
                className={`bg-[#000000] rounded-full h-[50px] p-4 mt-4 ${addbutton || loading ? "opacity-25" : ""}`}
                style={{
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text className="text-center text-white font-semibold text-base">
                  {t("UnregisteredCropDetails.Add")}
                </Text>
              </TouchableOpacity>

              {donebutton2visibale && (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={donebutton2disabale || loading}
                  className={`bg-[#980775] rounded-full p-4 mt-4  ${donebutton2disabale || loading ? "opacity-50" : ""}`}
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  {loading ? (
                    <View className="flex-row justify-center items-center">
                      <LottieView
                        source={require("../../assets/lottie/loading.json")}
                        autoPlay
                        loop
                        style={{ width: 30, height: 30 }}
                      />
                      <Text className="text-center text-white font-semibold ml-2 text-base">
                        {t("UnregisteredCropDetails.Processing...")}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-center text-white font-semibold text-base">
                      {t("UnregisteredCropDetails.Done")}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
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
        searchPlaceholder={t("search")}
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
        searchPlaceholder={t("search")}
        multiSelect={false}
        isLoading={loadingVarieties}
      />
    </KeyboardAvoidingView>
  );
};

export default UnregisteredCropDetails;
