import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import store from "@/services/reducxStore";

const STORAGE_KEY_Y = "@scale_button_pos_y";
const BUTTON_HEIGHT = 42;
const MIN_Y = 60;

interface FloatingScaleButtonProps {
  currentRoute?: string;
}

// Screens where the floating button shouldn't clutter the UI
const HIDDEN_ROUTES = ["Splash", "Login", "Lanuage", "BannedScreen", "Logout"];

export const FloatingScaleButton: React.FC<FloatingScaleButtonProps> = ({ currentRoute }) => {
  const { t } = useTranslation();
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!store.getState().auth.token);

  const windowHeight = Dimensions.get("window").height;
  const maxY = windowHeight - BUTTON_HEIGHT - 90;

  // Initial position in upper-middle of left side
  const defaultY = Math.round(windowHeight * 0.35);
  const panY = useRef(new Animated.Value(defaultY)).current;
  const currentYRef = useRef(defaultY);

  // Track dragging state to prevent opening modal on drag release
  const isDraggingRef = useRef(false);

  // Watch scale status changes
  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Watch auth state from Redux store
  useEffect(() => {
    const updateAuth = () => {
      setIsLoggedIn(!!store.getState().auth.token);
    };
    const unsubscribe = store.subscribe(updateAuth);
    return () => unsubscribe();
  }, []);

  // Load saved Y position on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_Y)
      .then((saved) => {
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= MIN_Y && parsed <= maxY) {
            currentYRef.current = parsed;
            panY.setValue(parsed);
          }
        }
      })
      .catch(() => {});
  }, [maxY, panY]);

  // Keep currentYRef in sync with Animated.Value
  useEffect(() => {
    const listenerId = panY.addListener(({ value }) => {
      currentYRef.current = value;
    });
    return () => panY.removeListener(listenerId);
  }, [panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture drag if vertical movement exceeds 6px
        return Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        panY.setOffset(currentYRef.current);
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const target = currentYRef.current + gestureState.dy;
        // Clamp bounds within screen height
        if (target >= MIN_Y && target <= maxY) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        const finalY = Math.max(MIN_Y, Math.min(maxY, currentYRef.current));
        currentYRef.current = finalY;
        panY.setValue(finalY);

        // Save position to AsyncStorage
        AsyncStorage.setItem(STORAGE_KEY_Y, finalY.toString()).catch(() => {});

        // Reset dragging flag after a short delay so onPress is ignored if dragged
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
    })
  ).current;

  // Hide on auth/splash screens or if not logged in
  if (!isLoggedIn || (currentRoute && HIDDEN_ROUTES.includes(currentRoute))) {
    return null;
  }

  const isConnected = !!scaleStatus?.connected;

  const handlePress = () => {
    if (isDraggingRef.current) return;
    setIsModalVisible(true);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          style={[
            styles.button,
            isConnected ? styles.connectedButton : styles.disconnectedButton,
          ]}
        >
          {/* Status Indicator Dot */}
          <View
            style={[
              styles.dot,
              isConnected ? styles.connectedDot : styles.disconnectedDot,
            ]}
          />

          {/* Scale/Wifi Icon */}
          <MaterialCommunityIcons
            name={isConnected ? "scale" : "wifi"}
            size={16}
            color="#FFFFFF"
            style={styles.icon}
          />

          {/* Button Text */}
          <Text style={styles.text} numberOfLines={1}>
            {isConnected
              ? t("ScaleSelectModal.ScaleConnected", "Scale Connected")
              : t("ScaleSelectModal.ConnectScale", "Connect Scale")}
          </Text>

          {/* Drag Handle indicator */}
          <MaterialCommunityIcons
            name="drag-vertical"
            size={14}
            color="rgba(255, 255, 255, 0.65)"
            style={styles.dragHandle}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Scale Selection Modal */}
      <ScaleSelectModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 9999,
    elevation: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    height: BUTTON_HEIGHT,
    paddingLeft: 8,
    paddingRight: 10,
    borderTopRightRadius: 21,
    borderBottomRightRadius: 21,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
  disconnectedButton: {
    backgroundColor: "#1266FD",
  },
  connectedButton: {
    backgroundColor: "#10B981", // Emerald green when connected
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  disconnectedDot: {
    backgroundColor: "#FACC15", // Warm yellow dot
  },
  connectedDot: {
    backgroundColor: "#FFFFFF",
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
    maxWidth: 110,
  },
  dragHandle: {
    marginLeft: 4,
  },
});
