import store from "@/services/reducxStore";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "@/environment/environment";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { ROLES } from "@/constants/user-roles";

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
  // fields used by manager edit flow
  dailyTarget?: any;
  varietyId?: any;
  centerTarget?: any;
}

const DailyTargetList: React.FC<DailyTargetListProps> = ({ navigation }) => {
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobRole = async () => {
      try {
        const role = store.getState().auth.jobRole;
        setJobRole(role);
      } catch (error) {
        console.error("Error fetching job role:", error);
      }
    };
    fetchJobRole();
  }, []);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
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

  const sortData = (data: TargetData[]): TargetData[] => {
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

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = store.getState().auth.token;
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

      setTodoData(sortData(todoItems));
      setCompletedData(sortData(completedItems));
    } catch (err) {
      console.log(t("Error.Failed to fetch data."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

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

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (
          jobRole === "Collection Officer" ||
          jobRole === "Collection Centre Manager"
        ) {
          navigation.navigate("CollectionDashboard" as any);
        } else {
          navigation.navigate("Main" as any, { screen: "SearchPriceScreen" });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation, jobRole]),
  );

  return (
    <View className="flex-1 bg-[#282828] w-full">
      {/* Header */}

      <CustomHeader
        title={t("DailyTarget.MyDailyTarget")}
        showBackButton={false}
        textColor="white"
        bgColor="#282828"
        iconBgColor="#FFFFFF1A"
      />

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
                <Text className="text-black font-bold text-xs py-1">
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
                <Text className="text-black font-bold text-xs py-1">
                  {completedData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Table */}
      {/* Table */}
      <View className="flex-1 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ minWidth: 505, flex: 1 }}>
            {/* Table Header */}
            <View className="flex-row bg-[#980775] min-h-[48px]">
              {/* No */}
              <View
                style={{ width: 55 }}
                className="justify-center items-center border-r border-white/20 px-1 py-2"
              >
                <Text className="text-center text-white font-bold text-xs">
                  {selectedToggle === "ToDo" ? t("DailyTarget.No") : ""}
                </Text>
              </View>

              {/* Variety */}
              <View
                style={{ flex: 1, minWidth: 180 }}
                className="justify-center items-center border-r border-white/20 px-2 py-2"
              >
                <Text
                  className="text-center text-white font-bold text-xs"
                  numberOfLines={2}
                >
                  {t("DailyTarget.Variety")}
                </Text>
              </View>

              {/* Grade */}
              <View
                style={{ width: 70 }}
                className="justify-center items-center border-r border-white/20 px-1 py-2"
              >
                <Text
                  className="text-center text-white font-bold text-xs"
                  numberOfLines={2}
                >
                  {t("DailyTarget.Grade")}
                </Text>
              </View>

              {/* Target */}
              <View
                style={{ width: 100 }}
                className="justify-center items-center border-r border-white/20 px-1 py-2"
              >
                <Text
                  className="text-center text-white font-bold text-xs"
                  numberOfLines={2}
                >
                  {t("DailyTarget.Target")}
                </Text>
              </View>

              {/* Todo / Completed */}
              <View
                style={{ width: 100 }}
                className="justify-center items-center px-1 py-2"
              >
                <Text
                  className="text-center text-white font-bold text-xs"
                  numberOfLines={2}
                >
                  {selectedToggle === "Completed"
                    ? t("DailyTarget.Completedkg")
                    : t("DailyTarget.Todo()")}
                </Text>
              </View>
            </View>

            <ScrollView
              className="flex-1 bg-white"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom:80 }}
            >
              {/* Table Data */}
              {loading ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../../../assets/lottie/loading.json")}
                    autoPlay
                    loop
                    style={{ width: 350, height: 350 }}
                  />
                </View>
              ) : selectedToggle === "ToDo" && todoData.length === 0 ? (
                <View className="flex-1 justify-center py-[30%] items-center ">
                  <LottieView
                    source={require("../../../../assets/lottie/no-data.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-[-5%] text-center">
                    {selectedToggle === "ToDo"
                      ? t("DailyTarget.NoTodoItems") || "No items to do"
                      : t("DailyTarget.noCompletedTargets") ||
                        "No completed items"}
                  </Text>
                </View>
              ) : selectedToggle === "Completed" &&
                completedData.length === 0 ? (
                <View className="flex-1 justify-center items-center py-20">
                  <LottieView
                    source={require("../../../../assets/lottie/no-data.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text className="text-gray-500 mt-4">
                    {t("DailyTarget.noCompletedTargets")}
                  </Text>
                </View>
              ) : (
                displayedData.map((item, index) => {
                  const isManager = jobRole === ROLES.COLLECTION_MANAGER;
                  const isTappable = isManager && selectedToggle === "ToDo";

                  const rowContent = (
                    <>
                      {/* No */}
                      <View
                        style={{ width: 55 }}
                        className="justify-center items-center border-r border-gray-300 px-1 py-3"
                      >
                        {selectedToggle === "ToDo" ? (
                          <Text className="text-center font-medium text-gray-800 text-xs">
                            {index + 1}
                          </Text>
                        ) : (
                          <Ionicons
                            name="flag"
                            size={18}
                            color="#980775"
                          />
                        )}
                      </View>

                      {/* Variety */}
                      <View
                        style={{ flex: 1, minWidth: 180 }}
                        className="justify-center items-center border-r border-gray-300 px-2 py-3"
                      >
                        <Text
                          className="font-semibold text-gray-900 text-xs leading-4 text-center"
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {getvarietyName(item)}
                        </Text>
                      </View>

                      {/* Grade */}
                      <View
                        style={{ width: 70 }}
                        className="justify-center items-center border-r border-gray-300 px-1 py-3"
                      >
                        <Text
                          className="text-center font-medium text-gray-800 text-xs"
                          numberOfLines={2}
                        >
                          {item.grade}
                        </Text>
                      </View>

                      {/* Target */}
                      <View
                        style={{ width: 100 }}
                        className="justify-center items-center border-r border-gray-300 px-1 py-3"
                      >
                        <Text
                          className="text-center font-medium text-gray-800 text-xs"
                          numberOfLines={2}
                        >
                          {item.officerTarget}
                        </Text>
                      </View>

                      {/* Todo / Completed */}
                      <View
                        style={{ width: 100 }}
                        className="justify-center items-center px-1 py-3"
                      >
                        <Text
                          className="text-center font-medium text-gray-800 text-sm"
                          numberOfLines={2}
                        >
                          {selectedToggle === "Completed"
                            ? item.complete
                            : item.todo}
                        </Text>
                      </View>
                    </>
                  );

                  if (isTappable) {
                    return (
                      <TouchableOpacity
                        key={index}
                        className={`flex-row border-b border-gray-300 ${
                          index % 2 === 0 ? "bg-gray-100" : "bg-white"
                        }`}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate("EditTargetManager" as any, {
                            varietyId: item.varietyId,
                            varietyNameEnglish: item.varietyNameEnglish,
                            varietyNameSinhala: item.varietyNameSinhala,
                            varietyNameTamil: item.varietyNameTamil,
                            grade: item.grade,
                            target: item.officerTarget,
                            todo: item.todo,
                            dailyTarget: item.dailyTarget ?? item.officerTarget,
                            fromScreen: "DailyTargetList",
                          })
                        }
                      >
                        {rowContent}
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View
                      key={index}
                      className={`flex-row border-b border-gray-300 ${
                        index % 2 === 0 ? "bg-gray-100" : "bg-white"
                      }`}
                    >
                      {rowContent}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default DailyTargetList;
