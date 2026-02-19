import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { RootStackParamList } from "../types";
import AntDesign from "react-native-vector-icons/AntDesign";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";

type TargetValidPeriodNavigationProps = StackNavigationProp<
  RootStackParamList,
  "TargetValidPeriod"
>;

interface TargetValidPeriodProps {
  navigation: TargetValidPeriodNavigationProps;
}

const TargetValidPeriod: React.FC<TargetValidPeriodProps> = ({
  navigation,
}) => {
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showToTimePicker, setShowToTimePicker] = useState(false);
  const { t } = useTranslation();

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const handleAddTarget = () => {
    // Extract and format components
    const fromDateStr = formatDate(fromDate);
    const fromTimeStr = formatTime(fromDate);
    const toDateStr = formatDate(toDate);
    const toTimeStr = formatTime(toDate);

    // Navigate to the target screen with the separate components
    navigation.navigate("SetTargetScreen", {
      fromDate: fromDateStr,
      fromTime: fromTimeStr,
      toDate: toDateStr,
      toTime: toTimeStr,
    });
  };

  return (
    <View className="flex-1 bg-white ">
      {/* Header */}
      <View className="flex-row items-center bg-[#2AAD7A] p-7">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-2">
          <AntDesign name="left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white ml-[20%]">
          {t("TargetValidPeriod.Target's Valid Period")}
        </Text>
      </View>

      {/* Form Section */}
      <View className="flex-1 bg-white p-7 mt-[10%]">
        {/* From Section */}
        <View className="mb-8">
          <Text className="text-black font-medium mb-2">
            {t("TargetValidPeriod.From")}
          </Text>
          <View className="flex-row space-x-4">
            {/* Date Picker */}
            <TouchableOpacity
              onPress={() => setShowFromDatePicker(true)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 items-center"
            >
              <Text>{formatDate(fromDate)}</Text>
            </TouchableOpacity>

            {/* Time Picker */}
            <TouchableOpacity
              onPress={() => setShowFromTimePicker(true)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 items-center"
            >
              <Text>{formatTime(fromDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* To Section */}
        <View className="mb-8">
          <Text className="text-black font-medium mb-2">
            {t("TargetValidPeriod.To")}
          </Text>
          <View className="flex-row space-x-4">
            {/* Date Picker */}
            <TouchableOpacity
              onPress={() => setShowToDatePicker(true)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 items-center"
            >
              <Text>{formatDate(toDate)}</Text>
            </TouchableOpacity>

            {/* Time Picker */}
            <TouchableOpacity
              onPress={() => setShowToTimePicker(true)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 items-center"
            >
              <Text>{formatTime(toDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Target Button */}
        <TouchableOpacity
          onPress={handleAddTarget}
          className="bg-[#2AAD7A] rounded-full py-3"
        >
          <Text className="text-center text-white font-bold">
            {t("TargetValidPeriod.Add Target")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* From DateTimePicker */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowFromDatePicker(false);
            if (selectedDate) setFromDate(selectedDate);
          }}
        />
      )}
      {showFromTimePicker && (
        <DateTimePicker
          value={fromDate}
          mode="time"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowFromTimePicker(false);
            if (selectedDate) setFromDate(selectedDate);
          }}
        />
      )}

      {/* To DateTimePicker */}
      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowToDatePicker(false);
            if (selectedDate) setToDate(selectedDate);
          }}
        />
      )}
      {showToTimePicker && (
        <DateTimePicker
          value={toDate}
          mode="time"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, selectedDate) => {
            setShowToTimePicker(false);
            if (selectedDate) setToDate(selectedDate);
          }}
        />
      )}
    </View>
  );
};

export default TargetValidPeriod;
