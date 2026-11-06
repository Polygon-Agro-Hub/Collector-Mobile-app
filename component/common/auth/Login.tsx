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
  Switch,
} from "react-native";
import React, { useCallback, useState, useRef } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { FontAwesome5 } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "@/environment/environment";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { setUser } from "@/store/authSlice";
import { saveAuthData } from "@/services/authStorage";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { ROLES } from "@/constants/user-roles";
import biometricService from "@/services/biometric/biometric.service";
import BiometricAuthModal from "@/component/components/popup/BiometricAuthModal";

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

// Generic label that is correct for Face ID, Face Unlock and fingerprint devices
const BIOMETRIC_LABEL = "Face ID / Fingerprint";

const normalizeId = (id?: string | null): string =>
  (id ?? "").trim().toUpperCase();

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [empid, setEmpid] = useState("");
  const [password, setPassword] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [empIdError, setEmpIdError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Biometrics state
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [hasStoredBiometrics, setHasStoredBiometrics] = useState(false);
  const [storedBiometricEmpId, setStoredBiometricEmpId] = useState<
    string | null
  >(null);
  const [isBiometricModalVisible, setIsBiometricModalVisible] = useState(false);
  const [biometricModalStatus, setBiometricModalStatus] = useState<
    "scanning" | "success" | "error"
  >("scanning");
  const [biometricModalMode, setBiometricModalMode] = useState<
    "login" | "enable"
  >("login");

  const passwordInputRef = useRef<TextInput>(null);
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

  // On every focus (first open AND after logout): load Remember Me + Biometrics
  // and pre-fill the Employee ID. Also handles the hardware back button.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const initScreen = async () => {
        try {
          const avail = await biometricService.checkBiometricAvailability();

          const bioCreds = await biometricService.getBiometricCredentials();
          const bioEnabled = await biometricService.isBiometricEnabled();
          const storedId = normalizeId(bioCreds?.empId);
          const hasBio = Boolean(
            bioEnabled && storedId && bioCreds?.password,
          );

          const remembered = await biometricService.getRememberMeCredentials();

          if (!isActive) return;

          setIsBiometricAvailable(
            Boolean(avail.hasHardware && avail.isEnrolled),
          );
          setHasStoredBiometrics(hasBio);
          setStoredBiometricEmpId(hasBio ? storedId : null);

          // Pre-fill the form: Remember Me wins, otherwise show the
          // biometric user's Employee ID (e.g. after logout).
          if (remembered && remembered.empId && remembered.password) {
            setRememberMe(true);
            setEmpid(normalizeId(remembered.empId));
            setPassword(remembered.password);
          } else {
            setRememberMe(false);
            setEmpid(hasBio ? storedId : "");
            setPassword("");
          }
          setEmpIdError("");
        } catch (err) {
          console.warn("Initialization error in Login:", err);
        }
      };

      initScreen();

      const onBackPress = () => {
        navigation.navigate("Lanuage");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        isActive = false;
        subscription.remove();
      };
    }, [navigation]),
  );

  const handleEmpIdChange = (text: string) => {
    setEmpid(text);
    if (empIdError) {
      setEmpIdError("");
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (empIdError) {
      setEmpIdError("");
    }
  };

  // Core login execution
  const executeLogin = async (
    loginEmpId: string,
    loginPassword: string,
    options: { saveBiometricsOnSuccess?: boolean } = {},
  ): Promise<boolean> => {
    setLoading(true);
    store.dispatch(logoutUser());
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setLoading(false);
      Alert.alert(t("Error.error"), "No internet connection");
      return false;
    }

    try {
      const trimmedEmpId = loginEmpId.trim();

      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            empId: trimmedEmpId,
            password: loginPassword,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 403) {
        setLoading(false);

        if (data.reason === "role_not_allowed") {
          Alert.alert(t("Error.error"), t("Error.Access Denied"));
          return false;
        }

        const rawStatus = (data.accountStatus || "").toLowerCase();
        const isRejected = rawStatus === "rejected" || rawStatus === "banned";
        const statusType = isRejected ? "rejected" : "not_approved";
        const errorMessage = isRejected
          ? data.message ||
            t("Error.This EMP ID is Rejected", "This EMP ID is Rejected")
          : data.message ||
            t(
              "Error.This EMP ID is not approved.",
              "This EMP ID is not approved.",
            );

        navigation.navigate("BannedScreen", {
          statusType,
          message: errorMessage,
        });
        return false;
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
          Alert.alert(
            t("Error.error"),
            data.message || t("Error.Invalid EMP ID"),
          );
        } else {
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        }
        return false;
      }

      const {
        token,
        passwordUpdateRequired,
        jobRole,
        empId: returnedEmpId,
        companyNameEnglish,
        companyNameSinhala,
        companyNameTamil,
      } = data;

      if (!jobRole || !ALLOWED_ROLES.includes(jobRole.toLowerCase())) {
        setLoading(false);
        Alert.alert(t("Error.error"), t("Error.Access Denied"));
        return false;
      }

      const timestamp = new Date();
      const expirationTime = new Date(
        timestamp.getTime() + 12 * 60 * 60 * 1000,
      ); // 12h matching JWT

      const authPayload = {
        token,
        jobRole,
        empId: (returnedEmpId || trimmedEmpId).toString(),
        id: data.userId || data.officer?.id || data.id,
        companyNameEnglish: companyNameEnglish || null,
        companyNameSinhala: companyNameSinhala || null,
        companyNameTamil: companyNameTamil || null,
        tokenStoredTime: timestamp.toISOString(),
        tokenExpirationTime: expirationTime.toISOString(),
      };

      // 1. Centralized persistent token & auth storage
      await saveAuthData(authPayload);

      // 2. Redux state update
      dispatch(setUser(authPayload));

      // 3. Mark user online (fire and forget)
      status((returnedEmpId || trimmedEmpId).toString(), true);

      // 4. Save Remember Me credentials
      if (rememberMe) {
        await biometricService.saveRememberMeCredentials(
          trimmedEmpId,
          loginPassword,
        );
      } else {
        await biometricService.clearRememberMeCredentials();
      }

      // 5. Save Biometric credentials ONLY after a successful login and only
      //    if this flow requested it (Enable Biometrics). This replaces any
      //    previously saved biometric user.
      if (options.saveBiometricsOnSuccess) {
        const cleanId = normalizeId(trimmedEmpId);
        await biometricService.saveBiometricCredentials(
          cleanId,
          loginPassword,
        );
        setHasStoredBiometrics(true);
        setStoredBiometricEmpId(cleanId);
      }

      // 6. Navigate to next screen without delay
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

      return true;
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
      return false;
    }
  };

  // Normal Sign In
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

    await executeLogin(empid, password, { saveBiometricsOnSuccess: false });
  };

  // "Enable Biometrics" Button Handler
  const handleEnableBiometrics = async () => {
    Keyboard.dismiss();
    setEmpIdError("");

    const trimmedEmpId = empid.trim();
    if (!trimmedEmpId || !password) {
      Alert.alert(
        t("Biometric.CredentialsRequiredTitle", "Credentials Required"),
        t(
          "Biometric.CredentialsRequiredMessage",
          "Please enter your Employee ID and Password to enable biometric login.",
        ),
      );
      return;
    }

    if (!validateEmpIdFormat(trimmedEmpId)) {
      return;
    }

    // Check hardware availability
    const avail = await biometricService.checkBiometricAvailability();
    if (!avail.hasHardware || !avail.isEnrolled) {
      Alert.alert(
        t("Biometric.NotAvailableTitle", "Biometrics Not Available"),
        t(
          "Biometric.NotAvailableMessage",
          "Biometric authentication is not supported or no Face ID / Fingerprint is enrolled on this device.",
        ),
      );
      return;
    }

    // Show verifying modal on Android only (iOS has native system Face ID / Touch ID UI)
    if (Platform.OS === "android") {
      setIsBiometricModalVisible(true);
      setBiometricModalStatus("scanning");
      setBiometricModalMode("enable");
    }

    const verified = await biometricService.authenticateWithBiometrics(
      Platform.OS === "ios"
        ? t(
            "Biometric.TouchToEnable",
            "Verify identity to enable biometric sign-in",
          )
        : t(
            "Biometric.TouchToEnable",
            "Confirm Face ID / Fingerprint to enable biometric login",
          ),
    );

    if (verified) {
      if (Platform.OS === "android") {
        setBiometricModalStatus("success");
        setTimeout(async () => {
          setIsBiometricModalVisible(false);
          await executeLogin(trimmedEmpId, password, {
            saveBiometricsOnSuccess: true,
          });
        }, 650);
      } else {
        await executeLogin(trimmedEmpId, password, {
          saveBiometricsOnSuccess: true,
        });
      }
    } else {
      if (Platform.OS === "android") {
        setIsBiometricModalVisible(false);
      }
    }
  };

  // "Use Biometrics" Button Handler
  const handleUseBiometrics = async () => {
    Keyboard.dismiss();

    const creds = await biometricService.getBiometricCredentials();
    const credId = normalizeId(creds?.empId);

    if (!creds || !credId || !creds.password) {
      Alert.alert(
        t("Biometric.NotFoundTitle", "Biometrics Not Found"),
        t(
          "Biometric.NotFoundMessage",
          "No saved credentials found. Please sign in with your password to re-enable biometrics.",
        ),
      );
      setHasStoredBiometrics(false);
      setStoredBiometricEmpId(null);
      return;
    }

    // Show verifying modal on Android only (iOS has native system Face ID / Touch ID UI)
    if (Platform.OS === "android") {
      setIsBiometricModalVisible(true);
      setBiometricModalStatus("scanning");
      setBiometricModalMode("login");
    }

    const verified = await biometricService.authenticateWithBiometrics(
      Platform.OS === "ios"
        ? "Sign in with Face ID / Touch ID"
        : "Confirm your Face ID / Fingerprint to Sign in",
    );

    if (verified) {
      setEmpid(credId);
      setPassword(creds.password);
      setStoredBiometricEmpId(credId);

      if (Platform.OS === "android") {
        setBiometricModalStatus("success");
        setTimeout(async () => {
          setIsBiometricModalVisible(false);
          await executeLogin(credId, creds.password, {
            saveBiometricsOnSuccess: false,
          });
        }, 650);
      } else {
        await executeLogin(credId, creds.password, {
          saveBiometricsOnSuccess: false,
        });
      }
    } else {
      if (Platform.OS === "android") {
        setIsBiometricModalVisible(false);
      }
    }
  };

  // "Use Biometrics" only when stored biometrics exist AND the typed ID is empty
  // or exactly equals the stored biometric user. Any other ID => "Enable Biometrics".
  const typedId = normalizeId(empid);
  const isMatchingBiometricUser = Boolean(
    hasStoredBiometrics &&
      storedBiometricEmpId &&
      (typedId === "" || typedId === storedBiometricEmpId),
  );

  const status = async (empId: string, onlineState: boolean) => {
    try {
      const token = store.getState().auth.token;
      if (!token) {
        return;
      }

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
            status: onlineState,
          }),
        },
      );
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
            style={{
              width: 270,
              height: 270,
              maxWidth: "100%",
              alignSelf: "center",
            }}
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
              className="px-2 text-black"
              onChangeText={handleEmpIdChange}
              autoCapitalize="characters"
              value={empid}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              style={{
                flex: 1,
                minWidth: 0,
                paddingVertical: 0,
                fontSize: 16,
                height: "100%",
                includeFontPadding: false,
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
          <View className="flex-row items-center bg-[#F4F4F4] border border-[#F4F4F4] rounded-3xl mb-4 px-3 h-[50px]">
            <Image
              source={passwordicon}
              style={{ width: 24, height: 24 }}
              className="w-6 h-6"
              resizeMode="contain"
            />
            <TextInput
              ref={passwordInputRef}
              className="px-2 text-black"
              secureTextEntry={secureTextEntry}
              onChangeText={handlePasswordChange}
              value={password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              style={{
                flex: 1,
                minWidth: 0,
                paddingVertical: 0,
                fontSize: 16,
                height: "100%",
                includeFontPadding: false,
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

          {/* Remember Me switch */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              paddingHorizontal: 4,
            }}
          >
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: "#E5E7EB", true: "#FAE432" }}
              thumbColor={rememberMe ? "#000000" : "#9CA3AF"}
              ios_backgroundColor="#E5E7EB"
              style={{
                transform:
                  Platform.OS === "ios"
                    ? [{ scaleX: 0.8 }, { scaleY: 0.8 }]
                    : [{ scaleX: 0.95 }, { scaleY: 0.95 }],
              }}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setRememberMe(!rememberMe)}
              style={{ marginLeft: 8 }}
            >
              <Text
                style={{
                  color: "#4B5563",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {t("Biometric.RememberMe", "Remember me")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Normal Sign in button */}
          <TouchableOpacity
            className="bg-black w-full rounded-3xl items-center justify-center mb-5 h-[50px]"
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

          {/* OR AUTHENTICATE WITH divider & Biometrics button (shown if hardware is available) */}
          {isBiometricAvailable && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 14,
                }}
              >
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
                />
                <Text
                  style={{
                    marginHorizontal: 12,
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#9CA3AF",
                    letterSpacing: 0.8,
                  }}
                >
                  {t("Biometric.OrAuthenticateWith", "OR AUTHENTICATE WITH")}
                </Text>
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
                />
              </View>

              {/* Biometrics Secondary Pill Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={
                  isMatchingBiometricUser
                    ? handleUseBiometrics
                    : handleEnableBiometrics
                }
                disabled={loading}
                style={{
                  alignSelf: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: "#000000",
                  borderRadius: 999,
                  paddingVertical: 12,
                  paddingHorizontal: 26,
                  marginBottom: 36,
                  opacity: loading ? 0.45 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <FontAwesome5
                  name="fingerprint"
                  size={20}
                  color="#000000"
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    color: "#000000",
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {isMatchingBiometricUser
                    ? t("Biometric.UseBiometrics", "Use Biometrics")
                    : t("Biometric.EnableBiometrics", "Enable Biometrics")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Biometric Verification Modal (Android Only - Apple Pay Style) */}
      {Platform.OS === "android" && (
        <BiometricAuthModal
          visible={isBiometricModalVisible}
          status={biometricModalStatus}
          mode={biometricModalMode}
          biometricLabel={BIOMETRIC_LABEL}
          onCancel={() => setIsBiometricModalVisible(false)}
        />
      )}
    </KeyboardAwareScrollView>
  );
};

export default Login;