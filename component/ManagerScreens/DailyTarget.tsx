import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CircularProgress } from "react-native-circular-progress";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import AntDesign from "react-native-vector-icons/AntDesign";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";
import { Animated } from "react-native";

type DailyTargetNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DailyTarget"
>;

interface DailyTargetProps {
  navigation: DailyTargetNavigationProps;
}

interface TargetData {
  dailyTarget: any;
  officerTarget: number;
  complete: number;
  varietyId: number;
  centerTarget: any;
  varietyNameEnglish: string;
  grade: string;
  target: number;
  todo: number;
  qty: number;
  varietyNameSinhala: string;
  varietyNameTamil: string;
}

const DailyTarget: React.FC<DailyTargetProps> = ({ navigation }) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
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

  const sortByVarietyAndGrade = (data: TargetData[]) => {
    return [...data].sort((a, b) => {
      const nameA = getVarietyNameForSort(a);
      const nameB = getVarietyNameForSort(b);
      const nameComparison = nameA.localeCompare(nameB);

      if (nameComparison === 0) {
        return getGradePriority(a.grade) - getGradePriority(b.grade);
      }

      return nameComparison;
    });
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

  useEffect(() => {
    const fetchTargets = async () => {
      setLoading(true);
      const startTime = Date.now();
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
          (item: TargetData) => item.complete >= item.officerTarget,
        );

        setTodoData(sortByVarietyAndGrade(todoItems));
        setCompletedData(sortByVarietyAndGrade(completedItems));
        setError(null);
      } catch (err) {
        setError(t("Error.Failed to fetch data."));
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = 3000 - elapsedTime;
        setTimeout(
          () => setLoading(false),
          remainingTime > 0 ? remainingTime : 0,
        );
      }
    };

    fetchTargets();
  }, [selectedLanguage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const fetchTargets = async () => {
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
         console.log('dataaa',allData)
        const todoItems = allData.filter((item: TargetData) => item.todo > 0);
        const completedItems = allData.filter(
          (item: TargetData) => item.complete >= item.officerTarget,
        );

        setTodoData(sortByVarietyAndGrade(todoItems));
        setCompletedData(sortByVarietyAndGrade(completedItems));
        setRefreshing(false);
      } catch (err) {
        setError(t("Error.Failed to fetch data."));
        setRefreshing(false);
      }
    };
    fetchTargets();
  }, [selectedLanguage]);

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
      <View className="bg-[#282828] px-4 py-3 flex-row justify-between items-center">
        <Text className="text-white text-lg font-bold ml-[35%]">
           {t("DailyTarget.MyTarget")}
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
            onPress={() => setSelectedToggle("ToDo")}
            style={{
              shadowColor:
                selectedToggle === "ToDo" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "ToDo" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "ToDo" ? 4 : 0,
            }}
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
                <Text className="text-[#000000] font-bold text-xs">
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
            onPress={() => setSelectedToggle("Completed")}
            style={{
              shadowColor:
                selectedToggle === "Completed" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "Completed" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "Completed" ? 4 : 0,
            }}
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
                <Text className="text-[#000000] font-bold text-xs">
                  {completedData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View className="flex-1 bg-white">
        {/* Horizontal ScrollView for wide table */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={{ minWidth: "100%" }}>
            {/* Table Header */}
            <View className="flex-row bg-[#980775] py-3">
              <Text className="w-16 p-2 text-center text-white font-bold">
                {selectedToggle === "ToDo" ? t("CenterTarget.No") : ""}
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
                {selectedToggle === "ToDo"
                  ? t("DailyTarget.Todo()")
                  : t("DailyTarget.Completedkg")}
              </Text>
            </View>

            <ScrollView
              className="flex-1 bg-white"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {/* Table Data */}
              {loading ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../assets/lottie/newLottie.json")}
                    autoPlay
                    loop
                    style={{ width: 250, height: 250 }}
                  />
                </View>
              ) : displayedData.length > 0 ? (
                displayedData.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row justify-center items-center ${
                      index % 2 === 0 ? "bg-gray-100" : "bg-white"
                    }`}
                    onPress={() => {
                      if (selectedToggle === "Completed") return;

                      navigation.navigate("EditTargetManager" as any, {
                        varietyNameEnglish: item.varietyNameEnglish,
                        varietyId: item.varietyId,
                        grade: item.grade,
                        target: item.officerTarget,
                        todo: item.todo,
                        dailyTarget: item.dailyTarget,
                        varietyNameSinhala: item.varietyNameSinhala,
                        varietyNameTamil: item.varietyNameTamil,
                      });
                    }}
                  >
                    <Text className="w-16 p-2 text-center">
                      {selectedToggle === "ToDo" ? (
                        index + 1
                      ) : (
                        <Ionicons name="flag" size={20} color="purple" />
                      )}
                    </Text>
                    <Text className="w-40 p-2 text-center">
                      {getvarietyName(item)}
                    </Text>
                    <Text className="w-32 p-2 text-center">{item.grade}</Text>
                    <Text className="w-32 p-2 text-center">
                      {item.officerTarget}
                    </Text>
                    <Text className="w-32 p-2 text-center">
                      {selectedToggle === "Completed"
                        ? item.complete
                        : item.todo}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../assets/lottie/NoComplaints.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-4 text-center">
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

export default DailyTarget;
