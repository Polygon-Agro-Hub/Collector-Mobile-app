import React from "react";
import { TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const scale = (size: number) => (width / 375) * size;

interface AddButtonProps {
  onPress: () => void;
}

const AddButton: React.FC<AddButtonProps> = ({ onPress }) => {

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="absolute right-6 bottom-5 bg-black w-[70px] h-[70px] rounded-full justify-center items-center shadow-lg"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={scale(32)} color="#fff" />
    </TouchableOpacity>
  );
};

export default AddButton;
