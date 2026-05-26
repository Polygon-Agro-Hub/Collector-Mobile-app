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

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string | React.ReactElement;
  onClose: () => void;
  onNavigate?: () => void;
  showNavigateButton?: boolean;
  navigateButtonText?: string;
  autoClose?: boolean;
  duration?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = "Success!",
  message,
  onClose,
  autoClose = true,
  duration = 4000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.sequence([
        Animated.delay(200),
        Animated.spring(checkAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

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
      checkAnim.setValue(0);
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
      <View style={{ flex: 1, backgroundColor: '#00000040', justifyContent: 'center', alignItems: 'center' }}>
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
            style={{ transform: [{ scale: checkAnim }] }}
            className="items-center mb-6"
          >
            <View className="relative">
              <Image
                source={require("../../assets/images/collection-common/otpsuccess.webp")}
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
                  backgroundColor: "#980775",
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

export default SuccessModal;