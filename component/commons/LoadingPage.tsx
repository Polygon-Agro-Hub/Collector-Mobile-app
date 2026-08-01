import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

interface LoadingPageProps {
  message?: string;
  containerStyle?: StyleProp<ViewStyle>;
  messageStyle?: StyleProp<TextStyle>;
  fullScreen?: boolean;
}

const LoadingPage: React.FC<LoadingPageProps> = ({
  message,
  containerStyle,
  messageStyle,
  fullScreen = false,
}) => {
  return (
    <View
      className={`${fullScreen ? "flex-1" : ""} justify-center items-center bg-white`}
      style={[
        fullScreen ? { minHeight: 300 } : { paddingVertical: 40 },
        containerStyle,
      ]}
    >
      <View className="justify-center items-center gap-3">
        <ActivityIndicator size="large" color="#030E25" />
        <Text
          className="text-sm font-bold text-[#030E25] text-center"
          style={messageStyle}
        >
          {message || "Loading assign products..."}
        </Text>
      </View>
    </View>
  );
};

export default LoadingPage;
