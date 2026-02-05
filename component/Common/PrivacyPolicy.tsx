import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity,BackHandler } from "react-native";
import { RootStackParamList } from "../types";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useFocusEffect } from "@react-navigation/native";
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
  const adjustFontSize = (size: number) => (language !== "en" ? size * 0.9 : size);
  
  useEffect(() => {
    const selectedLanguage = t("PrivacyPlicy.LNG");
    setLanguage(selectedLanguage);
  }, [t]);
     useFocusEffect(
        React.useCallback(() => {
          const onBackPress = () => {
            navigation.goBack(); 
            return true; // Prevent default back action
          };
      
          BackHandler.addEventListener("hardwareBackPress", onBackPress);
         const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
        }, [navigation])
      );

  return (
    <ScrollView className="flex-1 bg-white"        
     style={{ paddingHorizontal: wp(4) , paddingVertical: hp(2)}}
    >
      {/* Header Section */}
      <View className="flex-row items-center  ">
      <TouchableOpacity onPress={()=>navigation.goBack()} className="absolute z-20 bg-[#F6F6F680] rounded-full p-2">
      {/* Back Button with PNG image */}
      <AntDesign name="left" size={24} color="#000000" />
    </TouchableOpacity>
        <Text className="text-center flex-1 text-lg font-bold text-black"  style={{ fontSize: adjustFontSize(18) }}>
        {t("PrivacyPlicy.PrivacyPolicy")}
        </Text>
      </View>
            <Text className="text-sm  mt-8 text-center font-bold "  >{t("PrivacyPlicy.PrivacyPlicyCompany")}</Text>

      <Text className="text-sm text-blue-500 mt-4 text-center font-bold "  >{t("PrivacyPlicy.By")} {t("PrivacyPlicy.Date")}</Text>

      {/* Scrollable Content */}
      <View className="p-2" >
        {/* Part 1 */}
       
        <Text className="text-sm text-gray-700 mt-4 text-justify"  style={{ fontSize: adjustFontSize(14) }}>
        {t("PrivacyPlicy.explain")}
        </Text>
        <View className="flex-row justify-center items-center my-4" >
       
 
        </View>

        {/* Part 2 */}
        <Text className="text-lg font-bold "  style={{ fontSize: adjustFontSize(16) }}>1. {t("PrivacyPlicy.InformationWeCollect")}</Text>
        <Text className="text-sm text-justify text-gray-700 mt-1" >
        {t("PrivacyPlicy.RegistrationInformationTxt")}
        </Text>

        {/* Part 3 */}
        <Text className="text-lg font-bold mt-6" style={{ fontSize: adjustFontSize(16) }}>2.  {t("PrivacyPlicy.HowWeUseYourInformation")}</Text>
        <Text className="text-sm text-gray-700 text-justify mt-1">
        {t("PrivacyPlicy.ToProvideServicesTxt")}
        </Text>

        {/* Part 4 */}
        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>
          3. {t("PrivacyPlicy.InformationSharingandDisclosure")}
        </Text>

        <Text className="text-sm text-gray-700 mt-1 text-justify">
        {t("PrivacyPlicy.ServiceProvidersTxt")}
        </Text>

        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>
          4.  {t("PrivacyPlicy.SecurityofYourInformation")}
        </Text>
        <Text className="text-sm mt-1 text-gray-700 text-justify">
        {t("PrivacyPlicy.SecurityofYourInformationTxt")}
        </Text>
        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>5. {t("PrivacyPlicy.YourPrivacyChoices")}</Text>
        <Text className="text-sm mt-1 text-gray-700 text-justify">
        {t("PrivacyPlicy.YourPrivacyChoicesTxt")}        
        </Text>
        
        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>6. {t("PrivacyPlicy.ChildrensPrivacy")} </Text>
        <Text className="text-sm mt-1 text-gray-700 text-justify">
        {t("PrivacyPlicy.ChildrensPrivacyTxt")} 
        </Text>
        
        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>7. {t("PrivacyPlicy.UpdatestothisPrivacyPolicy")}</Text>
        <Text className="text-sm mt-1 text-gray-700 text-justify">
        {t("PrivacyPlicy.UpdatestothisPrivacyPolicyTxt")}       
         </Text>

        <Text className="text-lg font-bold mt-4" style={{ fontSize: adjustFontSize(16) }}>8. {t("PrivacyPlicy.ContactUs")}</Text>
        <Text className="text-sm mt-1 text-gray-700 mb-12 text-justify">
        {t("PrivacyPlicy.ContactUsText")}       
         </Text>
         </View>
      </ScrollView>
  );
};

export default PrivacyPolicy;
