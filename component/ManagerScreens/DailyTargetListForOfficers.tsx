import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";

type DailyTargetListForOfficerstNavigationProps = StackNavigationProp<
  RootStackParamList,
  "DailyTargetListForOfficers"
>;

interface DailyTargetListForOfficersProps {
  navigation: DailyTargetListForOfficerstNavigationProps;
  route: {
    params: {
      collectionOfficerId: number;
      officerId: string;
    };
  };
}

interface TargetData {
  dailyTarget: any;
  varietyId: any;
  centerTarget: any;
  varietyNameEnglish: string;
  varietyNameSinhala: string; // ✅ Added this
  varietyNameTamil: string; // ✅ Added this
  grade: string;
  officerTarget: number;
  todo: number;
  complete: number;
}

const DailyTargetListForOfficers: React.FC<DailyTargetListForOfficersProps> = ({
  navigation,
  route,
}) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const { collectionOfficerId, officerId } = route.params;
  const { t } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

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

  // ✅ Fetch Targets API (Runs every time the page is visited or refreshed)
  const fetchTargets = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const authToken = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/target/officer/${collectionOfficerId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const allData = response.data.data;
      // console.log("hell", allData);
      const todoItems = allData.filter((item: TargetData) => item.todo > 0);
      const completedItems = allData.filter(
        (item: TargetData) => item.todo === 0 && item.complete !== 0,
      );
      // console.log("todoItems", todoItems);
      // console.log("completedItems", completedItems);

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

  useFocusEffect(
    React.useCallback(() => {
      fetchTargets();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTargets();
    setRefreshing(false);
  }, [collectionOfficerId]);

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
    <View className="flex-1 bg-[#282828]">
      {/* Header */}
      <View className="bg-[#282828] px-4 py-3 flex-row justify-center items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute top-2 left-4 bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
        >
          <AntDesign name="left" size={24} color="#000502" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">{officerId}</Text>
      </View>

      {/* Toggle Buttons */}
      <View className="flex-row justify-center items-center py-4 bg-[#282828]">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full mx-2 flex-row items-center justify-center ${
            selectedToggle === "ToDo" ? "bg-[#980775]" : "bg-white"
          }`}
          style={{ height: 40 }}
          onPress={() => setSelectedToggle("ToDo")}
        >
          <Text
            className={`font-bold mr-2 ${
              selectedToggle === "ToDo" ? "text-white" : "text-black"
            }`}
          >
            {t("DailyTarget.Todo")}
          </Text>
          <View className="bg-white rounded-full px-2">
            <Text className="text-black font-bold text-xs">
              {todoData.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-full mx-2 flex-row items-center ${
            selectedToggle === "Completed" ? "bg-[#980775]" : "bg-white"
          }`}
          style={{ height: 40 }}
          onPress={() => setSelectedToggle("Completed")}
        >
          <Text
            className={`font-bold ${
              selectedToggle === "Completed" ? "text-white" : "text-black"
            }`}
          >
            {t("DailyTarget.Completed")}
          </Text>
          <View className="bg-white rounded-full px-2 ml-2">
            <Text className="text-black font-bold text-xs">
              {completedData.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scrollable Table - FIXED STRUCTURE */}
      <View className="flex-1 bg-white">
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header */}
            <View className="flex-row bg-[#980775]">
              <Text className="w-16 p-2 text-center text-white">
                {selectedToggle === "ToDo" ? t("CenterTarget.No") : ""}
              </Text>
              <Text className="w-40 p-2 text-center text-white">
                {t("DailyTarget.Variety")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
                {t("DailyTarget.Grade")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
                {t("DailyTarget.Target")}
              </Text>
              <Text className="w-32 p-2 text-center text-white">
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
            >
              {loading ? (
                <View className="flex-1 justify-center items-center py-16">
                  <LottieView
                    source={require("../../assets/lottie/newLottie.json")}
                    autoPlay
                    loop
                    style={{ width: 350, height: 350 }}
                  />
                </View>
              ) : displayedData.length > 0 ? (
                displayedData.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row ${
                      index % 2 === 0 ? "bg-gray-100" : "bg-white"
                    }`}
                    onPress={() => {
                      let qty = 0;
                      if (item.centerTarget) {
                        if (
                          item.grade === "A" &&
                          item.centerTarget.total_qtyA !== undefined
                        ) {
                          qty = parseFloat(item.centerTarget.total_qtyA);
                        } else if (
                          item.grade === "B" &&
                          item.centerTarget.total_qtyB !== undefined
                        ) {
                          qty = parseFloat(item.centerTarget.total_qtyB);
                        } else if (
                          item.grade === "C" &&
                          item.centerTarget.total_qtyC !== undefined
                        ) {
                          qty = parseFloat(item.centerTarget.total_qtyC);
                        }
                      }
                      if (selectedToggle === "Completed") return;

                      navigation.navigate("EditTargetScreen" as any, {
                        varietyNameEnglish: item.varietyNameEnglish,
                        varietyId: item.varietyId,
                        grade: item.grade,
                        target: item.officerTarget,
                        todo: item.todo,
                        qty: item.dailyTarget,
                        collectionOfficerId,
                        varietyNameSinhala: item.varietyNameSinhala,
                        varietyNameTamil: item.varietyNameTamil,
                        officerId: officerId,
                      });
                    }}
                  >
                    <Text className="w-16 p-2 border-r border-gray-300 text-center">
                      {selectedToggle === "ToDo" ? (
                        index + 1
                      ) : (
                        <Ionicons name="flag" size={20} color="purple" />
                      )}
                    </Text>
                    <Text className="w-40 p-2 border-r border-gray-300 text-center flex-wrap">
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
                  </TouchableOpacity>
                ))
              ) : (
                <View className="flex-1 justify-center items-center py-16 w-screen">
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

export default DailyTargetListForOfficers;
