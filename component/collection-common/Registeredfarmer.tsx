import { View, Text, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types'
import AntDesign from 'react-native-vector-icons/AntDesign';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { useTranslation } from "react-i18next";


type RegisteredfarmerNavigationProp = StackNavigationProp<RootStackParamList, 'Registeredfarmer'>;

interface RegisteredfarmerProps {
  navigation: RegisteredfarmerNavigationProp;
}

const Registeredfarmer: React.FC<RegisteredfarmerProps> = ({ navigation }) => {

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [nic, setNic] = useState('');
  const [phonenumber, setPhonenumber] = useState('');
  const [address, setAddress] = useState('');
  const [accountnumber, setAccountnumber] = useState('');
  const [holdername, setHoldername] = useState('');
  const [bankname, setBankname] = useState('');
  const [branchname, setBranchname] = useState('');
  const [selectedNav, setSelectedNav] = useState<string | null>(null);
  const { t } = useTranslation();

  return (
    <View className='flex-1 bg-white'>
      <View className='flex-row pt-[7%]'>
        <AntDesign name="left" size={24} color="#000502" onPress={() => navigation.goBack()} />
        <Text className='text-xl pl-[28%] text-center'> {t("Registeredfarmer.FarmerDetails")}</Text>
      </View>

      <View className='ml-[10%] mr-[10%] flex-1'>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}> 
          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.FirstName")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setFirstname}
              value={firstname}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.LastName")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setLastname}
              value={lastname}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.NIC")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setNic}
              value={nic}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.Phone")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setPhonenumber}
              value={phonenumber}
              keyboardType='numeric'
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.Address")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setAddress}
              value={address}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.AccountNum")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setAccountnumber}
              value={accountnumber}
              keyboardType='numeric'
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.AccountName")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setHoldername}
              value={holdername}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.Bank")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setBankname}
              value={bankname}
            />
          </View>

          <Text className='text-base pb-[2%] font-medium'>{t("Registeredfarmer.Branch")}</Text>
          <View className="flex-row items-center border w-full h-[40px] mb-5 bg-white px-3">
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setBranchname}
              value={branchname}
            />
          </View>
          <TouchableOpacity className='bg-[#2AAD7A] w-full h-[50px] rounded-3xl shadow-2xl items-center justify-center' onPress={() => navigation.navigate('Ufarmercropdetails')}>
            <Text className='text-center text-xl font-light text-white'>{t("Registeredfarmer.Next")}</Text>
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
  )
}

export default Registeredfarmer;
