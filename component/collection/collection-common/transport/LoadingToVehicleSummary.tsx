import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LoadingPage from "@/component/components/loading/LoadingPage";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import axios from "axios";
import store from "@/services/reducxStore";
import environment from "@/environment/environment";
import { clearTransportLoad } from "@/store/transportSlice";

type LoadingToVehicleSummaryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LoadingToVehicleSummary"
>;

type LoadingToVehicleSummaryRouteProp = RouteProp<
  RootStackParamList,
  "LoadingToVehicleSummary"
>;

interface LoadingToVehicleSummaryProps {
  navigation: LoadingToVehicleSummaryNavigationProp;
  route: LoadingToVehicleSummaryRouteProp;
}

export interface GradeSetItem {
  grade: string;
  gradeKey?: string;
  set: number;
  crates: number;
  weightKg: number;
}

export interface CropLoadData {
  id: string;
  cropId?: string;
  cropLabel?: string;
  varietyId?: string;
  varietyLabel?: string;
  cropName: string;
  imageUri: string;
  totalWeightKg: number;
  totalCrates: number;
  gradeSets: GradeSetItem[];
}

const DEFAULT_CROP_IMAGE =
  "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=150&auto=format&fit=crop&q=80";

export default function LoadingToVehicleSummary({
  navigation,
  route,
}: LoadingToVehicleSummaryProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const isViewOnly = !!(route.params?.isViewOnly || route.params?.transportId);
  const transportId = route.params?.transportId;

  const [loading, setLoading] = useState<boolean>(isViewOnly && !!transportId);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
  const [centreName, setCentreName] = useState<string>(
    route.params?.centreName || ""
  );

  const passedItems = route.params?.items;
  const [items, setItems] = useState<CropLoadData[]>(
    Array.isArray(passedItems) ? passedItems : []
  );

  const fetchLoadDetails = useCallback(async () => {
    if (!transportId) return;

    try {
      setLoading(true);
      const authToken = store.getState().auth.token;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/transport/load/${transportId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if (data.transferCode) setLoadCode(data.transferCode);
        if (data.vehicleNo) setVehicleNo(data.vehicleNo);
        if (data.driverEmpId) setDriverEmpId(data.driverEmpId);
        if (data.driverName) setDriverName(data.driverName);
        if (data.centreName) setCentreName(data.centreName);
        if (Array.isArray(data.items)) {
          setItems(data.items);
        }
      } else {
        Alert.alert(
          t("Error.error", "Error"),
          response.data.message || t("Error.Failed to fetch load details", "Failed to fetch load details.")
        );
      }
    } catch (err) {
      console.error("Error fetching load details:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to fetch load details", "Failed to fetch load details.")
      );
    } finally {
      setLoading(false);
    }
  }, [transportId, t]);

  useEffect(() => {
    if (isViewOnly && transportId) {
      fetchLoadDetails();
    }
  }, [isViewOnly, transportId, fetchLoadDetails]);

  const handleViewQRCode = () => {
    navigation.navigate("LoadQR", {
      transportId,
      loadCode: loadCode || route.params?.loadCode,
      vehicleNo: vehicleNo || route.params?.vehicleNo,
      centreName: centreName || route.params?.centreName,
      driverId: driverEmpId || route.params?.driverEmpId,
      driverName: driverName || route.params?.driverName,
    });
  };

  const handleConfirmAndContinue = async () => {
    try {
      setSubmitting(true);
      const authToken = store.getState().auth.token;
      const transportState = store.getState().transport;

      // Extract driverId, centreId, and disComCenId from route params or Redux
      const driverId = route.params?.driverId ?? transportState.driverId;
      const centreId = route.params?.centreId ?? transportState.centreId;
      const disComCenId = route.params?.disComCenId ?? transportState.disComCenId;

      // Build items payload
      const reduxItems = transportState.loadedVarieties;
      const sourceItems = items.length > 0 ? items : (reduxItems as any[]);
      const finalItems = sourceItems.map((item: any) => ({
        varietyId: item.varietyId || item.id,
        gradeSets: item.gradeSets || [],
      }));

      const response = await axios.post(
        `${environment.API_BASE_URL}api/transport/save-load`,
        {
          driverId,
          centreId,
          disComCenId,
          items: finalItems,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.success) {
        const { transferCode, transportId: newTransportId } = response.data.data;
        store.dispatch(clearTransportLoad());
        navigation.navigate("LoadQR", {
          transportId: newTransportId || transportId,
          loadCode: transferCode || loadCode,
          vehicleNo: route.params?.vehicleNo || vehicleNo,
          centreName: route.params?.centreName || centreName,
          driverId: route.params?.driverEmpId || transportState.driverEmpId || driverEmpId || undefined,
          driverName: route.params?.driverName || transportState.driverName || driverName || undefined,
        });
      } else {
        Alert.alert(
          t("Error.error", "Error"),
          response.data.message || t("LoadingToVehicleSummary.SaveFailed", "Failed to save transport load.")
        );
      }
    } catch (error: any) {
      console.error("Error saving transport load:", error);
      Alert.alert(
        t("Error.error", "Error"),
        error?.response?.data?.message ||
          t("LoadingToVehicleSummary.SaveFailed", "Failed to save transport load. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title={t("LoadingToVehicleSummary.Title", "Summary")}
        navigation={navigation}
      />

      {loading ? (
        <LoadingPage message={t("LoadingToVehicleSummary.Loading", "Loading load details...")} />
      ) : items.length === 0 ? (
        <View className="flex-1">
          <NoDataScreen message={t("LoadingToVehicleSummary.NoItems", "No items found in this load.")} />
        </View>
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
                  <Image
                    source={{ uri: crop.imageUri || DEFAULT_CROP_IMAGE }}
                    className="w-12 h-12 rounded-xl mr-3"
                    resizeMode="cover"
                  />
                  <Text className="text-base font-bold text-black">
                    {crop.cropName}
                  </Text>
                </View>

                {/* Total Dark Card */}
                <View
                  className="rounded-2xl p-4 flex-row items-center justify-between mb-4"
                  style={{ backgroundColor: "#17262C" }}
                >
                  {/* Total Weight */}
                  <View className="flex-1 items-center">
                    <MaterialCommunityIcons
                      name="scale"
                      size={24}
                      color="#FFFFFF"
                      style={{ marginBottom: 4 }}
                    />
                    <Text className="text-gray-300 text-xs text-center">
                      Total{"\n"}Weight
                    </Text>
                    <Text className="text-white text-base font-bold mt-1">
                      {Number(crop.totalWeightKg || 0).toFixed(2)} kg
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
                      Total{"\n"}Crates
                    </Text>
                    <Text className="text-white text-base font-bold mt-1">
                      {crop.totalCrates || 0}
                    </Text>
                  </View>
                </View>

                {/* Grade Sets List */}
                <View className="gap-y-4">
                  {(crop.gradeSets || []).map((gs, idx) => (
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
                            {gs.grade}  |  Set : {gs.set}
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
                              Crates
                            </Text>
                            <Text className="text-sm font-bold text-black">
                              {gs.crates}
                            </Text>
                          </View>
                        </View>

                        {/* Weight Column */}
                        <View className="flex-row items-center gap-x-2">
                          <View className="w-8 h-8 rounded-full bg-[#E5E7EB] items-center justify-center">
                            <MaterialCommunityIcons
                              name="scale"
                              size={16}
                              color="#000000"
                            />
                          </View>
                          <View>
                            <Text className="text-[10px] text-black font-medium">
                              Weight
                            </Text>
                            <Text className="text-sm font-bold text-black">
                              {Number(gs.weightKg || 0).toFixed(2)} kg
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

          {/* Bottom Button */}
          <View className="pt-4 pb-2">
            <TouchableOpacity
              onPress={isViewOnly ? handleViewQRCode : handleConfirmAndContinue}
              disabled={submitting}
              activeOpacity={0.8}
              className="w-full h-[50px] bg-[#000000] rounded-full items-center justify-center"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 4,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-extrabold text-base">
                  {isViewOnly
                    ? t("LoadingToVehicleSummary.ViewQRCode", "View QR Code")
                    : t("LoadingToVehicleSummary.ConfirmAndContinue", "Confirm & Continue")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
