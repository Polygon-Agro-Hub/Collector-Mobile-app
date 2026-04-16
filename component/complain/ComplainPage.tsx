import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";
import LottieView from "lottie-react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import GlobalSearchModal from "../common/GlobalSearchModal;
import CustomHeader from "../common/CustomHeader;

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type ComplainPageNavigationProps = StackNavigationProp<
  RootStackParamList,
  "ComplainPage"
>;

interface ComplainPageProps {
  navigation: ComplainPageNavigationProps;
}

const ComplainPage: React.FC<ComplainPageProps> = () => {
  const navigation = useNavigation<ComplainPageNavigationProps>();
  const route = useRoute<RouteProp<RootStackParamList, "ComplainPage">>();
  const { userId, farmerLanguage } = route.params;

  const [complain, setComplain] = useState<string>("");
  const { t } = useTranslation();
  const [Category, setCategory] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        await AsyncStorage.getItem("jobRole");
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    let appName = userId === 0 ? "CollectionOfficer" : "PlantCare";
    const selectedLanguage = t("ReportComplaint.LNG");

    const fetchComplainCategory = async () => {
      try {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/complain/get-complain-category/${appName}`,
        );
        if (response.data.status === "success") {
          const categoryField =
            selectedLanguage === "en"
              ? "categoryEnglish"
              : selectedLanguage === "si"
                ? "categorySinhala"
                : selectedLanguage === "ta"
                  ? "categoryTamil"
                  : "categoryEnglish";

          const mappedCategories = response.data.data
            .map((item: any) => {
              const categoryValue =
                item[categoryField] || item["categoryEnglish"];
              return { value: item.id, label: categoryValue };
            })
            .filter((item: { value: any }) => item.value);

          setCategory(mappedCategories);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchComplainCategory();
  }, [t]);

  const handleSubmit = async () => {
    if (!complain && !selectedCategory) {
      Alert.alert(
        t("Error.error"),
        t("Error.Please select a category and add your complaint."),
      );
      return;
    }
    if (!selectedCategory) {
      Alert.alert(t("Error.error"), t("Error.Please select a category."));
      return;
    }
    if (!complain) {
      Alert.alert(t("Error.error"), t("Error.Please add your complaint."));
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      const storedLanguage = await AsyncStorage.getItem("@user_language");
      const token = await AsyncStorage.getItem("token");

      if (userId === 0) {
        await api.post(
          "api/complain/officer-complaint",
          { complain, language: storedLanguage, category: selectedCategory },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        await api.post(
          "api/complain/farmer-complaint",
          {
            complain,
            language: farmerLanguage,
            category: selectedCategory,
            userId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      Alert.alert(
        t("Error.Success"),
        t("Error.Your complaint has Submit successfuly"),
      );
      setComplain("");
      setSelectedCategory(null);
      navigation.goBack();
    } catch (error) {
      console.error("Error submitting complaint:", error);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    }
  };

  const selectedCategoryLabel =
    Category.find((c) => c.value === selectedCategory)?.label || null;

  // Build modal data with translated labels
  const categoryModalData = Category.map((item) => ({
    label: t(item.label),
    value: item.value,
  }));

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      >
        <View className="flex-1 bg-white">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <LottieView
                source={require("../../assets/lottie/newLottie.json")}
                autoPlay
                loop
                style={{ width: 300, height: 300 }}
              />
            </View>
          ) : (
            <ScrollView
              className="flex-1 bg-white"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <CustomHeader
                title=""
                showBackButton={true}
                navigation={navigation}
                onBackPress={() => navigation.goBack()}
              />

              <View
                className="items-center bg-white"
                style={{ paddingHorizontal: wp(4) }}
              >
                <Image
                  source={require("../../assets/images/complain/complain.webp")}
                  className="w-36 h-36"
                  resizeMode="contain"
                />

                <View className="w-[100%] items-center p-6 shadow-2xl bg-white rounded-xl">
                  <View className="flex-row">
                    <Text className="text-2xl font-semibold text-center mb-4 color-[#424242]">
                      {t("ReportComplaint.Tellus")}
                    </Text>
                    <Text className="text-2xl font-semibold text-center mb-4 pl-2 color-[#D72C62]">
                      {t("ReportComplaint.Problem")}
                    </Text>
                  </View>

                  {/* Category Selector */}
                  <View className="w-full mb-4">
                    <TouchableOpacity
                      onPress={() => {
                        if (Category.length > 0) setCategoryModalVisible(true);
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: "#ccc",
                        borderRadius: 25,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "white",
                      }}
                    >
                      <Text
                        style={{
                          color: selectedCategoryLabel ? "#424242" : "#434343",
                          fontSize: 12,
                          flex: 1,
                          marginLeft: 8,
                        }}
                        numberOfLines={1}
                      >
                        {selectedCategoryLabel
                          ? t(selectedCategoryLabel)
                          : t("ReportComplaint.selectCategory")}
                      </Text>
                      <MaterialIcons
                        name="keyboard-arrow-down"
                        size={22}
                        color="#9CA3AF"
                        style={{ paddingRight: 10 }}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-sm text-gray-600 text-center mb-4">
                    {t("ReportComplaint.WewilRespond")}
                  </Text>

                  <TextInput
                    className="w-full h-60 border border-[#F6F6F6] rounded-lg p-3 bg-[#F6F6F6] mb-8"
                    placeholder={t("ReportComplaint.Kindlysubmit")}
                    placeholderTextColor="#434343"
                    multiline
                    value={complain}
                    onChangeText={(text) => setComplain(text)}
                    style={{ textAlignVertical: "top", color: "#424242" }}
                  />

                  <TouchableOpacity
                    className="w-full bg-[#000000] py-4 rounded-full items-center mb-20"
                    onPress={handleSubmit}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        {t("ReportComplaint.Submit")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <GlobalSearchModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={t("ReportComplaint.selectCategory")}
        data={categoryModalData}
        selectedItems={selectedCategory ? [selectedCategory] : []}
        onSelect={(items) => setSelectedCategory(items[0] ?? null)}
        multiSelect={false}
        showSearch={false}
      />
    </>
  );
};

export default ComplainPage;
