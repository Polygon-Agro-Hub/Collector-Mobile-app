import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface DownloadShareButtonsProps {
  onDownload: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  downloadLabel?: string;
  shareLabel?: string;
  disabled?: boolean;
}

const DownloadShareButtons: React.FC<DownloadShareButtonsProps> = ({
  onDownload,
  onShare,
  downloadLabel,
  shareLabel,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row w-full px-8 pb-8 gap-4 max-w-[500px] mx-auto">
      <TouchableOpacity
        className="bg-black rounded-lg items-center justify-center flex-1 py-3 h-[70px]"
        onPress={onDownload}
        disabled={disabled}
        activeOpacity={0.8}
        style={{
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <View className="flex-col items-center justify-center gap-2">
          <MaterialIcons name="download" size={24} color="white" />
          <Text className="text-white text-base">
            {downloadLabel || t("OfficerQr.Download")}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-black rounded-lg items-center justify-center flex-1 py-4 h-[70px]"
        onPress={onShare}
        disabled={disabled}
        activeOpacity={0.8}
        style={{
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <View className="flex-col items-center justify-center gap-2">
          <MaterialIcons name="share" size={24} color="white" />
          <Text className="text-white text-base">
            {shareLabel || t("OfficerQr.Share")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default DownloadShareButtons;
