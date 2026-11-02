import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScaleConnectionGuideCard } from "@/component/components/scale/ScaleConnectionGuideCard";

interface ScaleConnectionGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onConnectScale?: () => void;
}

export const ScaleConnectionGuideModal: React.FC<ScaleConnectionGuideModalProps> = ({
  visible,
  onClose,
  onConnectScale,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleConnect = () => {
    onClose();
    if (onConnectScale) {
      onConnectScale();
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
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </TouchableWithoutFeedback>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingHorizontal: 20,
            maxHeight: "90%",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <FontAwesome6 name="weight-scale" size={20} color="black" />
              <Text style={{ fontSize: 17, fontWeight: "bold", color: "#0F172A" }}>
                {t("ScaleConnectionGuide.ModalTitle", "Scale Setup Guide")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Guide Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
            }}
          >
            <ScaleConnectionGuideCard onConnectScale={handleConnect} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
