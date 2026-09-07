import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";

export const ScaleWeightScreen: React.FC = () => {
  const navigation = useNavigation();
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [ipAddress, setIpAddress] = useState<string>("192.168.1.23");
  const [port, setPort] = useState<string>("33581");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);

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
    } catch (err: any) {
      Alert.alert("Connection Failed", err.message || "Could not connect to Wi-Fi scale.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wifiScaleService.disconnectScale();
      setCapturedWeight(null);
      Alert.alert("Disconnected", "Scale disconnected.");
    } catch (err: any) {
      Alert.alert("Error", "Failed to disconnect scale.");
    }
  };

  const handleCaptureWeight = () => {
    if (!scaleStatus.connected) {
      Alert.alert("Scale Offline", "Please connect to the scale before capturing weight.");
      return;
    }
    setCapturedWeight(scaleStatus.currentWeight);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E2E8F0",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#0F172A" }}>
            Digital Scale
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>
            BUDRY MFD-300
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 14,
            backgroundColor: scaleStatus.connected ? "#DCFCE7" : "#FEE2E2",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: scaleStatus.connected ? "#16A34A" : "#DC2626",
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: scaleStatus.connected ? "#15803D" : "#B91C1C",
            }}
          >
            {scaleStatus.connected ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Wi-Fi Alert */}
        {!isWifiEnabled && (
          <View
            style={{
              backgroundColor: "#FFF1F2",
              borderWidth: 1,
              borderColor: "#FECDD3",
              borderRadius: 16,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#FFE4E6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="wifi-off" size={20} color="#E11D48" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#9F1239" }}>
                Wi-Fi is Turned Off
              </Text>
              <Text style={{ fontSize: 11, color: "#BE123C", marginTop: 2 }}>
                Please turn on Wi-Fi on your device to communicate with the scale.
              </Text>
            </View>
          </View>
        )}

        {/* PRIMARY SCALE READOUT CARD */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 24,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Real-Time Scale Weight
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: scaleStatus.connected ? "#ECFDF5" : "#F1F5F9",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: scaleStatus.connected ? "#059669" : "#94A3B8",
                }}
              >
                {scaleStatus.connected ? "LIVE POLLING" : "IDLE"}
              </Text>
            </View>
          </View>

          {/* Weight Digit Display */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "center",
              marginVertical: 18,
            }}
          >
            <Text
              style={{
                fontSize: 64,
                fontWeight: "900",
                color: scaleStatus.connected ? "#0F172A" : "#94A3B8",
                letterSpacing: -1,
              }}
            >
              {scaleStatus.connected
                ? scaleStatus.currentWeight.toFixed(2)
                : "0.00"}
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: scaleStatus.connected ? "#059669" : "#94A3B8",
                marginLeft: 10,
              }}
            >
              kg
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 12, width: "100%", marginTop: 10 }}>
            <TouchableOpacity
              onPress={handleCaptureWeight}
              disabled={!scaleStatus.connected}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: scaleStatus.connected ? "#059669" : "#E2E8F0",
                paddingVertical: 14,
                borderRadius: 16,
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="content-save-outline"
                size={20}
                color={scaleStatus.connected ? "#FFFFFF" : "#94A3B8"}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: scaleStatus.connected ? "#FFFFFF" : "#94A3B8",
                }}
              >
                Capture Weight
              </Text>
            </TouchableOpacity>

            {capturedWeight !== null && (
              <TouchableOpacity
                onPress={() => setCapturedWeight(null)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: "#F1F5F9",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="refresh-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Captured Weight Banner */}
          {capturedWeight !== null && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#F0FDF4",
                borderWidth: 1,
                borderColor: "#BBF7D0",
                borderRadius: 14,
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <Text style={{ fontSize: 13, color: "#166534", fontWeight: "600" }}>
                  Captured:
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#14532D" }}>
                {capturedWeight.toFixed(2)} kg
              </Text>
            </View>
          )}
        </View>

        {/* CONNECTION & SETUP CARD */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="cog-outline" size={22} color="#0F172A" />
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0F172A" }}>
                Scale Connection
              </Text>
            </View>

            {scaleStatus.connected && (
              <TouchableOpacity
                onPress={handleDisconnect}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: "#FEE2E2",
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#DC2626" }}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 12, marginBottom: 18 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
                Scale IP Address
              </Text>
              <TextInput
                value={ipAddress}
                onChangeText={setIpAddress}
                placeholder="192.168.1.23"
                keyboardType="numeric"
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: "#0F172A",
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 6 }}>
                Port
              </Text>
              <TextInput
                value={port}
                onChangeText={setPort}
                placeholder="33581"
                keyboardType="number-pad"
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#CBD5E1",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: "#0F172A",
                }}
              />
            </View>
          </View>

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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="wifi" size={20} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>
                  {scaleStatus.connected ? "Reconnect Scale" : "Connect to Scale"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScaleWeightScreen;
