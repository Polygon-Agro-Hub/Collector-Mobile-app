import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface CustomCalendarProps {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  minimumDate?: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const MONTH_KEYS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  visible,
  value,
  maximumDate,
  minimumDate,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(new Date(value));
  const [selectedDate, setSelectedDate] = useState(new Date(value));

  useEffect(() => {
    if (visible) {
      setViewDate(new Date(value));
      setSelectedDate(new Date(value));
    }
  }, [visible, value]);

  const weeks = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewDate]);

  const goPrevMonth = () =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const goNextMonth = () =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const isDisabled = (date: Date) => {
    if (maximumDate && date > maximumDate) return true;
    if (minimumDate && date < minimumDate) return true;
    return false;
  };

  const monthLabel = `${t(`Calendar.months.${MONTH_KEYS[viewDate.getMonth()]}`)} ${viewDate.getFullYear()}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              width: 340,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            {/* Header: month navigation */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingHorizontal: 4,
              }}
            >
              <TouchableOpacity onPress={goPrevMonth} style={{ padding: 6 }}>
                <Ionicons name="chevron-back" size={22} color="#313131" />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: "700", color: "#313131" }}>
                {monthLabel}
              </Text>

              <TouchableOpacity onPress={goNextMonth} style={{ padding: 6 }}>
                <Ionicons name="chevron-forward" size={22} color="#313131" />
              </TouchableOpacity>
            </View>

            {/* Weekday row */}
            <View style={{ flexDirection: "row" }}>
              {WEEKDAY_KEYS.map((wd) => (
                <View key={wd} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>
                    {t(`Calendar.weekdays.${wd}`)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            {weeks.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: "row" }}>
                {row.map((date, colIndex) => {
                  if (!date) {
                    return <View key={colIndex} style={{ flex: 1, aspectRatio: 1 }} />;
                  }

                  const selected = isSameDay(date, selectedDate);
                  const disabled = isDisabled(date);

                  return (
                    <View key={colIndex} style={{ flex: 1, aspectRatio: 1, padding: 2 }}>
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={() => setSelectedDate(date)}
                        style={{
                          flex: 1,
                          borderRadius: 999,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: selected ? "#313131" : "transparent",
                          opacity: disabled ? 0.3 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: selected ? "#FFFFFF" : "#111827",
                            fontWeight: selected ? "700" : "400",
                          }}
                        >
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Footer actions */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 16,
                gap: 12,
              }}
            >
              <TouchableOpacity onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 18 }}>
                <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                  {t("Calendar.Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onConfirm(selectedDate);
                  onClose();
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  backgroundColor: "#313131",
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {t("Calendar.Done")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default CustomCalendar;