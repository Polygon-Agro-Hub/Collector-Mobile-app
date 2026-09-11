import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { wifiScaleService, ScaleStatus } from "@/services/scale/wifiScaleService";

interface ScaleSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

const isExpoGo = Constants.appOwnership === "expo";

// Device config is data, not translated text — keep the model name out of the
// translation files and only translate the descriptive suffix around it.
const DEFAULT_DEVICE = {
  name: "BUDRY MFD-300",
  ip: isExpoGo ? "192.168.1.13" : "192.168.1.23",
  port: isExpoGo ? "3001" : "33581",
};
const DEFAULT_IP = DEFAULT_DEVICE.ip;
const DEFAULT_PORT = DEFAULT_DEVICE.port;

export const ScaleSelectModal: React.FC<ScaleSelectModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(wifiScaleService.getStatus());
  const [ipAddress, setIpAddress] = useState<string>(DEFAULT_IP);
  const [port, setPort] = useState<string>(DEFAULT_PORT);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribeScale = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
      if (status.scale?.ip) {
        if (isExpoGo && status.scale.ip === "192.168.1.23") {
          setIpAddress("192.168.1.13");
          setPort("3001");
        } else {
          setIpAddress(status.scale.ip);
          if (status.scale?.port) {
            setPort(status.scale.port.toString());
          }
        }
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
      Alert.alert(
        t("ScaleSelectModal.InputRequiredTitle"),
        t("ScaleSelectModal.InputRequiredMessage"),
      );
      return;
    }

    setIsConnecting(true);
    try {
      const parsedPort = parseInt(port.trim() || "8080", 10);
      await wifiScaleService.connectWifiScale(ipAddress.trim(), parsedPort);
      Alert.alert(
        t("ScaleSelectModal.ConnectedTitle"),
        t("ScaleSelectModal.ConnectedMessage", { deviceName: DEFAULT_DEVICE.name }),
      );
      onClose();
    } catch (err: any) {
      Alert.alert(
        t("ScaleSelectModal.ConnectionFailedTitle"),
        err.message || t("ScaleSelectModal.ConnectionFailedMessage", { deviceName: DEFAULT_DEVICE.name }),
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wifiScaleService.disconnectScale();
      Alert.alert(
        t("ScaleSelectModal.DisconnectedTitle"),
        t("ScaleSelectModal.DisconnectedMessage", { deviceName: DEFAULT_DEVICE.name }),
      );
    } catch (err: any) {
      Alert.alert(t("ScaleSelectModal.ErrorTitle"), t("ScaleSelectModal.DisconnectFailedMessage"));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "flex-end" }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </TouchableWithoutFeedback>
        <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 440, maxHeight: "85%" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <FontAwesome6 name="weight-scale" size={24} color="black" />
              <View>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#020617" }}>
                  {t("ScaleSelectModal.SelectWifiScale")}
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
                  {t("ScaleSelectModal.WifiOffTitle")}
                </Text>
                <Text style={{ fontSize: 11, color: "#be123c", marginTop: 2 }}>
                  {t("ScaleSelectModal.WifiOffMessage")}
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
                    {t("ScaleSelectModal.ConnectedReady")} ({scaleStatus.scale.ip}:{scaleStatus.scale.port || 8080})
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleDisconnect}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fee2e2", borderRadius: 20, borderWidth: 1, borderColor: "#fca5a5" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#dc2626" }}>
                  {t("ScaleSelectModal.Disconnect")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Configuration & Preset Section */}
          <ScrollView
            style={{ marginTop: 20 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {/* Default Device Selection Card */}
            <TouchableOpacity
              onPress={() => {
                setIpAddress(DEFAULT_IP);
                setPort(DEFAULT_PORT);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#9D9D9D",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }}>
                  <FontAwesome6 name="weight-scale" size={20} color="black" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a" }}>
                    {DEFAULT_DEVICE.name}
                    {isExpoGo ? ` (${t("ScaleSelectModal.PcBridgeSuffix")})` : ""}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {t("ScaleSelectModal.IpLabel")}: {DEFAULT_DEVICE.ip} | {t("ScaleSelectModal.PortLabel")}: {DEFAULT_DEVICE.port}
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
            </TouchableOpacity>

            {/* Manual IP / Port Input */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>
                  {t("ScaleSelectModal.ScaleIpAddress")}
                </Text>
                <TextInput
                  value={ipAddress}
                  onChangeText={setIpAddress}
                  placeholder={t("ScaleSelectModal.IpPlaceholder")}
                  keyboardType="numeric"
                  style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#9D9D9D", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0f172a" }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>
                  {t("ScaleSelectModal.PortNumber")}
                </Text>
                <TextInput
                  value={port}
                  onChangeText={(text) => setPort(text.replace(/[^0-9]/g, "").slice(0, 5))}
                  placeholder="8080"
                  keyboardType="number-pad"
                  maxLength={5}
                  style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#9D9D9D", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#0f172a" }}
                />
              </View>
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              onPress={handleConnect}
              disabled={isConnecting}
              activeOpacity={0.85}
              style={{
                backgroundColor: "#FAE432",
                paddingVertical: 14,
                borderRadius: 32,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <MaterialIcons name="wifi" size={20} color="#000000" />
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#000000" }}>
                    {scaleStatus.connected
                      ? t("ScaleSelectModal.ReconnectScale")
                      : t("ScaleSelectModal.ConnectScale")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};