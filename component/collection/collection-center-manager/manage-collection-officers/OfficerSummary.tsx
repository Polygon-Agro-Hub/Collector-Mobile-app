import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  BackHandler,
} from "react-native";
import { Entypo, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CircularProgress } from "react-native-circular-progress";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import environment from "@/environment/environment";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import WarningConfirmation from "@/component/components/popup/WarningConfirmation";
import CustomHeader from "@/component/components/navigations/CustomHeader";

type OfficerSummaryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OfficerSummary"
>;

type OfficerSummaryRouteProp = RouteProp<RootStackParamList, "OfficerSummary">;

interface OfficerSummaryProps {
  navigation: OfficerSummaryNavigationProp;
  route: OfficerSummaryRouteProp;
}

const OfficerSummary: React.FC<OfficerSummaryProps> = ({
  route,
  navigation,
}) => {
  const {
    officerId,
    officerName,
    phoneNumber1,
    phoneNumber2,
    collectionOfficerId,
    image,
  } = route.params;
  const [showMenu, setShowMenu] = useState(false);

  const [taskPercentage, setTaskPercentage] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Main", { screen: "CollectionOfficersList" });
        return true;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );



  const handleDial = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch((err) =>
      console.error("Failed to open dial pad:", err),
    );
  };

  const fetchTaskSummary = async () => {
    try {
      const res = await axios.get(
        `${environment.API_BASE_URL}api/target/officer-task-summary/${collectionOfficerId}`,
      );

      if (res.data.success) {
        const { totalTarget, totalComplete, completionPercentage } = res.data;

        const percentageFromAPI = parseInt(
          completionPercentage.replace("%", ""),
          10,
        );

        const calculatedPercentage =
          totalTarget > 0 ? Math.round((totalComplete / totalTarget) * 100) : 0;

        setTaskPercentage(percentageFromAPI);
      } else {
        Alert.alert(
          t("Error.error"),
          t("Error.No task summary found for this officer."),
        );
        setTaskPercentage(0);
      }
    } catch (error) {
      console.error("Error fetching task summary:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to fetch task summary."));
      setTaskPercentage(0);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTaskSummary();
    setRefreshing(false);
    setShowMenu(false);
    getOnlineStatus();
  }, [collectionOfficerId]);

  useEffect(() => {
    fetchTaskSummary();
  }, [collectionOfficerId]);

  const handleCancel = () => {
    setModalVisible(false);
    setShowMenu(false);
  };

  const handleDisclaim = async () => {
    setShowMenu(false);

    if (!collectionOfficerId) {
      Alert.alert(t("Error.error"), t("Error.Missing collectionOfficerId"));
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      const res = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/disclaim-officer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collectionOfficerId,
            jobRole: "Collection Officer",
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Disclaim failed:", errorData);
        Alert.alert(t("Error.error"), t("Error.Failed to disclaim officer."));
        return;
      }

      const data = await res.json();

      if (data.status === "success") {
        setModalVisible(false);
        Alert.alert(
          "Success",
          t("DisclaimOfficer.Employee successfully disclaimed."),
        );
        navigation.navigate("Main", { screen: "CollectionOfficersList" });
      } else {
        Alert.alert(
          "QRScanner.Failed",
          t("DisclaimOfficer.Failed to disclaim officer."),
        );
      }
    } catch (error) {
      console.error("Failed to disclaim:", error);
      Alert.alert(
        "QRScanner.Failed",
        t("DisclaimOfficer.Failed to disclaim officer."),
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      setShowMenu(false);
      getOnlineStatus();
    }, [collectionOfficerId]),
  );

  const getOnlineStatus = async () => {
    try {
      const res = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/get-officer-online/${collectionOfficerId}`,
      );
      const data = await res.json();

      if (data.success) {
        const { OnlineStatus } = data.result;

        if (OnlineStatus === 1) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } else {
        console.error("Failed to get officer status");
        Alert.alert(t("Error.error"), t("Error.Failed to get officer status."));
      }
    } catch (error) {
      console.error("Failed to get officer status:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to get officer status."));
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={""}
        showBackButton={true}
        navigation={navigation as any}
        onBackPress={() =>
          navigation.navigate("Main", { screen: "CollectionOfficersList" })
        }
        rightComponent={
          <View className="relative">
            <TouchableOpacity
              onPress={() => setShowMenu((prev) => !prev)}
              className="p-2 mr-1"
            >
              <Ionicons name="ellipsis-vertical" size={24} color="black" />
            </TouchableOpacity>

            {showMenu && (
              <View
                className="absolute z-50 top-10 right-0 bg-white border border-[#00000040] rounded-lg shadow-lg"
                style={{ minWidth: 100 }}
              >
                <TouchableOpacity
                  className="p-3 bg-white rounded-lg"
                  onPress={() => {
                    setModalVisible(true);
                    setShowMenu(false);
                  }}
                >
                  <Text className="text-gray-700 font-semibold text-center">
                    {t("OfficerSummary.Disclaim") || "Disclaim"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />
      <ScrollView
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="relative">
          <View className="bg-white rounded-b-[25px] px-4 pt-4 pb-6 items-center shadow-lg z-10">
            <View
              className={`w-28 h-28 border-[6px] rounded-full items-center justify-center ${isOnline ? "border-[#980775]" : "border-gray-400"}`}
            >
              <Image
                source={
                  image
                    ? { uri: image }
                    : require("../../../../assets/images/auth/my-profile.webp")
                }
                className="w-24 h-24 rounded-full "
              />
            </View>

            {/* Name and EMP ID */}
            <Text className="mt-4 text-lg font-bold text-black">
              {officerName}
            </Text>
            <Text className="text-sm text-gray-500">
              {t("OfficerSummary.EMPID")} {officerId}
            </Text>
          </View>

        {/* Action Buttons Section */}
        <View className="bg-[#980775] rounded-b-[45px] px-8 py-4 -mt-6 flex-row justify-around shadow-md z-0">
          {/* Phone Number 1 */}
          {phoneNumber1 ? (
            <TouchableOpacity
              className="items-center mt-5"
              onPress={() => handleDial(phoneNumber1)}
            >
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <Ionicons name="call" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">
                {t("OfficerSummary.Num1")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={true} className="items-center mt-5">
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <MaterialIcons name="error-outline" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">
                {t("OfficerSummary.Num1")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Phone Number 2 */}
          {phoneNumber2 ? (
            <TouchableOpacity
              className="items-center mt-5"
              onPress={() => handleDial(phoneNumber2)}
            >
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <Ionicons name="call" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">
                {t("OfficerSummary.Num2")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={true} className="items-center mt-5">
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <MaterialIcons name="error-outline" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">
                {t("OfficerSummary.Num2")}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="items-center mt-5"
            onPress={() =>
              navigation.navigate("Main", {
                screen: "TransactionList",
                params: {
                  officerId,
                  collectionOfficerId,
                  phoneNumber1,
                  phoneNumber2,
                  officerName,
                },
              })
            }
          >
            <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
              <Image
                source={require("../../../../assets/images/collection-manager/lf.webp")}
                style={{ width: 28, height: 28, resizeMode: "contain" }}
              />
            </View>
            <Text className="text-white mt-2 text-xs">
              {t("OfficerSummary.Collection")}
            </Text>
          </TouchableOpacity>

          {/* Report Button */}
          <TouchableOpacity
            className="items-center mt-5"
            onPress={() =>
              navigation.navigate("ReportGenerator" as any, {
                officerId,
                collectionOfficerId,
                phoneNumber1,
                phoneNumber2,
                officerName,
              })
            }
          >
            <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
              <MaterialIcons name="description" size={24} color="white" />
            </View>
            <Text className="text-white mt-2 text-xs">
              {t("OfficerSummary.Report")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View className="mt-6 px-6">
        <View className="items-center mt-4">
          {/* Total Weight */}
          <View className="items-center mb-8">
            <CircularProgress
              size={120}
              width={10}
              fill={taskPercentage ?? 0}
              tintColor="#000000"
              backgroundColor="#E5E7EB"
            >
              {(fill: number) => (
                <Text className="text-[#000000] font-bold text-xl">
                  {Math.round(fill)}%
                </Text>
              )}
            </CircularProgress>

            <Text className="text-sm text-gray-500 mt-4">
              {t("OfficerSummary.Target Coverage")}
            </Text>
          </View>

          <View className="mt-6 mb-10 items-center justify-center">
            <TouchableOpacity
              className="bg-[#000000] rounded-full w-64 py-3 h-[50px] justify-center"
              onPress={() =>
                navigation.navigate("DailyTargetListForOfficers", {
                  officerId,
                  officerName,
                  phoneNumber1,
                  phoneNumber2,
                  collectionOfficerId,
                  image,
                })
              }
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <Text className="text-white text-center font-medium">
                {t("OfficerSummary.OpenTarget")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <WarningConfirmation
        visible={modalVisible}
        message={t("DisclaimOfficer.Are you sure you want to disclaim this employee?")}
        onConfirm={handleDisclaim}
        onCancel={handleCancel}
        confirmText={t("DisclaimOfficer.Disclaim")}
        cancelText={t("ClaimOfficer.Cancel")}
        confirmButtonBgClass="bg-[#FF0700] active:bg-red-700"
      />
      </ScrollView>
    </View>
  );
};

export default OfficerSummary;
