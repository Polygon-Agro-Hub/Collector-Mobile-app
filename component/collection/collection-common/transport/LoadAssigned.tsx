import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import LottieView from "lottie-react-native";
import { FontAwesome5, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type LoadAssignedNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LoadAssigned"
>;

type LoadAssignedRouteProp = RouteProp<RootStackParamList, "LoadAssigned">;

interface LoadAssignedProps {
  navigation: LoadAssignedNavigationProp;
  route: LoadAssignedRouteProp;
}

export default function LoadAssigned({ navigation, route }: LoadAssignedProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadCode = route.params?.loadCode || "L-DRV00001260911001";
  const driverId = route.params?.driverId || "DRV00001";
  const vehicleNo = route.params?.vehicleNo || "WP AB 1234";

  const handleGoToHome = () => {
    navigation.navigate("CollectionDashboard");
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <CustomHeader
        title={t("LoadAssigned.Title", "Load Assigned")}
        navigation={navigation}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          {/* Lottie Success Animation */}
          <View className="items-center justify-center my-4">
            <LottieView
              source={require("@/assets/lottie/loading-vehicle/success-loaded.json")}
              autoPlay
              loop={true}
              style={{ width: 240, height: 240 }}
            />
          </View>

          {/* Dark Info Summary Card */}
          <View
            className="w-full rounded-[28px] p-5 mb-6"
            style={{
              backgroundColor: "#122026",
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
                  {loadCode}
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
                  {driverId}
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
                  {vehicleNo}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Go to Home Button */}
        <View className="pt-4 pb-2">
          <TouchableOpacity
            onPress={handleGoToHome}
            activeOpacity={0.8}
            className="w-full h-[54px] rounded-full bg-[#000000] items-center justify-center"
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            <Text className="text-white font-extrabold text-base">
              {t("LoadAssigned.GoToHome", "Go to Home")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
