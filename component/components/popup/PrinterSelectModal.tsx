import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PrinterDevice } from "@/services/printer/BluetoothPrinterService";
import { useTranslation } from "react-i18next";
import environment from "@/environment/environment";

interface PrinterSelectModalProps {
  visible: boolean;
  onClose: () => void;
  devices: PrinterDevice[];
  isScanning: boolean;
  isConnecting: boolean;
  connectedDevice: PrinterDevice | null;
  onStartScan: () => void;
  onSelectDevice: (device: PrinterDevice) => void;
  onDisconnect: () => void;
}

export const PrinterSelectModal: React.FC<PrinterSelectModalProps> = ({
  visible,
  onClose,
  devices,
  isScanning,
  isConnecting,
  connectedDevice,
  onStartScan,
  onSelectDevice,
  onDisconnect,
}) => {
  const { t } = useTranslation();

  // Access Code security states for Dev Printer
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<PrinterDevice | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const accessInputRef = useRef<TextInput>(null);

  // Only show Dev Printer if isDeveloper is explicitly true in environment
  const visibleDevices = environment.isDeveloper
    ? devices
    : devices.filter((d) => d.id !== "DEV_PRINTER" && !d.name?.includes("Dev Printer"));

  const handleDeviceItemPress = (item: PrinterDevice) => {
    const isDev =
      item.id === "DEV_PRINTER" ||
      Boolean(item.name && item.name.toLowerCase().includes("dev printer")) ||
      Boolean(item.displayName && item.displayName.toLowerCase().includes("dev printer"));

    // ONLY Dev Printer requires an access code
    if (isDev) {
      setPendingDevice(item);
      setAccessCode("");
      setAccessError("");
      setAccessModalVisible(true);
    } else {
      // All other real printers connect normally without access code
      onSelectDevice(item);
    }
  };

  const handleVerifyAccessCode = () => {
    if (accessCode.trim() === "5578") {
      setAccessModalVisible(false);
      if (pendingDevice) {
        onSelectDevice(pendingDevice);
      }
    } else {
      setAccessError("Invalid Access Code. Please enter 5578.");
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
        <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 450, maxHeight: "85%" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="printer-search" size={24} color="#030E25" />
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#020617" }}>
                {t("QRHandling.Select Bluetooth Printer", "Select Bluetooth Printer")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Currently Connected Device */}
          {connectedDevice && (
            <View style={{ marginTop: 16, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="printer-check" size={22} color="#16a34a" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#14532d" }}>
                    {connectedDevice.displayName || connectedDevice.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#166534" }}>
                    {t("QRHandling.Connected & Ready", "Connected & Ready (50x30mm)")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onDisconnect}
                style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fee2e2", borderRadius: 20, borderWidth: 1, borderColor: "#fca5a5" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#dc2626" }}>{t("QRHandling.Disconnect", "Disconnect")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scan Action Bar */}
          <View style={{ marginTop: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("QRHandling.Available Printers", { count: visibleDevices.length, defaultValue: `Available Printers (${visibleDevices.length})` })}
            </Text>
            <TouchableOpacity
              onPress={onStartScan}
              disabled={isScanning}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#e0e7ff", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#4338ca" />
              ) : (
                <Ionicons name="refresh" size={16} color="#4338ca" />
              )}
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#4338ca" }}>
                {isScanning ? t("QRHandling.Scanning...", "Scanning...") : t("QRHandling.Scan Devices", "Scan Devices")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Device List */}
          {isConnecting ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#334155" }}>
                {t("QRHandling.Connecting to Printer...", "Connecting to Printer...")}
              </Text>
            </View>
          ) : visibleDevices.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <MaterialCommunityIcons name="bluetooth-off" size={48} color="#94a3b8" />
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#64748b" }}>
                {isScanning
                  ? t("QRHandling.Scanning for Bluetooth printers...", "Scanning for Bluetooth printers...")
                  : t("QRHandling.No Bluetooth printers found.", "No Bluetooth printers found.")}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                {t("QRHandling.Turn on printer prompt", 'Turn on your Bluetooth label printer & tap "Scan Devices"')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={visibleDevices}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isConnected = item.id === connectedDevice?.id;
                return (
                  <TouchableOpacity
                    onPress={() => handleDeviceItemPress(item)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: isConnected ? "#f0fdf4" : "#f8fafc",
                      padding: 16,
                      borderRadius: 16,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isConnected ? "#bbf7d0" : "#e2e8f0",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: isConnected ? "#dcfce7" : "#e2e8f0",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={isConnected ? "printer-check" : "printer"}
                          size={22}
                          color={isConnected ? "#16a34a" : "#334155"}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: "bold", color: "#0f172a" }}>
                          {item.displayName || item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>
                          {item.address}
                        </Text>
                      </View>
                    </View>
                    {isConnected ? (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>

      {/* Access Code Modal ONLY for Dev Printer */}
      <Modal
        visible={accessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccessModalVisible(false)}
        onShow={() => {
          setTimeout(() => accessInputRef.current?.focus(), 150);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#ffffff", borderRadius: 24, padding: 24, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}>
            {/* Lock / Key Icon */}
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MaterialCommunityIcons name="shield-key" size={32} color="#980775" />
            </View>

            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#0f172a", textAlign: "center", marginBottom: 6 }}>
              Dev Printer Access Code
            </Text>
            <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 20 }}>
              Enter the authorized access code to connect to Dev Printer (Simulation mode / No physical sticker printed).
            </Text>

            {/* Access Code Input (Centered Box & Centered Caret) */}
            <View style={{ width: "100%", alignItems: "center", marginBottom: 16 }}>
              <TextInput
                ref={accessInputRef}
                value={accessCode}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
                  setAccessCode(cleaned);
                  if (accessError) setAccessError("");
                  if (cleaned === "5578") {
                    setTimeout(() => {
                      setAccessModalVisible(false);
                      if (pendingDevice) {
                        onSelectDevice(pendingDevice);
                      }
                    }, 250);
                  }
                }}
                placeholder="Code"
                placeholderTextColor="#cbd5e1"
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                textAlign="center"
                onSubmitEditing={handleVerifyAccessCode}
                returnKeyType="done"
                style={{
                  width: 180,
                  height: 56,
                  borderWidth: 2,
                  borderColor: accessError ? "#ef4444" : "#980775",
                  borderRadius: 16,
                  fontSize: 22,
                  fontWeight: "bold",
                  textAlign: "center",
                  textAlignVertical: "center",
                  color: "#0f172a",
                  backgroundColor: "#f8fafc",
                }}
              />
              {accessError ? (
                <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "600", marginTop: 8, textAlign: "center" }}>
                  {accessError}
                </Text>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", width: "100%", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setAccessModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#64748b" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleVerifyAccessCode}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "#980775",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#ffffff" }}>
                  Authorize
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
