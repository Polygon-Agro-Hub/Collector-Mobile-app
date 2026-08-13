import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import store from "@/services/reducxStore";
import { logoutUser } from "@/store/authSlice";
import * as Progress from "react-native-progress";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { environment } from "@/environment/environment";

type LogoutNavigationProp = StackNavigationProp<RootStackParamList, "Logout">;

interface LogoutProps {
  navigation: LogoutNavigationProp;
}

const center = require("../../../assets/images/common/codinet.webp");
const bottom = require("../../../assets/images/common/codinet-back.webp");
const top = require("../../../assets/images/common/codinet-up.webp");

const Logout: React.FC<LogoutProps> = ({ navigation }) => {
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();

  const status = async (empId: string, statusVal: boolean) => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }
    try {
      const token = store.getState().auth.token;
      if (!token) return;

      await fetch(
        `${environment.API_BASE_URL}api/collection-officer/online-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empId: empId,
            status: statusVal,
          }),
        },
      );
    } catch (error) {
      console.error("Online status error during logout:", error);
    }
  };

  useEffect(() => {
    const performLogout = async () => {
      try {
        const empId = store.getState().auth.empId;
        if (empId) {
          await status(empId, false);
        }
      } catch (err) {
        console.error("Error in logout screen online status update:", err);
      }

      // Dispatch logout user to clear redux state
      store.dispatch(logoutUser());

      // Progress animation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 1) {
            return prev + 0.1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 100);

      // Navigate to Login after 1.5 seconds
      const timeout = setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" as any }],
        });
      }, 1500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    };

    performLogout();
  }, [navigation]);

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
        <Text className="text-center text-[#374151] font-semibold text-lg mt-4">
          {t("SideMenu.Logging out") || "Logging out..."}
        </Text>
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
            style={{ height: 10 }}
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

export default Logout;
