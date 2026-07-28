import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";

interface CustomHeaderProps {
  title: string;
  titleStyle?: object;
  showBackButton?: boolean;
  showLanguageSelector?: boolean;
  showLogoutButton?: boolean;
  navigation?: StackNavigationProp<any>;
  onBackPress?: () => void;
  onLanguageChange?: (language: string) => void;
  onLogoutPress?: () => void;
  dark?: boolean;

  // Legacy/Extra properties for other screens
  subtitle?: string | React.ReactNode;
  transparent?: boolean;
  linearGradient?: boolean;
  textColor?: string;
  bgColor?: string;
  iconBgColor?: string;
  rightComponent?: React.ReactNode;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  titleStyle,
  showBackButton = true,
  showLanguageSelector = false,
  showLogoutButton = false,
  navigation,
  onBackPress,
  onLanguageChange,
  onLogoutPress,
  dark = false,

  // Legacy properties
  subtitle,
  transparent = false,
  linearGradient = false,
  textColor,
  bgColor,
  iconBgColor,
  rightComponent,
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  const languages = [
    { code: "EN", name: "English" },
    { code: "SI", name: "සිංහල" },
    { code: "TA", name: "தமிழ்" },
  ];

  const getLanguageButtonText = (langCode: string): string => {
    switch (langCode) {
      case "EN":
        return "En";
      case "SI":
        return "සිං";
      case "TA":
        return "தமி";
      default:
        return "En";
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setDropdownVisible(false);
    onLanguageChange?.(languageCode);
  };

  const handleLogoutPress = () => {
    if (onLogoutPress) {
      onLogoutPress();
    }
  };

  const HeaderContent = () => (
    <View
      className={`flex-row items-center justify-between px-4 py-3 relative ${
        transparent ? "bg-transparent" : dark ? "bg-black" : "bg-white"
      }`}
      style={bgColor && !transparent ? { backgroundColor: bgColor } : undefined}
    >
      <View style={{ minWidth: 50, zIndex: 20 }}>
        {showBackButton && navigation && (
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            className="items-start"
          >
            <Entypo
              name="chevron-left"
              size={30}
              color={textColor ? textColor : dark ? "white" : "black"}
              style={{
                backgroundColor: iconBgColor ? iconBgColor : dark ? "#1F1F1F" : "#F7FAFF",
                borderRadius: 50,
                padding: 8,
              }}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Absolutely Centered Title Container */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        }}
        pointerEvents="none"
      >
        <View className="px-24 w-full items-center">
          {title ? (
            <Text
              className={`text-xl font-semibold text-center ${
                textColor ? "" : dark ? "text-white" : "text-black"
              }`}
              style={[titleStyle, textColor ? { color: textColor } : undefined]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {title}
            </Text>
          ) : null}
          {subtitle && (
            typeof subtitle === "string" ? (
              <Text
                className={`text-xs text-center mt-0.5 ${
                  textColor ? "" : dark ? "text-gray-400" : "text-gray-500"
                }`}
                style={textColor ? { color: textColor } : undefined}
              >
                {subtitle}
              </Text>
            ) : (
              subtitle
            )
          )}
        </View>
      </View>

      <View style={{ minWidth: 50, zIndex: 20 }} className="items-end">
        {rightComponent ? (
          rightComponent
        ) : (
          <>
            {showLanguageSelector && (
              <View className="relative">
                <TouchableOpacity
                  onPress={() => setDropdownVisible(!dropdownVisible)}
                  className={`flex-row items-center px-3 py-2 rounded-md ${
                    dark ? "bg-[#333]" : "bg-[#F6CA20]"
                  }`}
                >
                  <Text
                    className={`font-medium text-sm ${
                      dark ? "text-white" : "text-black"
                    }`}
                  >
                    {getLanguageButtonText(selectedLanguage)}
                  </Text>
                  <AntDesign
                    name={dropdownVisible ? "up" : "down"}
                    size={12}
                    color={dark ? "#fff" : "#666"}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                {dropdownVisible && (
                  <>
                    <TouchableWithoutFeedback
                      onPress={() => setDropdownVisible(false)}
                    >
                      <View className="absolute top-full right-0 left-0 bottom-[-1000px] z-10" />
                    </TouchableWithoutFeedback>

                    <View className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg z-20 min-w-[130px] border border-gray-200">
                      {languages.map((lang, index) => (
                        <TouchableOpacity
                          key={lang.code}
                          onPress={() => handleLanguageSelect(lang.code)}
                          className={`flex-row items-center px-4 py-3 ${
                            index !== languages.length - 1
                              ? "border-b border-gray-100"
                              : ""
                          }
                          ${
                            selectedLanguage === lang.code
                              ? "bg-blue-50"
                              : "bg-white"
                          }
                          `}
                        >
                          <Text className="flex-1 text-base">{lang.name}</Text>
                          {selectedLanguage === lang.code && (
                            <AntDesign name="check" size={16} color="#007AFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {showLogoutButton && (
              <TouchableOpacity onPress={handleLogoutPress}>
                <MaterialIcons name="logout" size={24} color="#FF0000" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );

  if (linearGradient) {
    return (
      <LinearGradient colors={["#6839CF", "#854EDC"]} style={{ top: 0, left: 0, right: 0, zIndex: 10 }}>
        <HeaderContent />
      </LinearGradient>
    );
  }

  return <HeaderContent />;
};

export default CustomHeader;
