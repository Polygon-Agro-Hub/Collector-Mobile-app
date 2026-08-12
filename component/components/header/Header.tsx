import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface HeaderProps<T> {
  title: string;
  activeTab: T;
  setActiveTab: (tab: T) => void;
  tab1Value: T;
  tab1Label: string;
  tab1Count: number;
  tab2Value: T;
  tab2Label: string;
  tab2Count: number;
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onClaimPress: () => void;
  claimLabel: string;
}

export function Header<T>({
  title,
  activeTab,
  setActiveTab,
  tab1Value,
  tab1Label,
  tab1Count,
  tab2Value,
  tab2Label,
  tab2Count,
  showMenu,
  setShowMenu,
  onClaimPress,
  claimLabel,
}: HeaderProps<T>) {
  return (
    <View className="w-full bg-white pt-4 pb-2 px-6 relative z-50">
      {/* Title & 3-dot Menu Row */}
      <View className="flex-row items-center justify-between h-12">
        {/* Left spacing to center title */}
        <View className="w-10" />

        {/* Centered Title */}
        <Text className="text-[#030E25] text-xl font-bold text-center flex-1">
          {title}
        </Text>

        {/* Right side component (3-dot menu) */}
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() => setShowMenu((prev) => !prev)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#030E25" />
        </TouchableOpacity>
      </View>

      {/* Menu dropdown */}
      {showMenu && (
        <View
          style={{
            position: "absolute",
            top: 56,
            right: 24,
            backgroundColor: "white",
            zIndex: 999,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#00000020",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "white",
              borderRadius: 8,
            }}
            onPress={() => {
              setShowMenu(false);
              onClaimPress();
            }}
          >
            <Text style={{ color: "#374151", fontWeight: "600", fontSize: 14 }}>
              {claimLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pill Tabs Selector */}
      <View className="flex-row gap-4 mt-2">
        {/* Tab 1 */}
        <TouchableOpacity
          onPress={() => setActiveTab(tab1Value)}
          className={`flex-1 h-[50px] rounded-full items-center justify-center ${
            activeTab === tab1Value ? "bg-[#030E25]" : "bg-[#E9ECF1]"
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`font-extrabold text-sm ${
              activeTab === tab1Value ? "text-white" : "text-[#54617D]"
            }`}
          >
            {tab1Label} ({String(tab1Count).padStart(2, "0")})
          </Text>
        </TouchableOpacity>

        {/* Tab 2 */}
        <TouchableOpacity
          onPress={() => setActiveTab(tab2Value)}
          className={`flex-1 h-[50px] rounded-full items-center justify-center ${
            activeTab === tab2Value ? "bg-[#030E25]" : "bg-[#E9ECF1]"
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`font-extrabold text-sm ${
              activeTab === tab2Value ? "text-white" : "text-[#54617D]"
            }`}
          >
            {tab2Label} ({String(tab2Count).padStart(2, "0")})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default Header;
