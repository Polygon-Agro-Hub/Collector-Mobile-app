import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import environment from "@/environment/environment";
import store from "@/services/reducxStore";
import { useDispatch } from "react-redux";
import { clearActiveAssignment } from "@/store/authSlice";

export function EndShiftHeaderRight({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#FF0000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialIcons name="logout" size={20} color="white" />
    </TouchableOpacity>
  );
}

interface EndShiftModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  positionText?: string;
  rowText?: string;
  customMessage?: string;
}

export function EndShiftModal({
  visible,
  onClose,
  navigation,
  positionText,
  rowText,
  customMessage,
}: EndShiftModalProps) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const activeAssignment = store.getState().auth.activeAssignment;
  const resolvedRow =
    rowText ||
    activeAssignment?.rowName ||
    (activeAssignment?.rowIndex ? `Row ${activeAssignment.rowIndex}` : "Row 1");
  const resolvedPos = positionText || activeAssignment?.positionName || "Packing Position 1";

  const message =
    customMessage ||
    `Are you sure you want to end the shift for ${resolvedPos} in ${resolvedRow}?`;

  const handleConfirmEndShift = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
      if (token) {
        await axios.post(
          `${environment.API_BASE_URL}api/packing/positions/release`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error("Error releasing position on end shift:", err);
    } finally {
      store.dispatch(clearActiveAssignment());
      dispatch(clearActiveAssignment());
      setLoading(false);
      onClose();
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "88%", maxWidth: 360, alignItems: "center" }}>
          {/* Warning Icon */}
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="warning-outline" size={24} color="#475467" />
          </View>

          {/* Confirmation Message */}
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#030E25", textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
            {message}
          </Text>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", width: "100%", gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "#D0D5DD",
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#344054", fontSize: 14, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmEndShift}
              disabled={loading}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#FF0000",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                  End
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
