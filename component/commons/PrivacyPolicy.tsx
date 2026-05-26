import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, BackHandler } from "react-native";
import { RootStackParamList } from "../types/types";
import { useTranslation } from "react-i18next";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useFocusEffect } from "@react-navigation/native";
import CustomHeader from "../navigations/CustomHeader";
type PrivacyPolicyNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PrivacyPolicy"
>;

interface PrivacyPolicyProps {
  navigation: PrivacyPolicyNavigationProp;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ navigation }) => {
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const adjustFontSize = (size: number) =>
    language !== "en" ? size * 0.9 : size;

  useEffect(() => {
    const selectedLanguage = t("PrivacyPlicy.LNG");
    setLanguage(selectedLanguage);
  }, [t]);
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
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

  return (
    <ScrollView className="flex-1 bg-white">
      <CustomHeader
        title={t("PrivacyPlicy.PrivacyPolicy")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />
      <View style={{ paddingHorizontal: wp(2), paddingVertical: hp(2) }}>
        <Text className="text-sm   text-center font-bold ">
          {t("PrivacyPlicy.PrivacyPlicyCompany")}
        </Text>

        <Text className="text-sm text-blue-500 mt-4 text-center font-bold ">
          {t("PrivacyPlicy.By")} {t("PrivacyPlicy.Date")}
        </Text>

        {/* Scrollable Content */}
        <View className="p-2">
          <Text
            className="text-sm text-gray-700 mt-4 text-justify"
            style={{ fontSize: adjustFontSize(14) }}
          >
            {t("PrivacyPlicy.explain")}
          </Text>
          <View className="flex-row justify-center items-center my-4"></View>

          <Text
            className="text-lg font-bold "
            style={{ fontSize: adjustFontSize(16) }}
          >
            1. {t("PrivacyPlicy.InformationWeCollect")}
          </Text>
          <Text className="text-sm text-justify text-gray-700 mt-1">
            {t("PrivacyPlicy.RegistrationInformationTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-6"
            style={{ fontSize: adjustFontSize(16) }}
          >
            2. {t("PrivacyPlicy.HowWeUseYourInformation")}
          </Text>
          <Text className="text-sm text-gray-700 text-justify mt-1">
            {t("PrivacyPlicy.ToProvideServicesTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            3. {t("PrivacyPlicy.InformationSharingandDisclosure")}
          </Text>

          <Text className="text-sm text-gray-700 mt-1 text-justify">
            {t("PrivacyPlicy.ServiceProvidersTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            4. {t("PrivacyPlicy.SecurityofYourInformation")}
          </Text>
          <Text className="text-sm mt-1 text-gray-700 text-justify">
            {t("PrivacyPlicy.SecurityofYourInformationTxt")}
          </Text>
          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            5. {t("PrivacyPlicy.YourPrivacyChoices")}
          </Text>
          <Text className="text-sm mt-1 text-gray-700 text-justify">
            {t("PrivacyPlicy.YourPrivacyChoicesTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            6. {t("PrivacyPlicy.ChildrensPrivacy")}{" "}
          </Text>
          <Text className="text-sm mt-1 text-gray-700 text-justify">
            {t("PrivacyPlicy.ChildrensPrivacyTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            7. {t("PrivacyPlicy.UpdatestothisPrivacyPolicy")}
          </Text>
          <Text className="text-sm mt-1 text-gray-700 text-justify">
            {t("PrivacyPlicy.UpdatestothisPrivacyPolicyTxt")}
          </Text>

          <Text
            className="text-lg font-bold mt-4"
            style={{ fontSize: adjustFontSize(16) }}
          >
            8. {t("PrivacyPlicy.ContactUs")}
          </Text>
          <Text className="text-sm mt-1 text-gray-700 mb-12 text-justify">
            {t("PrivacyPlicy.ContactUsText")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicy;
