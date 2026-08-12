import { logoutUser } from "@/store/authSlice";
import store from "@/services/reducxStore";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  BackHandler,
  Platform,
} from "react-native";
import React, { useCallback, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { setUser } from "@/store/authSlice";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { ROLES } from "@/constants/user-roles";

type LoginNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginProps {
  navigation: LoginNavigationProp;
}

const loginImage = require("@/assets/images/auth/login.webp");
const user = require("@/assets/images/auth/user.webp");
const passwordicon = require("@/assets/images/auth/password.webp");

const ALLOWED_ROLES = [
  ROLES.COLLECTION_OFFICER.toLowerCase(),
  ROLES.COLLECTION_MANAGER.toLowerCase(),
  ROLES.DISTRIBUTION_OFFICER.toLowerCase(),
  ROLES.DISTRIBUTION_MANAGER.toLowerCase(),
];

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [empid, setEmpid] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [empIdError, setEmpIdError] = useState("");
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const validateEmpIdFormat = (empId: string) => {
    const trimmedEmpId = empId.trim();

    if (trimmedEmpId !== trimmedEmpId.toUpperCase()) {
      setEmpIdError(t("Error.Please enter Employee ID in uppercase letters"));
      return false;
    }

    setEmpIdError("");
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Lanuage");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const checkDCMAccess = async (empId: string, pass: string) => {
    if (!empId.trim() || !pass.trim()) return;

    const trimmedEmpId = empId.trim();

    if (trimmedEmpId !== trimmedEmpId.toUpperCase()) {
      setEmpIdError(t("Error.Please enter Employee ID in uppercase letters"));
      return;
    }

    try {
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            empId: trimmedEmpId,
            password: pass,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.jobRole) {
        if (!ALLOWED_ROLES.includes(data.jobRole.toLowerCase())) {
          setEmpIdError(
            t(
              "Error.Access Denied",
            ),
          );
          return;
        } else {
          setEmpIdError("");
        }
      }
    } catch (error) {
      console.log("Validation check error:", error);
    }
  };

  const handleEmpIdChange = (text: string) => {
    setEmpid(text);

    if (empIdError) {
      setEmpIdError("");
    }

    if (password.trim()) {
      checkDCMAccess(text, password);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);

    if (empid.trim() && text.trim()) {
      checkDCMAccess(empid, text);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    setEmpIdError("");

    if (!empid && !password) {
      Alert.alert(
        t("Error.error"),
        t("Error.Password & Employee ID are not allowed to be empty"),
      );
      return false;
    }

    if (empid && !password) {
      Alert.alert(
        t("Error.error"),
        t("Error.Password is not allowed to be empty"),
      );
      return false;
    }

    if (!empid && password) {
      Alert.alert(
        t("Error.error"),
        t("Error.Employee ID is not allowed to be empty"),
      );
      return false;
    }

    if (!validateEmpIdFormat(empid)) {
      return false;
    }

    setLoading(true);
    store.dispatch(logoutUser());
const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setLoading(false);
      Alert.alert(t("Error.error"), "No internet connection");
      return;
    }

    try {
      const trimmedEmpId = empid.trim();

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            empId: trimmedEmpId,
            password,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 403) {
        setLoading(false);

        if (data.reason === "role_not_allowed") {
          Alert.alert(
            t("Error.error"),
            t(
              "Error.Access Denied",
            ),
          );
          return;
        }

        let errorMessage = t("Error.This EMP ID is not approved.");
        let statusType = "not_approved";

        if (data.accountStatus === "Rejected") {
          errorMessage = t("Error.This EMP ID is Rejected");
          statusType = "rejected";
        } else if (data.accountStatus === "Not Approved") {
          errorMessage = t("Error.This EMP ID is not approved.");
          statusType = "not_approved";
        }

        navigation.navigate("BannedScreen", {
          statusType,
          message: errorMessage,
        });
        return;
      }

      if (!response.ok) {
        setLoading(false);
        if (response.status === 404) {
          Alert.alert(t("Error.error"), t("Error.Invalid EMP ID & Password"));
        } else if (response.status === 401) {
          Alert.alert(
            t("Error.error"),
            t("Error.Invalid Password. Please try again."),
          );
        } else if (data.status === "error") {
          Alert.alert(t("Error.error"), t("Error.Invalid EMP ID"));
        } else {
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        }
        return;
      }

      const {
        token,
        passwordUpdateRequired,
        jobRole,
        empId,
        companyNameEnglish,
        companyNameSinhala,
        companyNameTamil,
      } = data;

      if (!ALLOWED_ROLES.includes(jobRole.toLowerCase())) {
        setLoading(false);
        Alert.alert(
          t("Error.error"),
          t(
            "Error.Access Denied",
          ),
        );
        return;
      }

      const timestamp = new Date();
      const expirationTime = new Date(
        timestamp.getTime() + 8 * 60 * 60 * 1000,
      );

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("jobRole", jobRole);
      await AsyncStorage.setItem("companyNameEnglish", companyNameEnglish);
      await AsyncStorage.setItem("companyNameSinhala", companyNameSinhala);
      await AsyncStorage.setItem("companyNameTamil", companyNameTamil);
      await AsyncStorage.setItem("empid", empId.toString());

      if (token) {
        await AsyncStorage.multiSet([
          ["tokenStoredTime", timestamp.toISOString()],
          ["tokenExpirationTime", expirationTime.toISOString()],
        ]);
      }

      dispatch(
        setUser({
          token,
          jobRole,
          empId: empId.toString(),
          companyNameEnglish,
          companyNameSinhala,
          companyNameTamil,
          tokenStoredTime: timestamp.toISOString(),
          tokenExpirationTime: expirationTime.toISOString(),
        }),
      );

      await status(empId, true);

      setTimeout(() => {
        setLoading(false);

        if (passwordUpdateRequired) {
          navigation.navigate("ChangePassword");
        } else {
          if (
            jobRole === "Distribution Officer" ||
            jobRole === "Distribution Centre Manager"
          ) {
            navigation.navigate("Main", { screen: "DistridutionaDashboard" });
          } else if (
            jobRole === "Collection Officer" ||
            jobRole === "Collection Centre Manager"
          ) {
            navigation.navigate("Main", { screen: "CollectionDashboard" });
          }
        }
      }, 4000);
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    }
  };

  const status = async (empId: string, status: boolean) => {
    try {
      const token = store.getState().auth.token;
      if (!token) {
        console.error("Token not found");
        return;
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/online-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empId: empId,
            status: status,
          }),
        },
      );

      if (response) {
        console.log("User is marked as online");
      } else {
        console.log("Failed to update online status");
      }
    } catch (error) {
      console.error("Online status error:", error);
    }
  };

  const handleNavBack = async () => {
    navigation.navigate("Lanuage");
    await AsyncStorage.removeItem("@user_language");
  };

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
      <CustomHeader
        title=""
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => handleNavBack()}
      />

      <View className="flex-1 justify-center px-5 bg-white">
        <View className="items-center">
          <Image
            source={loginImage}
            style={{ width: 270, height: 270, maxWidth: "100%", alignSelf: "center" }}
            className="w-[270px] h-[270px]"
            resizeMode="contain"
          />
          <Text className="font-bold text-2xl pt-[7%]">
            {t("SignIn.Wellcome")}
          </Text>
        </View>

        <View className="mt-2 items-center">
          <Text>{t("SignIn.SigntoLogin")}</Text>
        </View>

        <View className="px-4 py-6 max-w-[500px] w-full mx-auto ">
          <Text className="text-base pb-[2%] font-light">
            {t("SignIn.Employee")}
          </Text>
          <View
            className={`flex-row items-center bg-[#F4F4F4] border rounded-3xl mb-2 px-3 h-[50px] ${
              empIdError ? "border-red-500" : "border-[#F4F4F4]"
            }`}
          >
            <Image
              source={user}
              style={{ width: 24, height: 24 }}
              className="w-6 h-6"
              resizeMode="contain"
            />
            <TextInput
              className="flex-1 text-black text-base pl-2"
              onChangeText={handleEmpIdChange}
              autoCapitalize="characters"
              value={empid}
              style={{
                fontSize: 16,
                lineHeight: 22,
                paddingVertical: 8,
                includeFontPadding: true,
                textAlignVertical: "center",
                color: "#000000",
              }}
            />
          </View>

          {empIdError ? (
            <View className="mb-4">
              <Text className="text-red-500 text-sm pl-3">{empIdError}</Text>
            </View>
          ) : (
            <View className="mb-6" />
          )}

          <Text className="text-base pb-[2%] font-light">
            {t("SignIn.Password")}
          </Text>
          <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-8 px-3 h-[50px]">
            <Image
              source={passwordicon}
              style={{ width: 24, height: 24 }}
              className="w-6 h-6"
              resizeMode="contain"
            />
            <TextInput
              className="flex-1 text-black text-base pl-2"
              secureTextEntry={secureTextEntry}
              onChangeText={handlePasswordChange}
              value={password}
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
              onPress={() => setSecureTextEntry(!secureTextEntry)}
            >
              <Icon
                name={secureTextEntry ? "eye-off-outline" : "eye-outline"}
                size={24}
                color="black"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-black w-full  rounded-3xl items-center justify-center mb-[20%] h-[50px]"
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-center font-semibold text-white text-lg">
                {t("SignIn.Sign")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default Login;
