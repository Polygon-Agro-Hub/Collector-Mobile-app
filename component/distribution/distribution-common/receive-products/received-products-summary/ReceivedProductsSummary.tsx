import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LoadingPage from "@/component/components/loading/LoadingPage";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import { MaterialCommunityIcons, FontAwesome5, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import { getLocalizedProductName } from "../unloading-products/UnloadingProducts";
import { getLocalizedDriverName } from "@/utils/driverLocalization";

type ReceivedProductsSummaryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedProductsSummary"
>;

type ReceivedProductsSummaryRouteProp = RouteProp<
  RootStackParamList,
  "ReceivedProductsSummary"
>;

interface ReceivedProductsSummaryProps {
  navigation: ReceivedProductsSummaryNavigationProp;
  route: ReceivedProductsSummaryRouteProp;
}

export interface GradeSetItem {
  grade: string;
  set: number;
  crates: number;
  weightKg: number;
}

export interface CropLoadData {
  id: string;
  varietyNameEnglish?: string;
  varietyNameSinhala?: string;
  varietyNameTamil?: string;
  cropNameEnglish?: string;
  cropNameSinhala?: string;
  cropNameTamil?: string;
  cropName: string;
  imageUri: string;
  totalWeightKg: number;
  totalCrates: number;
  gradeSets: GradeSetItem[];
}

export default function ReceivedProductsSummary({
  navigation,
  route,
}: ReceivedProductsSummaryProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const transportId = route.params?.transportId;
  const isUnloadedParam = route.params?.isUnloaded ?? false;
  const [isUnloaded, setIsUnloaded] = useState<boolean>(isUnloadedParam);
  const passedTitle = route.params?.title;

  const [vehicleNo, setVehicleNo] = useState<string>(
    route.params?.vehicleNo || ""
  );
  const [loadCode, setLoadCode] = useState<string>(
    route.params?.loadCode || ""
  );
  const [driverEmpId, setDriverEmpId] = useState<string>(
    route.params?.driverEmpId || ""
  );
  const [driverName, setDriverName] = useState<string>(
    route.params?.driverName || ""
  );
  const [driverData, setDriverData] = useState<any>(route.params || null);

  const passedItems = route.params?.items;
  const [items, setItems] = useState<CropLoadData[]>(
    Array.isArray(passedItems) ? passedItems : []
  );
  const [loading, setLoading] = useState<boolean>(!!transportId);

  const fetchLoadDetails = useCallback(async () => {
    if (!transportId) return;

    try {
      setLoading(true);
      const authToken = store.getState().auth.token;

      const queryParam = isUnloadedParam ? "?type=unloaded" : "";
      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/load/${transportId}${queryParam}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if (data.transferCode) setLoadCode(data.transferCode);
        if (data.vehicleNo && data.vehicleNo !== "N/A") setVehicleNo(data.vehicleNo);
        if (data.driverEmpId) setDriverEmpId(data.driverEmpId);
        if (data.driverName) setDriverName(data.driverName);
        setDriverData(data);
        if (data.isUnloaded !== undefined) {
          setIsUnloaded(data.isUnloaded || isUnloadedParam);
        }
        if (Array.isArray(data.items)) {
          setItems(data.items);
        }
      } else {
        Alert.alert(
          t("Error.error", "Error"),
          response.data.message ||
            t("Error.Failed to fetch load details", "Failed to fetch load details.")
        );
      }
    } catch (err) {
      console.error("Error fetching received load details:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to fetch load details", "Failed to fetch load details.")
      );
    } finally {
      setLoading(false);
    }
  }, [transportId, isUnloadedParam, t]);

  useEffect(() => {
    fetchLoadDetails();
  }, [fetchLoadDetails]);

  const handleStartUnloading = () => {
    navigation.navigate("UnloadingProducts", {
      transportId,
      loadCode,
      vehicleNo,
      items,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title={
          isUnloaded
            ? t("ReceivedProductsSummary.UnloadedSummary", passedTitle || "Unloaded Summery")
            : t("ReceivedProductsSummary.Title", "Summery")
        }
        navigation={navigation}
      />

      {loading ? (
        <LoadingPage message={t("ReceivedProductsSummary.Loading", "Loading load details...")} />
      ) : items.length === 0 ? (
        <NoDataScreen message={t("ReceivedProductsSummary.NoItems", "- No items found in this load -")} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {/* Dark Load Info Summary Card */}
            <View
              className="w-full rounded-[28px] p-5 mb-5"
              style={{
                backgroundColor: "#17262C",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              {/* Transfer ID Row */}
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3.5">
                  <FontAwesome5 name="boxes" size={16} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs font-normal">
                    {t("LoadAssigned.TransferID", "Transfer ID")}
                  </Text>
                  <Text className="text-white text-base font-bold mt-0.5">
                    {loadCode || "—"}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View className="h-[1px] bg-gray-700/60 my-3" />

              {/* Driver Row */}
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3.5">
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs font-normal">
                    {t("LoadAssigned.Driver", "Driver")}
                  </Text>
                  <Text className="text-white text-base font-bold mt-0.5">
                    {getLocalizedDriverName(driverData, i18n.language) ||
                      driverName ||
                      driverEmpId ||
                      "—"}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View className="h-[1px] bg-gray-700/60 my-3" />

              {/* Vehicle Registration Number Row */}
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3.5">
                  <FontAwesome6 name="truck" size={16} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs font-normal">
                    {t(
                      "LoadAssigned.VehicleRegistrationNumber",
                      "Vehicle Registration Number"
                    )}
                  </Text>
                  <Text className="text-white text-base font-bold mt-0.5">
                    {vehicleNo || "—"}
                  </Text>
                </View>
              </View>
            </View>
            {items.map((crop) => (
              <View
                key={crop.id}
                className="bg-white rounded-3xl p-4 mb-5"
                style={{
                  borderWidth: 1,
                  borderColor: "#9C9C9C",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {/* Crop Header */}
                <View className="flex-row items-center mb-3">
                  {crop.imageUri ? (
                    <Image
                      source={{ uri: crop.imageUri }}
                      className="w-12 h-12 rounded-xl mr-3"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-xl bg-gray-100 mr-3 items-center justify-center">
                      <MaterialCommunityIcons name="sprout" size={24} color="#54617D" />
                    </View>
                  )}
                  <Text className="text-base font-bold text-black">
                    {getLocalizedProductName(crop, i18n.language) || crop.cropName}
                  </Text>
                </View>

                {/* Total Dark Card */}
                <View
                  className="rounded-2xl p-4 flex-row items-center justify-between mb-4"
                  style={{ backgroundColor: "#17262C" }}
                >
                  {/* Total Weight */}
                  <View className="flex-1 items-center">
                    <FontAwesome6
                      name="weight-scale"
                      size={24}
                      color="#FFFFFF"
                      style={{ marginBottom: 4 }}
                    />
                    <Text className="text-gray-300 text-xs text-center">
                      {t("LoadingToVehicleSummary.TotalWeight", "Total Weight")}
                    </Text>
                    <Text className="text-white text-base font-bold mt-1">
                      {crop.totalWeightKg.toFixed(2)} {t("Common.kg", "kg")}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View className="w-[1px] h-14 bg-gray-600 mx-2" />

                  {/* Total Crates */}
                  <View className="flex-1 items-center">
                    <FontAwesome5
                      name="boxes"
                      size={22}
                      color="#FFFFFF"
                      style={{ marginBottom: 4 }}
                    />
                    <Text className="text-gray-300 text-xs text-center">
                      {t("ReceivedProductsSummary.TotalCrates", "Total Crates")}
                    </Text>
                    <Text className="text-white text-base font-bold mt-1">
                      {crop.totalCrates}
                    </Text>
                  </View>
                </View>

              {/* Grade Sets List */}
              <View className="gap-y-4">
                {crop.gradeSets.map((gs, idx) => (
                  <View key={idx} className="relative pt-3">
                    {/* Centered Pill Badge */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        zIndex: 10,
                      }}
                    >
                      <View className="bg-[#FFF6AD] px-4 py-0.5 rounded-full">
                        <Text className="text-[11px] font-bold text-gray-800">
                          {t("ReceivedProductsSummary.Grade", "Grade")} {gs.grade.replace(/^Grade\s*/i, "")}  |  {t("ReceivedProductsSummary.Set", "Set")} : {gs.set}
                        </Text>
                      </View>
                    </View>

                    {/* Inner Box */}
                    <View
                      className="bg-[#FAFAFA] rounded-2xl p-3 flex-row items-center justify-around"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: "#19282F",
                      }}
                    >
                      {/* Crates Column */}
                      <View className="flex-row items-center gap-x-2">
                        <View className="w-8 h-8 rounded-full bg-[#E5E7EB] items-center justify-center">
                          <FontAwesome5 name="boxes" size={14} color="#000000" />
                        </View>
                        <View>
                          <Text className="text-[10px] text-black font-medium">
                            {t("ReceivedProductsSummary.Crates", "Crates")}
                          </Text>
                          <Text className="text-sm font-bold text-black">
                            {gs.crates}
                          </Text>
                        </View>
                      </View>

                      {/* Weight Column */}
                      <View className="flex-row items-center gap-x-2">
                        <View className="w-8 h-8 rounded-full bg-[#E5E7EB] items-center justify-center">
                          <FontAwesome6
                            name="weight-scale"
                            size={16}
                            color="#000000"
                          />
                        </View>
                        <View>
                          <Text className="text-[10px] text-black font-medium">
                            {t("ReceivedProductsSummary.Weight", "Weight")}
                          </Text>
                          <Text className="text-sm font-bold text-black">
                            {gs.weightKg.toFixed(2)} {t("Common.kg", "kg")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Button: "Start Unloading" */}
        {!isUnloaded && (
          <View className="pt-4 pb-2">
            <TouchableOpacity
              onPress={handleStartUnloading}
              activeOpacity={0.8}
              className="w-full h-[50px] bg-[#000000] rounded-full items-center justify-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 4,
              }}
            >
              <Text className="text-white font-extrabold text-base">
                {t("ReceivedProductsSummary.StartUnloading", "Start Unloading")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      )}
    </View>
  );
}
