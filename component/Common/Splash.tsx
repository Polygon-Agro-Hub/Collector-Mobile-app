import { View, Text, Image } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { environment } from "@/environment/environment";
import { useDispatch } from "react-redux";
import { setUser } from "../../store/authSlice";
import * as Progress from "react-native-progress";

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

interface SplashProps {
  navigation: SplashNavigationProp;
}

const Center = require("../../assets/images/common/codinet.webp");
const Bottom = require("../../assets/images/common/codinet-back.webp");
const Top = require("../../assets/images/common/codinet-up.webp");
const Splash: React.FC<SplashProps> = ({ navigation }) => {
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
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
    try {
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/password-update`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (response.ok) {
        const data = await response.json();

        return data.data.passwordUpdated;
      } else {
        throw new Error("Failed to fetch password status");
      }
    } catch (error) {
      console.error("Error checking password status:", error);
      throw error;
    }
  };

  const handleTokenCheck = async () => {
    try {
      const expirationTime = await AsyncStorage.getItem("tokenExpirationTime");
      const userToken = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("jobRole");
      const emp = await AsyncStorage.getItem("empid");
      dispatch(
        setUser({
          token: userToken ?? "",
          jobRole: role ?? "",
          empId: emp ?? "",
        }),
      );
      if (expirationTime && userToken) {
        const currentTime = new Date();
        const tokenExpiry = new Date(expirationTime);

        if (currentTime < tokenExpiry) {
          const passwordUpdated = await checkPasswordStatus(userToken);

          if (passwordUpdated === 0) {
            navigation.navigate("Login");
            return;
          }

          const jobRole = await AsyncStorage.getItem("jobRole");
          if (jobRole === "Collection Officer") {
            navigation.reset({
              index: 0,
              routes: [{ name: "Main", params: { screen: "Dashboard" } }],
            });
          } else if (jobRole === "Collection Centre Manager") {
            navigation.reset({
              index: 0,
              routes: [
                { name: "Main", params: { screen: "ManagerDashboard" } },
              ],
            });
          } else if (
            jobRole === "Distribution Officer" ||
            "Distribution Centre Manager"
          ) {
            navigation.reset({
              index: 0,
              routes: [
                { name: "Main", params: { screen: "DistridutionaDashboard" } },
              ],
            });
          }
        } else {
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
      console.error(
        "Error checking token expiration or password status:",
        error,
      );
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
      <Text className="text-center text-[10px] mt-2">POWERED BY POLYGON</Text>
      <View style={{ width: "80%", marginTop: 20, marginLeft: "10%" }}>
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
