import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string | React.ReactNode;
  type?: "success" | "error";
  onClose: () => void;
  showRescanButton?: boolean;
  onRescan?: () => void;
  showOpenOngoingButton?: boolean;
  onOpenOngoing?: () => void;
  duration?: number;
  autoClose?: boolean;
  showOkButton?: boolean;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = "error",
  onClose,
  showRescanButton = false,
  onRescan,
  showOpenOngoingButton = false,
  onOpenOngoing,
  duration = 4000,
  autoClose = true,
  showOkButton,
}) => {
  const { t } = useTranslation();
  const isOkButtonVisible =
    showOkButton !== undefined ? showOkButton : !autoClose;
  const loadingBarWidth = useRef(new Animated.Value(1)).current; // 1 = 100%

  useEffect(() => {
    if (visible && autoClose) {
      loadingBarWidth.setValue(1);

      Animated.timing(loadingBarWidth, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      const closeTimer = setTimeout(() => {
        onClose();
      }, duration - 200);

      return () => clearTimeout(closeTimer);
    }
  }, [visible, duration, autoClose]);

  const getContent = () => {
    switch (type) {
      case "success":
        return (
          <LottieView
            source={require("../../../assets/lottie/successful.json")}
            autoPlay
            loop={false}
            style={{ width: 120, height: 120 }}
          />
        );
      case "error":
      default:
        return (
          <LottieView
            source={require("../../../assets/lottie/error.json")}
            autoPlay
            loop={false}
            style={{ width: 120, height: 120 }}
          />
        );
    }
  };

  const renderMessage = () => {
    if (typeof message === "string") {
      return (
        <Text className="text-center text-[#4E4E4E] mb-5 mt-2">{message}</Text>
      );
    }
    return message;
  };

  const getModalTitle = () => {
    if (showOpenOngoingButton) {
      return t("AlertModal.Cannot Proceed!", "Cannot Proceed!");
    }
    return title;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape",
        "landscape-left",
        "landscape-right",
      ]}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white p-6 rounded-2xl items-center shadow-lg w-full max-w-md relative">
          <TouchableOpacity
            className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-[#F7FAFF] items-center justify-center"
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#000000" />
          </TouchableOpacity>

          <Text
            className="font-bold text-lg mb-4 text-center text-black"
            style={{ paddingHorizontal: 36 }}
          >
            {getModalTitle()}
          </Text>

          {getContent()}

          {renderMessage()}

          <View className="w-full gap-y-3">
            {showRescanButton && onRescan && (
              <TouchableOpacity
                onPress={onRescan}
                activeOpacity={0.8}
                className="bg-[#980775] py-3 px-6 rounded-full flex-row items-center justify-center gap-x-2 shadow-md"
              >
                <FontAwesome5 name="undo" size={18} color="white" />
                <Text className="text-white font-bold text-base">
                  {t("AlertModal.Re-Scan", "Re-Scan")}
                </Text>
              </TouchableOpacity>
            )}

            {/* Open Ongoing Activity Button (only shown when showOpenOngoingButton is true) */}
            {showOpenOngoingButton && onOpenOngoing && (
              <TouchableOpacity
                onPress={onOpenOngoing}
                activeOpacity={0.8}
                className="bg-[#980775] py-3 px-6 rounded-full flex-row items-center justify-center gap-x-2 shadow-md"
              >
                <Text className="text-white font-bold text-base">
                  {t("AlertModal.Open Ongoing Activity", "Open Ongoing Activity")}
                </Text>
              </TouchableOpacity>
            )}

            {isOkButtonVisible && (
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                className="bg-[#980775] py-3 px-6 rounded-full flex-row items-center justify-center gap-x-2 shadow-md"
              >
                <Text className="text-white font-bold text-base">
                  {t("AlertModal.OK", "OK")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loading Bar - only show if autoClose is true */}
          {autoClose && (
            <View
              className="absolute bottom-0 left-0 right-0 h-3"
              style={{
                overflow: "hidden",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            >
              <Animated.View
                className="h-full rounded-b-3xl"
                style={{
                  width: loadingBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#980775",
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Global Alert Listener & Hook setup
type AlertListener = (
  title: string,
  message: string | React.ReactNode,
  type: "success" | "error",
  onClose: () => void,
  autoClose: boolean,
  showOkButton?: boolean,
) => void;

let globalAlertListener: AlertListener | null = null;

export const setGlobalAlertListener = (listener: AlertListener) => {
  globalAlertListener = listener;
};

const originalAlert = Alert.alert;

Alert.alert = (title, message, buttons, options) => {
  const hasMultipleButtons = buttons && buttons.length > 1;

  if (hasMultipleButtons) {
    originalAlert(title, message, buttons, options);
  } else {
    const combinedText =
      `${title || ""} ${typeof message === "string" ? message : ""}`.toLowerCase();

    const ERROR_KEYWORDS = [
      // English
      "unsuccessful",
      "fail",
      "failed",
      "failure",
      "error",
      "invalid",
      "unable",
      "cannot",
      "could not",
      "warning",
      "denied",
      "rejected",
      "banned",
      "expired",
      "wrong",
      "missing",
      "not found",
      "sorry",
      // Sinhala
      "අසාර්ථක", // failed / unsuccessful
      "අසමත්", // failed / unable
      "දෝෂ", // error
      "වැරදි", // wrong
      "සමාවෙන්න", // sorry
      "කණගාටුයි", // sorry
      "නොහැක", // cannot
      "නොහැකි", // unable
      "ප්‍රතික්ෂේප", // rejected
      "වලංගු නැත", // invalid
      "වලංගු නොවන", // invalid
      "අවලංගු", // invalid
      "අවසර නැත", // permission denied
      "හමු නොවීය", // not found
      // Tamil
      "தோல்வி", // fail / failure / unsuccessful
      "பிழை", // error
      "தவறு", // wrong
      "மன்னிக்கவும்", // sorry
      "முடியாது", // cannot
      "இயலவில்லை", // unable
      "நிராகரிக்கப்பட்டது", // rejected
      "செல்லுபடியாகாது", // invalid
      "அனுமதி இல்லை", // permission denied
      "காணப்படவில்லை", // not found
    ];

    const SUCCESS_KEYWORDS = [
      // English
      "success",
      "successful",
      "successfully",
      "connected",
      "completed",
      "complete",
      "done",
      "saved",
      "updated",
      "sent",
      "verified",
      "approved",
      "confirmed",
      "created",
      "submitted",
      "claimed",
      "disclaimed",
      "generated",
      "passed",
      "received",
      "added",
      // Sinhala
      "සාර්ථක", // covers සාර්ථක, සාර්ථකයි, සාර්ථකව, etc.
      "සම්බන්ධ විය", // successfully connected
      "සුරකින ලදී", // saved
      "යාවත්කාලීන කරන ලදී", // updated
      "යවන ලදී", // sent
      "යවා ඇත", // sent
      "එවා ඇත", // resent
      "සම්පූර්ණ", // completed
      "ඉදිරිපත් කරන ලදී", // submitted
      "අනුමත කරන ලදී", // approved
      "ලැබුණි", // received
      "මාරු කරන ලදී", // transferred
      "ජනනය කරන ලදී", // generated
      "නිර්මාණය කරන ලදී", // created
      "පවරන ලදී", // assigned
      "භාර දී ඇත", // handed over
      // Tamil
      "வெற்றி", // covers வெற்றி, வெற்றி!, வெற்றிகரமாக, etc.
      "இணைக்கப்பட்டது", // connected
      "சேமிக்கப்பட்டது", // saved
      "புதுப்பிக்கப்பட்டது", // updated
      "அனுப்பப்பட்டது", // sent
      "முழுமையடைந்தது", // completed
      "சமர்ப்பிக்கப்பட்டது", // submitted
      "ஒப்படைக்கப்பட்டது", // handed over
      "உருவாக்கப்பட்டது", // created
      "அங்கீகரிக்கப்பட்டது", // approved
      "பெறப்பட்டது", // received
      "மாற்றப்பட்டது", // transferred
      "ஒதுக்கப்பட்டது", // assigned
    ];

    const hasErrorKeyword = ERROR_KEYWORDS.some((kw) =>
      combinedText.includes(kw.toLowerCase())
    );

    const hasSuccessKeyword = SUCCESS_KEYWORDS.some((kw) =>
      combinedText.includes(kw.toLowerCase())
    );

    const explicitType = (options as any)?.type;
    const isSuccess =
      explicitType === "success"
        ? true
        : explicitType === "error"
        ? false
        : !hasErrorKeyword && hasSuccessKeyword;

    const type = isSuccess ? "success" : "error";

    const onCloseCallback = () => {
      if (buttons && buttons.length === 1 && buttons[0].onPress) {
        buttons[0].onPress();
      }
    };

    const autoClose =
      (options as any)?.autoClose !== undefined
        ? (options as any).autoClose
        : isSuccess === true;

    const showOkButton =
      (options as any)?.showOkButton !== undefined
        ? (options as any).showOkButton
        : !isSuccess;

    if (globalAlertListener) {
      globalAlertListener(
        title || "",
        message || "",
        type,
        onCloseCallback,
        autoClose,
        showOkButton,
      );
    } else {
      originalAlert(title, message, buttons, options);
    }
  }
};

export default AlertModal;
