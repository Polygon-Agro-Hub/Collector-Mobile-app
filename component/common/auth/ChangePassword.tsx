import { logoutUser } from "@/store/authSlice";
import store from "@/services/reducxStore";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  BackHandler,
  Keyboard,
  Platform,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

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
  const [isLoading, setIsLoading] = useState(false);
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

    if (newPassword === currentPassword) {
      Alert.alert(
        t("Error.error"),
        "New password cannot be the same as the current password.",
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

    if (isLoading) return;

    if (!validatePassword()) {
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      setIsLoading(true);
      const token = store.getState().auth.token;
      await axios.post(
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

      Alert.alert(
        t("Error.Success"),
        t("Error.Password updated successfully"),
        [
          {
            text: "OK",
            onPress: async () => {
              // Clear session — user must log in again with new password
              store.dispatch(logoutUser());
navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          Alert.alert(t("Error.error"), t("Error.Invalid current password"));
        } else {
          Alert.alert(t("Error.error"), t("Error.Failed to update password"));
        }
      } else {
        Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfficer = async () => {
    try {
      const token = store.getState().auth.token;

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

        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [passwordUpdate]),
  );

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: "white" }}
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "white" }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      keyboardOpeningTime={0}
      extraScrollHeight={Platform.OS === "ios" ? 0 : 20}
      extraHeight={Platform.OS === "ios" ? 0 : 20}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {passwordUpdate === 1 ? (
        <CustomHeader
          title=""
          showBackButton={true}
          navigation={navigation}
          onBackPress={() => navigation.goBack()}
        />
      ) : (
        <View className="h-[70px]" />
      )}

      <View className="flex-1 bg-white" style={{ padding: 4, flexGrow: 1 }}>
        <View className="flex-1 justify-center mx-auto w-full max-w-[500px]">
          <View className="items-center mt-[-5%]">
            <Image
              source={require("@/assets/images/auth/change-password.webp")}
              resizeMode="contain"
              className="w-[220px] h-[140px]"
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
            <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3 h-[50px]">
              <TextInput
                className="flex-1 bg-[#F4F4F4] text-black text-base"
                secureTextEntry={secureCurrent}
                onChangeText={setCurrentPassword}
                value={currentPassword}
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  paddingVertical: 8,
                  includeFontPadding: true,
                  textAlignVertical: "center",
                  color: "#000000",
                }}
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
            <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3 h-[50px]">
              <TextInput
                className="flex-1 text-black text-base"
                secureTextEntry={secureNew}
                value={newPassword}
                onChangeText={(text) => {
                  const cleanText = text.replace(/\s/g, "");
                  setNewPassword(cleanText);
                }}
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  paddingVertical: 8,
                  includeFontPadding: true,
                  textAlignVertical: "center",
                  color: "#000000",
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
            <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3 h-[50px]">
              <TextInput
                className="flex-1 bg-[#F4F4F4] text-black text-base"
                secureTextEntry={secureConfirm}
                onChangeText={(text) => {
                  const cleanText = text.replace(/\s/g, "");
                  setConfirmPassword(cleanText);
                }}
                value={confirmPassword}
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  paddingVertical: 8,
                  includeFontPadding: true,
                  textAlignVertical: "center",
                  color: "#000000",
                }}
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
              className="bg-black w-full rounded-3xl items-center justify-center h-[50px]"
              onPress={handleChangePassword}
              disabled={isLoading}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="font-light text-white text-lg">
                  {t("ChangePassword.Next")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default ChangePassword;
