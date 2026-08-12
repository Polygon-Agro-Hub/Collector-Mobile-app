import React, { useEffect, useContext, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { LanguageContext } from "@/context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView } from "react-native-gesture-handler";

type LanuageScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Lanuage"
>;

interface LanuageProps {
  navigation: LanuageScreenNavigationProp;
}

const lg = require("../../../assets/images/common/language.webp");

const Lanuage: React.FC<LanuageProps> = ({ navigation }) => {
  const { changeLanguage } = useContext(LanguageContext);

  const handleLanguageSelect = async (language: string) => {
    try {
      await AsyncStorage.setItem("@user_language", language);
      changeLanguage(language);
      navigation.navigate("Login");
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  return (
    <ScrollView
      className="bg-white flex-1"
      contentContainerStyle={{ flexGrow: 1, padding: 4 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 bg-white justify-center max-w-[500px] w-full mx-auto">
        <View className="items-center">
          <Image
            className="w-52 h-52 rounded-full"
            style={{ width: 208, height: 208, maxWidth: "100%", alignSelf: "center" }}
            source={lg}
            resizeMode="contain"
          />
          <Text className="text-3xl pt-5 font-semibold">Language</Text>
          <Text className="text-lg pt-5 font-extralight">
            மொழியைத் தேர்ந்தெடுக்கவும்
          </Text>
          <Text className="text-lg pt-1 font-extralight">
            කරුණාකර භාෂාව තෝරන්න
          </Text>
        </View>

        <View className="w-64 self-center mt-8">
          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl mb-6 items-center justify-center h-[50px]"
            onPress={() => handleLanguageSelect("en")}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text className="text-white text-center text-lg">ENGLISH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl mb-6 items-center justify-center h-[50px]"
            onPress={() => handleLanguageSelect("si")}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text className="text-white text-center text-lg">සිංහල</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl items-center justify-center h-[50px]"
            onPress={() => handleLanguageSelect("ta")}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text className="text-white text-center text-lg">தமிழ்</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default Lanuage;