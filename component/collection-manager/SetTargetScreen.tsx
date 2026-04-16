import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { MaterialIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import GlobalSearchModal from "../common/GlobalSearchModal; 

type SetTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "SetTargetScreen"
>;

interface SetTargetScreenProps {
  navigation: SetTargetScreenNavigationProps;
  route: {
    params: {
      fromDate: string;
      fromTime: string;
      toDate: string;
      toTime: string;
    };
  };
}

const SetTargetScreen: React.FC<SetTargetScreenProps> = ({
  navigation,
  route,
}) => {
  const { fromDate, fromTime, toDate, toTime } = route.params;

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [selectedVariety, setSelectedVariety] = useState<string>("");
  const [cropOptions, setCropOptions] = useState<{ label: string; value: string }[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<{ label: string; value: string }[]>([]);
  const [weights, setWeights] = useState({ gradeA: "0.00", gradeB: "0.00", gradeC: "0.00" });
  const [targets, setTargets] = useState<any[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [loadingVarieties, setLoadingVarieties] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [varietyModalVisible, setVarietyModalVisible] = useState(false);
  const { t } = useTranslation();

  const fetchCropNames = async () => {
    setLoadingCrops(true);
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/unregisteredfarmercrop/get-crop-names`,
      );
      const formattedData = response.data.map(
        (crop: { id: string; cropNameEnglish: string }) => ({
          label: crop.cropNameEnglish,
          value: crop.id,
        }),
      );
      setCropOptions(formattedData);
    } catch (error) {
      Alert.alert(t("Error.error"), t("Error.Failed to fetch crop names."));
    } finally {
      setLoadingCrops(false);
    }
  };

  const fetchVarieties = async () => {
    if (!selectedCrop) return;

    setLoadingVarieties(true);
    try {
      const response = await axios.get(
        `${environment.API_BASE_URL}api/unregisteredfarmercrop/crops/varieties/${selectedCrop}`,
      );
      const formattedData = response.data.map(
        (variety: { id: string; varietyNameEnglish: string }) => ({
          label: variety.varietyNameEnglish,
          value: variety.id,
        }),
      );
      setVarietyOptions(formattedData);
    } catch (error) {
      Alert.alert(t("Error.error"), t("Error.Failed to fetch varieties."));
    } finally {
      setLoadingVarieties(false);
    }
  };

  useEffect(() => {
    fetchCropNames();
  }, []);

  useEffect(() => {
    fetchVarieties();
  }, [selectedCrop]);

  const handleWeightChange = (grade: string, value: string) => {
    setWeights((prev) => ({ ...prev, [grade]: value }));
  };

  const handleAddMore = () => {
    if (!selectedCrop || !selectedVariety || !weights.gradeA || !weights.gradeB || !weights.gradeC) {
      Alert.alert(t("Error.error"), t("Error.Please fill in all fields."));
      return;
    }

    const selectedVarietyName = varietyOptions.find((v) => v.value === selectedVariety)?.label;

    setTargets((prev) => [
      ...prev,
      {
        varietyId: selectedVariety,
        varietyName: selectedVarietyName,
        gradeA: weights.gradeA,
        gradeB: weights.gradeB,
        gradeC: weights.gradeC,
      },
    ]);

    setSelectedCrop("");
    setSelectedVariety("");
    setVarietyOptions([]);
    setWeights({ gradeA: "0.00", gradeB: "0.00", gradeC: "0.00" });
  };

  const formatDateToMySQL = (dateString: string): string | null => {
    if (!dateString) return null;

    const [month, day, year] = dateString.split(" ");
    const months: { [key: string]: string } = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
      May: "05", Jun: "06", Jul: "07", Aug: "08",
      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };

    const monthNumber = months[month];
    if (!monthNumber || isNaN(Number(day.replace(",", ""))) || isNaN(Number(year))) return null;

    return `${year}/${monthNumber}/${String(day.replace(",", "")).padStart(2, "0")}`;
  };

  const formatTimeToMySQL = (timeString: string): string | null => {
    if (!timeString) return null;

    const [time, modifier] = timeString.split(" ");
    if (!time || !modifier) return null;

    let [hours, minutes] = time.split(":").map(Number);
    if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  };

  const handleSave = async () => {
    if (targets.length === 0) {
      Alert.alert(t("Error.error"), t("Error.No targets to save."));
      return;
    }

    const formattedFromDate = formatDateToMySQL(fromDate);
    const formattedToDate = formatDateToMySQL(toDate);
    const formattedFromTime = formatTimeToMySQL(fromTime);
    const formattedToTime = formatTimeToMySQL(toTime);

    if (!formattedFromDate || !formattedToDate || !formattedFromTime || !formattedToTime) {
      Alert.alert(t("Error.error"), t("Error.Invalid date or time values provided."));
      return;
    }

    const payload = {
      fromDate: formattedFromDate,
      toDate: formattedToDate,
      fromTime: formattedFromTime,
      toTime: formattedToTime,
      TargetItems: targets.map((target) => ({
        varietyId: target.varietyId,
        qtyA: target.gradeA,
        qtyB: target.gradeB,
        qtyC: target.gradeC,
      })),
    };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.Authentication token is missing."));
        return;
      }

      const response = await axios.post(
        `${environment.API_BASE_URL}api/collection-manager/create-daily-target`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.status) {
        Alert.alert(t("Error.Success"), t("Error.Daily target created successfully"));
        navigation.goBack();
      } else {
        Alert.alert(t("Error.error"), response.data.message || "Failed to save target.");
      }
    } catch (error) {
      console.error("Error saving target:", error);
      Alert.alert(t("Error.error"), t("Error.An error occurred while saving the target."));
    }
  };

  const selectedCropLabel = cropOptions.find((o) => o.value === selectedCrop)?.label || null;
  const selectedVarietyLabel = varietyOptions.find((o) => o.value === selectedVariety)?.label || null;

  return (
    <>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center p-6" style={{ backgroundColor: "#2AAD7A" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <AntDesign name="left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white ml-[25%]">
            {t("SetTargetScreen.Set Target")}
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView className="px-6 py-8">

          {/* Select Crop */}
          <View className="mt-8">
            <Text className="text-sm text-gray-600 mb-2">
              {t("SetTargetScreen.Select Crop")}
            </Text>
            <TouchableOpacity
              onPress={() => setCropModalVisible(true)}
              style={{
                height: 50,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "white",
              }}
            >
              <Text style={{ color: selectedCropLabel ? "#000" : "#9CA3AF", fontSize: 14, flex: 1 }}>
                {loadingCrops
                  ? "Loading crops..."
                  : selectedCropLabel || "--Select Crop--"}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Select Variety */}
          <View className="mt-4">
            <Text className="text-sm text-gray-600 mb-2">
              {t("SetTargetScreen.Select Variety")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (!selectedCrop) {
                  Alert.alert(t("Error.error"), t("SetTargetScreen.Select Crop"));
                  return;
                }
                setVarietyModalVisible(true);
              }}
              style={{
                height: 50,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 8,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "white",
              }}
            >
              <Text style={{ color: selectedVarietyLabel ? "#000" : "#9CA3AF", fontSize: 14, flex: 1 }}>
                {loadingVarieties
                  ? "Loading varieties..."
                  : selectedVarietyLabel || "--Select Variety--"}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Weight Section */}
          <View className="mt-8">
            <Text className="text-gray-600 text-sm mb-2">
              {t("SetTargetScreen.WeightGrades")}
            </Text>
            <View className="border border-gray-300 rounded-lg p-4">
              {Object.entries(weights).map(([grade, value], index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Text className="w-32 text-gray-600">{`Grade ${grade.slice(-1)}`}</Text>
                  <TextInput
                    placeholder="0.00"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800"
                    value={value}
                    keyboardType="decimal-pad"
                    onChangeText={(newValue) => handleWeightChange(grade, newValue)}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View className="mt-8 items-center">
            <TouchableOpacity
              className="border border-gray-500 rounded-[45px] p-3 mb-4"
              style={{ width: 250, height: 45 }}
              onPress={handleAddMore}
            >
              <Text className="text-center text-gray-700 font-medium">
                {t("SetTargetScreen.Add More")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target List */}
          <View className="mt-8 border border-gray-300 rounded-lg mb-10">
            <View className="flex-row bg-[#2AAD7A] py-2 px-3 rounded-t-lg">
              <Text className="text-white font-bold w-8 text-center">{t("SetTargetScreen.No")}</Text>
              <Text className="text-white font-bold w-20 text-center">{t("SetTargetScreen.Variety")}</Text>
              <Text className="text-white font-bold w-12 text-center">{t("SetTargetScreen.Grade")}</Text>
              <View className="w-16">
                <Text className="text-white font-bold text-center">{t("SetTargetScreen.Target")}</Text>
                <Text className="text-white font-bold text-center text-xs">{t("SetTargetScreen.kg")}</Text>
              </View>
              <Text className="text-white font-bold w-12 text-center ml-[10%]">{t("SetTargetScreen.Action")}</Text>
            </View>

            {targets.flatMap((item, index) =>
              [
                { grade: "A", target: item.gradeA },
                { grade: "B", target: item.gradeB },
                { grade: "C", target: item.gradeC },
              ]
                .filter((row) => parseFloat(row.target) > 0)
                .map((row, subIndex) => (
                  <View
                    key={`${index}-${subIndex}`}
                    className="flex-row border-b border-gray-300 py-2 px-2"
                  >
                    <Text className="w-8 text-center">{index + 1 + subIndex}</Text>
                    <Text className="w-20 text-center flex-wrap" numberOfLines={2} ellipsizeMode="tail">
                      {item.varietyName}
                    </Text>
                    <Text className="w-12 text-center">{row.grade}</Text>
                    <Text className="w-16 text-center">{row.target}</Text>
                    <View className="w-12 items-center ml-[10%]">
                      <TouchableOpacity
                        onPress={() => {
                          const updatedTargets = [...targets];
                          updatedTargets[index][`grade${row.grade}`] = "0.00";
                          setTargets(
                            updatedTargets.filter(
                              (t) =>
                                parseFloat(t.gradeA) ||
                                parseFloat(t.gradeB) ||
                                parseFloat(t.gradeC),
                            ),
                          );
                        }}
                      >
                        <AntDesign name="delete" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )),
            )}
          </View>

          <View className="mb-10 items-center">
            <TouchableOpacity
              className="bg-[#2AAD7A] rounded-[45px] p-3"
              style={{ width: 250, height: 45 }}
              onPress={handleSave}
            >
              <Text className="text-center text-white font-medium">
                {t("SetTargetScreen.Save")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Crop Modal */}
      <GlobalSearchModal
        visible={cropModalVisible}
        onClose={() => setCropModalVisible(false)}
        title={t("SetTargetScreen.Select Crop")}
        data={cropOptions}
        selectedItems={selectedCrop ? [selectedCrop] : []}
        onSelect={(items) => {
          const val = items[0] ?? "";
          if (val !== selectedCrop) {
            setSelectedCrop(val);
            setSelectedVariety("");
            setVarietyOptions([]);
          }
        }}
        searchPlaceholder="Search crop..."
        multiSelect={false}
        isLoading={loadingCrops}
      />

      {/* Variety Modal */}
      <GlobalSearchModal
        visible={varietyModalVisible}
        onClose={() => setVarietyModalVisible(false)}
        title={t("SetTargetScreen.Select Variety")}
        data={varietyOptions}
        selectedItems={selectedVariety ? [selectedVariety] : []}
        onSelect={(items) => {
          setSelectedVariety(items[0] ?? "");
        }}
        searchPlaceholder="Search variety..."
        multiSelect={false}
        isLoading={loadingVarieties}
      />
    </>
  );
};

export default SetTargetScreen;