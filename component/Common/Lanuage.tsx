import React,{useEffect, useState, useContext, useCallback} from 'react';
import { View, Text, Image, TouchableOpacity, BackHandler,  } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
const lg = require('../../assets/images/New/language.png');
import { RootStackParamList } from '../types';
import { LanguageContext } from '@/context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView } from 'react-native-gesture-handler';

type LanuageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Lanuage'>;

interface LanuageProps {
  navigation: LanuageScreenNavigationProp;
}

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
        console.error(("Failed to retrieve language preference:"), error);
      }
    };

    checkLanguagePreference();
  }, []); // Empty dependency array means this effect runs only once

  const handleLanguageSelect = async (language: string) => {
    try {
      await AsyncStorage.setItem("@user_language", language);
      changeLanguage(language);
      navigation.navigate("Login"); // Navigate to SignupForum
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  };

        useFocusEffect(
        useCallback(() => {
          const onBackPress = () => true;
          BackHandler.addEventListener("hardwareBackPress", onBackPress);
             const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
        }, [])
      );

  return (
    <ScrollView className = "bg-white">
    <View className="flex-1 bg-white items-center">
      <Image  className="mt-20 w-40 h-40 rounded-full mr-3" source={lg} resizeMode="contain" />
      <Text className="text-3xl pt-5 font-semibold">Language</Text>
      <Text className="text-lg pt-5 font-extralight">மொழியைத் தேர்ந்தெடுக்கவும்</Text>
      <Text className="text-lg pt-1 mb-0 font-extralight">කරුණාකර භාෂාව තෝරන්න</Text>

      {/* TouchableOpacity Buttons */}
      <View className="flex-1 justify-center w-64 px-4 mt-4 pt-0">
        <TouchableOpacity className="bg-[#413A3F] p-4 rounded-3xl mb-6"  onPress={() => handleLanguageSelect("en")}>
          <Text className="text-white text-lg text-center">ENGLISH</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-[#413A3F] p-4 rounded-3xl mb-6 " onPress={() => handleLanguageSelect("si")} >
          <Text className="text-white text-2xl text-center">සිංහල</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-[#413A3F] p-4 rounded-3xl mb-12"  onPress={() => handleLanguageSelect("ta")}>
          <Text className="text-white text-2xl text-center ">தமிழ்</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScrollView>
  );
};

export default Lanuage;