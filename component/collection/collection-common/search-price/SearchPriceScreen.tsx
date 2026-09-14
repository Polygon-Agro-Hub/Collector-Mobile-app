import store from "@/services/reducxStore";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  BackHandler,
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import environment from "../../../../environment/environment";
import { ScrollView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GlobalSearchModal from "@/component/components/popup/GlobalSearchModal";
import CustomHeader from "@/component/components/navigations/CustomHeader";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type CropOption = {
  label: string;
  value: string;
  cropName: string;
};

type SearchPriceScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SearchPriceScreen"
>;

interface SearchPriceScreenProps {
  navigation: SearchPriceScreenNavigationProp;
}

const SearchPriceScreen: React.FC<SearchPriceScreenProps> = ({
  navigation,
}) => {
  const [rawCrops, setRawCrops] = useState<any[]>([]);
  const [rawVarieties, setRawVarieties] = useState<any[]>([]);
  const [cropOptions, setCropOptions] = useState<CropOption[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [selectedVariety, setSelectedVariety] = useState<string | null>(null);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [loadingVarieties, setLoadingVarieties] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [varietyModalVisible, setVarietyModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobRole, setJobRole] = useState<string | null>(null);

  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const getFormattedCropOptions = useCallback(
    (crops: any[]) => {
      const lang = (i18n.language || selectedLanguage || "en").toLowerCase();
      const isSinhala = lang.startsWith("si");
      const isTamil = lang.startsWith("ta");

      return crops.map((crop: any) => {
        const cropName = isSinhala
          ? crop.cropNameSinhala || crop.cropNameEnglish
          : isTamil
          ? crop.cropNameTamil || crop.cropNameEnglish
          : crop.cropNameEnglish || crop.cropNameSinhala || crop.cropNameTamil;

        return {
          label: cropName,
          value: crop.id.toString(),
          cropName: cropName,
        };
      });
    },
    [i18n.language, selectedLanguage],
  );

  const getFormattedVarietyOptions = useCallback(
    (varieties: any[]) => {
      const lang = (i18n.language || selectedLanguage || "en").toLowerCase();
      const isSinhala = lang.startsWith("si");
      const isTamil = lang.startsWith("ta");

      return varieties.map((variety: any) => {
        const varietyName = isSinhala
          ? variety.varietySinhala || variety.varietyEnglish
          : isTamil
          ? variety.varietyTamil || variety.varietyEnglish
          : variety.varietyEnglish || variety.varietySinhala || variety.varietyTamil;

        return {
          label: varietyName,
          value: variety.id.toString(),
        };
      });
    },
    [i18n.language, selectedLanguage],
  );

  const fetchCropNames = useCallback(async () => {
    setLoadingCrops(true);
    try {
      const token = store.getState().auth.token;

      const response = await api.get(
        "api/unregisteredfarmercrop/get-crop-names",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const crops = response.data || [];
      setRawCrops(crops);
      setCropOptions(getFormattedCropOptions(crops));
    } catch (error) {
      console.error("Failed to fetch crop names:", error);
    } finally {
      setLoadingCrops(false);
    }
  }, [getFormattedCropOptions]);

  const fetchLanguagePreference = useCallback(async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      if (lang) {
        setSelectedLanguage(lang);
      }
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  }, []);

  useEffect(() => {
    fetchLanguagePreference();
  }, [fetchLanguagePreference]);

  useEffect(() => {
    const fetchJobRole = async () => {
      try {
        const role = store.getState().auth.jobRole;
        setJobRole(role);
      } catch (error) {
        console.error("Error fetching job role:", error);
      }
    };
    fetchJobRole();
  }, []);

  useEffect(() => {
    if (rawCrops.length > 0) {
      setCropOptions(getFormattedCropOptions(rawCrops));
    }
  }, [rawCrops, getFormattedCropOptions]);

  useEffect(() => {
    if (rawVarieties.length > 0) {
      setVarietyOptions(getFormattedVarietyOptions(rawVarieties));
    }
  }, [rawVarieties, getFormattedVarietyOptions]);

  const resetForm = useCallback(() => {
    setSelectedCrop(null);
    setSelectedVariety(null);
    setRawVarieties([]);
    setVarietyOptions([]);
    setCropModalVisible(false);
    setVarietyModalVisible(false);
    fetchCropNames();
  }, [fetchCropNames]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    resetForm();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [resetForm]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", resetForm);
    return unsubscribe;
  }, [navigation, resetForm]);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      fetchLanguagePreference();
      resetForm();
      return () => {};
    }, [resetForm, fetchLanguagePreference]),
  );

  const handleVarietyModalOpen = () => {
    if (!selectedCrop) {
      Alert.alert(
        t("Error.error"),
        t(
          "SearchPrice.Please select crop first",
          t("Error.Please select crop first", "Please select crop first"),
        ),
        [{ text: t("AlertModal.OK", "OK") }],
      );
      return;
    }
    setVarietyModalVisible(true);
  };

  const fetchVarieties = useCallback(async () => {
    if (!selectedCrop) {
      setRawVarieties([]);
      setVarietyOptions([]);
      setSelectedVariety(null);
      return;
    }

    setLoadingVarieties(true);
    try {
      const token = store.getState().auth.token;
      const response = await api.get(
        `api/unregisteredfarmercrop/crops/varieties/${selectedCrop}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const varieties = response.data || [];
      setRawVarieties(varieties);
      setVarietyOptions(getFormattedVarietyOptions(varieties));
    } catch (error) {
      console.error("Failed to fetch varieties:", error);
    } finally {
      setLoadingVarieties(false);
    }
  }, [selectedCrop, getFormattedVarietyOptions]);

  useEffect(() => {
    fetchVarieties();
  }, [fetchVarieties]);

  const handleSearch = () => {
    if (selectedCrop && selectedVariety) {
      setLoading(true);
      const cropName =
        cropOptions.find((option) => option.value === selectedCrop)?.label ||
        "";
      const varietyName =
        varietyOptions.find((option) => option.value === selectedVariety)
          ?.label || "";

      navigation.navigate("PriceChart", {
        cropName: cropName,
        varietyId: selectedVariety,
        varietyName: varietyName,
      });
    } else {
      setLoading(false);
      Alert.alert(
        t("SearchPrice.Selection Required"),
        t("SearchPrice.Please select both Crop and Variety to continue"),
        [{ text: t("AlertModal.OK", "OK") }],
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (
          jobRole === "Collection Officer" ||
          jobRole === "Collection Centre Manager"
        ) {
          navigation.navigate("CollectionDashboard" as any);
        } else {
          navigation.navigate("Main" as any, { screen: "SearchPriceScreen" });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation, jobRole]),
  );

  const selectedCropLabel =
    cropOptions.find((o) => o.value === selectedCrop)?.label || null;
  const selectedVarietyLabel =
    varietyOptions.find((o) => o.value === selectedVariety)?.label || null;

  if (loadingCrops) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <LottieView
          source={require("../../../../assets/lottie/loading.json")}
          autoPlay
          loop
          style={{ width: 150, height: 150 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <ScrollView
        className="flex-1 px-4 bg-white"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2AAD7A"]}
            tintColor="#2AAD7A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <CustomHeader
          title={t("SearchPrice.SearchPrice")}
          showBackButton={false}
        />

        {/* Centered content after header */}
        <View className="flex-1 mt-20 w-full max-w-[500px] mx-auto">
          <View className="bg-white items-center px-4">
            <Image
              source={require("../../../../assets/images/collection-common/search-crop.webp")}
              className="w-80 h-52 mb-6"
              resizeMode="contain"
            />

            {/* Crop Name Selector */}
            <View className="w-full mb-4">
              <Text
                className="text-base mb-2 text-center"
                style={{ fontSize: 16 }}
              >
                {t("SearchPrice.Crop")}
              </Text>
              <TouchableOpacity
                onPress={() => setCropModalVisible(true)}
                className="w-full flex-row items-center justify-between px-4 rounded-3xl"
                style={{ backgroundColor: "#F4F4F4", height: 50 }}
              >
                <Text
                  className={`${selectedCropLabel ? "text-black" : "text-gray-400"}`}
                  style={{ fontSize: 16 }}
                >
                  {selectedCropLabel || t("SearchPrice.SelectCrop")}
                </Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {/* Variety Selector */}
            <View className="w-full mb-8">
              <Text
                className="text-base mb-2 text-center"
                style={{ fontSize: 16 }}
              >
                {t("SearchPrice.Variety")}
              </Text>
              {loadingVarieties ? (
                <View
                  className="w-full flex-row items-center justify-center px-4 rounded-3xl"
                  style={{ backgroundColor: "#F4F4F4", height: 50 }}
                >
                  <ActivityIndicator size="small" color="#2AAD7A" />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleVarietyModalOpen}
                  className="w-full flex-row items-center justify-between px-4 rounded-3xl"
                  style={{ backgroundColor: "#F4F4F4", height: 50 }}
                >
                  <Text
                    className={`${selectedVarietyLabel ? "text-black" : "text-gray-400"}`}
                    style={{ fontSize: 16 }}
                  >
                    {selectedVarietyLabel || t("SearchPrice.SelectVariety")}
                  </Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={24}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Button */}
            <TouchableOpacity
              className="bg-[#000000] w-full rounded-3xl items-center justify-center mb-4"
              onPress={handleSearch}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
                height: 50,
                borderRadius:30
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  className="text-white font-semibold"
                  style={{ fontSize: 18 }}
                >
                  {t("SearchPrice.Search")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Crop Modal */}
      <GlobalSearchModal
        visible={cropModalVisible}
        onClose={() => setCropModalVisible(false)}
        title={t("SearchPrice.Crop")}
        data={cropOptions}
        selectedItems={selectedCrop ? [selectedCrop] : []}
        onSelect={(items) => {
          const newCrop = items[0] ?? null;
          if (newCrop !== selectedCrop) {
            setSelectedCrop(newCrop);
            setSelectedVariety(null);
          }
        }}
        searchPlaceholder={t("SearchPrice.SelectCrop")}
        multiSelect={false}
      />

      {/* Variety Modal */}
      <GlobalSearchModal
        visible={varietyModalVisible}
        onClose={() => setVarietyModalVisible(false)}
        title={t("SearchPrice.Variety")}
        data={varietyOptions}
        selectedItems={selectedVariety ? [selectedVariety] : []}
        onSelect={(items) => {
          setSelectedVariety(items[0] ?? null);
        }}
        searchPlaceholder={t("SearchPrice.SelectVariety")}
        multiSelect={false}
        isLoading={loadingVarieties}
      />
    </KeyboardAvoidingView>
  );
};

export default SearchPriceScreen;
