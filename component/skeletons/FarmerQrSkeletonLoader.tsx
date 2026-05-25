import React from "react";
import ContentLoader, { Rect } from "react-content-loader/native";
import { View } from "react-native";

const FarmerQrSkeletonLoader: React.FC = () => (
  <View className="flex-1 items-center justify-center bg-white w-full max-w-[500px] mx-auto">
    <ContentLoader
      speed={1}
      width={360}
      height={650}
      viewBox="0 0 360 650"
      backgroundColor="#f3f3f3"
      foregroundColor="#ecebeb"
    >
      {/* Farmer Name */}
      <Rect x="60" y="20" rx="8" ry="8" width="240" height="28" />
      <Rect x="110" y="60" rx="8" ry="8" width="140" height="20" />

      {/* QR Code */}
      <Rect x="40" y="100" rx="12" ry="12" width="280" height="280" />

      {/* Main Buttons (Collect & Pension) */}
      <Rect x="33.5" y="410" rx="25" ry="25" width="293" height="50" />
      <Rect x="33.5" y="475" rx="25" ry="25" width="293" height="50" />

      {/* Download and Share buttons */}
      <Rect x="40" y="550" rx="12" ry="12" width="130" height="70" />
      <Rect x="190" y="550" rx="12" ry="12" width="130" height="70" />
    </ContentLoader>
  </View>
);

export default FarmerQrSkeletonLoader;
