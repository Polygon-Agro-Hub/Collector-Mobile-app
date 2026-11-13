import React from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface ScaleConnectionGuideCardProps {
  onConnectScale?: () => void;
  compact?: boolean;
}

type KeyCapVariant = "lightBlue" | "gray" | "green";

interface KeyCapProps {
  label: string;
  variant?: KeyCapVariant;
  aspect?: "1x1" | "2x1";
  icon?: React.ReactNode;
  fontSize?: number;
}

// Keycap Component representing physical scale buttons with specific color & aspect ratio
const KeyCap: React.FC<KeyCapProps> = ({
  label,
  variant = "gray",
  aspect = "1x1",
  icon,
  fontSize,
}) => {
  const is2x1 = aspect === "2x1";

  const getContainerStyle = () => {
    switch (variant) {
      case "lightBlue":
        return styles.keyCapLightBlue;
      case "green":
        return styles.keyCapGreen;
      case "gray":
      default:
        return styles.keyCapGray;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "lightBlue":
        return styles.keyCapTextLightBlue;
      case "green":
        return styles.keyCapTextGreen;
      case "gray":
      default:
        return styles.keyCapTextGray;
    }
  };

  return (
    <View
      style={[
        styles.keyCapBase,
        is2x1 ? styles.keyCap2x1 : styles.keyCap1x1,
        getContainerStyle(),
      ]}
    >
      {icon}
      <Text
        style={[getTextStyle(), fontSize ? { fontSize } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
};

// Scale LCD display simulator with #9067f0 box and white text
const LcdDisplay: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.lcdContainer}>
    <Text style={styles.lcdText}>{text}</Text>
  </View>
);

export const ScaleConnectionGuideCard: React.FC<ScaleConnectionGuideCardProps> = ({
  onConnectScale,
  compact = false,
}) => {
  const { t } = useTranslation();

  const steps = [
    {
      step: 1,
      text: t("ScaleConnectionGuide.Step1", "Press the [Mode] button."),
      // mode button - light blue (#0080b9) size 1x1, text white
      badge: <KeyCap label="Mode" variant="lightBlue" aspect="1x1" fontSize={10.5} />,
    },
    {
      step: 2,
      text: t("ScaleConnectionGuide.Step2", 'Enter 42. You should see "Wi-Fi" on the display.'),
      // 4, 2 numbers button - gray (#e8e5cc) button size 1x1, text black; display #9067f0
      badge: (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <KeyCap label="4" variant="gray" aspect="1x1" fontSize={16} />
          <KeyCap label="2" variant="gray" aspect="1x1" fontSize={16} />
          <Text style={{ fontSize: 14, color: "#64748B", fontWeight: "600" }}>→</Text>
          <LcdDisplay text="Wi-Fi" />
        </View>
      ),
    },
    {
      step: 3,
      text: t("ScaleConnectionGuide.Step3", "Press the [F-Prog] + [Amend] buttons together."),
      // f-prog, amend button - light blue (#0080b9) size 1x1, text white
      badge: (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <KeyCap label="F-Prog" variant="lightBlue" aspect="1x1" fontSize={9} />
          <Text style={{ fontSize: 14, color: "#475569", fontWeight: "bold" }}>+</Text>
          <KeyCap label="Amend" variant="lightBlue" aspect="1x1" fontSize={9.5} />
        </View>
      ),
    },
    {
      step: 4,
      text: t(
        "ScaleConnectionGuide.Step4",
        'You will see "Please Wait" on the screen. Wait until the Scale scans and prints the available Wi-Fi routers in the area.'
      ),
      // display in #9067f0 box, text white
      badge: (
        <View style={{ marginTop: 4 }}>
          <LcdDisplay text="Please Wait" />
        </View>
      ),
    },
    {
      step: 5,
      text: t("ScaleConnectionGuide.Step5", "Using the [→] button, select the correct wireless router."),
      // arrow button - light blue (#0080b9) size 1x1, text white
      badge: <KeyCap label="→" variant="lightBlue" aspect="1x1" fontSize={18} />,
    },
    {
      step: 6,
      text: t("ScaleConnectionGuide.Step6", "Press the [Accu/Confirm] button."),
      // accu/confirm button - green (#02a796), size 2:1 (width 80 height 40), text white in same line
      badge: <KeyCap label="Accu/Confirm" variant="green" aspect="2x1" fontSize={9.5} />,
    },
    {
      step: 7,
      text: t("ScaleConnectionGuide.Step7", "Enter the Wi-Fi password."),
      badge: (
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.passwordBadge}>
              <MaterialCommunityIcons name="lock-outline" size={13} color="#475569" />
              <Text style={{ fontSize: 12, color: "#334155", fontWeight: "600" }}>••••••••</Text>
            </View>
          </View>

          {/* IME Button & Mode Switching Helper Box */}
          <View style={styles.imeContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {/* IME button - gray (#e8e5cc) button size 1x1, text black */}
              <KeyCap label="IME" variant="gray" aspect="1x1" fontSize={11} />
              <Text style={styles.imeTitle}>
                {t("ScaleConnectionGuide.ImeTitle", "Typing Uppercase & Characters ([IME] button)")}
              </Text>
            </View>

            <Text style={styles.imeDescription}>
              {t(
                "ScaleConnectionGuide.ImeDescription",
                "If you need to type uppercase letters, press the [IME] button. Pressing [IME] switches cyclically between:"
              )}
            </Text>

            {/* Cycle mode chips */}
            <View style={styles.imeCycleRow}>
              <View style={styles.imeModeChip}>
                <Text style={styles.imeModeChipText}>
                  {t("ScaleConnectionGuide.ImeLowercase", "lowercase")}
                </Text>
              </View>
              <Text style={styles.imeArrow}>→</Text>
              <View style={[styles.imeModeChip, styles.imeModeChipActive]}>
                <Text style={[styles.imeModeChipText, styles.imeModeChipTextActive]}>
                  {t("ScaleConnectionGuide.ImeUppercase", "uppercase")}
                </Text>
              </View>
              <Text style={styles.imeArrow}>→</Text>
              <View style={styles.imeModeChip}>
                <Text style={styles.imeModeChipText}>
                  {t("ScaleConnectionGuide.ImeUtf8", "UTF-8")}
                </Text>
              </View>
              <Text style={styles.imeArrow}>→</Text>
              <View style={styles.imeModeChip}>
                <Text style={styles.imeModeChipText}>
                  {t("ScaleConnectionGuide.ImeIsn", "ISN code")}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              <Text style={styles.imeTipText}>
                {t(
                  "ScaleConnectionGuide.ImeTip",
                  "Press [IME] repeatedly until you reach the desired case or character mode."
                )}
              </Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      step: 8,
      text: t("ScaleConnectionGuide.Step8", "Press the [Amend] button."),
      // amend button - light blue (#0080b9) size 1x1, text white
      badge: <KeyCap label="Amend" variant="lightBlue" aspect="1x1" fontSize={9.5} />,
    },
    {
      step: 9,
      text: t(
        "ScaleConnectionGuide.Step9",
        "Wait 30-60 seconds until the device shows an IP address. Please note this IP address."
      ),
      // display in #9067f0 box, text white
      badge: (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <LcdDisplay text="192.168.1.XXX" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>30 - 60s</Text>
          </View>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="router-wireless" size={22} color="#0080b9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {t("ScaleConnectionGuide.Title", "12.2 Connect Scale to your wireless router")}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t("ScaleConnectionGuide.SectionTitle", "Wireless Router Connection")}
          </Text>
        </View>
      </View>

      {/* Prerequisite Alert Box */}
      <View style={styles.prerequisiteBox}>
        <MaterialCommunityIcons name="information-outline" size={18} color="#B45309" style={{ marginTop: 2 }} />
        <Text style={styles.prerequisiteText}>
          {t(
            "ScaleConnectionGuide.Prerequisite",
            "Make sure that the scale is in WiFi Mode as per the instructions given above."
          )}
        </Text>
      </View>

      {/* Step by Step Timeline */}
      <View style={styles.timelineContainer}>
        {steps.map((item, index) => {
          const isLast = index === steps.length - 1;
          return (
            <View key={item.step} style={styles.stepRow}>
              {/* Left indicator with connecting line */}
              <View style={styles.indicatorCol}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCircleText}>{item.step}</Text>
                </View>
                {!isLast && <View style={styles.connectingLine} />}
              </View>

              {/* Right content */}
              <View style={[styles.stepContent, isLast && { paddingBottom: 0 }]}>
                <Text style={styles.stepText}>{item.text}</Text>
                {item.badge && <View style={{ marginTop: 6 }}>{item.badge}</View>}
              </View>
            </View>
          );
        })}
      </View>

      {/* IP Address Note Callout */}
      <View style={styles.noteBox}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#02a796" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>
            {t("ScaleConnectionGuide.IpNoteTitle", "Important Note")}
          </Text>
          <Text style={styles.noteText}>
            {t(
              "ScaleConnectionGuide.IpNote",
              "Please note down this IP address. You will need to enter it in the app to connect the scale."
            )}
          </Text>
        </View>
      </View>

      {/* Action Button: Connect Scale in App */}
      {onConnectScale && (
        <TouchableOpacity
          onPress={onConnectScale}
          activeOpacity={0.85}
          style={styles.actionButton}
        >
          <FontAwesome6 name="weight-scale" size={16} color="#000000" />
          <Text style={styles.actionButtonText}>
            {t("ScaleConnectionGuide.ConnectScaleNow", "Connect Scale in App")}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#000000" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  prerequisiteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  prerequisiteText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    fontWeight: "500",
  },
  timelineContainer: {
    paddingLeft: 2,
  },
  stepRow: {
    flexDirection: "row",
  },
  indicatorCol: {
    alignItems: "center",
    width: 28,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FAE432",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 1,
    zIndex: 1,
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
  },
  connectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stepText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 19,
    fontWeight: "500",
  },

  // Physical Button Keycap Base & Dimensions
  keyCapBase: {
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  keyCap1x1: {
    width: 40,
    height: 40,
  },
  keyCap2x1: {
    width: 80,
    height: 40,
    paddingHorizontal: 2,
  },

  // Light Blue button (f-prog, amend, mode, arrow button - #0080b9, size 1x1, text white)
  keyCapLightBlue: {
    backgroundColor: "#0080b9",
    borderWidth: 1.5,
    borderColor: "#006b9b",
    borderBottomWidth: 3,
    borderBottomColor: "#00567c",
  },
  keyCapTextLightBlue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 10,
    textAlign: "center",
  },

  // Gray button (IME button, 4, 2 numbers button - #e8e5cc, size 1x1, text black)
  keyCapGray: {
    backgroundColor: "#e8e5cc",
    borderWidth: 1.5,
    borderColor: "#d2ceb0",
    borderBottomWidth: 3,
    borderBottomColor: "#b8b495",
  },
  keyCapTextGray: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },

  // Green button (accu/confirm button - #02a796, size 2:1 width 2 height 1, text white in same line)
  keyCapGreen: {
    backgroundColor: "#02a796",
    borderWidth: 1.5,
    borderColor: "#028d7f",
    borderBottomWidth: 3,
    borderBottomColor: "#017367",
  },
  keyCapTextGreen: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 9.5,
    textAlign: "center",
  },

  // Display Box (#9067f0 square box with white text, same height as buttons: 40dp)
  lcdContainer: {
    height: 40,
    backgroundColor: "#9067f0",
    borderRadius: 7,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#7c52df",
    borderBottomWidth: 3,
    borderBottomColor: "#6b41ce",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  lcdText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  passwordBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imeContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  imeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  imeDescription: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 6,
  },
  imeCycleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginVertical: 4,
  },
  imeModeChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  imeModeChipActive: {
    backgroundColor: "#FEF08A",
    borderColor: "#EAB308",
  },
  imeModeChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  imeModeChipTextActive: {
    color: "#713F12",
    fontWeight: "700",
  },
  imeArrow: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
  },
  imeTipText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
    lineHeight: 15,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#14532D",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: "#FAE432",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000000",
  },
});
