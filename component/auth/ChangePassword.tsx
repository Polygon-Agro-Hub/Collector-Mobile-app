import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
  Keyboard,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { ScrollView } from "react-native-gesture-handler";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "@/component/navigations/CustomHeader";

type ChangePasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChangePassword"
>;

interface ChangePasswordProps {
  navigation: ChangePasswordNavigationProp;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [passwordUpdate, setPasswordUpdate] = useState<number | null>(null);
  const { t } = useTranslation();

  const validatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("Error.error"), t("Error.All fields are required"));
      return false;
    }

    if (newPassword.length < 8) {
      Alert.alert(t("Error.error"), t("Error.Your password must contain"));
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert(
        t("Error.error"),
        t("Error.Your password must contain a minimum"),
      );
      return false;
    }

    if (!/[0-9]/.test(newPassword)) {
      Alert.alert(t("Error.error"), t("Error.Your password must contain"));
      return false;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      Alert.alert(
        t("Error.error"),
        t("Error.Your password must contain a minimum"),
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("Error.error"),
        "New password and confirm password do not match",
      );
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    Keyboard.dismiss();

    if (!validatePassword()) {
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${environment.API_BASE_URL}api/collection-officer/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      Alert.alert(t("Error.Success"), t("Error.Password updated successfully"));
      navigation.navigate("Login");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          Alert.alert(t("Error.error"), t("Error.Invalid current password"));
        } else {
          Alert.alert(t("Error.error"), t("Error.Failed to update password"));
        }
      } else {
        Alert.alert(t("Error.error"), "Error.somethingWentWrong");
      }
    }
  };

  const fetchOfficer = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `${environment.API_BASE_URL}api/collection-officer/password-update`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPasswordUpdate(response.data.data.passwordUpdated);
    } catch (error) {
      console.error("Error fetching password update status:", error);
    }
  };

  useEffect(() => {
    fetchOfficer();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (passwordUpdate === 0) {
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [passwordUpdate]),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1, backgroundColor: "white" }}
    >
      {passwordUpdate === 1 && (
        <CustomHeader
          title=""
          showBackButton={true}
          navigation={navigation}
          onBackPress={() => navigation.goBack()}
        />
      )}
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 4 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center">
          <View className="items-center mt-[5%]">
            <Image
              source={require("@/assets/images/auth/change-password.webp")}
              resizeMode="contain"
              className="w-60 h-32"
              style={{ width: 220, height: 140 }}
            />
          </View>

          <View className="items-center pt-[5%]">
            <Text className="font-bold text-2xl">
              {t("ChangePassword.ChoosePassword")}
            </Text>
            <Text className="text-center font-light pt-3">
              {t("ChangePassword.Changepassword")}
            </Text>
          </View>

          <View className="px-4 py-6">
            <Text className="font-normal pb-2">
              {t("ChangePassword.CurrentPassword")}
            </Text>
            <View
              className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3"
              style={{ height: 50 }}
            >
              <TextInput
                className="flex-1 bg-[#F4F4F4]"
                style={{ height: 40, fontSize: 16 }}
                secureTextEntry={secureCurrent}
                onChangeText={setCurrentPassword}
                value={currentPassword}
              />
              <TouchableOpacity
                onPress={() => setSecureCurrent(!secureCurrent)}
              >
                <Icon
                  name={secureCurrent ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            <Text className="font-normal pb-2">
              {t("ChangePassword.NewPassword")}
            </Text>
            <View
              className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3"
              style={{ height: 50 }}
            >
              <TextInput
                className="flex-1"
                style={{ height: 40, fontSize: 16 }}
                secureTextEntry={secureNew}
                value={newPassword}
                onChangeText={(text) => {
                  const cleanText = text.replace(/\s/g, "");
                  setNewPassword(cleanText);
                }}
              />
              <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
                <Icon
                  name={secureNew ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>

            <Text className="font-normal pb-2">
              {t("ChangePassword.ConfirmNewPassword")}
            </Text>
            <View
              className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3"
              style={{ height: 50 }}
            >
              <TextInput
                className="flex-1 bg-[#F4F4F4]"
                style={{ height: 40, fontSize: 16 }}
                secureTextEntry={secureConfirm}
                onChangeText={(text) => {
                  const cleanText = text.replace(/\s/g, "");
                  setConfirmPassword(cleanText);
                }}
                value={confirmPassword}
              />
              <TouchableOpacity
                onPress={() => setSecureConfirm(!secureConfirm)}
              >
                <Icon
                  name={secureConfirm ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-4 pb-20">
            <TouchableOpacity
              className="bg-[#000000] w-full rounded-3xl items-center justify-center"
              style={{ height: 50 }}
              onPress={handleChangePassword}
            >
              <Text className="font-light text-white" style={{ fontSize: 18 }}>
                {t("ChangePassword.Next")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;
