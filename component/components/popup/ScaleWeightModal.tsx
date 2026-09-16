import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import {
  wifiScaleService,
  ScaleStatus,
} from "@/services/scale/wifiScaleService";

interface ScaleWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (weight: number) => void;
  scaleName?: string;
  initialWeight?: number;
}

export const ScaleWeightModal: React.FC<ScaleWeightModalProps> = ({
  visible,
  onClose,
  onContinue,
  scaleName = "Budry MFD - 300",
  initialWeight = 0,
}) => {
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(
    wifiScaleService.getStatus(),
  );
  const [displayWeight, setDisplayWeight] = useState<number>(initialWeight);

  useEffect(() => {
    if (!visible) return;

    const current = wifiScaleService.getStatus();
    setScaleStatus(current);
    if (current.currentWeight > 0) {
      setDisplayWeight(current.currentWeight);
    }

    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
      if (status.currentWeight !== undefined) {
        setDisplayWeight(status.currentWeight);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [visible]);

  const handleContinue = () => {
    onContinue(displayWeight);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                width: "100%",
                maxWidth: 380,
                backgroundColor: "#FFFFFF",
                borderRadius: 28,
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 22,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Header: Icon + Name + Close X */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E2E8F0",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <FontAwesome6 name="weight-scale" size={22} color="#000000" />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: "#0F172A",
                    }}
                  >
                    {scaleName}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "#64748B",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Inner Scale Display Card */}
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  paddingHorizontal: 18,
                  paddingTop: 14,
                  paddingBottom: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 13,
                    color: "#64748B",
                    fontWeight: "500",
                    marginBottom: 16,
                  }}
                >
                  Real - Time Scale Weight
                </Text>

                {/* Live weight read out */}
                <Text
                  style={{
                    fontSize: 44,
                    fontWeight: "900",
                    color: "#0F172A",
                    letterSpacing: -0.5,
                    marginBottom: 20,
                  }}
                >
                  {displayWeight.toFixed(2)} kg
                </Text>

                {/* Continue button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleContinue}
                  style={{
                    width: "100%",
                    backgroundColor: "#000000",
                    paddingVertical: 14,
                    borderRadius: 30,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: "#FFFFFF",
                    }}
                  >
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
