import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

type NotificationAccessNavigationProp = StackNavigationProp<
  RootStackParamList,
  any
>;

interface NotificationAccessProps {
  navigation?: NotificationAccessNavigationProp;
  onPermissionGranted?: () => void;
  onClose?: () => void;
  onNotNow?: () => void;
  returnScreen?: keyof RootStackParamList;
  onBackPress?: () => void;
  blockBackNavigation?: boolean;
}

const NotificationAccess: React.FC<NotificationAccessProps> = ({
  navigation,
  onPermissionGranted,
  onClose,
  onNotNow,
  returnScreen = "Main",
  onBackPress,
  blockBackNavigation = false,
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

  const handleNotNowPress = () => {
    if (onNotNow) {
      onNotNow();
    } else {
      handleDenyOrClose();
    }
  };

  useEffect(() => {
    const handleHardwareBackPress = () => {
      if (blockBackNavigation) {
        return true;
      }
      handleDenyOrClose();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleHardwareBackPress
    );
    return () => subscription.remove();
  }, [blockBackNavigation, navigation, onClose, onBackPress, returnScreen]);

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === "granted") {
        if (onPermissionGranted) {
          onPermissionGranted();
        } else if (navigation?.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else if (navigation) {
          navigation.navigate(returnScreen as any);
        }
      } else {
        Alert.alert(
          t("NotificationAccess.PermissionDenied") || "Permission Denied",
          t(
            "NotificationAccess.NotificationAccessIsRequiredPleaseEnableItInSettings"
          ) ||
            "Notification access is required to receive OTP and operational alerts. Please enable it in settings.",
          [
            {
              text: t("NotificationAccess.NotNow") || "Not Now",
              style: "cancel",
              onPress: handleNotNowPress,
            },
            {
              text: t("NotificationAccess.OpenSettings") || "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      Alert.alert(
        t("Error.error") || "Error",
        t(
          "NotificationAccess.UnableToRequestNotificationPermissionPleaseTryAgain"
        ) || "Unable to request notification permission. Please try again.",
        [
          {
            text: t("NotificationAccess.NotNow") || "Not Now",
            onPress: handleNotNowPress,
          },
          { text: t("Main.OK") || "OK" },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
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
          {/* Header Icon / Visual */}
          <View className="items-center justify-center mt-4 mb-5">
            <View
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{
                backgroundColor: "rgba(152, 7, 117, 0.15)",
                borderColor: "rgba(152, 7, 117, 0.4)",
                borderWidth: 2,
              }}
            >
              <MaterialCommunityIcons
                name="bell-ring"
                size={54}
                color="#E879F9"
              />
            </View>
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-2">
            {t("NotificationAccess.ProminentDisclosureTitle") ||
              "Why CoDi-Net Uses Notifications"}
          </Text>

          {/* Intro */}
          <Text className="text-gray-300 text-sm text-center mb-5 leading-5">
            {t("NotificationAccess.ProminentDisclosureIntro") ||
              "CoDi-Net sends notifications to ensure you receive essential time-sensitive operational alerts:"}
          </Text>

          {/* Feature: Return Order OTP Alerts */}
          <View className="bg-[#1E1E1E] p-4 rounded-xl mb-4 border border-gray-800 flex-row items-start">
            <View className="bg-[#980775]/20 p-2.5 rounded-lg mr-3 mt-0.5 border border-[#980775]/40">
              <MaterialCommunityIcons
                name="ticket-confirmation-outline"
                size={24}
                color="#E879F9"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base mb-1">
                {t("NotificationAccess.FeatureOTPTitle") ||
                  "Return Order OTP Alerts"}
              </Text>
              <Text className="text-gray-400 text-xs leading-4">
                {t("NotificationAccess.FeatureOTPDesc") ||
                  "Instantly receive OTP codes and verification details when drivers return orders to your distribution centre."}
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
              {t("NotificationAccess.DisclosureFooter") ||
                "Notification access is only used for operational alerts and security OTPs. We never send promotional messages or spam."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View
            className={`items-center w-full mt-4 ${
              isScreenTooLong ? "mb-2" : "mb-8"
            }`}
          >
            <TouchableOpacity
              onPress={requestNotificationPermission}
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
                    name="notifications-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-extrabold text-base tracking-wide">
                    {isLoading
                      ? t("NotificationAccess.Requesting...") || "Requesting..."
                      : t("NotificationAccess.AgreeAndContinue") ||
                        "Agree & Continue"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNotNowPress}
              activeOpacity={0.7}
              className="py-3 px-6 items-center justify-center"
            >
              <Text className="text-gray-400 font-semibold text-sm">
                {t("NotificationAccess.NotNow") || "Not Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default NotificationAccess;
