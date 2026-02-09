import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { Animated } from "react-native";

type DailyTargetListNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DailyTargetList"
>;

interface DailyTargetListProps {
  navigation: DailyTargetListNavigationProps;
}

interface TargetData {
  officerTarget: number;
  varietyNameEnglish: string;
  grade: string;
  target: number;
  todo: number;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  complete: number;
}

const DailyTargetList: React.FC<DailyTargetListProps> = ({ navigation }) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false); // State for refresh control
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language"); // Get stored language
      setSelectedLanguage(lang || "en"); // Default to English if not set
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const getVarietyNameForSort = (item: TargetData) => {
    switch (selectedLanguage) {
      case "si":
        return item.varietyNameSinhala || "";
      case "ta":
        return item.varietyNameTamil || "";
      default:
        return item.varietyNameEnglish || "";
    }
  };

  // Function to get grade priority for sorting
  const getGradePriority = (grade: string): number => {
    switch (grade) {
      case "A":
        return 1;
      case "B":
        return 2;
      case "C":
        return 3;
      default:
        return 4; // Any other grades come after A, B, C
    }
  };

  // Sort function for data - first by variety name, then by grade (A, B, C)
  const sortData = (data: TargetData[]): TargetData[] => {
    return [...data].sort((a, b) => {
      // First sort by variety name alphabetically
      const nameA = getVarietyNameForSort(a);
      const nameB = getVarietyNameForSort(b);

      const nameComparison = nameA.localeCompare(nameB);

      // If variety names are the same, sort by grade (A, B, C)
      if (nameComparison === 0) {
        return getGradePriority(a.grade) - getGradePriority(b.grade);
      }

      return nameComparison;
    });
  };

  // Function to fetch targets
  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/target/officer`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const allData = response.data.data;
      const todoItems = allData.filter((item: TargetData) => item.todo > 0);
      const completedItems = allData.filter(
        (item: TargetData) => item.todo === 0 && item.complete !== 0,
      );
      // console.log("completedItems", completedItems);
      // console.log(allData);

      // Sort data by variety name and grade
      setTodoData(sortData(todoItems));
      setCompletedData(sortData(completedItems));
      setError(null);
    } catch (err) {
      setError(t("Error.Failed to fetch data."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLanguage]); // Re-fetch when language changes

  // Initial data load
  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  // Function for refreshing the list
  const onRefresh = () => {
    setRefreshing(true);
    fetchTargets();
  };

  const displayedData = selectedToggle === "ToDo" ? todoData : completedData;

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const getvarietyName = (TargetData: TargetData) => {
    switch (selectedLanguage) {
      case "si":
        return TargetData.varietyNameSinhala;
      case "ta":
        return TargetData.varietyNameTamil;
      default:
        return TargetData.varietyNameEnglish;
    }
  };

  return (
    <View className="flex-1 bg-[#282828] w-full">
      {/* Header */}
      <View className="bg-[#282828] px-4 py-3 flex-row justify-between items-center w-full">
        <Text className="text-white text-lg font-bold ml-[35%]">
          {t("DailyTarget.DailyTarget")}
        </Text>
      </View>

      {/* Toggle Buttons */}
      <View className="flex-row justify-center items-center py-4 bg-[#282828]">
        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "ToDo" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center justify-center ${
              selectedToggle === "ToDo" ? "bg-[#980775]" : "bg-white"
            }`}
            style={{
              height: 40,
              shadowColor:
                selectedToggle === "ToDo" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "ToDo" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "ToDo" ? 4 : 0,
            }}
            onPress={() => setSelectedToggle("ToDo")}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "ToDo" ? "text-white" : "text-black"
              } ${selectedToggle === "ToDo" ? "mr-2" : ""}`}
              style={{
                opacity: selectedToggle === "ToDo" ? 1 : 0.7,
              }}
            >
              {t("DailyTarget.Todo")}
            </Animated.Text>

            {selectedToggle === "ToDo" && (
              <Animated.View
                className="bg-white rounded-full px-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-black font-bold text-xs">
                  {todoData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "Completed" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center ${
              selectedToggle === "Completed" ? "bg-[#980775]" : "bg-white"
            }`}
            style={{
              height: 40,
              shadowColor:
                selectedToggle === "Completed" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "Completed" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "Completed" ? 4 : 0,
            }}
            onPress={() => setSelectedToggle("Completed")}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "Completed" ? "text-white" : "text-black"
              }`}
              style={{
                opacity: selectedToggle === "Completed" ? 1 : 0.7,
              }}
            >
              {t("DailyTarget.Completed")}
            </Animated.Text>

            {selectedToggle === "Completed" && (
              <Animated.View
                className="bg-white rounded-full px-2 ml-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-black font-bold text-xs">
                  {completedData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Table - Now with proper scrolling */}
      <View className="flex-1 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="bg-white">
            {/* Table Header */}
            <View className="flex-row bg-[#980775]">
              <Text className="w-16 p-2 text-center text-white font-bold">
                {selectedToggle === "ToDo" ? t("DailyTarget.No") : ""}
              </Text>
              <Text className="w-40 p-2 text-center text-white font-bold">
                {t("DailyTarget.Variety")}
              </Text>
              <Text className="w-32 p-2 text-center text-white font-bold">
                {t("DailyTarget.Grade")}
              </Text>
              <Text className="w-32 p-2 text-center text-white font-bold">
                {t("DailyTarget.Target")}
              </Text>
              <Text className="w-32 p-2 text-center text-white font-bold">
                {selectedToggle === "Completed"
                  ? t("DailyTarget.Completedkg")
                  : t("DailyTarget.Todo()")}
              </Text>
            </View>

            <ScrollView
              className="flex-1 bg-white"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={true}
            >
              {/* Table Data */}
              {loading ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../assets/lottie/newLottie.json")}
                    autoPlay
                    loop
                    style={{ width: 350, height: 350 }}
                  />
                </View>
              ) : selectedToggle === "ToDo" && todoData.length === 0 ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../assets/lottie/NoComplaints.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-4">
                    {t("DailyTarget.NoTodoItems")}
                  </Text>
                </View>
              ) : selectedToggle === "Completed" &&
                completedData.length === 0 ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../assets/lottie/NoComplaints.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-4">
                    {t("DailyTarget.noCompletedTargets")}
                  </Text>
                </View>
              ) : (
                displayedData.map((item, index) => (
                  <View
                    key={index}
                    className={`flex-row ${
                      index % 2 === 0 ? "bg-gray-100" : "bg-white"
                    }`}
                  >
                    <Text className="w-16 p-2 border-r border-gray-300 text-center">
                      {selectedToggle === "ToDo" ? (
                        index + 1
                      ) : (
                        <Ionicons name="flag" size={20} color="#980775" />
                      )}
                    </Text>
                    <Text
                      className="w-40 p-2 border-r border-gray-300 text-center"
                      numberOfLines={2}
                    >
                      {getvarietyName(item)}
                    </Text>
                    <Text className="w-32 p-2 border-r border-gray-300 text-center">
                      {item.grade}
                    </Text>
                    <Text className="w-32 p-2 border-r border-gray-300 text-center">
                      {item.officerTarget}
                    </Text>
                    <Text className="w-32 p-2 text-center">
                      {selectedToggle === "Completed"
                        ? item.complete
                        : item.todo}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default DailyTargetList;
