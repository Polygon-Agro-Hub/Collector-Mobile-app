import store from "@/services/reducxStore";
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
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";

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
      const token = store.getState().auth.token;

      if (token) {
        const response = await api.get(
          `api/unregisteredfarmercrop/unitPrices/${varietyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const originalData = response.data.map((item: any) => ({
          ...item,
          price: String(item.price).trim(),
        }));

        setPriceData(originalData);
        setEditedPrices(JSON.parse(JSON.stringify(originalData)));
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

  const handlePriceChange = (index: number, newPrice: string) => {
    const sanitized = newPrice.replace(/[^0-9.]/g, "");

    const firstDot = sanitized.indexOf(".");
    const cleanedPrice =
      firstDot === -1
        ? sanitized
        : sanitized.slice(0, firstDot + 1) +
          sanitized.slice(firstDot + 1).replace(/\./g, "");

    const updatedPrices = [...editedPrices];
    updatedPrices[index].price = cleanedPrice;
    setEditedPrices(updatedPrices);
  };

  useFocusEffect(
    useCallback(() => {
      setIsEditable(false);
      setButtonText(t("PriceChart.Request Price Update"));

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
        );
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      try {
        const token = store.getState().auth.token;
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
          return;
        }

        const response = await api.post(
          "api/auth/marketpricerequest",
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
            t("Error.The price request was sent successfully"),
          );
          await fetchPrices();
          setIsEditable(false);
          setButtonText(t("PriceChart.Request Price Update"));
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
      }
    } else {
      setIsEditable(true);
      setButtonText(t("PriceChart.Submit Request"));
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
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("PriceChart.PriceChart")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, { screen: "SearchPriceScreen" })
        }
        textColor="white"
        bgColor="#313131"
        iconBgColor="#FFFFFF1A"
      />

      {/* Content */}
      <ScrollView
        className="flex-1 bg-white w-full max-w-[500px] mx-auto"
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
      >
        <View className="mb-4 ">
          <View className="items-center">
            <Text className="text-[#7D7D7D] mb-1">{t("PriceChart.Crop")}</Text>
          </View>
          <TextInput
            className="border border-[#F4F4F4] rounded-full bg-[#F4F4F4] px-4 py-2 text-gray-800 h-[50px]"
            value={cropName}
            editable={false}
          />
        </View>

        <View className="mb-4 ">
          <View className="items-center">
            <Text className="text-[#7D7D7D] mb-1">
              {t("PriceChart.Variety")}
            </Text>
          </View>
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
            <View className="border border-[#E7E7E7] rounded-xl p-4">
              {priceData.map((priceItem, index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Text className="w-32 font-medium text-[#7D7D7D]">
                    {`${t("PriceChart.Grade")} ${priceItem.grade}`}
                  </Text>

                  <View
                    className="flex-1 flex-row items-center rounded-full px-4 h-[45px]"
                    style={{
                      borderWidth: 1,
                      borderColor: isEditable ? "#980775" : "#F4F4F4",
                      backgroundColor: "#F4F4F4",
                    }}
                  >
                    <Text className="text-[#000000] font-medium mr-1">Rs.</Text>
                    <TextInput
                      className="flex-1 font-medium text-[#000000]"
                      value={editedPrices[index]?.price}
                      editable={isEditable}
                      onChangeText={(newPrice) =>
                        handlePriceChange(index, newPrice)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          className="bg-[#000000] rounded-[45px] py-3 h-[50px] items-center justify-center mt-4 w-3/4 mx-auto"
          onPress={handleButtonClick}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
          }}
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
          className="border border-[#606060] mt-4 py-3 h-12  rounded-full h-[50px] items-center justify-center w-3/4 mx-auto"
          onPress={() => {
            if (isEditable) {
              setIsEditable(false);
              setButtonText(t("PriceChart.Request Price Update"));
              fetchPrices();
            } else {
              navigation.navigate("Main" as any, {
                screen: "SearchPriceScreen",
              });
            }
          }}
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
            marginBottom: 20,
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
