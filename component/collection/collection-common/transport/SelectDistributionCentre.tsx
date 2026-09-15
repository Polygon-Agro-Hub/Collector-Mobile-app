import React, { useState } from "react";
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
import { FontAwesome6 } from "@expo/vector-icons";

type SelectDistributionCentreNavigationProps = StackNavigationProp<
  RootStackParamList,
  "SelectDistributionCentre"
>;

interface SelectDistributionCentreProps {
  navigation: SelectDistributionCentreNavigationProps;
}

export interface DistributionCentreItem {
  id: string;
  name: string;
  code: string;
}

const DUMMY_CENTRES: DistributionCentreItem[] = [
  {
    id: "1",
    name: "Ampara Centre",
    code: "D-APAA-01",
  },
  {
    id: "2",
    name: "Bambalapitiya Centre",
    code: "D-WPCB-01",
  },
  {
    id: "3",
    name: "Kollupitiya Centre",
    code: "D-WPCK-01",
  },
];

export default function SelectDistributionCentre({
  navigation,
}: SelectDistributionCentreProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [centres] = useState<DistributionCentreItem[]>(DUMMY_CENTRES);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedCentreId) return;
    const selectedCentre = centres.find((c) => c.id === selectedCentreId);
    navigation.navigate("LoadingToVehicle", {
      vehicleNo: "BKH-5578",
      centreId: selectedCentre?.id,
      centreName: selectedCentre?.name,
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
        {centres.length === 0 ? (
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
