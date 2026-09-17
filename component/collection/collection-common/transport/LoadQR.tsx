import React from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type LoadQRNavigationProp = StackNavigationProp<
  RootStackParamList,
  "LoadQR"
>;

type LoadQRRouteProp = RouteProp<RootStackParamList, "LoadQR">;

interface LoadQRProps {
  navigation: LoadQRNavigationProp;
  route: LoadQRRouteProp;
}

const LoadQR: React.FC<LoadQRProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const transportId = route.params?.transportId;
  const loadCode = route.params?.loadCode || "";
  const vehicleNo = route.params?.vehicleNo || "";
  const driverId = route.params?.driverId || "";
  const driverName = route.params?.driverName || "";

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("SentProductsToday");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const handleNavigateToLoadAssigned = () => {
    navigation.navigate("LoadAssigned", {
      transportId,
      loadCode,
      vehicleNo,
      driverId,
      driverName,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header with Title */}
      <CustomHeader
        title={t("LoadQR.Title", "Generated QR")}
        navigation={navigation}
        showBackButton={true}
        showLanguageSelector={false}
        onBackPress={() => navigation.navigate("SentProductsToday")}
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full items-center">
          {/* Dark Prompt Banner */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNavigateToLoadAssigned}
            className="w-full rounded-2xl p-4 flex-row items-center mb-8"
            style={{ backgroundColor: "#17262C" }}
          >
            <View className="mr-3 p-2 border-r border-gray-600">
              <Ionicons name="qr-code" size={32} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold mb-1">
                {t("LoadQR.ScanQRImmediately", "Scan QR Immediately")}
              </Text>
              <Text className="text-gray-300 text-xs font-normal">
                {t("LoadQR.ShowQRToOfficer", "Show this QR to the relevant officer.")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* QR Code Container with Yellow Border */}
          <View className="items-center justify-center mb-8">
            <View
              className="bg-white p-6 rounded-3xl items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: "#FFE066",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <QRCode
                value={loadCode || "N/A"}
                size={240}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Info / Notice Footer Box */}
          <View className="w-full bg-[#F5F7FA] rounded-2xl p-4 flex-row items-center border border-gray-100">
            <View className="mr-3 p-1.5 border-r border-gray-300">
              <View className="w-7 h-7 rounded-full bg-black items-center justify-center">
                <Text className="text-white font-extrabold text-sm">!</Text>
              </View>
            </View>
            <Text className="flex-1 text-xs text-gray-700 font-medium leading-4">
              {t(
                "LoadQR.Notice",
                "Please scan the QR immediately to avoid delays in load assignment."
              )}
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

export default LoadQR;
