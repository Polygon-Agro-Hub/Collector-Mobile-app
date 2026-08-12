import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WarningConfirmationProps {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonBgClass?: string;
}

const WarningConfirmation: React.FC<WarningConfirmationProps> = ({
  visible,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonBgClass = "bg-red-600 active:bg-red-700",
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000040",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View className="bg-white items-center rounded-2xl w-80 p-6 shadow-2xl">
          <View className="flex items-center justify-center mb-4 rounded-xl bg-[#F6F7F9] p-3 w-14 h-14">
            <Ionicons name="warning" size={32} color="#6c7e8c" />
          </View>
          <Text className="text-center text-sm font-semibold mb-6 text-gray-800 leading-5">
            {message}
          </Text>

          <View className="flex-row items-center justify-center gap-4 w-full">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-3 bg-[#F6F7F9] border border-[#D1D5DB] rounded-full items-center justify-center active:bg-gray-100"
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-sm font-bold text-gray-700">
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 py-3 rounded-full items-center justify-center ${confirmButtonBgClass}`}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-sm font-bold text-white">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default WarningConfirmation;
