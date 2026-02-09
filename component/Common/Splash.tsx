import { View, Text, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types'; // Adjust the import path as needed
import { environment } from "@/environment/environment";
import { useDispatch } from "react-redux";
import { setUser } from '../../store/authSlice';
import * as Progress from "react-native-progress";

type SplashNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface SplashProps {
  navigation: SplashNavigationProp;
}

const phone = require('../../assets/images/phone.webp');
const Center = require('../../assets/images/CODINET expanded logo colored.png');
const Bottom = require('../../assets/images/Group 35 (1).png');
const Top = require('../../assets/images/Group 34 (3).png');
const Splash: React.FC<SplashProps> = ({ navigation }) => {

  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();


  useEffect(() => {
    const timer = setTimeout(() => {
      // Only navigate after token check and progress bar completion
      handleTokenCheck();
    }, 5000);
      const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 1) {
          return prev + 0.1;
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [navigation]);



  const checkPasswordStatus = async (token: string) => {
    console.log('Checking password status...', token);
    try {
      const response = await fetch(`${environment.API_BASE_URL}api/collection-officer/password-update`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Password update status:', data);

        return data.data.passwordUpdated;
      } else {
        throw new Error('Failed to fetch password status');
      }
    } catch (error) {
      console.error('Error checking password status:', error);
      throw error;
    }
  };

  const handleTokenCheck = async () => {
    try {
      const expirationTime = await AsyncStorage.getItem("tokenExpirationTime");
      const userToken = await AsyncStorage.getItem("token");
      const role = await  AsyncStorage.getItem("jobRole");
      const emp = await AsyncStorage.getItem("empid");
dispatch(setUser({ token: userToken ?? '', jobRole: role ?? '', empId: emp ?? '' }));
      if (expirationTime && userToken) {
        const currentTime = new Date();
        const tokenExpiry = new Date(expirationTime);

        if (currentTime < tokenExpiry) {
          console.log("Token is valid, checking password status...");
          
          // Check password status
          const passwordUpdated = await checkPasswordStatus(userToken);
          
          if (passwordUpdated === 0) {
            console.log("Password needs to be updated, navigating to Login.");
           navigation.navigate("Login");
            return;
          }
          console.log("Token is valid, navigating to Main.");
          const jobRole = await AsyncStorage.getItem('jobRole');
          if (jobRole === "Collection Officer") {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main', params: { screen: 'Dashboard' } }]
            });
          } else if (jobRole === "Collection Centre Manager") {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main', params: { screen: 'ManagerDashboard' } }]
            })
          }else if (jobRole==="Distribution Officer" || "Distribution Centre Manager"){
            console.log("hit dis manager")
             navigation.reset({
              index: 0,
              routes: [{ name: 'Main', params: { screen: 'DistridutionaDashboard' } }]
            })
          }
        } else {
          console.log("Token expired, clearing storage.");
          await AsyncStorage.multiRemove([
            "token",
            "tokenStoredTime",
            "tokenExpirationTime",
          ]);
          navigation.navigate("Login");
        }
      } else {
        navigation.navigate("Login");
      }
    } catch (error) {
      console.error("Error checking token expiration or password status:", error);
      navigation.navigate("Login");
    }
  };
  return (
    <View className="flex-1 bg-white relative justify-center">
      <Image
        source={Top} 
        className="w-[50%] h-[18%] absolute left-0 top-0 -mt-2"
        resizeMode="contain"
      />
      <Image
        source={Center} 
        className="w-full h-32 justify-center items-center"
        resizeMode="contain"
      />
      <Text className="text-center text-[10px] mt-2">
        POWERED BY POLYGON
      </Text>
      <View style={{ width: '80%', marginTop: 20, marginLeft: '10%' }} >
        <Progress.Bar
          progress={progress}
          width={null}
          color="#8C0876"
          borderWidth={0}
          style={{ height: 10, marginTop: 20 }}
        />
      </View>
      <Image
        source={Bottom} 
        className="w-[50%] h-[18%] absolute bottom-0 right-0"
        resizeMode="contain"
      />
    </View>
  );

};

export default Splash;

