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
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { environment } from "../../environment/environment";
import { ScrollView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import LottieView from "lottie-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import GlobalSearchModal from "../common/GlobalSearchModal";

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

  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language");
        setSelectedLanguage(lang || "en");
      } catch (error) {
        console.error("Error fetching language preference:", error);
      }
    };
    fetchLanguage();
  }, []);

  useEffect(() => {
    const fetchJobRole = async () => {
      try {
        const role = await AsyncStorage.getItem("jobRole");
        setJobRole(role);
      } catch (error) {
        console.error("Error fetching job role:", error);
      }
    };
    fetchJobRole();
  }, []);

  const resetForm = useCallback(() => {
    setSelectedCrop(null);
    setSelectedVariety(null);
    setVarietyOptions([]);
    setCropModalVisible(false);
    setVarietyModalVisible(false);
    fetchCropNames();
  }, []);

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
      resetForm();
      return () => {};
    }, [resetForm]),
  );

  useEffect(() => {
    if (selectedLanguage) {
      fetchCropNames();
    }
  }, [selectedLanguage]);

  const fetchCropNames = async () => {
    setLoadingCrops(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await api.get(
        "api/unregisteredfarmercrop/get-crop-names",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const fetchLanguage = async () => {
        try {
          const lang = await AsyncStorage.getItem("@user_language");
          setSelectedLanguage(lang || "en");
        } catch (error) {
          console.error("Error fetching language preference:", error);
        }
      };
      fetchLanguage();

      const formattedData = response.data.map((crop: any) => {
        let cropName;
        switch (selectedLanguage) {
          case "si":
            cropName = crop.cropNameSinhala;
            break;
          case "ta":
            cropName = crop.cropNameTamil;
            break;
          default:
            cropName = crop.cropNameEnglish;
        }

        return {
          label: cropName,
          value: crop.id.toString(),
          cropName: cropName,
        };
      });

      setCropOptions(formattedData);
    } catch (error) {
      console.error("Failed to fetch crop names:", error);
    } finally {
      setLoadingCrops(false);
    }
  };

  const handleVarietyModalOpen = () => {
    if (!selectedCrop) {
      Alert.alert(t("Error.error"), "Please select crop first");
      return;
    }
    setVarietyModalVisible(true);
  };

  const fetchVarieties = async () => {
    if (!selectedCrop) {
      setVarietyOptions([]);
      setSelectedVariety(null);
      return;
    }

    setLoadingVarieties(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await api.get(
        `api/unregisteredfarmercrop/crops/varieties/${selectedCrop}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const formattedData = response.data.map((variety: any) => {
        let varietyName;
        switch (selectedLanguage) {
          case "si":
            varietyName = variety.varietySinhala;
            break;
          case "ta":
            varietyName = variety.varietyTamil;
            break;
          default:
            varietyName = variety.varietyEnglish;
        }

        return {
          label: varietyName,
          value: variety.id.toString(),
        };
      });

      setVarietyOptions(formattedData);
    } catch (error) {
      console.error("Failed to fetch varieties:", error);
    } finally {
      setLoadingVarieties(false);
    }
  };

  useEffect(() => {
    fetchVarieties();
  }, [selectedCrop]);

  const handleSearch = () => {
    if (selectedCrop && selectedVariety) {
      setLoading(true);
      const cropName =
        cropOptions.find((option) => option.value === selectedCrop)?.label ||
        "";
      const varietyName =
        varietyOptions.find((option) => option.value === selectedVariety)
          ?.label || "";

      if (jobRole === "Collection Centre Manager") {
        navigation.navigate("PriceChartManager", {
          cropName: cropName,
          varietyId: selectedVariety,
          varietyName: varietyName,
        });
      } else {
        navigation.navigate("PriceChart", {
          cropName: cropName,
          varietyId: selectedVariety,
          varietyName: varietyName,
        });
      }
    } else {
      setLoading(false);
      Alert.alert(
        t("SearchPrice.Selection Required"),
        t("SearchPrice.Please select both Crop and Variety to continue"),
        [{ text: t("SearchPrice.OK") }],
      );
    }
  };

  const selectedCropLabel =
    cropOptions.find((o) => o.value === selectedCrop)?.label || null;
  const selectedVarietyLabel =
    varietyOptions.find((o) => o.value === selectedVariety)?.label || null;

  if (loadingCrops) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <LottieView
          source={require("../../assets/lottie/newLottie.json")}
          autoPlay
          loop
          style={{ width: 300, height: 300 }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-white"
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
      >
        <View className="flex-1 bg-white items-center px-6 pt-8">
          <Text className="text-xl font-semibold mb-4">
            {t("SearchPrice.SearchPrice")}
          </Text>
          <Image
            source={require("../../assets/images/collection-common/search-crop.webp")}
            className="w-64 h-40 mb-6 mt-8"
            resizeMode="contain"
          />

          {/* Crop Name Selector */}
          <View className="w-full mb-4">
            <Text className="text-base mb-2 text-center">
              {t("SearchPrice.Crop")}
            </Text>
            <TouchableOpacity
              onPress={() => setCropModalVisible(true)}
              className="w-full flex-row items-center justify-between px-4 py-3 rounded-[25px]"
              style={{ backgroundColor: "#F4F4F4" }}
            >
              <Text
                className={`text-base ${selectedCropLabel ? "text-black" : "text-gray-400"}`}
              >
                {selectedCropLabel || t("SearchPrice.SelectCrop")}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Variety Selector */}
          <View className="w-full mb-8">
            <Text className="text-base mb-2 text-center">
              {t("SearchPrice.Variety")}
            </Text>
            {loadingVarieties ? (
              <View
                className="w-full flex-row items-center justify-center px-4 py-3 rounded-[25px]"
                style={{ backgroundColor: "#F4F4F4" }}
              >
                <ActivityIndicator size="small" color="#2AAD7A" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleVarietyModalOpen}
                className="w-full flex-row items-center justify-between px-4 py-3 rounded-[25px]"
                style={{ backgroundColor: "#F4F4F4" }}
              >
                <Text
                  className={`text-base ${selectedVarietyLabel ? "text-black" : "text-gray-400"}`}
                >
                  {selectedVarietyLabel || t("SearchPrice.SelectVariety")}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Button */}
          <TouchableOpacity
            className="bg-[#000000] w-full py-3 mb-4 rounded-[35px] items-center"
            onPress={handleSearch}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                {t("SearchPrice.Search")}
              </Text>
            )}
          </TouchableOpacity>
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
