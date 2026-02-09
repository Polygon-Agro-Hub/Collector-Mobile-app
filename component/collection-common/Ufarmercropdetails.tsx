import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import * as ImagePicker from 'react-native-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTranslation } from "react-i18next";

type UfarmercropdetailsNavigationProp = StackNavigationProp<RootStackParamList, 'Ufarmercropdetails'>;

interface UfarmercropdetailsProps {
  navigation: UfarmercropdetailsNavigationProp;
}

const Ufarmercropdetails: React.FC<UfarmercropdetailsProps> = ({ navigation }) => {
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [total, setTotal] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedNav, setSelectedNav] = useState<string | null>(null);
  const [openCrop, setOpenCrop] = useState(false);
  const [cropValue, setCropValue] = useState(null);
  const [cropItems, setCropItems] = useState([
    { label: 'Carrots', value: 'carrots' },
    { label: 'Potatoes', value: 'potatoes' },
    { label: 'Tomatoes', value: 'tomatoes' },
  ]);

  const [openQuality, setOpenQuality] = useState(false);
  const [qualityValue, setQualityValue] = useState(null);
  const [qualityItems, setQualityItems] = useState([
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ]);
  const { t } = useTranslation();

  const borderRadiusValue = 10; // Consistent border radius for all fields

  useEffect(() => {
    calculateTotal();
  }, [quantity, unitPrice]);

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const totalValue = (qty * price).toFixed(2);
    setTotal(totalValue);
  };

  const handleChooseImage = () => {
    ImagePicker.launchImageLibrary(
        {
            mediaType: 'photo',
            maxWidth: 300,
            maxHeight: 300,
            quality: 1,
        },
        response => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('ImagePicker Error: ', response.errorMessage);
            } else if (response.assets && response.assets.length > 0) {
                const selectedImageUri = response.assets[0].uri;
                if (selectedImageUri) {
                    setImageUri(selectedImageUri);
                } else {
                    console.log('Selected image URI is undefined');
                }
            }
        },
    );
};


  return (
    <View className='flex-1 bg-white'>
      <View className='flex-row pt-[7%] pl-[3%] pb-[5%]'>
        <AntDesign name="left" size={24} color="#000502"  onPress={() => navigation.goBack()} />
        <Text className='text-xl pl-[22%] text-center'>{t("Ufarmercropdetails.FillCropDetails")} </Text>
      </View>

      <View className='ml-[10%] mr-[10%] flex-1'>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.CropName")}</Text>
          <View style={{ zIndex: 500 }}>
            <DropDownPicker
              open={openCrop}
              value={cropValue}
              items={cropItems}
              setOpen={setOpenCrop}
              setValue={setCropValue}
              setItems={setCropItems}
              placeholder="Select a crop"
              style={{ borderColor: 'gray', borderWidth: 1, borderRadius: borderRadiusValue }}
              placeholderStyle={{ color: '#2E2E2E' }}
              containerStyle={{ marginBottom: 16 }}
              zIndex={500}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.Quality")}</Text>
          <View style={{ zIndex: 400 }}>
            <DropDownPicker
              open={openQuality}
              value={qualityValue}
              items={qualityItems}
              setOpen={setOpenQuality}
              setValue={setQualityValue}
              setItems={setQualityItems}
              placeholder="Select quality"
              style={{ borderColor: 'gray', borderWidth: 1, borderRadius: borderRadiusValue }}
              placeholderStyle={{ color: '#2E2E2E' }}
              containerStyle={{ marginBottom: 16 }}
              zIndex={400}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.Quantity")}</Text>
          <View style={{ borderColor: 'gray', borderWidth: 1, borderRadius: borderRadiusValue, marginBottom: 16, backgroundColor: 'white' }}>
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setQuantity}
              value={quantity}
              keyboardType='numeric'
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.UnitPrice")}</Text>
          <View style={{ borderColor: 'gray', borderWidth: 1, borderRadius: borderRadiusValue, marginBottom: 16, backgroundColor: 'white' }}>
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setUnitPrice}
              value={unitPrice}
              keyboardType='numeric'
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.UploadImage")}</Text>
          <TouchableOpacity
            className="flex-row items-center border w-full h-[40px] mb-5 bg-black px-3 justify-center"
            style={{ borderRadius: borderRadiusValue }}
            onPress={handleChooseImage}
          >
            <Text className='text-base pl-2 text-white'>{t("Ufarmercropdetails.ChooseImage")}</Text>
          </TouchableOpacity>

          {/* Display selected image */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 100, height: 100, borderRadius: borderRadiusValue, marginBottom: 16 }}
              resizeMode="contain"
            />
          )}

          <Text className='text-base pb-[2%] font-medium'>{t("Ufarmercropdetails.Total")}</Text>
          <View style={{ borderColor: 'gray', borderWidth: 1, borderRadius: borderRadiusValue, marginBottom: 16, backgroundColor: 'white' }}>
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              value={total}
              editable={false}
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          <TouchableOpacity className='bg-[#2AAD7A] w-full h-[50px] rounded-3xl shadow-2xl items-center justify-center' onPress={() => navigation.navigate('Registeredfarmer')}>
            <Text className='text-center text-xl font-light text-white'>{t("Ufarmercropdetails.Next")}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Navbar */}
        <View className="flex-row justify-around items-center py-4 border-t border-gray-300 h-16">
          <TouchableOpacity
            onPress={() => setSelectedNav('first')}
            style={{ transform: [{ scale: selectedNav === 'first' ? 1.5 : 1 }] }}
          >
            <Image
              source={require('../../assets/images/first-image.webp')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedNav('second')}
            style={{ transform: [{ scale: selectedNav === 'second' ? 1.5 : 1 }] }}
          >
            <Image
              source={require('../../assets/images/second-image.webp')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedNav('third')}
            style={{ transform: [{ scale: selectedNav === 'third' ? 1.5 : 1 }] }}
          >
            <Image
              source={require('../../assets/images/third-image.webp')}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default Ufarmercropdetails;
