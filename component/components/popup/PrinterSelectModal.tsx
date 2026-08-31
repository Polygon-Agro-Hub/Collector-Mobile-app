import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PrinterDevice } from "@/services/printer/BluetoothPrinterService";

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
                Select Bluetooth Printer
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
                    Connected & Ready (50x30mm)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onDisconnect}
                style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fee2e2", borderRadius: 20, borderWidth: 1, borderColor: "#fca5a5" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#dc2626" }}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scan Action Bar */}
          <View style={{ marginTop: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Available Printers ({devices.length})
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
                {isScanning ? "Scanning..." : "Scan Devices"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Device List */}
          {isConnecting ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#334155" }}>
                Connecting to Printer...
              </Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <MaterialCommunityIcons name="bluetooth-off" size={48} color="#94a3b8" />
              <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#64748b" }}>
                {isScanning ? "Scanning for Bluetooth printers..." : "No Bluetooth printers found."}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                Turn on your Bluetooth label printer & tap "Scan Devices"
              </Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelectDevice(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: item.id === connectedDevice?.id ? "#f0fdf4" : "#f8fafc",
                    padding: 16,
                    borderRadius: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: item.id === connectedDevice?.id ? "#bbf7d0" : "#e2e8f0",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="printer" size={22} color="#334155" />
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
                  {item.id === connectedDevice?.id ? (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
