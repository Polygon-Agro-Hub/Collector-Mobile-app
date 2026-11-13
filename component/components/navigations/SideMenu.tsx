import { logoutUser } from "@/store/authSlice";
import store from "@/services/reducxStore";
import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  BackHandler,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "@/environment/environment";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";
import { LanguageContext } from "@/context/LanguageContext";
import LottieView from "lottie-react-native";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { ROLES } from "@/constants/user-roles";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import {
  isQuickAccessScaleEnabled,
  setQuickAccessScaleEnabled,
} from "@/utils/scale/scale-storage";
import biometricService from "@/services/biometric/biometric.service";

type SideMenuNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SideMenu"
>;

interface SideMenuProps {
  navigation: SideMenuNavigationProp;
}

const api = axios.create({
  baseURL: environment.API_BASE_URL,
});

interface UserProfile {
  firstNameEnglish: string;
  lastNameEnglish: string;
  companyName: string;
  image: string;
  firstNameSinhala: string;
  lastNameSinhala: string;
  firstNameTamil: string;
  lastNameTamil: string;
  companyNameSinhala: string;
  companyNameEnglish: string;
  companyNameTamil: string;
  empId: string;
  jobRole: string;
}

const icon = require("@/assets/images/common/eng-profile-icon.webp");

const SideMenu: React.FC<SideMenuProps> = ({ navigation }) => {
  const [isLanguageDropdownOpen, setLanguageDropdownOpen] =
    useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(
    null,
  );
  const [isComplaintDropdownOpen, setComplaintDropdownOpen] =
    useState<boolean>(false);
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useContext(LanguageContext);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [jobRole, setJobRole] = useState<string | null>(null);
  const [isQuickAccessEnabled, setIsQuickAccessEnabled] = useState<boolean>(true);
  const [isScaleSelectModalVisible, setIsScaleSelectModalVisible] = useState<boolean>(false);

  // Biometrics state
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState<boolean>(false);
  const [passwordModalInput, setPasswordModalInput] = useState<string>("");
  const [passwordModalError, setPasswordModalError] = useState<string>("");
  const [modalSecureTextEntry, setModalSecureTextEntry] = useState<boolean>(true);
  const [isPasswordVerifying, setIsPasswordVerifying] = useState<boolean>(false);

  useEffect(() => {
    isQuickAccessScaleEnabled().then((val) => {
      setIsQuickAccessEnabled(val);
    });
  }, []);

  const handleToggleQuickAccess = async (val: boolean) => {
    setIsQuickAccessEnabled(val);
    await setQuickAccessScaleEnabled(val);
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (!val) {
      await biometricService.setBiometricEnabled(false);
      setIsBiometricsEnabled(false);
      Alert.alert(
        t("Error.Success", "Success"),
        t("Biometric.BiometricsDisabledSuccess", "Biometric sign-in has been disabled."),
      );
      return;
    }

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

    const currentEmpId = profile?.empId || store.getState().auth.empId || "";
    const storedCreds = await biometricService.getBiometricCredentials();
    const rememberCreds = await biometricService.getRememberMeCredentials();

    let existingPassword = "";
    if (
      storedCreds &&
      storedCreds.empId.trim().toUpperCase() === currentEmpId.trim().toUpperCase() &&
      storedCreds.password
    ) {
      existingPassword = storedCreds.password;
    } else if (
      rememberCreds &&
      rememberCreds.empId.trim().toUpperCase() === currentEmpId.trim().toUpperCase() &&
      rememberCreds.password
    ) {
      existingPassword = rememberCreds.password;
    }

    if (existingPassword) {
      const verified = await biometricService.authenticateWithBiometrics(
        t("Biometric.VerifyIdentityToSignIn", "Verify your identity to sign in"),
      );
      if (verified) {
        await biometricService.saveBiometricCredentials(currentEmpId, existingPassword);
        setIsBiometricsEnabled(true);
        Alert.alert(
          t("Error.Success", "Success"),
          t("Biometric.BiometricsEnabledSuccess", "Biometric sign-in has been enabled successfully."),
        );
      }
    } else {
      setPasswordModalInput("");
      setPasswordModalError("");
      setModalSecureTextEntry(true);
      setIsPasswordModalVisible(true);
    }
  };

  const handleConfirmPasswordAndEnable = async () => {
    if (!passwordModalInput.trim()) {
      setPasswordModalError(
        t("Error.Password is not allowed to be empty", "Password is not allowed to be empty"),
      );
      return;
    }

    const currentEmpId = profile?.empId || store.getState().auth.empId || "";
    if (!currentEmpId) {
      setPasswordModalError(t("Error.Invalid EMP ID", "Invalid EMP ID"));
      return;
    }

    setIsPasswordVerifying(true);
    setPasswordModalError("");

    try {
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-officer/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: currentEmpId.trim(),
            password: passwordModalInput,
          }),
        },
      );

      if (!response.ok) {
        setIsPasswordVerifying(false);
        setPasswordModalError(
          t("Error.Invalid Password. Please try again.", "Invalid Password. Please try again."),
        );
        return;
      }

      setIsPasswordVerifying(false);
      setIsPasswordModalVisible(false);

      const verified = await biometricService.authenticateWithBiometrics(
        t("Biometric.VerifyIdentityToSignIn", "Verify your identity to sign in"),
      );

      if (verified) {
        await biometricService.saveBiometricCredentials(currentEmpId, passwordModalInput);
        setIsBiometricsEnabled(true);
        setPasswordModalInput("");
        Alert.alert(
          t("Error.Success", "Success"),
          t("Biometric.BiometricsEnabledSuccess", "Biometric sign-in has been enabled successfully."),
        );
      }
    } catch (error) {
      setIsPasswordVerifying(false);
      console.error("Error verifying password:", error);
      setPasswordModalError(
        t("Error.somethingWentWrong", "Something went wrong. Please try again later."),
      );
    }
  };

  useEffect(() => {
    const fetchJobRole = async () => {
      try {
        const role = store.getState().auth.jobRole;
        setJobRole(role);
      } catch (error) {
        console.error("Error fetching job role:", error);
      }
    };
    fetchJobRole();
  }, []);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      setComplaintDropdownOpen(false);
      setLanguageDropdownOpen(false);
      const curLang = (i18n.language || "").toLowerCase();
      if (curLang.startsWith("si")) {
        setSelectedLanguage("SINHALA");
      } else if (curLang.startsWith("ta")) {
        setSelectedLanguage("TAMIL");
      } else {
        setSelectedLanguage("ENGLISH");
      }
      isQuickAccessScaleEnabled().then((val) => {
        setIsQuickAccessEnabled(val);
      });
    }, [i18n.language]),
  );
  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
    };
    fetchData();
  }, []);

  const route = useRoute();
  const currentScreen = route.name;

  const complaintOptions = [
    t("SideMenu.Report Complaint"),
    t("SideMenu.View Complaint History"),
  ];

  const handleComplaintSelect = (complaint: string) => {
    setComplaintDropdownOpen(false);

    if (complaint === t("SideMenu.Report Complaint")) {
      navigation.navigate("ComplainPage" as any, { userId: 0 });
    } else if (complaint === t("SideMenu.View Complaint History")) {
      navigation.navigate("Main", {
        screen: "ComplainHistory",
        params: {
          fullname: profile
            ? `${profile.firstNameEnglish || ""} ${profile.lastNameEnglish || ""}`.trim()
            : "",
          fullnameSi: profile
            ? `${profile.firstNameSinhala || ""} ${profile.lastNameSinhala || ""}`.trim()
            : "",
          fullnameTa: profile
            ? `${profile.firstNameTamil || ""} ${profile.lastNameTamil || ""}`.trim()
            : "",
        },
      });
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = store.getState().auth.token;
        const role = store.getState().auth.jobRole;
        if (token) {
          const endpoint =
            role === ROLES.DISTRIBUTION_OFFICER ||
              role === ROLES.DISTRIBUTION_MANAGER ||
              role === "Distribution Officer" ||
              role === "Distribution Centre Manager"
              ? "api/distribution-manager/user-profile"
              : "api/collection-officer/user-profile";

          const response = await api.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data && response.data.data) {
            const data = response.data.data;
            setProfile(data);
            const fnEn = `${data.firstNameEnglish || ""} ${data.lastNameEnglish || ""}`.trim();
            const fnSi = `${data.firstNameSinhala || ""} ${data.lastNameSinhala || ""}`.trim();
            const fnTa = `${data.firstNameTamil || ""} ${data.lastNameTamil || ""}`.trim();
            if (fnEn) AsyncStorage.setItem("fullname", fnEn);
            if (fnSi) AsyncStorage.setItem("fullnameSi", fnSi);
            if (fnTa) AsyncStorage.setItem("fullnameTa", fnTa);
          }
        }
      } catch (error: any) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.log("User profile access restricted or unauthorized (403/401).");
        } else {
          console.warn("User profile fetch warning:", error.message || error);
        }
      }
    };

    fetchUserProfile();
  }, []);

  const HanldeAsynStorage = async (lng: string) => {
    await AsyncStorage.setItem("@user_language", lng);
  };

  const LanguageSelect = async (language: string) => {
    try {
      await AsyncStorage.setItem("@user_language", language);
      changeLanguage(language);
    } catch (error) { }
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setLanguageDropdownOpen(false);
    const code = language === "SINHALA" ? "si" : language === "TAMIL" ? "ta" : "en";
    try {
      AsyncStorage.setItem("@user_language", code);
      changeLanguage(code);
      i18n.changeLanguage(code);
    } catch (error) { }
  };

  const handleLogout = () => {
    navigation.navigate("Logout" as any);
  };

  const handleEditClick = () => {
    navigation.navigate("Profile" as any, { jobRole: profile?.jobRole });
  };

  const getTextStyle = (language: string) => {
    if (language === "si" || language === "SINHALA" || i18n.language?.startsWith("si")) {
      return {
        fontSize: 14,
        lineHeight: 20,
      };
    }
    return {
      fontSize: 16,
      lineHeight: 25,
    };
  };

  const getFullName = () => {
    if (!profile) return t("ManagerTransactions.Loading");
    const lang = (i18n.language || "").toLowerCase();
    const isSinhala = selectedLanguage === "SINHALA" || selectedLanguage === "si" || lang.startsWith("si");
    const isTamil = selectedLanguage === "TAMIL" || selectedLanguage === "ta" || lang.startsWith("ta");

    if (isSinhala) {
      const siName = `${profile.firstNameSinhala || ""} ${profile.lastNameSinhala || ""}`.trim();
      if (siName) return siName;
    }
    if (isTamil) {
      const taName = `${profile.firstNameTamil || ""} ${profile.lastNameTamil || ""}`.trim();
      if (taName) return taName;
    }
    return `${profile.firstNameEnglish || ""} ${profile.lastNameEnglish || ""}`.trim() || t("SideMenu.Officer");
  };

  const handleBackPress = () => {
    if (
      profile?.jobRole === ROLES.DISTRIBUTION_OFFICER ||
      profile?.jobRole === ROLES.DISTRIBUTION_MANAGER
    ) {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
    } else if (
      profile?.jobRole === ROLES.COLLECTION_OFFICER ||
      profile?.jobRole === ROLES.COLLECTION_MANAGER
    ) {
      navigation.navigate("Main", { screen: "CollectionDashboard" });
    }
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      const checkBioStatus = async () => {
        try {
          const currentEmpId = profile?.empId || store.getState().auth.empId;
          const enabled = await biometricService.isBiometricEnabledForUser(currentEmpId);
          setIsBiometricsEnabled(enabled);
        } catch (e) {
          console.warn("Error checking biometric status:", e);
        }
      };
      checkBioStatus();

      return () => subscription.remove();
    }, [navigation, jobRole, profile, currentScreen]),
  );

  return (
    <View className="flex-1 bg-white ">
      <CustomHeader
        title=""
        showBackButton={true}
        navigation={navigation}
        onBackPress={handleBackPress}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View className="flex-row items-center px-8 mb-4">
          <Image
            source={
              profile?.image
                ? { uri: profile.image }
                : require("../../../assets/images/auth/my-profile.webp")
            }
            className="w-16 h-16 rounded-full mr-3"
          />

          <View className="flex-1">
            <Text
              style={[{ fontSize: 16 }, getTextStyle(selectedLanguage)]}
              className="text-lg font-bold"
            >
              {getFullName()}
            </Text>
            <Text className="text-gray-500">{profile?.empId}</Text>
          </View>

          <TouchableOpacity onPress={handleEditClick}>
            <Image
              source={icon}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1 py-4 px-8 mt-[-30]">
          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            onPress={() => setLanguageDropdownOpen(!isLanguageDropdownOpen)}
            className="flex-row items-center py-3"
          >
            <Ionicons name="globe-outline" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("SideMenu.Language")}
            </Text>
            <MaterialIcons
              name={
                isLanguageDropdownOpen ? "arrow-drop-up" : "arrow-drop-down"
              }
              size={30}
              color="black"
            />
          </TouchableOpacity>

          {/* Then render dropdown AFTER the trigger */}
          {isLanguageDropdownOpen && (
            <View className="pl-8 bg-white  rounded-lg mt-2">
              {["ENGLISH", "SINHALA", "TAMIL"].map((language) => {
                const displayLanguage =
                  language === "SINHALA"
                    ? "සිංහල"
                    : language === "TAMIL"
                      ? "தமிழ்"
                      : language === "ENGLISH"
                        ? "English"
                        : language;
                return (
                  <TouchableOpacity
                    key={language}
                    onPress={() => handleLanguageSelect(language)}
                    className={`flex-row items-center py-2 px-4 rounded-lg my-1 ${selectedLanguage === language
                        ? "bg-[#FFDFF7]"
                        : "bg-transparent"
                      }`}
                  >
                    <Text
                      className={`text-base ${selectedLanguage === language
                          ? "text-black"
                          : "text-[#434343]"
                        }`}
                    >
                      {displayLanguage}
                    </Text>
                    {selectedLanguage === language && (
                      <View className="absolute right-4">
                        <Ionicons name="checkmark" size={20} color="black" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={() => navigation.navigate("OfficerQr")}
          >
            <Ionicons name="qr-code" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">{t("SideMenu.View")}</Text>
          </TouchableOpacity>

          {/* Horizontal Line */}
          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Change Password */}
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => navigation.navigate("ChangePassword")}
          >
            <Ionicons name="lock-closed-outline" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("SideMenu.ChangePassword")}
            </Text>
          </TouchableOpacity>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Use Biometrics */}
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center flex-1 pr-2">
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="finger-print" size={20} color="#374151" />
              </View>
              <Text className="text-lg font-normal text-black">
                {t("Biometric.UseBiometrics", "Use Biometrics")}
              </Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: "#E2E8F0", true: "#007AFF" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E2E8F0"
            />
          </View>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Quick Access to Scale */}
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center flex-1 pr-2">
              <MaterialCommunityIcons name="scale" size={22} color="black" />
              <Text className="text-lg ml-2 font-normal text-black">
                {t("SideMenu.Quick Access to Scale", "Quick Access to Scale")}
              </Text>
            </View>
            <Switch
              value={isQuickAccessEnabled}
              onValueChange={handleToggleQuickAccess}
              trackColor={{ false: "#e2e8f0", true: "#007AFF" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#e2e8f0"
            />
          </View>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Scale Connection Guide */}
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => navigation.navigate("ScaleConnectionGuide")}
          >
            <MaterialCommunityIcons name="book-open-outline" size={22} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("SideMenu.ScaleConnectionGuide", "Scale Connection Guide")}
            </Text>
          </TouchableOpacity>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => navigation.navigate("PrivacyPolicy")}
          >
            <MaterialIcons name="privacy-tip" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("PrivacyPlicy.PrivacyPolicy")}
            </Text>
          </TouchableOpacity>

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          <TouchableOpacity
            onPress={() => setComplaintDropdownOpen(!isComplaintDropdownOpen)}
            className="flex-row items-center py-3"
          >
            <AntDesign name="warning" size={20} color="black" />
            <Text className="flex-1 text-lg ml-2">
              {t("SideMenu.Complaints")}
            </Text>
            <MaterialIcons
              name={
                isComplaintDropdownOpen ? "arrow-drop-up" : "arrow-drop-down"
              }
              size={30}
              color="black"
            />
          </TouchableOpacity>

          {isComplaintDropdownOpen && (
            <View className="pl-8">
              {complaintOptions.map((complaint) => (
                <TouchableOpacity
                  key={complaint}
                  onPress={() => handleComplaintSelect(complaint)}
                  className={`flex-row items-center py-2 px-4 rounded-lg my-1 ${selectedComplaint === complaint ? "bg-green-200" : ""
                    }`}
                >
                  <Text
                    className={`text-base ${selectedComplaint === complaint ? "text-black" : "#434343"
                      }`}
                  >
                    {complaint}
                  </Text>
                  {selectedComplaint === complaint && (
                    <View className="absolute right-4">
                      <Ionicons name="checkmark" size={20} color="black" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="h-0.5 bg-[#D2D2D2] my-4" />

          {/* Logout Button */}
          <TouchableOpacity
            className="flex-row items-center py-3 mb-20"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="red" />
            <Text className="flex-1 text-lg ml-2 text-red-500">
              {t("SideMenu.Logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Scale Select Modal */}
      <ScaleSelectModal
        visible={isScaleSelectModalVisible}
        onClose={() => setIsScaleSelectModalVisible(false)}
      />

      {/* Enable Biometrics Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsPasswordModalVisible(false);
          setPasswordModalInput("");
          setPasswordModalError("");
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 360,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#F3E8FF",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="finger-print" size={28} color="#7C3AED" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#111827",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {t("Biometric.EnableBiometrics", "Enable Biometrics")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                {t(
                  "Biometric.EnterPasswordToEnableBiometrics",
                  "Enter your password to enable biometric sign-in",
                )}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F4F4F4",
                borderWidth: 1,
                borderColor: passwordModalError ? "#EF4444" : "#E5E7EB",
                borderRadius: 16,
                paddingHorizontal: 12,
                height: 48,
                marginBottom: passwordModalError ? 4 : 16,
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#6B7280"
                style={{ marginRight: 8 }}
              />
              <TextInput
                secureTextEntry={modalSecureTextEntry}
                value={passwordModalInput}
                onChangeText={(text) => {
                  setPasswordModalInput(text);
                  if (passwordModalError) setPasswordModalError("");
                }}
                placeholder={t("SignIn.Password", "Password")}
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#111827",
                  paddingVertical: 0,
                }}
              />
              <TouchableOpacity
                onPress={() => setModalSecureTextEntry(!modalSecureTextEntry)}
              >
                <Ionicons
                  name={modalSecureTextEntry ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {passwordModalError ? (
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginBottom: 14,
                  paddingHorizontal: 4,
                }}
              >
                {passwordModalError}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setIsPasswordModalVisible(false);
                  setPasswordModalInput("");
                  setPasswordModalError("");
                }}
                disabled={isPasswordVerifying}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 999,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#4B5563",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {t("Biometric.Cancel", "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmPasswordAndEnable}
                disabled={isPasswordVerifying}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 999,
                  backgroundColor: "#000000",
                  alignItems: "center",
                }}
              >
                {isPasswordVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {t("Ok", "OK")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SideMenu;
