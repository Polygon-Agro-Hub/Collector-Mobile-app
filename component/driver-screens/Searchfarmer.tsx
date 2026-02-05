import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import axios from "axios";
import { StackNavigationProp } from "@react-navigation/stack";
 import { RootStackParamList } from "../types"; // Ensure this file exists
import {environment }from '@/environment/environment';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

type SearchFarmerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SearchFarmerScreen"
>;

interface SearchFarmerScreenProps {
  navigation: SearchFarmerScreenNavigationProp;
}

const SearchFarmerScreen: React.FC<SearchFarmerScreenProps> = ({ navigation }) => {
    const [NICnumber, setNICnumber] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [noResults, setNoResults] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
    const [foundFarmer, setFoundFarmer] = useState<{
      id:number;
      NICnumber: string;
      firstName: string;
      lastName: string;
      language: string;
      phoneNumber: string;
      city?: string;
      streetName?: string;
      route?: string;
      houseNo?: string;
    } | null>(null);
    
    const [ere, setEre] = useState("");
    const { t } = useTranslation();
    const [newQr, setNewQr] = useState<boolean>(false);
    const [farmers, setFarmers] = useState<{
      NICnumber: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      PreferdLanguage:string
      id: string;
    } | null>(null);
    const validateNic = (nic: string) => {
      const regex = /^(\d{12}|\d{9}V|\d{9}X|\d{9}v|\d{9}x)$/;
      if (!regex.test(nic)) {
        setEre(t("Transport.Enter Valide NIC"));
      } else {
        setEre("");
      }
    };
  
    const handleNicChange = (text: string) => {
      setFarmers(null)
      const normalizedText = text.replace(/[vV]/g, "V");
      setNICnumber(normalizedText);
      if (normalizedText.trim().length === 0) {
    setEre(""); // Clear error message when NIC is empty
  } else {
    // Validate NIC and set error if needed
    const regex = /^(\d{12}|\d{9}V|\d{9}X|\d{9}v|\d{9}x)$/;
    if (!regex.test(normalizedText)) {
      setEre("");
    } else {
      setEre(""); // Clear error if NIC is valid
    }
  }
      // validateNic(normalizedText);
      // Reset found farmer when NIC changes
      setFoundFarmer(null);
      setNoResults(false);
    };
  
    const handleSearch = async () => {
  Keyboard.dismiss();
  if (NICnumber.trim().length === 0) {
    setEre("");  // Clear error message
    return;
  }
  
  // Validate directly within the function
  const regex = /^(\d{12}|\d{9}V|\d{9}X|\d{9}v|\d{9}x)$/;
  if (!regex.test(NICnumber)) {
    setEre(t("Transport.Enter Valide NIC"));
    return;
  }
  
  setEre("");
  setIsSearching(true);
  setNoResults(false);
  setFoundFarmer(null);
  
      try {
        const response = await api.get(`api/auth/get-users/${NICnumber}`);
  
        if (response.status === 200) {
          const farmer = response.data;
          console.log("ggg",response.data)
          // setFoundFarmer({
          //   id: farmer.id,
          //   NICnumber: farmer.NICnumber,
          //   firstName: farmer.firstName,
          //   lastName: farmer.lastName
          // });
          if (farmer.farmerQr === null || farmer.farmerQr === "") {
            setIsSearching(false);
            setNewQr(true);
            setFarmers(farmer);
          } else {
            setFoundFarmer({
              id: farmer.id,
              NICnumber: farmer.NICnumber,
              firstName: farmer.firstName,
              lastName: farmer.lastName,
              language: farmer.language,
              phoneNumber: farmer.phoneNumber,
              city: farmer.city,
              streetName: farmer.streetName,
              route: farmer.route,
              houseNo: farmer.houseNo
            });
            setNewQr(false);
          }
          setIsSearching(false);
        }
      } catch (error) {
        setIsSearching(false);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            setNoResults(true);
          } else {
            Alert.alert(
            t("Error.error"), t("Error.Failed to search for farmer.")
            );
          }
        } else {
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        }
      }
    };
  
    const handleAddCollectionRequest = () => {
      if (foundFarmer) {
        navigation.navigate("CollectionRequestForm" as any, {
          id: foundFarmer.id,
          NICnumber: foundFarmer.NICnumber,
          phoneNumber: foundFarmer.phoneNumber,
          language: foundFarmer.language,
          oldcity: foundFarmer.city,
          oldstreet: foundFarmer.streetName,
          oldlandmark: foundFarmer.route,
          oldhouseno: foundFarmer.houseNo
        });
         console.log(foundFarmer.id)
      }
     
    };

     useFocusEffect(
        useCallback(() => {
          setNICnumber("");
          setNoResults(false);
          setEre("");
          setNewQr(false);
          setFarmers(null)
          setFoundFarmer(null);
        }, [])
      );
  
      const getTextStyle = (language: string) => {
        if (language === "si") {
          return {
            fontSize: 12, // Smaller text size for Sinhala
            lineHeight: 20, // Space between lines
          };
        }
       
      };
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1 bg-white"
        >
          <View
            className="flex-1 bg-white"
            style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
          >
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity onPress={() => navigation.navigate("Main" as any)} className="">
                <AntDesign name="left" size={24} color="#000" />
              </TouchableOpacity>
              <Text className="flex-1 text-center text-xl font-bold text-black">
                {t("SearchFarmer.Search")}
              </Text>
            </View>
  
            {/* Search Form */}
            <View className="p-4">
              <Text style={[{ fontSize: 16 } , getTextStyle(selectedLanguage)]}  className="text-center text-lg mt-5">
                {t("SearchFarmer.EnterFarmer")}
              </Text>

  <View className="flex-row justify-center items-center border border-[#A7A7A7] rounded-full mt-4 px-4 py-2 bg-white">
    <TextInput
      value={NICnumber}
      onChangeText={handleNicChange}
      placeholder={t("SearchFarmer.EnterNIC").length > 20 ? t("SearchFarmer.EnterNIC").slice(0, 28) + "..." : t("SearchFarmer.EnterNIC")}
      className="flex-1 text-center"
      maxLength={12}
       style={{
      color: "#000",
      textAlign: 'center', // Ensures the text is centered
      paddingRight: NICnumber.length === 0 ? 0 : 20, // Add padding when text is empty to ensure centering
    }}
    />
    <TouchableOpacity className="ml-2" onPress={handleSearch}>
      <FontAwesome name="search" size={24} color="green" />
    </TouchableOpacity>
  </View>


              {ere ? (
                <Text className="text-red-500 mt-2 justify-center text-center">
                  {ere}
                </Text>
              ) : null}
  
              {/* Display search image when no NIC is entered */}
              {!isSearching && !foundFarmer && NICnumber.length === 0 && (
                <View className="mt-10 items-center">
                  <Image
                    source={require("../../assets/images/search.webp")}
                    className="h-[350px] w-[300px] rounded-lg"
                    resizeMode="contain"
                  />
                </View>
              )}
  
              {/* Searching status */}
              {isSearching && (
                <View className="mt-10 items-center">
                  <Text style={[{ fontSize: 16 }]} className="text-center text-lg">
                    {t("SearchFarmer.Searching")}
                  </Text>
                </View>
              )}
  
              {/* Farmer Found Results */}
              {foundFarmer && (
                <View className="mt-6 items-center">
                  
                    <Text className="text-center text-lg  mt-[20%]">
                     {t("SearchFarmer.Result Found")} 
                    </Text>
                    <View className="w-full bg-white border border-gray-200 rounded-lg p-4 mt-4">
                    <Text className="text-center text-lg">
                      {foundFarmer.firstName} {foundFarmer.lastName}
                    </Text>
                    <Text className="text-center text-md text-gray-600 mb-4">
                      {foundFarmer.NICnumber}
                    </Text>

                    </View>
                    
                    <TouchableOpacity
                      onPress={handleAddCollectionRequest}
                      // onPress={() =>
                      //   navigation.navigate("CollectionRequestForm" as any, )}
                      className="bg-[#2AAD7A] rounded-full py-3 w-full mt-[30%]"
                    >
                      <Text className="text-center text-white text-lg"  style={[{ fontSize: 16 } , getTextStyle(selectedLanguage)]} >
                        {t("Transport.Add Collection Request")}
                      </Text>
                    </TouchableOpacity>
                 
                </View>
              )}
              { newQr && farmers &&  (
                          <View className="mt-6 items-center">
                 
                            <Text style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]} className="text-center text-lg mt-4 color-[#888888]">
                            {t("SearchFarmer.Result Found")}
                            </Text>
                            <View className="border border-[#A7A7A7] rounded-xl mt-4 px-6 py-2 w-full ">
                            <Text style={[{ fontSize: 20 }, getTextStyle(selectedLanguage)]} className="text-center text-lg mt-2">
                              {farmers.firstName} {farmers.lastName}
                              </Text>
                              <Text style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]} className="text-center text-lg mt-2 color-[#888888]">
                              {farmers.NICnumber}
                              </Text>
                            </View>
                            <Text style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]} className="text-center text-lg mt-4 text-red-600">
                            {t("SearchFarmer.This Farmer does not have the QR")}
                            </Text>
              
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate("UpdateFarmerBankDetails" as any, {
                                  id: farmers.id,
                                  NICnumber: farmers.NICnumber,
                                  phoneNumber: farmers.phoneNumber,
                                  PreferdLanguage: farmers.PreferdLanguage,
                                  officerRole:"CCM"
                                })
                              }
                              className="mt-8 bg-[#2AAD7A]  rounded-full px-16 py-3  "
                            >
                              <Text style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]} className="text-center text-white text-lg">{t("SearchFarmer.Set QR Code")}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
  
              {/* No Results Found */}
              {!isSearching && noResults && NICnumber.length > 0 && !ere &&(
                <View className="mt-6 items-center">
                  <Image
                    source={require("../../assets/images/notfound.webp")}
                    className="h-[200px] w-[200px] rounded-lg"
                    resizeMode="contain"
                  />
                  <Text style={[{ fontSize: 16 }]} className="text-center text-lg mt-4 color-[#888888]">
                    {t("SearchFarmer.Noregistered")}
                  </Text>
  
                  <TouchableOpacity
                   onPress={() =>
                                          navigation.navigate("RegisterFarmer" as any, {
                                            NIC: NICnumber,
                                          })
                                        }
                    className="mt-16 bg-[#2AAD7A] rounded-full px-16 py-3"
                  >
                    <Text style={[{ fontSize: 16 }]} className="text-center text-white text-lg">
                      {t("SearchFarmer.RegisterFarmer")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };
  
  export default SearchFarmerScreen;
