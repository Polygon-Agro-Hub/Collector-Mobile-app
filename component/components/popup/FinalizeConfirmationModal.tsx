import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { useTranslation } from "react-i18next";

export interface FinalizeConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FinalizeConfirmationModal: React.FC<FinalizeConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  const displayTitle = title ?? t("Common.ReadyToFinalize", "Ready to Finalize?");
  const displayMessage =
    message ??
    t(
      "Common.ReviewDetailsBeforeFinalize",
      "Please review your details again before finalize."
    );
  const displayConfirmText =
    confirmText ?? t("Common.Confirm", "Confirm");
  const displayCancelText =
    cancelText ?? t("Common.NoGoBack", "No, Go back");

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
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
                maxWidth: 340,
                backgroundColor: "#FFFFFF",
                borderRadius: 28,
                paddingHorizontal: 22,
                paddingTop: 26,
                paddingBottom: 22,
                alignItems: "center",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Title */}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#000000",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {displayTitle}
              </Text>

              {/* Message */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#5E7182",
                  textAlign: "center",
                  lineHeight: 20,
                  marginBottom: 24,
                  paddingHorizontal: 6,
                }}
              >
                {displayMessage}
              </Text>

              {/* Primary Confirm Button (Magenta #980775) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onConfirm}
                style={{
                  width: "100%",
                  height: 50,
                  backgroundColor: "#980775",
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {displayConfirmText}
                </Text>
              </TouchableOpacity>

              {/* Secondary Cancel Button (Slate Grey #708596) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onCancel}
                style={{
                  width: "100%",
                  height: 50,
                  backgroundColor: "#708596",
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {displayCancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default FinalizeConfirmationModal;
