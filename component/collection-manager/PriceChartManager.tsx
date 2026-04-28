import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  BackHandler,
} from "react-native";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type PriceChartManagerNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PriceChartManager"
>;

interface PriceChartManagerProps {
  navigation: PriceChartManagerNavigationProp;
  route: any;
}

interface PriceItem {
  grade: string;
  price: string;
  originalPrice?: string;
  isValid?: boolean;
}

const PriceChartManager: React.FC<PriceChartManagerProps> = ({
  navigation,
  route,
}) => {
  const { varietyId, cropName, varietyName } = route.params;

  const [priceData, setPriceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedPrices, setEditedPrices] = useState<PriceItem[]>([]);
  const [isEditable, setIsEditable] = useState(false);
  const { t } = useTranslation();
  const [buttonText, setButtonText] = useState(t("PriceChart.Edit Price"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const PRICE_RANGE = 15;

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");

      if (token) {
        const response = await api.get(
          `api/unregisteredfarmercrop/unitPrices/${varietyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const pricesWithOriginal = response.data.map((item: any) => ({
          ...item,
          originalPrice: item.price,
          isValid: true,
        }));

        setPriceData(pricesWithOriginal);
        setEditedPrices(pricesWithOriginal);
      } else {
        setError(t("Error.Failed to fetch prices"));
      }
    } catch (error) {
      setError(t("Error.Failed to fetch prices"));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPrices();
    }, [varietyId]),
  );

  const validatePrice = (newPrice: string, originalPrice: string): boolean => {
    const newPriceNum = parseFloat(newPrice);
    const originalPriceNum = parseFloat(originalPrice);

    if (isNaN(newPriceNum) || isNaN(originalPriceNum)) {
      return false;
    }

    const minPrice = originalPriceNum - PRICE_RANGE;
    const maxPrice = originalPriceNum + PRICE_RANGE;

    return newPriceNum >= minPrice && newPriceNum <= maxPrice;
  };

  const getAllowedRange = (originalPrice: string): string => {
    const originalPriceNum = parseFloat(originalPrice);
    if (isNaN(originalPriceNum)) return "";

    const minPrice = (originalPriceNum - PRICE_RANGE).toFixed(2);
    const maxPrice = (originalPriceNum + PRICE_RANGE).toFixed(2);

    return t("PriceChart.AllowedRange", { minPrice, maxPrice });
  };

  const handlePriceChange = (index: number, newPrice: string) => {
    const sanitized = newPrice.replace(/[^0-9.]/g, "");

    const parts = sanitized.split(".");
    const cleanedPrice =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : sanitized;

    const updatedPrices = [...editedPrices];
    const originalPrice =
      updatedPrices[index].originalPrice || updatedPrices[index].price;

    const isValid =
      cleanedPrice === "" || validatePrice(cleanedPrice, originalPrice);

    updatedPrices[index] = {
      ...updatedPrices[index],
      price: cleanedPrice,
      isValid: isValid,
    };

    setEditedPrices(updatedPrices);
  };

  const areAllPricesValid = (): boolean => {
    return editedPrices.every(
      (item) =>
        item.isValid !== false &&
        item.price &&
        item.price.trim() !== "" &&
        item.price !== "0",
    );
  };

  useFocusEffect(
    useCallback(() => {
      setIsEditable(false);
      setButtonText(t("PriceChart.Edit Price"));
      setIsSubmitting(false);
      fetchPrices();
    }, [varietyId]),
  );

  const handleButtonClick = async () => {
    if (isEditable) {
      const hasEmptyPrices = editedPrices.some(
        (item) => !item.price || item.price.trim() === "" || item.price === "0",
      );

      if (hasEmptyPrices) {
        Alert.alert(
          t("Error.error"),
          t("Error.Please enter prices for all grades before submitting"),
          [{ text: t("SearchPrice.OK") }],
        );
        return;
      }

      if (!areAllPricesValid()) {
        Alert.alert(
          t("Error.error"),
          "Please ensure all prices are within the allowed range before submitting.",
        );
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      setIsSubmitting(true);

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found.");
        }

        const requestData = editedPrices
          .filter((editedItem, index) => {
            const originalItem = priceData[index];

            const editedPrice = String(editedItem.price).trim();
            const originalPrice = String(originalItem.price).trim();

            return editedPrice !== originalPrice;
          })
          .map((priceItem) => ({
            varietyId,
            grade: priceItem.grade,
            requestPrice: priceItem.price,
          }));

        if (requestData.length === 0) {
          Alert.alert(t("Error.error"), t("Error.No prices to update"));
          setIsSubmitting(false);
          return;
        }

        const response = await api.post(
          "api/auth/marketpricerequest-manager",
          { prices: requestData },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 201) {
          Alert.alert(
            t("Error.Success"),
            t("Error.Price updated successfully"),
            [
              {
                text: t("SearchPrice.OK"),
                onPress: () => {
                  setIsEditable(false);
                  setButtonText(t("PriceChart.Edit Price"));
                  fetchPrices();
                },
              },
            ],
            {
              cancelable: false,
            },
          );
        }
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.response.status === 400
        ) {
          Alert.alert(
            t("Error.error"),
            t(
              "Error.You must change the prices before submitting. Please update the values.",
            ),
          );
        } else {
          console.error("Error submitting price request:", error);
          setError("Failed to submit price update.");
          Alert.alert(
            t("Error.error"),
            t("Error.Failed to submit price update."),
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsEditable(true);
      setButtonText(t("PriceChart.Update"));
    }
  };

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
  };

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("Main" as any, { screen: "SearchPriceScreen" });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <View className="flex-1 bg-whitegray-100">
      {/* Header */}

      <CustomHeader
        title={t("PriceChart.PriceChart")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, { screen: "SearchPriceScreen" })
        }
        textColor="white"
        bgColor="#282828"
        iconBgColor="#FFFFFF1A"
      />

      {/* Content */}
      <ScrollView
        className="flex-1 bg-white"
        style={{ paddingHorizontal: wp(8), paddingVertical: hp(2) }}
      >
        <View className="mb-4">
          <Text className="text-black text-sm mb-1">
            {t("PriceChart.Crop")}
          </Text>
          <TextInput
            className="border border-[#F4F4F4] rounded-full bg-[#F4F4F4] px-4 py-2 text-gray-800 h-[50px]"
            value={cropName}
            editable={false}
          />
        </View>

        <View className="mb-4">
          <Text className="text-black text-sm mb-1">
            {t("PriceChart.Variety")}
          </Text>
          <TextInput
            className="border border-[#F4F4F4] rounded-full px-4 py-2 text-gray-800 bg-[#F4F4F4] h-[50px]"
            value={varietyName}
            editable={false}
          />
        </View>

        {loading && (
          <View className="items-center my-6">
            <ActivityIndicator size="large" color="#2AAD7A" />
          </View>
        )}

        {error && (
          <View className="bg-red-100 p-4 rounded-md mb-6">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        )}

        {priceData.length > 0 && !loading && !error && (
          <View className="mb-6">
            <Text className="text-gray-600 text-sm mb-2">
              {t("PriceChart.UnitGrades")}
            </Text>
            <View className="border border-[#E7E7E7] rounded-lg p-4">
              {priceData.map((priceItem, index) => (
                <View key={index} className="mb-3">
                  <View className="flex-row items-center">
                    <Text className="w-32 text-gray-600">
                      {`${t("PriceChart.Grade")} ${priceItem.grade}`}
                    </Text>
                   
                    <View
                      className="flex-1 flex-row items-center rounded-full px-4 h-[50px]"
                      style={{
                        borderWidth: 1,
                        borderColor: isEditable
                          ? editedPrices[index]?.isValid === false
                            ? "#FF0000"
                            : "#980775"
                          : "#F4F4F4",
                        backgroundColor: "#F4F4F4",
                      }}
                    >
                      <Text className="text-gray-800 mr-1">{t("ReplaceRequestsApprove.Rs")} </Text>
                      <TextInput
                        className="flex-1 text-gray-800"
                        style={{ height: 50, padding: 0 }}
                        value={editedPrices[index]?.price}
                        editable={isEditable}
                        onChangeText={(newPrice) =>
                          handlePriceChange(index, newPrice)
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  {isEditable && editedPrices[index]?.isValid === false && (
                    <Text className="text-red-500 text-xs mt-1 ml-32">
                      {getAllowedRange(
                        editedPrices[index]?.originalPrice || priceItem.price,
                      )}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          className="rounded-[45px] py-3 h-12 mt-4 w-3/4 mx-auto h-[50px] justify-center"
          onPress={handleButtonClick}
          disabled={(isEditable && !areAllPricesValid()) || isSubmitting}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
            height: 50,
            backgroundColor:
              (isEditable && !areAllPricesValid()) || isSubmitting
                ? "#CCCCCC"
                : "#000000",
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-center text-base text-white font-semibold"
            >
              {buttonText}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-[#606060] mt-4 py-3 h-12 rounded-full items-center w-3/4 mx-auto h-[50px] justify-center"
          onPress={() => {
            if (isEditable) {
              setIsEditable(false);
              setButtonText(t("PriceChart.Edit Price"));
              fetchPrices();
            } else {
              navigation.navigate("Main" as any, {
                screen: "SearchPriceScreen",
              });
            }
          }}
          disabled={isSubmitting}
          style={{
            height: 50,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#000000",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-center text-base text-[#606060] font-semibold"
          >
            {isEditable ? t("PriceChart.Cancel") : t("PriceChart.Go")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default PriceChartManager;
