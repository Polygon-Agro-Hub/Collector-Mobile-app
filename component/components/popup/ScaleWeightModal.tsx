import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  wifiScaleService,
  ScaleStatus,
} from "@/services/scale/wifiScaleService";

export interface ScaleWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (weight: number, grossWeight?: number, tareWeight?: number) => void;
  scaleName?: string;
  initialWeight?: number;
  tareWeight?: number;
}

export const ScaleWeightModal: React.FC<ScaleWeightModalProps> = ({
  visible,
  onClose,
  onContinue,
  scaleName = "Budry MFD - 300",
  initialWeight = 0,
  tareWeight = 0,
}) => {
  const { t } = useTranslation();
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>(
    wifiScaleService.getStatus(),
  );
  const [displayWeight, setDisplayWeight] = useState<number>(initialWeight);

  const tare = Math.max(0, tareWeight || 0);
  const grossWeight = displayWeight;
  const netWeight = Math.max(0, grossWeight - tare);

  useEffect(() => {
    if (!visible) return;

    const current = wifiScaleService.getStatus();
    setScaleStatus(current);

    // If initialWeight is provided (> 0) and scale is disconnected or reading 0,
    // display the previously recorded initialWeight (+ tare if tare was applied)
    if (initialWeight > 0 && (!current.connected || current.currentWeight <= 0)) {
      setDisplayWeight(initialWeight + tare);
    } else if (current.connected && current.currentWeight > 0) {
      setDisplayWeight(current.currentWeight);
    } else if (initialWeight > 0) {
      setDisplayWeight(initialWeight + tare);
    } else {
      setDisplayWeight(0);
    }

    const unsubscribe = wifiScaleService.subscribe((status) => {
      setScaleStatus(status);
      if (status.connected && status.currentWeight !== undefined && status.currentWeight > 0) {
        setDisplayWeight(status.currentWeight);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [visible, initialWeight, tare]);

  const handleContinue = () => {
    // Save only Net Total to the set / database
    onContinue(netWeight, grossWeight, tare);
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
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: "#000000",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="gauge" size={20} color="#FFFFFF" />
                  </View>
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

              {/* Edge-to-edge full width divider line */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E2E8F0",
                  marginHorizontal: -20,
                  marginBottom: 16,
                }}
              />

              {/* Top Live Scale Reading Dark Navy Card */}
              <View
                style={{
                  backgroundColor: "#0F172A",
                  borderRadius: 24,
                  paddingVertical: 22,
                  paddingHorizontal: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Header with yellow indicator dot */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    alignSelf: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#EAB308",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
                    {t("ScaleWeightModal.LiveScaleReading", "Live Scale Reading")}
                  </Text>
                </View>

                {/* Weight read out: White value + Yellow kg */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 48,
                      fontWeight: "900",
                      color: "#FFFFFF",
                      letterSpacing: -0.5,
                    }}
                  >
                    {grossWeight.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 34,
                      fontWeight: "900",
                      color: "#FACC15",
                      marginLeft: 8,
                    }}
                  >
                    {t("Common.kg", "kg")}
                  </Text>
                </View>

                {/* Gross weight on platform subtitle */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#94A3B8",
                  }}
                >
                  {t("ScaleWeightModal.GrossWeightOnPlatform", "Gross weight on platform")}
                </Text>
              </View>

              {/* Weight Breakdown Section Card */}
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#475569",
                    marginBottom: 14,
                  }}
                >
                  {t("ScaleWeightModal.WeightBreakdown", "Weight Breakdown")}
                </Text>

                {/* 3 Columns: Gross | − Tare | Net Total */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "stretch",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  {/* Gross Card */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      paddingVertical: 14,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: 8,
                      }}
                    >
                      {t("ScaleWeightModal.Gross", "Gross")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#0F172A",
                        marginBottom: 8,
                      }}
                    >
                      {grossWeight.toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: "#64748B",
                      }}
                    >
                      {t("Common.kg", "kg")}
                    </Text>
                  </View>

                  {/* Tare Card */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      paddingVertical: 14,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#F43F5E",
                        marginBottom: 8,
                      }}
                    >
                      {t("ScaleWeightModal.MinusTare", "− Tare")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#F43F5E",
                        marginBottom: 8,
                      }}
                    >
                      {tare.toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: "#FDA4AF",
                      }}
                    >
                      {t("Common.kg", "kg")}
                    </Text>
                  </View>

                  {/* Net Total Card */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#FEFCE8",
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: "#FDE047",
                      paddingVertical: 14,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#EAB308",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#0F172A",
                        marginBottom: 8,
                        textAlign: "center",
                        alignSelf: "stretch",
                      }}
                    >
                      {t("ScaleWeightModal.NetTotal", "Net Total")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#0F172A",
                        marginBottom: 8,
                      }}
                    >
                      {netWeight.toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#0F172A",
                      }}
                    >
                      {t("Common.kg", "kg")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Continue button */}
              <TouchableOpacity
                disabled={netWeight <= 0}
                activeOpacity={0.85}
                onPress={handleContinue}
                style={{
                  width: "100%",
                  backgroundColor: netWeight > 0 ? "#000000" : "#ACB5BE",
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#FFFFFF",
                  }}
                >
                  {t("ScaleWeightModal.Continue", t("Common.Continue", "Continue"))}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
