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
import DropDownPicker from "react-native-dropdown-picker";
import LottieView from "lottie-react-native";

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
  const [open, setOpen] = useState(false);
  const [vopen, setVopen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobRole, setJobRole] = useState<string | null>(null);

  const { t, i18n } = useTranslation();
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

  // Fetch job role from AsyncStorage
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
    setOpen(false);
    setVopen(false);
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
    }, [resetForm])
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
        }
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

  useEffect(() => {
    if (vopen && !selectedCrop) {
      Alert.alert(t("Error.error"), "Please select crop first");
    }
  }, [vopen]);

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
        }
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

  // Handle navigation based on job role
  const handleSearch = () => {
    if (selectedCrop && selectedVariety) {
      setLoading(true);
      const cropName =
        cropOptions.find((option) => option.value === selectedCrop)?.label || "";
      const varietyName =
        varietyOptions.find((option) => option.value === selectedVariety)?.label || "";

      // Navigate based on job role
      if (jobRole === "Collection Centre Manager") {
     navigation.navigate("PriceChartManager", {
          cropName: cropName,
          varietyId: selectedVariety,
          varietyName: varietyName,
        });
      } else {
        // For Distribution Officer, Distribution Centre Manager, and other roles
        
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
        [{ text: t("SearchPrice.OK") }]
      );
    }
  };

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
            source={require("../../assets/images/New/Searchcrop.png")}
            className="w-64 h-40 mb-6 mt-8"
            resizeMode="contain"
          />

          {/* Crop Name Dropdown */}
          <View className="w-full mb-4" style={{ zIndex: 3000 }}>
            <Text className="text-base mb-2 text-center">
              {t("SearchPrice.Crop")}
            </Text>
            {loadingCrops ? (
              <ActivityIndicator size="small" color="#2AAD7A" />
            ) : (
              <DropDownPicker
                open={open}
                value={selectedCrop}
                items={cropOptions}
                setOpen={setOpen}
                setValue={(value) => {
                  setSelectedCrop(value);
                  if (!value) {
                    setSelectedVariety(null);
                  }
                }}
                setItems={setCropOptions}
                placeholder={t("SearchPrice.SelectCrop")}
                style={{
                  backgroundColor: "#F4F4F4",
                  borderColor: "#F4F4F4",
                  borderRadius: 25
                }}
                placeholderStyle={{ color: "#9CA3AF" }}
                textStyle={{
                  color: "#000",
                }}
                dropDownContainerStyle={{
                  borderColor: "#CFCFCF",
                  maxHeight: 200,
                }}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                zIndex={3000}
                zIndexInverse={1000}
              />
            )}
          </View>

          {/* Variety Dropdown */}
          <View className="w-full mb-8" style={{ zIndex: 1000 }}>
            <Text className="text-base mb-2 text-center">
              {t("SearchPrice.Variety")}
            </Text>
            {loadingVarieties ? (
              <ActivityIndicator size="small" color="#2AAD7A" />
            ) : (
              <DropDownPicker
                open={vopen}
                value={selectedVariety}
                items={varietyOptions}
                setOpen={setVopen}
                setValue={setSelectedVariety}
                setItems={setVarietyOptions}
                placeholder={t("SearchPrice.SelectVariety")}
                placeholderStyle={{ color: "#9CA3AF" }}
                style={{
                  backgroundColor: "#F4F4F4",
                  borderColor: "#F4F4F4",
                  borderRadius: 25
                }}
                textStyle={{
                  color: "#000",
                }}
                dropDownContainerStyle={{
                  borderColor: "#CFCFCF",
                  maxHeight: 200,
                }}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                zIndex={1000}
                zIndexInverse={3000}
              />
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
    </KeyboardAvoidingView>
  );
};

export default SearchPriceScreen;