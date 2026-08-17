/**
 * Centralized Time Slot Constants & Helper Functions for Frontend
 */
export const TIME_SLOTS = [
  { label: "08:00 AM - 12:00 PM", value: "08:00 AM - 12:00 PM" },
  { label: "12:00 PM - 04:00 PM", value: "12:00 PM - 04:00 PM" },
  { label: "04:00 PM - 09:00 PM", value: "04:00 PM - 09:00 PM" },
] as const;

export const TIME_SLOT_MAP: Record<string, string> = {
  "8-12": "08:00 AM - 12:00 PM",
  "12-16": "12:00 PM - 04:00 PM",
  "12-4": "12:00 PM - 04:00 PM",
  "16-20": "04:00 PM - 09:00 PM",
  "16-21": "04:00 PM - 09:00 PM",
  "4-9": "04:00 PM - 09:00 PM",
};

/**
 * Formats raw timeSlot key into standard human-readable time string
 * (Restricted to 3 standard formats: 08:00 AM - 12:00 PM, 12:00 PM - 04:00 PM, 04:00 PM - 09:00 PM)
 * @param timeSlot raw timeSlot string
 * @returns formatted string
 */
export const formatTimeSlot = (timeSlot?: string | null): string => {
  if (!timeSlot) return "";
  return TIME_SLOT_MAP[timeSlot] || timeSlot;
};

/**
 * Returns sorting priority rank for a given time slot (1 for morning, 2 for afternoon, 3 for evening, 4 fallback)
 */
export const getTimeSlotPriority = (rawTimeSlot?: string, formattedTimeSlot?: string): number => {
  const str = (rawTimeSlot || formattedTimeSlot || "").toLowerCase();
  if (str === "8-12" || str.includes("8:00 am") || str.includes("08:00 am")) return 1;
  if (str === "12-4" || str === "12-16" || str.includes("12:00 pm")) return 2;
  if (
    str === "16-20" ||
    str === "16-21" ||
    str === "4-8" ||
    str === "4-9" ||
    str.includes("04:00 pm") ||
    str.includes("4:00 pm") ||
    str.includes("09:00 pm") ||
    str.includes("9:00 pm")
  ) {
    return 3;
  }
  return 4;
};
