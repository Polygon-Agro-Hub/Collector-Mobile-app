import store, { loadPersistedAuth } from "@/services/reducxStore";
import { View, Text, Image } from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import environment from "@/environment/environment";
import { useDispatch } from "react-redux";
import { setUser, logoutUser } from "@/store/authSlice";
import { ROLES } from "@/constants/user-roles";
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
      } else if (response.status === 401) {
        return { isExpiredToken: true };
      } else if (response.status === 403) {
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
      console.warn(
        "Network check error in splash, using local session:",
        error,
      );
      return { passwordUpdated: 1 };
    }
  };

  const handleTokenCheck = async () => {
    try {
      await loadPersistedAuth();
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (!hasLaunched) {
        await AsyncStorage.setItem("hasLaunched", "true");
        navigation.navigate("Lanuage");
        return;
      }

      const userToken = store.getState().auth.token;
      const role = store.getState().auth.jobRole;
      const emp = store.getState().auth.empId;

      if (userToken) {
        const result = await checkPasswordStatus(userToken);

        if (result.isExpiredToken) {
          store.dispatch(logoutUser());
          dispatch(logoutUser());
          navigation.navigate("Login");
          return;
        }

        if (result.isBanned) {
          store.dispatch(logoutUser());
          dispatch(logoutUser());
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "BannedScreen",
                params: {
                  statusType:
                    result.accountStatus === "Rejected"
                      ? "rejected"
                      : "not_approved",
                  message: result.message,
                },
              },
            ],
          });
          return;
        }

        if (result.passwordUpdated === 0) {
          store.dispatch(logoutUser());
          dispatch(logoutUser());
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
          return;
        }

        const jobRole = role || store.getState().auth.jobRole;

        if (
          jobRole === ROLES.COLLECTION_OFFICER ||
          jobRole === ROLES.COLLECTION_MANAGER
        ) {
          navigation.reset({
            index: 0,
            routes: [
              { name: "Main", params: { screen: "CollectionDashboard" } },
            ],
          });
        } else if (
          jobRole === ROLES.DISTRIBUTION_OFFICER ||
          jobRole === ROLES.DISTRIBUTION_MANAGER
        ) {
          navigation.reset({
            index: 0,
            routes: [
              { name: "Main", params: { screen: "DistridutionaDashboard" } },
            ],
          });
        } else {
          store.dispatch(logoutUser());
          dispatch(logoutUser());
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
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
    <View className="flex-1 bg-white justify-center items-center relative">
      <Image
        source={top}
        style={{ width: "40%", height: "18%", maxWidth: 260, maxHeight: 130 }}
        className="w-[40%] h-[18%] absolute left-0 top-0 -mt-2"
        resizeMode="contain"
      />
      
      <View className="w-full max-w-[500px] justify-center items-center px-6">
        <Image
          source={center}
          style={{
            width: "100%",
            height: 128,
            maxWidth: 380,
            alignSelf: "center",
          }}
          className="w-full h-32 justify-center items-center"
          resizeMode="contain"
        />
        <Text className="text-center text-[10px] mt-2">POWERED BY POLYGON</Text>
        <View
          style={{
            width: "80%",
            maxWidth: 360,
            marginTop: 20,
            alignSelf: "center",
          }}
        >
          <Progress.Bar
            progress={progress}
            width={null}
            color="#8C0876"
            borderWidth={0}
            style={{ height: 10, marginTop: 20 }}
          />
        </View>
      </View>

      <Image
        source={bottom}
        style={{ width: "40%", height: "18%", maxWidth: 260, maxHeight: 130 }}
        className="w-[40%] h-[18%] absolute bottom-0 right-0"
        resizeMode="contain"
      />
    </View>
  );
};

export default Splash;
