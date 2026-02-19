import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types'; // Adjust the path to your types file
import { useTranslation } from "react-i18next";
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GenericNavigationProp = StackNavigationProp<RootStackParamList, keyof RootStackParamList>;

type TransportComponentProps = {
  navigation: GenericNavigationProp;
};

const TransportComponent: React.FC<TransportComponentProps> = ({ navigation }) => {
        const { t } = useTranslation();
        const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

        useEffect(() => {
          const fetchLanguage = async () => {
            try {
              const lang = await AsyncStorage.getItem("@user_language"); // Get stored language
              setSelectedLanguage(lang || "en"); // Default to English if not set
            } catch (error) {
              console.error("Error fetching language preference:", error);
            }
          };
          fetchLanguage();
        }, []);
  
        const getTextStyle = (language: string) => {
          if (language === "si") {
            return {
              fontSize: 14, // Smaller text size for Sinhala
              lineHeight: 20, // Space between lines
            };
          }
         
        };
  return (
    <View className="flex flex-row flex-wrap justify-between items-center p-7">
      {/* First Row */}
      <View className="flex-row justify-between w-full mb-4">
        {/* Register Drivers */}
        <TouchableOpacity
          className="bg-white p-4 rounded-lg w-[45%] h-28 shadow-lg shadow-gray-500 relative"
          onPress={() => navigation.navigate("RegisterDriver" as any)}
        >
          <Image
            source={require('../../assets/images/pick.png')}
            className="w-8 h-8 absolute top-2 right-2"
          />
          <Text className="text-gray-700 text-lg absolute bottom-2 left-2" style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}>{t("Transport.Register Drivers")}</Text>
        </TouchableOpacity>

        {/* Add Farmer Requests */}
        <TouchableOpacity
          className="bg-white p-4 rounded-lg w-[45%] h-28 shadow-lg shadow-gray-500 relative"
          onPress={() => navigation.navigate("SearchFarmerScreen" as any)}
        >
          <Image
            source={require('../../assets/images/brief.png')}
            className="w-8 h-8 absolute top-2 right-2"
          />
          <Text className="text-gray-700 text-lg absolute bottom-2 left-2" style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}>{t("Transport.Add Farmer Requests")}</Text>
        </TouchableOpacity>
      </View>

      {/* Second Row */}
      <View className="flex-row justify-start w-full mt-[20%]">
        {/* View Farmer Requests */}
        <TouchableOpacity
          className="bg-white p-4 rounded-lg w-[45%] h-28 shadow-lg shadow-gray-500 relative"
          onPress={() => navigation.navigate("CollectionRequests" as any)}
        >
          <Image
            source={require('../../assets/images/help.png')}
            className="w-8 h-8 absolute top-2 right-2"
          />
          <Text className="text-gray-700 text-lg absolute bottom-2 left-2" style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}>{t("Transport.View Farmer Requests")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TransportComponent;