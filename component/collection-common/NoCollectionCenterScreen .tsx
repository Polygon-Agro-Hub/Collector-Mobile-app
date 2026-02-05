import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { View, Text, Image, BackHandler } from 'react-native';
import { RootStackParamList } from '../types';
import { ScrollView } from 'react-native-gesture-handler';
import { useTranslation } from "react-i18next";

type NoCollectionCenterScreenNavigationProps = StackNavigationProp<RootStackParamList, 'NoCollectionCenterScreen'>;

interface NoCollectionCenterScreenProps {
  navigation: NoCollectionCenterScreenNavigationProps;
}

const NoCollectionCenterScreen: React.FC<NoCollectionCenterScreenProps> = ({ navigation }) => {

    const { t } = useTranslation();
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('Login');
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <ScrollView className='flex-1 bg-white '>
    <View className="flex-1 bg-white justify-center items-center">
     
      {/* Error Text */}
      <View className="items-center mb-[25%]">
        <Text className="text-lg font-semibold  text-black-300 mt-[20%]">{t("NoCollectionCenterScreen.ErrorFound")}</Text>
        <Text className="text-2xl font-bold text-black mt-2">
          {t("NoCollectionCenterScreen.NoCenter")}
        </Text>
      </View>

      {/* Illustration */}
      <View className="w-full flex items-center justify-center">
        <Image
          source={require('../../assets/images/noUser.webp')}
          className="w-80 h-80"
          resizeMode="contain"
        />
      </View>
    
    </View>
    </ScrollView>
  );
};

export default NoCollectionCenterScreen;
