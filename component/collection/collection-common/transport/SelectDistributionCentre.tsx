import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";
import LoadingPage from "@/component/components/loading/LoadingPage";
import { FontAwesome6 } from "@expo/vector-icons";
import axios from "axios";
import environment from "@/environment/environment";
import store from "@/services/reducxStore";

import { RouteProp } from "@react-navigation/native";

type SelectDistributionCentreNavigationProps = StackNavigationProp<
  RootStackParamList,
  "SelectDistributionCentre"
>;

type SelectDistributionCentreRouteProps = RouteProp<
  RootStackParamList,
  "SelectDistributionCentre"
>;

interface SelectDistributionCentreProps {
  navigation: SelectDistributionCentreNavigationProps;
  route: SelectDistributionCentreRouteProps;
}

export interface DistributionCentreItem {
  id: string;
  name: string;
  code: string;
}

export default function SelectDistributionCentre({
  navigation,
  route,
}: SelectDistributionCentreProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [centres, setCentres] = useState<DistributionCentreItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);

  const fetchCentres = useCallback(async () => {
    try {
      setLoading(true);

      const authToken = store.getState().auth.token;
    
       const response = await axios.get(
              `${environment.API_BASE_URL}api/transport/distribution-centres`,
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                },
              },
            );

      if (response.data.success) {
        setCentres(response.data.data);
      } else {
        setCentres([]);
      }
    } catch (err) {
      console.error("Error fetching collection centres:", err);
      Alert.alert(
        t("Error.error", "Error"),
        t("Error.Failed to fetch centres.", "Failed to fetch distribution centres."),
      );
      setCentres([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  const handleContinue = () => {
    if (!selectedCentreId) return;
    const selectedCentre = centres.find((c) => c.id === selectedCentreId);

    store.dispatch({
      type: "transport/setTransportDestination",
      payload: {
        centreId: selectedCentre?.id ?? null,
        centreName: selectedCentre?.name ?? null,
      },
    });

    navigation.navigate("LoadingToVehicle", {
      vehicleNo: route.params?.vehicleNo || "N/A",
      centreId: selectedCentre?.id,
      centreName: selectedCentre?.name,
      driverId: route.params?.driverId,
      driverEmpId: route.params?.driverEmpId,
      driverName: route.params?.driverName,
      vehicleId: route.params?.vehicleId,
      vType: route.params?.vType,
      vCapacity: route.params?.vCapacity,
    });
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <CustomHeader
        title={t("SelectDistributionCentre.Title", "Select Distribution Centre")}
        navigation={navigation}
      />

      <View className="flex-1">
        {loading ? (
          /* Loading State */
          <LoadingPage
            message={t("SelectDistributionCentre.Loading", "Loading...")}
          />
        ) : centres.length === 0 ? (
          /* Empty State */
          <NoDataScreen
            message={t(
              "SelectDistributionCentre.NoCentresFound",
              "- No distribution centres found -"
            )}
          />
        ) : (
          /* List of Distribution Centres */
          <ScrollView
            className="flex-1 px-6 pt-4"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {centres.map((centre) => {
              const isSelected = centre.id === selectedCentreId;
              return (
                <TouchableOpacity
                  key={centre.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCentreId(centre.id)}
                  className={`flex-row items-center bg-white border rounded-2xl p-4 my-2 ${
                    isSelected ? "border-[#000000] border-[1.5px]" : "border-[#E1E7EE]"
                  }`}
                  style={{
                    backgroundColor: "#ffffff",
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.08 : 0.04,
                    shadowRadius: 5,
                    elevation: 2,
                  }}
                >
                  {/* Building Icon Badge */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: "#E9ECF1" }}
                  >
                    <FontAwesome6 name="building-circle-arrow-right" size={18} color="black" />
                  </View>

                  {/* Centre Info */}
                  <View className="flex-1">
                    <Text className="font-extrabold text-[#030E25] text-base">
                      {centre.name}
                    </Text>
                    <Text className="text-xs text-[#676771] mt-0.5 font-medium">
                      {centre.code}
                    </Text>
                  </View>

                  {/* Radio Button Indicator */}
                  <View className="w-6 h-6 rounded-full border-2 border-[#000000] items-center justify-center">
                    {isSelected && (
                      <View className="w-3 h-3 rounded-full bg-[#000000]" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Bottom Select & Continue Button */}
      <View
        style={{ paddingBottom: insets.bottom + 16 }}
        className="px-6 pt-3 bg-white"
      >
        <TouchableOpacity
          disabled={!selectedCentreId}
          onPress={handleContinue}
          activeOpacity={0.8}
          className={`w-full h-[50px] rounded-full items-center justify-center ${
            selectedCentreId ? "bg-[#000000]" : "bg-[#ACB5BE]"
          }`}
          style={
            selectedCentreId
              ? {
                  backgroundColor: "#000000",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 5,
                }
              : undefined
          }
        >
          <Text className="text-white font-extrabold text-base">
            {t("SelectDistributionCentre.SelectAndContinue", "Select & Continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}