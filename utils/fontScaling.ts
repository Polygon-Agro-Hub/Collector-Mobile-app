import React from "react";
import { StyleSheet, TextProps } from "react-native";
import i18n from "@/i18n/i18n";

// Access original React Native Text directly from react-native
const RN = require("react-native");
const RNText = RN.Text;

/**
 * Checks if the current app language is Tamil.
 */
export const isTamilLanguage = (): boolean => {
  return i18n.language === "ta" || i18n.language?.startsWith("ta");
};

/**
 * Helper to calculate scaled font size for Tamil (-1.5px reduction).
 */
export const getTamilScaledFontSize = (size: number): number => {
  return isTamilLanguage() ? Math.max(8, size - 1.5) : size;
};

/**
 * ScaledText wraps React Native's Text component and automatically
 * reduces font size by 1.5px when Tamil language is active.
 * English and Sinhala remain completely untouched at their original sizes.
 */
const ScaledText = React.forwardRef<any, TextProps>((props, ref) => {
  const isTamil = isTamilLanguage();

  if (!isTamil || !props.style) {
    return React.createElement(RNText, { ref, ...props });
  }

  const flattened = StyleSheet.flatten(props.style);

  if (flattened && typeof flattened.fontSize === "number") {
    const newFontSize = Math.max(8, flattened.fontSize - 1.5);
    const newStyle = [props.style, { fontSize: newFontSize }];
    return React.createElement(RNText, { ref, ...props, style: newStyle });
  }

  return React.createElement(RNText, { ref, ...props });
});

// Preserve displayName and statics
(ScaledText as any).displayName = RNText.displayName || "Text";
Object.assign(ScaledText, RNText);

// Safely redefine the Text getter on the react-native package without touching frozen exports
try {
  Object.defineProperty(RN, "Text", {
    get: () => ScaledText,
    configurable: true,
    enumerable: true,
  });
} catch {
  try {
    RN.Text = ScaledText;
  } catch {}
}

export default ScaledText;
