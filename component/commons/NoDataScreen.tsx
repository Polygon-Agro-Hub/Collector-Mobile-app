import { View, Text } from "react-native";
import LottieView from "lottie-react-native";

interface NoDataScreenProps {
  message?: string;
  subtitle?: string;
}

export default function NoDataScreen({
  message = "- No Data Found -",
  subtitle,
}: NoDataScreenProps) {
  return (
    <View className="flex-1 px-6 justify-center items-center bg-white">
      {/* Icon with reduced spacing to text */}
      <View className="w-52 h-52 justify-center items-center">
        <LottieView
          source={require("../../assets/lottie/no-data.json")}
          autoPlay
          loop
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <Text className="text-xs font-semibold text-[#676771] text-center italic px-6 leading-5">
        {message}
      </Text>
    </View>
  );
}
