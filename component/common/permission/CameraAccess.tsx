import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  Platform,
  StatusBar,
  SafeAreaView,
  LayoutChangeEvent,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Camera } from "expo-camera";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

type CameraAccessNavigationProp = StackNavigationProp<
  RootStackParamList,
  any
>;

interface CameraAccessProps {
  navigation?: CameraAccessNavigationProp;
  onPermissionGranted?: () => void;
  onClose?: () => void;
  returnScreen?: keyof RootStackParamList;
  onBackPress?: () => void;
}

const cameraImage = require("@/assets/images/permission/camera.webp");

const CameraAccess: React.FC<CameraAccessProps> = ({
  navigation,
  onPermissionGranted,
  onClose,
  returnScreen = "Main",
  onBackPress,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const isScreenTooLong =
    scrollViewHeight > 0 &&
    contentHeight > 0 &&
    scrollViewHeight >= contentHeight + 20;

  const handleDenyOrClose = () => {
    if (onClose) {
      onClose();
    } else if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation) {
      navigation.navigate(returnScreen as any);
    }
  };

  useEffect(() => {
    const handleHardwareBackPress = () => {
      handleDenyOrClose();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleHardwareBackPress
    );
    return () => subscription.remove();
  }, [navigation, onClose, onBackPress, returnScreen]);

  const requestCameraPermission = async () => {
    setIsLoading(true);
    try {
      const current = await Camera.getCameraPermissionsAsync();
      let status = current.status;
      if (status !== "granted") {
        const response = await Camera.requestCameraPermissionsAsync();
        status = response.status;
      }

      if (status === "granted") {
        if (onPermissionGranted) {
          onPermissionGranted();
        } else if (navigation?.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else if (navigation) {
          navigation.navigate(returnScreen as any);
        }
      } else if (status === "denied") {
        Alert.alert(
          t("CameraAccess.PermissionDenied") || "Permission Denied",
          t("CameraAccess.CameraAccessIsRequiredPleaseEnableItInSettings") ||
            "Camera access is required. Please enable it in settings.",
          [
            {
              text: t("CameraAccess.NotNow") || "Not Now",
              style: "cancel",
              onPress: handleDenyOrClose,
            },
            {
              text: t("CameraAccess.OpenSettings") || "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      Alert.alert(
        t("Error.error") || "Error",
        t("CameraAccess.UnableToRequestCameraPermissionPleaseTryAgain") ||
          "Unable to request camera permission. Please try again.",
        [{ text: t("Main.OK") || "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" }}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <ScrollView
        className="flex-1 px-5"
        onLayout={(e: LayoutChangeEvent) =>
          setScrollViewHeight(e.nativeEvent.layout.height)
        }
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isScreenTooLong ? "center" : "flex-start",
          paddingBottom: isScreenTooLong
            ? 20
            : Platform.OS === "android"
            ? 75
            : 55,
          paddingTop: isScreenTooLong ? 0 : 10,
        }}
        showsVerticalScrollIndicator={false}
        bounces={!isScreenTooLong}
      >
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setContentHeight(e.nativeEvent.layout.height)
          }
          className="w-full"
        >
          {/* Header Image */}
          <View className="items-center justify-center mt-2 mb-4">
            <Image
              source={cameraImage}
              className="w-32 h-32"
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-2">
            {t("CameraAccess.ProminentDisclosureTitle") ||
              "Why CoDi-Net Uses Camera"}
          </Text>

          {/* Intro */}
          <Text className="text-gray-300 text-sm text-center mb-5 leading-5">
            {t("CameraAccess.ProminentDisclosureIntro") ||
              "CoDi-Net requires camera access to enable the following operational features:"}
          </Text>

          {/* Feature 1: QR Scanning */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-4 border border-gray-800 flex-row items-start">
            <View className="bg-[#980775]/20 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#980775]/40">
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={24}
                color="#E879F9"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                {t("CameraAccess.FeatureQRTitle") ||
                  "Instant QR Code Scanning"}
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                {t("CameraAccess.FeatureQRDesc") ||
                  "Scan driver QR codes, farmer IDs, pickup orders, and cash handover QR codes for quick identification, verification, and secure transport & collection operations."}
              </Text>
            </View>
          </View>

          {/* Privacy Note */}
          <View className="bg-[#200A1A] p-3 rounded-lg mb-6 border border-[#980775]/30 flex-row items-start">
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#E879F9"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <Text className="text-gray-300 text-xs flex-1 leading-4">
              {t("CameraAccess.DisclosureFooter") ||
                "Camera access is only active while scanning QR codes. No photos or videos are recorded without your explicit action."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            className={`items-center w-full mt-4 ${
              isScreenTooLong ? "mb-2" : "mb-8"
            }`}
          >
            <TouchableOpacity
              onPress={requestCameraPermission}
              activeOpacity={0.8}
              disabled={isLoading}
              className="w-full mb-3"
              style={{ borderRadius: 999, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#7B065E", "#980775", "#B8138F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: 52,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-extrabold text-base tracking-wide">
                    {isLoading
                      ? t("CameraAccess.Requesting...") || "Requesting..."
                      : t("CameraAccess.AgreeAndContinue") ||
                        "Agree & Continue"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDenyOrClose}
              activeOpacity={0.7}
              className="py-3 px-6 items-center justify-center"
            >
              <Text className="text-gray-400 font-semibold text-sm">
                {t("CameraAccess.NotNow") || "Not Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CameraAccess;
