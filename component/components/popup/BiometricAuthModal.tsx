import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

interface BiometricAuthModalProps {
  visible: boolean;
  status: "scanning" | "success" | "error";
  onCancel: () => void;
  biometricLabel?: string;
  mode?: "login" | "enable";
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  visible,
  status,
  onCancel,
  biometricLabel = "Fingerprint",
  mode = "login",
  title,
}) => {
  const { t } = useTranslation();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleSuccessAnim = useRef(new Animated.Value(0)).current;

  // Orbiting radar ring animation
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (visible && status === "scanning") {
      rotateAnim.setValue(0);
      loop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    } else {
      rotateAnim.stopAnimation();
    }
    return () => {
      loop?.stop();
    };
  }, [visible, status]);

  // Breathing pulse for center icon during scanning
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (visible && status === "scanning") {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop?.stop();
    };
  }, [visible, status]);

  // Spring bounce checkmark animation on success
  useEffect(() => {
    if (visible && status === "success") {
      scaleSuccessAnim.setValue(0);
      Animated.spring(scaleSuccessAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, status]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.78)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#181818",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#2E2E2E",
            width: Math.min(SCREEN_WIDTH - 48, 340),
            paddingVertical: 32,
            paddingHorizontal: 24,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          {/* Circular Visual Area */}
          <View
            style={{
              width: 140,
              height: 140,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            {/* Spinning Radar Ring */}
            {status === "scanning" && (
              <Animated.View
                style={{
                  position: "absolute",
                  width: 140,
                  height: 140,
                  justifyContent: "center",
                  alignItems: "center",
                  transform: [{ rotate: spin }],
                }}
              >
                <Svg width={140} height={140} viewBox="0 0 140 140">
                  <Circle
                    cx="70"
                    cy="70"
                    r="66"
                    stroke="#FAE432"
                    strokeWidth="3.5"
                    fill="none"
                    strokeDasharray="180, 240"
                    strokeLinecap="round"
                  />
                </Svg>
              </Animated.View>
            )}

            {/* Static Success Outer Ring */}
            {status === "success" && (
              <View
                style={{
                  position: "absolute",
                  width: 136,
                  height: 136,
                  borderRadius: 68,
                  borderWidth: 3.5,
                  borderColor: "#FAE432",
                  backgroundColor: "rgba(250, 228, 50, 0.15)",
                }}
              />
            )}

            {/* Static Error Outer Ring */}
            {status === "error" && (
              <View
                style={{
                  position: "absolute",
                  width: 136,
                  height: 136,
                  borderRadius: 68,
                  borderWidth: 3.5,
                  borderColor: "#EF4444",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                }}
              />
            )}

            {/* Center Content: Pure Fingerprint while scanning */}
            {status === "scanning" && (
              <Animated.View
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  backgroundColor: "rgba(250, 228, 50, 0.12)",
                  borderWidth: 1.5,
                  borderColor: "rgba(250, 228, 50, 0.35)",
                  justifyContent: "center",
                  alignItems: "center",
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <FontAwesome5 name="fingerprint" size={50} color="#FAE432" />
              </Animated.View>
            )}

            {/* Center Content: Checkmark on success */}
            {status === "success" && (
              <Animated.View
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  backgroundColor: "#FAE432",
                  justifyContent: "center",
                  alignItems: "center",
                  transform: [{ scale: scaleSuccessAnim }],
                  shadowColor: "#FAE432",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Ionicons name="checkmark" size={56} color="#000000" />
              </Animated.View>
            )}

            {/* Center Content: Close icon on error */}
            {status === "error" && (
              <View
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  backgroundColor: "#EF4444",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#EF4444",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Ionicons name="close" size={56} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Status Label & Microcopy */}
          {status === "scanning" && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                }}
              >
                <FontAwesome5
                  name="fingerprint"
                  size={18}
                  color="#FAE432"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    textAlign: "center",
                  }}
                >
                  {title ||
                    t(
                      "Biometric.VerifyIdentityToSignIn",
                      "Verify your identity to sign in",
                    )}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  textAlign: "center",
                  lineHeight: 18,
                  paddingHorizontal: 8,
                }}
              >
                {mode === "enable"
                  ? t("Biometric.TouchToEnable", "Touch the sensor to verify and enable biometrics")
                  : t("Biometric.TouchToSignIn", "Touch the fingerprint sensor or hold your finger to sign in")}
              </Text>
            </>
          )}

          {status === "success" && (
            <>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#FAE432",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {t("Biometric.Verified", "Verified!")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  textAlign: "center",
                }}
              >
                {mode === "enable"
                  ? t("Biometric.EnabledSigningIn", "Biometrics enabled. Redirecting to Dashboard...")
                  : t("Biometric.WelcomeSigningIn", "Welcome back. Redirecting to Dashboard...")}
              </Text>
            </>
          )}

          {status === "error" && (
            <>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#EF4444",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {t("Biometric.VerificationFailed", "Verification Failed")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                  textAlign: "center",
                }}
              >
                {t("Biometric.VerificationFailedMessage", "Could not verify your identity. Please try again or use your password.")}
              </Text>
            </>
          )}

          {/* Cancel Button */}
          {status !== "success" && (
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              style={{
                marginTop: 22,
                paddingVertical: 10,
                paddingHorizontal: 28,
                borderRadius: 999,
                backgroundColor: "#262626",
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#D1D5DB",
                }}
              >
                {t("Biometric.Cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BiometricAuthModal;
