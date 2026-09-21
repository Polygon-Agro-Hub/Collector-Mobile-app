import React from "react";
import { TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AddButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  bottomOffset?: number;
}

const AddButton: React.FC<AddButtonProps> = ({ onPress, style, bottomOffset }) => {
  const insets = useSafeAreaInsets();
  const bottom = bottomOffset !== undefined ? bottomOffset : Math.max(insets.bottom + 16, 24);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="absolute right-6 bg-[#000000] w-[60px] h-[60px] rounded-full justify-center items-center"
      style={[
        {
          bottom,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 999,
        },
        style,
      ]}
    >
      <Ionicons name="add" size={32} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

export default AddButton;
