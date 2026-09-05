import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";

interface ScaleSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScaleSelectModal: React.FC<ScaleSelectModalProps> = ({
  visible,
  onClose,
}) => {
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [ipAddress, setIpAddress] = useState<string>("192.168.1.100");
  const [port, setPort] = useState<string>("8080");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribeScale = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
      if (status.scale?.ip) {
        setIpAddress(status.scale.ip);
      }
      if (status.scale?.port) {
        setPort(status.scale.port.toString());
      }
    });
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      setIsWifiEnabled(state.isWifiEnabled ?? state.type === "wifi");
    });
    return () => {
      unsubscribeScale();
      unsubscribeNet();
    };
  }, []);

  const handleConnect = async () => {
    if (!ipAddress.trim()) {
      Alert.alert("Input Required", "Please enter the scale IP address.");
      return;
    }

    setIsConnecting(true);
    try {
      const parsedPort = parseInt(port.trim() || "8080", 10);
      await wifiScaleService.connectWifiScale(ipAddress.trim(), parsedPort);
      Alert.alert("Connected", "Successfully connected to BUDRY MFD-300 Wi-Fi Scale.");
      onClose();
    } catch (err: any) {
      Alert.alert("Connection Failed", err.message || "Could not connect to BUDRY MFD-300 Wi-Fi Scale.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wifiScaleService.disconnectScale();
      Alert.alert("Disconnected", "Disconnected from BUDRY MFD-300 Wi-Fi Scale.");
    } catch (err: any) {
      Alert.alert("Error", "Failed to disconnect scale.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 440, maxHeight: "85%" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialCommunityIcons name="scale-balance" size={26} color="#030E25" />
              <View>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#020617" }}>
                  Select Wi-Fi Scale
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  BUDRY MFD-300 Scale Setup
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Wi-Fi Off Warning Banner */}
          {!isWifiEnabled && (
            <View style={{ marginTop: 16, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffe4e6", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="wifi-off" size={20} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: "#9f1239" }}>
                  Wi-Fi is Off
                </Text>
                <Text style={{ fontSize: 11, color: "#be123c", marginTop: 2 }}>
                  Please turn on Wi-Fi on your phone to connect to the scale.
                </Text>
              </View>
            </View>
          )}

          {/* Currently Connected Scale Banner */}
          {scaleStatus.connected && scaleStatus.scale && (
            <View style={{ marginTop: 16, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="wifi-check" size={22} color="#16a34a" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#14532d" }}>
                    {scaleStatus.scale.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#166534" }}>
                    Connected & Ready ({scaleStatus.scale.ip}:{scaleStatus.scale.port || 8080})
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleDisconnect}
                style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fee2e2", borderRadius: 20, borderWidth: 1, borderColor: "#fca5a5" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#dc2626" }}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Configuration & Preset Section */}
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Scale Device Configuration
            </Text>

            {/* Default Device Selection Card */}
            <TouchableOpacity
              onPress={() => {
                setIpAddress("192.168.1.100");
                setPort("8080");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f8fafc",
                padding: 14,
                borderRadius: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="scale" size={20} color="#334155" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a" }}>
                    BUDRY MFD-300 (Default)
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    IP: 192.168.1.100 | Port: 8080
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
            </TouchableOpacity>

            {/* Manual IP / Port Input */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>
                  Scale IP Address
                </Text>
                <TextInput
                  value={ipAddress}
                  onChangeText={setIpAddress}
                  placeholder="e.g. 192.168.1.100"
                  keyboardType="numeric"
                  style={{ backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0f172a" }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>
                  Port Number
                </Text>
                <TextInput
                  value={port}
                  onChangeText={setPort}
                  placeholder="8080"
                  keyboardType="number-pad"
                  style={{ backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0f172a" }}
                />
              </View>
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              onPress={handleConnect}
              disabled={isConnecting}
              style={{
                backgroundColor: "#059669",
                paddingVertical: 14,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="wifi" size={20} color="#ffffff" />
                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#ffffff" }}>
                    {scaleStatus.connected ? "Reconnect Scale" : "Connect Scale"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
