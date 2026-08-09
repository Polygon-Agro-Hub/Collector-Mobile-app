import { View, Text, Image } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import { useDispatch } from "react-redux";
import { setUser, logoutUser } from "@/store/authSlice";
import * as Progress from "react-native-progress";

type SplashNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

interface SplashProps {
  navigation: SplashNavigationProp;
}

const center = require("../../../assets/images/common/codinet.webp");
const bottom = require("../../../assets/images/common/codinet-back.webp");
const top = require("../../../assets/images/common/codinet-up.webp");

const Splash: React.FC<SplashProps> = ({ navigation }) => {
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      handleTokenCheck();
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 1) {
          return prev + 0.2;
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 200);

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
        return { passwordUpdated: data.data.passwordUpdated };
      } else if (response.status === 403 || response.status === 401) {
        const data = await response.json();
        return {
          isBanned: true,
          accountStatus: data.accountStatus,
          message: data.message,
        };
      } else {
        return { passwordUpdated: 1 };
      }
    } catch (error) {
      console.warn("Network check error in splash, using local session:", error);
      return { passwordUpdated: 1 };
    }
  };

  const handleTokenCheck = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (!hasLaunched) {
        await AsyncStorage.setItem("hasLaunched", "true");
        navigation.navigate("Lanuage");
        return;
      }

      const expirationTime = await AsyncStorage.getItem("tokenExpirationTime");
      const userToken = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("jobRole");
      const emp = await AsyncStorage.getItem("empid");

      if (userToken) {
        dispatch(
          setUser({
            token: userToken,
            jobRole: role ?? "",
            empId: emp ?? "",
          }),
        );

        let isExpired = false;
        if (expirationTime) {
          const currentTime = new Date();
          const tokenExpiry = new Date(expirationTime);
          if (currentTime >= tokenExpiry) {
            isExpired = true;
          }
        }

        if (isExpired) {
          await AsyncStorage.multiRemove([
            "token",
            "tokenStoredTime",
            "tokenExpirationTime",
            "jobRole",
            "empid",
          ]);
          dispatch(logoutUser());
          navigation.navigate("Login");
          return;
        }

        const result = await checkPasswordStatus(userToken);

        if (result.isBanned) {
          await AsyncStorage.multiRemove([
            "token",
            "tokenStoredTime",
            "tokenExpirationTime",
            "jobRole",
            "empid",
            "companyNameEnglish",
            "companyNameSinhala",
            "companyNameTamil",
          ]);
          dispatch(logoutUser());
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "BannedScreen",
                params: {
                  statusType: result.accountStatus === "Rejected" ? "rejected" : "not_approved",
                  message: result.message,
                },
              },
            ],
          });
          return;
        }

        // User never completed the mandatory first-time password update.
        // Clear session and force them to ChangePassword via Login.
        if (result.passwordUpdated === 0) {
          await AsyncStorage.multiRemove([
            "token",
            "tokenStoredTime",
            "tokenExpirationTime",
            "jobRole",
            "empid",
            "companyNameEnglish",
            "companyNameSinhala",
            "companyNameTamil",
          ]);
          dispatch(logoutUser());
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          return;
        }

        const jobRole = role || (await AsyncStorage.getItem("jobRole"));

        if (jobRole === "Collection Officer") {
          navigation.reset({
            index: 0,
            routes: [
              { name: "Main", params: { screen: "CollectionOfficerDashboard" } },
            ],
          });
        } else if (jobRole === "Collection Centre Manager") {
          navigation.reset({
            index: 0,
            routes: [
              { name: "Main", params: { screen: "ManagerDashboard" } },
            ],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [
              { name: "Main", params: { screen: "DistridutionaDashboard" } },
            ],
          });
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
    <View className="flex-1 bg-white justify-center items-center">
      <View className="w-full max-w-[500px] flex-1 justify-center relative items-center">
        <Image
          source={top}
          style={{ width: "50%", height: "18%", maxWidth: 260, maxHeight: 130 }}
          className="w-[50%] h-[18%] absolute left-0 top-0 -mt-2"
          resizeMode="contain"
        />
        <Image
          source={center}
          style={{ width: "100%", height: 128, maxWidth: 380, alignSelf: "center" }}
          className="w-full h-32 justify-center items-center"
          resizeMode="contain"
        />
        <Text className="text-center text-[10px] mt-2">POWERED BY POLYGON</Text>
        <View style={{ width: "80%", maxWidth: 360, marginTop: 20, alignSelf: "center" }}>
          <Progress.Bar
            progress={progress}
            width={null}
            color="#8C0876"
            borderWidth={0}
            style={{ height: 10, marginTop: 20 }}
          />
        </View>
        <Image
          source={bottom}
          style={{ width: "50%", height: "18%", maxWidth: 260, maxHeight: 130 }}
          className="w-[50%] h-[18%] absolute bottom-0 right-0"
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

export default Splash;