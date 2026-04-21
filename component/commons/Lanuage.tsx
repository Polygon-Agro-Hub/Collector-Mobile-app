import React, { useEffect, useContext, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
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

const lg = require("../../assets/images/common/language.webp");

const Lanuage: React.FC<LanuageProps> = ({ navigation }) => {
  const { changeLanguage } = useContext(LanguageContext);

  useEffect(() => {
    const checkLanguagePreference = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem("@user_language");
        if (storedLanguage) {
          handleLanguageSelect(storedLanguage);
        }
      } catch (error) {
        console.error("Failed to retrieve language preference:", error);
      }
    };

    checkLanguagePreference();
  }, []);

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
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  return (
    <ScrollView 
      className="bg-white"
      contentContainerStyle={{ flexGrow: 1, padding: 4 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 bg-white justify-center">
        {/* Image and text section */}
        <View className="items-center">
          <Image
            className="w-40 h-40 rounded-full"
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

        {/* Buttons section */}
        <View className="w-64 self-center mt-8">
          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl mb-6 items-center justify-center"
            style={{ height: 50 }}
            onPress={() => handleLanguageSelect("en")}
          >
            <Text 
              className="text-white text-center"
              style={{ fontSize: 18 }}
            >
              ENGLISH
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl mb-6 items-center justify-center"
            style={{ height: 50 }}
            onPress={() => handleLanguageSelect("si")}
          >
            <Text 
              className="text-white text-center"
              style={{ fontSize: 18 }}
            >
              සිංහල
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-[#413A3F] rounded-3xl items-center justify-center"
            style={{ height: 50 }}
            onPress={() => handleLanguageSelect("ta")}
          >
            <Text 
              className="text-white text-center"
              style={{ fontSize: 18 }}
            >
              தமிழ்
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default Lanuage;