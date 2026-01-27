import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface FailedModalProps {
  visible: boolean;
  title?: string;
  message: string | React.ReactElement;
  onClose: () => void;
  showRetryButton?: boolean;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const FailedModal: React.FC<FailedModalProps> = ({
  visible,
  title = "Failed!",
  message,
  onClose,
  showRetryButton = false,
  onRetry,
  autoClose = true,
  duration = 4000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      if (autoClose) {
        progressAnim.setValue(100);
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }).start();

        const timer = setTimeout(() => {
          onClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
      progressAnim.setValue(100);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className="bg-white rounded-3xl p-6 mx-6 w-[85%] max-w-sm relative overflow-hidden"
        >
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <MaterialIcons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-center text-gray-800 mb-6">
            {title}
          </Text>

          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/New/error.png")}
                className="h-[100px] w-[100px] rounded-lg"
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <View className="mb-6">
            {typeof message === "string" ? (
              <Text className="text-center text-gray-600 text-base">
                {message}
              </Text>
            ) : (
              message
            )}
          </View>

          {showRetryButton && onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              className="bg-[#EF4444] py-3 px-6 rounded-xl mt-2"
            >
              <Text className="text-white text-center font-semibold text-base">
                Try Again
              </Text>
            </TouchableOpacity>
          )}

          {autoClose && (
            <View
              className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200"
              style={{
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }}
            >
              <Animated.View
                className="h-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#EF4444",
                  borderBottomLeftRadius: 24,
                  borderBottomRightRadius: 24,
                }}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default FailedModal;