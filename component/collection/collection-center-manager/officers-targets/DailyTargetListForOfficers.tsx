import store from "@/services/reducxStore";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  useFocusEffect,
  useIsFocused,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import CustomHeader from "@/component/components/navigations/CustomHeader";

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
      officerName: string;
      phoneNumber1: string;
      phoneNumber2: string;
      image: string;
    };
  };
}

interface TargetData {
  dailyTarget: any;
  varietyId: any;
  centerTarget: any;
  varietyNameEnglish: string;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  grade: string;
  officerTarget: number;
  todo: number;
  complete: number;
}

const DailyTargetListForOfficers: React.FC<DailyTargetListForOfficersProps> = ({
  navigation,
}) => {
  const route =
    useRoute<RouteProp<RootStackParamList, "DailyTargetListForOfficers">>();
  const {
    collectionOfficerId,
    officerId,
    officerName,
    phoneNumber1,
    phoneNumber2,
    image,
  } = route.params;
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

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

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const authToken = store.getState().auth.token;
      const response = await axios.get(
        `${environment.API_BASE_URL}api/target/officer/${collectionOfficerId}`,
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

      setTodoData(sortByVarietyAndGrade(todoItems));
      setCompletedData(sortByVarietyAndGrade(completedItems));
    } catch (err) {
      console.log(t("Error.Failed to fetch data."));
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 3000 - elapsedTime;
      setTimeout(
        () => setLoading(false),
        remainingTime > 0 ? remainingTime : 0,
      );
    }
  }, [collectionOfficerId, selectedLanguage, t]);

  useEffect(() => {
    if (!isFocused) return;
    fetchTargets();
  }, [isFocused, collectionOfficerId]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("OfficerSummary" as any, {
          officerId,
          officerName,
          phoneNumber1,
          phoneNumber2,
          collectionOfficerId,
          image,
        });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [
      navigation,
      officerId,
      officerName,
      phoneNumber1,
      phoneNumber2,
      collectionOfficerId,
      image,
    ]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTargets().finally(() => setRefreshing(false));
  }, [fetchTargets]);

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
      <CustomHeader
        title={officerId || ""}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => {
          navigation.navigate("OfficerSummary" as any, {
            officerId,
            officerName,
            phoneNumber1,
            phoneNumber2,
            collectionOfficerId,
            image,
          });
        }}
        textColor="white"
        bgColor="#282828"
        iconBgColor="#FFFFFF1A"
      />

      {/* Toggle Buttons */}
      <View className="flex-row justify-center items-center pb-4 bg-[#282828]">
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
          {/* Only show count badge when ToDo tab is active */}
          {selectedToggle === "ToDo" && (
            <View className="bg-white rounded-full px-2 py-1">
              <Text className="text-black font-bold text-xs">
                {todoData.length}
              </Text>
            </View>
          )}
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
          {/* Only show count badge when Completed tab is active */}
          {selectedToggle === "Completed" && (
            <View className="bg-white rounded-full px-2 py-1 ml-2">
              <Text className="text-black font-bold text-xs">
                {completedData.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Scrollable Table - FIXED STRUCTURE */}
      <View className="flex-1 bg-white">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <LottieView
              source={require("../../../../assets/lottie/loading.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
          </View>
        ) : (
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
                  {selectedToggle === "ToDo" ? t("CenterTarget.No") : ""}
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
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                />
              }
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              {/* Table Data */}
              {displayedData.length > 0 ? (
                displayedData.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row border-b border-gray-300 ${
                      index % 2 === 0 ? "bg-gray-100" : "bg-white"
                    }`}
                    onPress={() => {
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
                        officerName,
                        phoneNumber1,
                        phoneNumber2,
                        image,
                      });
                    }}
                  >
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
                  </TouchableOpacity>
                ))
                ) : (
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
                )}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default DailyTargetListForOfficers;
