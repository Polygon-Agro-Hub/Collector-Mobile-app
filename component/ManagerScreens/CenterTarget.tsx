import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native"; // Import LottieView
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Animated } from "react-native";

type CenterTargetNavigationProps = StackNavigationProp<
  RootStackParamList,
  "CenterTarget"
>;

interface CenterTargetProps {
  navigation: CenterTargetNavigationProps;
}

interface TargetData {
  complete: number;
  varietyNameEnglish: string;
  grade: string;
  target: number;
  todo: number;
  varietyNameSinhala: string;
  varietyNameTamil: string;
}

const CenterTarget: React.FC<CenterTargetProps> = ({ navigation }) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [centerCode, setcenterCode] = useState<string | null>("");
  console.log("Center Code", centerCode);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
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

  const getGradePriority = (grade: string): number => {
    switch (grade) {
      case "A":
        return 1;
      case "B":
        return 2;
      case "C":
        return 3;
      default:
        return 4;
    }
  };

  // Helper function to get the variety name based on selected language
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

  // Sort function that first sorts by variety name, then by grade (A, B, C)
  const sortByVarietyAndGrade = (data: TargetData[]) => {
    return [...data].sort((a, b) => {
      // First sort by variety name
      const nameA = getVarietyNameForSort(a);
      const nameB = getVarietyNameForSort(b);

      const nameComparison = nameA.localeCompare(nameB);

      // If variety names are the same, sort by grade (A, B, C)
      if (nameComparison === 0) {
        return getGradePriority(a.grade) - getGradePriority(b.grade);
      }

      return nameComparison; // Return the name comparison if names are different
    });
  };

  const fetchTargets = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const authToken = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/target/get-center-target`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      // Safely process the data
      const allData = response.data.data.map((item: any) => ({
        ...item,
        // Ensure numeric values with fallback to 0
        target: Number(item.target || 0),
        complete: Number(item.complete || 0),
        todo: Number(item.todo || 0),
      }));

      // console.log('Processed data:', allData);

      const todoItems = allData.filter((item: TargetData) => item.todo > 0);
      const completedItems = allData.filter(
        (item: TargetData) => item.complete >= item.target,
      );

      setTodoData(sortByVarietyAndGrade(todoItems));
      setCompletedData(sortByVarietyAndGrade(completedItems));
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(t("Error.Failed to fetch data."));
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 4000 - elapsedTime;
      setTimeout(
        () => setLoading(false),
        remainingTime > 0 ? remainingTime : 0,
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchTargets();
      const centerCode = await AsyncStorage.getItem("centerCode");
      setcenterCode(centerCode);
    };
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTargets(); // Trigger data fetch on refresh
    setRefreshing(false); // Reset refreshing state after fetching
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
    <View className="flex-1 bg-[#282828] ">
      {/* Header */}
      <View className="bg-[#282828] px-4 py-3 flex-row justify-center items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-4 left-4 bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
        >
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>
        {/* <Text className="text-white text-lg font-bold ml-[35%] mt-[3%]">{t("CenterTarget.CenterTarget")}</Text> */}
        <Text className="text-white text-lg font-bold mt-[3%]">
          {centerCode}
        </Text>
      </View>

      <View className="flex-row justify-center items-center py-4 bg-[#282828]">
        {/* To Do Button */}
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
              {t("CenterTarget.Todo")}
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

        {/* Completed Button */}
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
              {t("CenterTarget.Completed")}
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
      {/* Table Header */}

      <View className="flex-1 bg-white">
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: "100%" }}>
            {/* Table Header */}
            <View className="flex-row bg-[#980775] h-[50px]">
              <Text className="w-16 p-2 text-center text-white">
                {selectedToggle === "ToDo" ? t("CenterTarget.No") : ""}
              </Text>
              <Text className="w-40 p-2 text-center text-white">
                {t("CenterTarget.Variety")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
                {t("CenterTarget.Grade")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
                {t("CenterTarget.Target")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
                {selectedToggle === "ToDo"
                  ? t("DailyTarget.Todo")
                  : t("DailyTarget.Completed")}
              </Text>
            </View>

            <ScrollView
              className="flex-1 bg-white"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Table Content */}
              {loading ? (
                <View className="flex-1 justify-center items-center py-10">
                  <LottieView
                    source={require("../../assets/lottie/newLottie.json")}
                    autoPlay
                    loop
                    style={{ width: 350, height: 350 }}
                  />
                </View>
              ) : displayedData.length > 0 ? (
                displayedData.map((item, index) => (
                  <View
                    key={index}
                    className={`flex-row ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
                  >
                    <Text className="w-16 p-2 border-r border-gray-300 text-center">
                      {selectedToggle === "ToDo" ? (
                        index + 1
                      ) : (
                        <Ionicons name="flag" size={20} color="purple" />
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
                      {item.target.toFixed(2)}
                    </Text>
                    <Text className="w-32 p-2 text-center">
                      {selectedToggle === "Completed"
                        ? item.complete.toFixed(2)
                        : item.todo.toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <View className="flex-1 justify-center items-center py-10">
                  <LottieView
                    source={require("../../assets/lottie/NoComplaints.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-4">
                    {selectedToggle === "ToDo"
                      ? t("DailyTarget.NoTodoItems") || "No items to do"
                      : t("DailyTarget.noCompletedTargets") ||
                        "No completed items"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default CenterTarget;
