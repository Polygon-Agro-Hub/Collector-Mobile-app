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
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";
import { isQuickAccessScaleEnabled, subscribeQuickAccessScale } from "@/utils/scale/scale-storage";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";
import store from "@/services/reducxStore";

const STORAGE_KEY_X = "@scale_button_pos_x";
const STORAGE_KEY_Y = "@scale_button_pos_y";
const BUTTON_HEIGHT = 46;
const BUTTON_WIDTH = 96;
const MIN_X = 6;

interface FloatingScaleButtonProps {
  currentRoute?: string;
}

// Screens where the floating button shouldn't clutter the UI
const HIDDEN_ROUTES = ["Splash", "Login", "Lanuage", "BannedScreen", "Logout"];

export const FloatingScaleButton: React.FC<FloatingScaleButtonProps> = ({ currentRoute }) => {
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!store.getState().auth.token);
  const [isQuickAccessEnabled, setIsQuickAccessEnabled] = useState<boolean>(true);

  const insets = useSafeAreaInsets();
  const windowDimensions = Dimensions.get("window");
  const windowWidth = windowDimensions.width;
  const windowHeight = windowDimensions.height;

  const isTabScreen = [
    "CollectionDashboard",
    "DailyTargetList",
    "CollectionOfficersList",
    "SearchPriceScreen",
    "DistridutionaDashboard",
    "DistributionDashboard",
    "DistributionOfficersList",
    "ComplainHistory",
    "SideMenu",
    "OfficerQr",
    "ComplainPage",
  ].includes(currentRoute || "");

  const bottomInset = Math.max(insets.bottom, 12);
  const MIN_Y = Math.max(insets.top + 10, 48);
  const maxX = Math.max(MIN_X, Math.round(windowWidth * 0.5) - BUTTON_WIDTH);
  const maxY = isTabScreen
    ? windowHeight - BUTTON_HEIGHT - bottomInset - 72
    : windowHeight - BUTTON_HEIGHT - bottomInset - 16;

  // Initial position in upper-middle left area (padded from edge)
  const defaultX = 14;
  const defaultY = Math.round(windowHeight * 0.35);

  const panX = useRef(new Animated.Value(defaultX)).current;
  const panY = useRef(new Animated.Value(defaultY)).current;
  const currentXRef = useRef(defaultX);
  const currentYRef = useRef(defaultY);

  // Pulse glow animation
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  // Track dragging state to prevent opening modal on drag release
  const isDraggingRef = useRef(false);

  // Glow breathing animation loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  // Watch scale status changes
  useEffect(() => {
    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Watch NetInfo for Wi-Fi status
  useEffect(() => {
    const checkWifi = (state: any) => {
      // A Wi-Fi scale communicates over local Wi-Fi LAN.
      // Therefore, Wi-Fi is considered active ONLY if the active network interface is 'wifi',
      // or if state.isWifiEnabled is explicitly true.
      // If the user turns off Wi-Fi (e.g. falls back to cellular or has no connection),
      // isWifi is false -> triggers the red (#E91233) button state.
      const isWifi = state.type === "wifi" || (state.isWifiEnabled === true && state.isConnected === true);
      setIsWifiEnabled(!!isWifi);
    };

    NetInfo.fetch().then(checkWifi);
    const unsubscribeNet = NetInfo.addEventListener(checkWifi);

    // Also poll every 3 seconds so if OS-level toggle doesn't trigger an event immediately, it updates promptly
    const interval = setInterval(() => {
      NetInfo.fetch().then(checkWifi);
    }, 3000);

    return () => {
      unsubscribeNet();
      clearInterval(interval);
    };
  }, []);

  // Watch auth state from Redux store
  useEffect(() => {
    const updateAuth = () => {
      setIsLoggedIn(!!store.getState().auth.token);
    };
    const unsubscribe = store.subscribe(updateAuth);
    return () => unsubscribe();
  }, []);

  // Watch quick access scale preference (toggle from SideMenu)
  useEffect(() => {
    isQuickAccessScaleEnabled().then((enabled) => {
      setIsQuickAccessEnabled(enabled);
    });
    const unsubscribe = subscribeQuickAccessScale((enabled) => {
      setIsQuickAccessEnabled(enabled);
    });
    return () => unsubscribe();
  }, []);

  // Load saved X & Y position on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_X),
      AsyncStorage.getItem(STORAGE_KEY_Y),
    ])
      .then(([savedX, savedY]) => {
        if (savedX !== null) {
          const parsedX = parseFloat(savedX);
          if (!isNaN(parsedX) && parsedX >= MIN_X && parsedX <= maxX) {
            currentXRef.current = parsedX;
            panX.setValue(parsedX);
          }
        }
        if (savedY !== null) {
          const parsedY = parseFloat(savedY);
          if (!isNaN(parsedY) && parsedY >= MIN_Y && parsedY <= maxY) {
            currentYRef.current = parsedY;
            panY.setValue(parsedY);
          }
        }
      })
      .catch(() => {});
  }, [maxX, maxY, panX, panY]);

  // Keep position refs in sync with Animated.Values
  useEffect(() => {
    const listenerX = panX.addListener(({ value }) => {
      currentXRef.current = value;
    });
    const listenerY = panY.addListener(({ value }) => {
      currentYRef.current = value;
    });
    return () => {
      panX.removeListener(listenerX);
      panY.removeListener(listenerY);
    };
  }, [panX, panY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture drag if movement in any direction exceeds 4px
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        panX.setOffset(currentXRef.current);
        panY.setOffset(currentYRef.current);
        panX.setValue(0);
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Clamp smoothly to valid bounds so the finger can continue dragging without getting stuck
        const clampedTargetX = Math.max(MIN_X, Math.min(maxX, currentXRef.current + gestureState.dx));
        const clampedTargetY = Math.max(MIN_Y, Math.min(maxY, currentYRef.current + gestureState.dy));

        panX.setValue(clampedTargetX - currentXRef.current);
        panY.setValue(clampedTargetY - currentYRef.current);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalX = Math.max(MIN_X, Math.min(maxX, currentXRef.current + gestureState.dx));
        const finalY = Math.max(MIN_Y, Math.min(maxY, currentYRef.current + gestureState.dy));

        panX.flattenOffset();
        panY.flattenOffset();

        currentXRef.current = finalX;
        currentYRef.current = finalY;

        panX.setValue(finalX);
        panY.setValue(finalY);

        // Save position to AsyncStorage
        AsyncStorage.setItem(STORAGE_KEY_X, finalX.toString()).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEY_Y, finalY.toString()).catch(() => {});

        // Reset dragging flag after a short delay so onPress is ignored if dragged
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
      onPanResponderTerminate: (_, gestureState) => {
        const finalX = Math.max(MIN_X, Math.min(maxX, currentXRef.current + gestureState.dx));
        const finalY = Math.max(MIN_Y, Math.min(maxY, currentYRef.current + gestureState.dy));

        panX.flattenOffset();
        panY.flattenOffset();

        currentXRef.current = finalX;
        currentYRef.current = finalY;

        panX.setValue(finalX);
        panY.setValue(finalY);

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      },
    })
  ).current;

  // Hide on auth/splash screens, if not logged in, or if Quick Access toggle is disabled
  if (!isLoggedIn || !isQuickAccessEnabled || (currentRoute && HIDDEN_ROUTES.includes(currentRoute))) {
    return null;
  }

  const isConnected = !!scaleStatus?.connected;
  // If wifi is off -> red state
  const isWifiOff = !isWifiEnabled;

  // Determine state colors
  // 1. Connected -> #FAE432 (Yellow)
  // 2. Wi-Fi off -> #E91233 (Red)
  // 3. Not connected (Wi-Fi ON) -> #1266FD (Blue)
  let backgroundColor = "#1266FD";
  let glowColor = "#1266FD";
  let circleBgColor = "#FFFFFF";
  let wifiIconColor = "#1266FD";
  let rightIconColor = "#FFFFFF";
  let dividerColor = "rgba(255, 255, 255, 0.75)";

  if (isConnected) {
    backgroundColor = "#FAE432";
    glowColor = "#FAE432";
    circleBgColor = "#000000";
    wifiIconColor = "#FFFFFF";
    rightIconColor = "#000000";
    dividerColor = "#000000";
  } else if (isWifiOff) {
    backgroundColor = "#E91233";
    glowColor = "#E91233";
    circleBgColor = "#FFFFFF";
    wifiIconColor = "#E91233";
    rightIconColor = "#FFFFFF";
    dividerColor = "rgba(255, 255, 255, 0.85)";
  } else {
    // Not connected, Wi-Fi is ON
    backgroundColor = "#1266FD";
    glowColor = "#1266FD";
    circleBgColor = "#FFFFFF";
    wifiIconColor = "#1266FD";
    rightIconColor = "#FFFFFF";
    dividerColor = "rgba(255, 255, 255, 0.85)";
  }

  const handlePress = () => {
    if (isDraggingRef.current) return;

    if (isWifiOff) {
      // Trigger global AlertModal popup with error type
      Alert.alert(
        "Wi-Fi is not enabled!",
        "Please enable the Wi-Fi to connect with the Scale.",
        [{ text: "OK" }],
        { type: "error", autoClose: false, showOkButton: true } as any
      );
      return;
    }

    setIsModalVisible(true);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: panX }, { translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          style={styles.touchable}
        >
          {/* Glowing Aura Outer Effect */}
          <Animated.View
            style={[
              styles.glowAura,
              {
                backgroundColor: glowColor,
                opacity: glowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.35, 0.75],
                }),
                shadowColor: glowColor,
              },
            ]}
          />

          {/* Main Free-Floating Pill Capsule Button */}
          <View style={[styles.capsule, { backgroundColor }]}>
            {/* Left Section (50% width) with Wi-Fi Badge */}
            <View style={styles.leftSection}>
              <View style={[styles.wifiCircle, { backgroundColor: circleBgColor }]}>
                <MaterialCommunityIcons
                  name="wifi"
                  size={21}
                  color={wifiIconColor}
                />
              </View>
            </View>

            {/* Right Status Icon Section (50% width) */}
            <View style={styles.rightSection}>
              {isConnected ? (
                // Connected: Bold Checkmark
                <Feather
                  name="check"
                  size={24}
                  color={rightIconColor}
                  style={styles.iconStroke}
                />
              ) : isWifiOff ? (
                // Wi-Fi Off: Exclamation Warning in Circle (same size as Wi-Fi circle)
                <View style={styles.exclamationCircle}>
                  <Text style={styles.exclamationText}>!</Text>
                </View>
              ) : (
                // Disconnected: Arrow Right
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={26}
                  color={rightIconColor}
                />
              )}
            </View>

            {/* Vertical Divider Line (Exact 50% Center) */}
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          </View>
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
    zIndex: 99999,
    elevation: 25,
  },
  touchable: {
    padding: 6,
  },
  glowAura: {
    position: "absolute",
    left: 2,
    top: 2,
    width: BUTTON_WIDTH + 8,
    height: BUTTON_HEIGHT + 8,
    borderRadius: (BUTTON_HEIGHT + 8) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 16,
    ...Platform.select({
      android: {
        elevation: 14,
      },
    }),
  },
  capsule: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2, // Full pill shape (both sides rounded)
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },
  leftSection: {
    width: "50%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  wifiCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  divider: {
    position: "absolute",
    left: "50%",
    marginLeft: -1.1,
    top: (BUTTON_HEIGHT - 28) / 2,
    width: 2.2,
    height: 28,
    borderRadius: 1.1,
    zIndex: 10,
  },
  rightSection: {
    width: "50%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconStroke: {
    fontWeight: "bold",
  },
  exclamationCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  exclamationText: {
    color: "#E91233",
    fontSize: 22,
    fontWeight: "900",
    marginTop: -2,
    textAlign: "center",
  },
});
