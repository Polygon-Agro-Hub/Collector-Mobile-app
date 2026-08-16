import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  BackHandler,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { RootStackParamList } from "@/types/types";

type NotEligibleScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "NotEligibleScreen"
>;

type NotEligibleScreenRouteProp = RouteProp<
  RootStackParamList,
  "NotEligibleScreen"
>;

interface NotEligibleScreenProps {
  navigation: NotEligibleScreenNavigationProp;
  route: NotEligibleScreenRouteProp;
}

const NotEligibleScreen: React.FC<NotEligibleScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <CustomHeader
        title={t("GoviPensionForm.GoViPension")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Image */}
        <View className="items-center justify-center mt-4 mb-8">
          <View className="w-64 h-64 overflow-hidden">
            <Image
              source={require("../../../../assets/images/govi-pension/not-eligible.webp")}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Status Title */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-black">Not Eligible Yet</Text>
        </View>

        {/* Status Content */}
        <View className="px-8 mb-8">
          <Text className="text-md text-[#4B6B87] text-center leading-5">
            The farmer haven’t completed any cultivation yet.
          </Text>
        </View>

        {/* Spacer to push button to bottom */}
        <View className="flex-1" />
      </ScrollView>

      {/* Action Button - Always "Go Back" */}
      <View className="px-4 mb-20 bg-white">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-[#353535] rounded-3xl h-[50px] items-center justify-center flex-row w-full"
          activeOpacity={0.8}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <Text
            className="text-white text-center font-bold text-lg"
            style={{
              color: "#ffffff",
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {t("GoviPensionStatus.GoBack") || "Go Back"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NotEligibleScreen;
