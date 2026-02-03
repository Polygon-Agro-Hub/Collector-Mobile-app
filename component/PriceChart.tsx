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
import { RootStackParamList } from "./types";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type PriceChartNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PriceChart"
>;

interface PriceChartProps {
  navigation: PriceChartNavigationProp;
  route: any;
}

const PriceChart: React.FC<PriceChartProps> = ({ navigation, route }) => {
  const { varietyId, cropName, varietyName } = route.params;

  const [priceData, setPriceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedPrices, setEditedPrices] = useState<any[]>([]);
  const [isEditable, setIsEditable] = useState(false);
  const { t } = useTranslation();
  const [buttonText, setButtonText] = useState(
    t("PriceChart.Request Price Update"),
  );

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

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

        // Deep clone the data to avoid reference issues
        const originalData = response.data.map((item: any) => ({
          ...item,
          price: String(item.price).trim(),
        }));

        setPriceData(originalData);
        setEditedPrices(JSON.parse(JSON.stringify(originalData))); // Deep clone
      } else {
        setError(t("Error.Failed to fetch prices"));
        console.log("Token not found");
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

  const handlePriceChange = (index: number, newPrice: string) => {
    const cleanedPrice = newPrice.replace(/[^0-9.]/g, "");
    const updatedPrices = [...editedPrices];
    updatedPrices[index].price = cleanedPrice;
    setEditedPrices(updatedPrices);
  };

  console.log("cropp", cropName);
  console.log("verity", varietyName);

  // Add this to reset the state when the component is focused
  useFocusEffect(
    useCallback(() => {
      // Reset button states
      setIsEditable(false);
      setButtonText(t("PriceChart.Request Price Update"));

      // Fetch prices (your existing code)
      fetchPrices();
    }, [varietyId]),
  );

  const handleButtonClick = async () => {
    if (isEditable) {
      // Check if any price fields are empty
      const hasEmptyPrices = editedPrices.some(
        (item) => !item.price || item.price.trim() === "" || item.price === "0",
      );

      if (hasEmptyPrices) {
        Alert.alert(
          t("Error.error"),
          t("Error.Please enter prices for all grades before submitting"),
        );
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found.");
        }

        // Only send prices that have been changed
        const requestData = editedPrices
          .filter((editedItem, index) => {
            const originalItem = priceData[index];
            // Convert both to strings and trim to ensure proper comparison
            const editedPrice = String(editedItem.price).trim();
            const originalPrice = String(originalItem.price).trim();
            console.log(
              `Comparing Grade ${editedItem.grade}: edited="${editedPrice}" vs original="${originalPrice}"`,
            );
            return editedPrice !== originalPrice;
          })
          .map((priceItem) => ({
            varietyId,
            grade: priceItem.grade,
            requestPrice: priceItem.price,
          }));

        console.log("request data", requestData);
        console.log("Number of changed prices:", requestData.length);

        if (requestData.length === 0) {
          Alert.alert(t("Error.error"), t("Error.No prices to update"));
          return;
        }

        // Send the price update request
        const response = await api.post(
          "api/auth/marketpricerequest",
          { prices: requestData },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        // Handle success response
        if (response.status === 201) {
          Alert.alert(
            t("Error.Success"),
            t("Error.The price request was sent successfully"),
          );
          await fetchPrices(); // Refetch prices after submitting
          setIsEditable(false);
          setButtonText(t("PriceChart.Request Price Update"));
        }
      } catch (error) {
        // Check if error status is 400 and show the message to update prices
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
          console.log("Error:", error.response.data.message);
        } else {
          console.error("Error submitting price request:", error);
          setError("Failed to submit price update.");
          Alert.alert(
            t("Error.error"),
            t("Error.Failed to submit price update."),
          );
        }
      }
    } else {
      setIsEditable(true);
      setButtonText(t("PriceChart.Submit Request"));
    }
  };

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14, // Smaller text size for Sinhala
        lineHeight: 20, // Space between lines
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
      <View
        className="bg-[#313131] h-20 flex-row items-center"
        style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Main" as any, { screen: "SearchPriceScreen" })
          }
          className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
        >
          <AntDesign name="left" size={24} color="#000502" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold text-center flex-1 mr-[5%]">
          {t("PriceChart.PriceChart")}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-white"
        style={{ paddingHorizontal: wp(8), paddingVertical: hp(2) }}
      >
        <View className="mb-4 ">
          <Text className="text-black text-sm mb-1">
            {t("PriceChart.Crop")}
          </Text>
          <TextInput
            className="border border-[#F4F4F4] rounded-full bg-[#F4F4F4] px-4 py-2 text-gray-800 "
            value={cropName}
            editable={false}
          />
        </View>

        <View className="mb-4 ">
          <Text className="text-black text-sm mb-1">
            {t("PriceChart.Variety")}
          </Text>
          <TextInput
            className="border border-[#F4F4F4] rounded-full px-4 py-2 text-gray-800 bg-[#F4F4F4]"
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
                <View key={index} className="flex-row items-center mb-3">
                  {/* <Text className="w-32 text-gray-600">{`Grade ${priceItem.grade}`}</Text> */}
                  <Text className="w-32 text-gray-600">
                    {`${t("PriceChart.Grade")} ${priceItem.grade}`} Rs.
                  </Text>
                  <TextInput
                    className="flex-1 rounded-full px-4 py-2 text-gray-800"
                    style={{
                      borderWidth: 1,
                      borderColor: isEditable ? "#980775" : "#F4F4F4",
                      backgroundColor: "#F4F4F4",
                    }}
                    value={editedPrices[index]?.price}
                    editable={isEditable}
                    onChangeText={(newPrice) =>
                      handlePriceChange(index, newPrice)
                    }
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          className="bg-[#000000] rounded-[45px] py-3 h-12 mt-4 w-3/4 mx-auto"
          onPress={handleButtonClick}
        >
          <Text
            style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
            className="text-center text-base text-white font-semibold"
          >
            {buttonText}
          </Text>
        </TouchableOpacity>

        {/* Secondary Button - Changes based on state */}
        <TouchableOpacity
          className="border border-[#606060] mt-4 py-3 h-12 rounded-full items-center w-3/4 mx-auto"
          onPress={() => {
            if (isEditable) {
              // If in edit mode, this acts as "Cancel"
              setIsEditable(false);
              setButtonText(t("PriceChart.Request Price Update"));
              fetchPrices();
            } else {
              // If not in edit mode, this acts as "Go Back"
              navigation.navigate("Main" as any, {
                screen: "SearchPriceScreen",
              });
            }
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

export default PriceChart;
