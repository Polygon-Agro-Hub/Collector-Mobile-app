import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { StackNavigationProp } from "@react-navigation/stack";

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  navigation?: StackNavigationProp<any>;
  onBackPress?: () => void;
  textColor?: string;
  bgColor?: string;
  iconBgColor?: string;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = true,
  navigation,
  onBackPress,
  textColor = "black",
  bgColor = "white",
  iconBgColor = "#F6F6F680",
}) => {
  return (
    <View
      className="flex-row items-center justify-between px-4 py-3 relative"
      style={{ backgroundColor: bgColor }}
    >
      {/* LEFT - BACK BUTTON */}
      <View style={{ width: wp(15) }}>
        {showBackButton && navigation && (
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            className="items-start"
          >
            <Entypo
              name="chevron-left"
              size={25}
              color={textColor}
              style={{
                backgroundColor: iconBgColor,
                borderRadius: 50,
                padding: wp(2.5),
              }}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* CENTER - TITLE */}
      <View className="flex-1 items-center">
        <Text
          style={{ color: textColor }}
          className="text-xl font-semibold text-center"
        >
          {title}
        </Text>
      </View>

      {/* RIGHT */}
      <View style={{ width: wp(15) }} className="items-end"></View>
    </View>
  );
};

export default CustomHeader;
