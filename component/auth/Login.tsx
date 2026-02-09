import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  BackHandler,
} from "react-native";
import React, { useCallback, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ScrollView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import AntDesign from "react-native-vector-icons/AntDesign";
import LottieView from "lottie-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { setUser } from "../../store/authSlice";
import { useDispatch } from "react-redux";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import NetInfo from "@react-native-community/netinfo";

type LoginNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginProps {
  navigation: LoginNavigationProp;
}

const loginImage = require("@/assets/images/New/login.png");
const user = require("@/assets/images/New/user.png");
const passwordicon = require("@/assets/images/New/password.png");

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

  const checkDCMAccess = async (empId: string, pass: string) => {
    if (!empId.trim() || !pass.trim()) return;

    const trimmedEmpId = empId.trim();

    // First validate format
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
        if (data.jobRole.toLowerCase() === "distribution centre head") {
          setEmpIdError(
            t(
              "Error.Distribution Centre Head are not allowed to access this application",
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

    // Clear any existing errors
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
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("jobRole");
    await AsyncStorage.removeItem("companyNameEnglish");
    await AsyncStorage.removeItem("companyNameSinhala");
    await AsyncStorage.removeItem("companyNameTamil");
    await AsyncStorage.removeItem("empid");

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
      console.log("Login response:", data);

      if (response.status === 403) {
        setLoading(false);

        // Handle different account statuses
        let errorMessage = t("Error.This EMP ID is not approved.");

        if (data.accountStatus === "Rejected") {
          errorMessage = t("Error.This EMP ID is Rejected");
        } else if (data.accountStatus === "Not Approved") {
          errorMessage = t("Error.This EMP ID is not approved.");
        }

        Alert.alert(t("Error.error"), errorMessage);
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
          console.log("Login error:", data);
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
        accountStatus,
      } = data;

      const allowedRoles = [
        "collection officer",
        "collection centre manager",
        "distribution officer",
        "distribution centre manager",
      ];

      if (!allowedRoles.includes(jobRole.toLowerCase())) {
        setLoading(false);
        Alert.alert(t("Error.error"), t("Error.Access denied"));
        return;
      }

      // Continue with normal login flow
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("jobRole", jobRole);
      await AsyncStorage.setItem("companyNameEnglish", companyNameEnglish);
      await AsyncStorage.setItem("companyNameSinhala", companyNameSinhala);
      await AsyncStorage.setItem("companyNameTamil", companyNameTamil);
      await AsyncStorage.setItem("empid", empId.toString());
      dispatch(setUser({ token, jobRole, empId: empId.toString() }));

      if (token) {
        const timestamp = new Date();
        const expirationTime = new Date(
          timestamp.getTime() + 8 * 60 * 60 * 1000,
        );
        await AsyncStorage.multiSet([
          ["tokenStoredTime", timestamp.toISOString()],
          ["tokenExpirationTime", expirationTime.toISOString()],
        ]);
      }

      //   console.log("Password update required:", passwordUpdateRequired);
      await status(empId, true);

      setTimeout(() => {
        setLoading(false);

        if (passwordUpdateRequired) {
          navigation.navigate("ChangePassword");
        } else {
          // Fixed: Check for both Distribution roles individually
          if (
            jobRole === "Distribution Officer" ||
            jobRole === "Distribution Centre Manager"
          ) {
            navigation.navigate("Main", { screen: "DistridutionaDashboard" });
          } else if (jobRole === "Collection Officer") {
            navigation.navigate("Main", { screen: "Dashboard" });
          } else {
            navigation.navigate("Main", { screen: "ManagerDashboard" });
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
      const token = await AsyncStorage.getItem("token");
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

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener("hardwareBackPress", onBackPress);
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className=" bg-white"
      >
        <View
          className="flex-row items-center justify-between "
          style={{ paddingHorizontal: wp(4), paddingVertical: hp(2) }}
        >
          <TouchableOpacity onPress={() => handleNavBack()}>
            <AntDesign
              name="left"
              size={22}
              color="black"
              style={{
                paddingHorizontal: wp(3),
                paddingVertical: hp(1.5),
                backgroundColor: "#F6F6F680",
                borderRadius: 50,
              }}
            />
          </TouchableOpacity>
          <View style={{ width: 22 }} />
        </View>

        <View className="items-center ">
          <Image
            source={loginImage}
            style={{ width: 270, height: 270 }}
            resizeMode="contain"
          />
          <Text className="font-bold text-2xl pt-[7%]">
            {t("SignIn.Wellcome")}
          </Text>
        </View>

        <View className="mt-2 items-center">
          <Text>{t("SignIn.SigntoLogin")}</Text>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center ">
            <LottieView
              source={require("../../assets/lottie/newLottie.json")}
              autoPlay
              loop
              style={{ width: 300, height: 300 }}
            />
          </View>
        ) : (
          <View className="p-6">
            <Text className="text-base pb-[2%] font-light">
              {t("SignIn.Employee")}
            </Text>
            <View
              className={`flex-row items-center bg-[#F4F4F4] border rounded-3xl w-[95%] h-[53px] mb-2 px-3 ${
                empIdError ? "border-red-500" : "border-[#F4F4F4]"
              }`}
            >
              <Image
                source={user}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
              <TextInput
                className="flex-1 h-[40px] text-base pl-2"
                onChangeText={handleEmpIdChange}
                autoCapitalize="characters"
                value={empid}
              />
            </View>

            {/* Error message for Employee ID */}
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
            <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl w-[95%] h-[53px] mb-8 px-3">
              <Image
                source={passwordicon}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
              <TextInput
                className="flex-1 h-[40px] text-base pl-2"
                secureTextEntry={secureTextEntry}
                onChangeText={handlePasswordChange}
                value={password}
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
              className="bg-[#000000] w-full p-3 rounded-3xl shadow-2xl items-center justify-center mb-[20%]"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-center text-xl font-light text-white">
                  {t("SignIn.Sign")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;
