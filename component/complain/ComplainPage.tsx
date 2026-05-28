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
import { RootStackParamList } from "../types/types";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import GlobalSearchModal from "../commons/GlobalSearchModal";
import CustomHeader from "../navigations/CustomHeader";
import LoadingPage from "../commons/LoadingPage";

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
    const selectedLanguage = t("ReportComplaint.LNG");

    const fetchComplainCategory = async () => {
      try {
        const response = await axios.get(
          `${environment.API_BASE_URL}api/complain/get-complain-category/Collection`,
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

  const categoryModalData = Category.map((item) => ({
    label: t(item.label),
    value: item.value,
  }));

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        className="flex-1 bg-white"
      >
        <View className="flex-1 bg-white">
          {loading ? (
            <LoadingPage fullScreen />
          ) : (
            <ScrollView
              className="flex-1 bg-white"
              contentContainerStyle={{
                flexGrow: 1,
                backgroundColor: "#F6F6F6",
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <CustomHeader
                title=""
                showBackButton={true}
                navigation={navigation}
                onBackPress={() => navigation.goBack()}
                transparent
              />

              <View className="flex-1 px-4 max-w-[500px] w-full mx-auto bg-[#F6F6F6] justify-center">
                <Image
                  source={require("../../assets/images/complain/complain.webp")}
                  className="w-48 h-48 mx-auto"
                  resizeMode="contain"
                />

                <View className="items-center bg-white rounded-3xl w-full mb-10 p-4">
                  <View className="w-full items-center mt-10">
                    <View className="flex-row">
                      <Text className="text-2xl font-semibold text-center mb-4 text-[#424242]">
                        {t("ReportComplaint.Tellus")}
                      </Text>
                      <Text className="text-2xl font-semibold text-center mb-4 pl-2 text-[#D72C62]">
                        {t("ReportComplaint.Problem")}
                      </Text>
                    </View>

                    {/* Category Selector */}
                    <View className="w-full mb-4">
                      <TouchableOpacity
                        onPress={() => {
                          if (Category.length > 0)
                            setCategoryModalVisible(true);
                        }}
                        className="border border-gray-300 rounded-3xl px-2 h-[50px] flex-row items-center justify-between bg-white w-full"
                      >
                        <Text
                          className={`flex-1 ml-2 text-base ${selectedCategoryLabel ? "text-[#424242]" : "text-[#434343]"}`}
                          numberOfLines={1}
                        >
                          {selectedCategoryLabel
                            ? t(selectedCategoryLabel)
                            : t("ReportComplaint.selectCategory")}
                        </Text>
                        <MaterialIcons
                          name="arrow-drop-down"
                          size={24}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>

                    <Text className="text-sm text-gray-600 text-center mb-4">
                      {t("ReportComplaint.WewilRespond")}
                    </Text>

                    <TextInput
                      className="w-full h-60 border border-[#F6F6F6] rounded-lg p-3 bg-[#F6F6F6] mb-8 text-[#424242]"
                      style={{ textAlignVertical: "top" }}
                      placeholder={t("ReportComplaint.Kindlysubmit")}
                      placeholderTextColor="#434343"
                      multiline
                      value={complain}
                      onChangeText={(text) => setComplain(text.trimStart())}
                    />

                    <TouchableOpacity
                      className="w-full bg-black rounded-3xl items-center justify-center mb-20 h-[50px]"
                      onPress={handleSubmit}
                      style={{
                        shadowColor: "#000000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        elevation: 6,
                      }}
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
        showSearch={true}
      />
    </>
  );
};

export default ComplainPage;
