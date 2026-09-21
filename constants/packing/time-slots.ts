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

import i18n from "@/i18n/i18n";

export const SRI_LANKA_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Moneragala", "Monaragala", "Mullaitivu",
  "Nuwara Eliya", "NuwaraEliya", "Polonnaruwa", "Puttalam",
  "Ratnapura", "Rathnapura", "Trincomalee", "Vavuniya",
  "Moragahahena", "Horana", "Homagama", "Maharagama", "Kottawa", "Piliyandala", "Kaduwela"
];

/**
 * Formats raw timeSlot key into standard human-readable time string
 * and translates AM / PM tokens with prefix format (e.g. පෙ.ව. 08:00 - ප.ව. 12:00) according to active language.
 * @param timeSlot raw timeSlot string
 * @param t optional translation function
 * @returns formatted string
 */
export const formatTimeSlot = (
  timeSlot?: string | null,
  t?: any
): string => {
  if (!timeSlot) return "";
  let standard = TIME_SLOT_MAP[timeSlot] || timeSlot;

  // Clean "within" prefix and trim
  standard = standard.replace(/within\s*/i, "").trim();

  // Normalize en-dash / em-dash to hyphen
  standard = standard.replace(/[–—]/g, "-");

  // Normalize localized tokens and positions to standard "HH:MM AM - HH:MM PM"
  standard = standard
    .replace(/(?:පෙ\.ව\.|මුற்பகல்)\s*(\d{1,2}(?:[:.]\d{2})?)/gi, "$1 AM")
    .replace(/(?:ප\.ව\.|பிற்பகல்)\s*(\d{1,2}(?:[:.]\d{2})?)/gi, "$1 PM")
    .replace(/(\d{1,2}(?:[:.]\d{2})?)\s*(?:පෙ\.ව\.|මුற்பகல்)/gi, "$1 AM")
    .replace(/(\d{1,2}(?:[:.]\d{2})?)\s*(?:ප\.ව\.|பிற்பகல்)/gi, "$1 PM")
    .replace(/පෙ\.ව\.|මුற்பகல்/g, "AM")
    .replace(/ප\.ව\.|பிற்பகல்/g, "PM");

  // Handle shorthand patterns like 8AM, 8 AM, 8.00 AM -> 08:00 AM
  standard = standard.replace(/(\d{1,2})(?:[:.](\d{2}))?\s*(AM|PM)/gi, (match, h, m, p) => {
    const mins = m || "00";
    return `${h.padStart(2, "0")}:${mins} ${p.toUpperCase()}`;
  });

  const am = t ? t("Time.AM", { defaultValue: "AM" }) : i18n.t("Time.AM", { defaultValue: "AM" });
  const pm = t ? t("Time.PM", { defaultValue: "PM" }) : i18n.t("Time.PM", { defaultValue: "PM" });

  const currentLang =
    (t && t("SignIn.LNG")) ||
    (t && t("LNG")) ||
    (t && t("AddOfficerBasicDetails.LNG")) ||
    i18n.language ||
    "en";

  const isSinhala = am === "පෙ.ව." || currentLang.toLowerCase().startsWith("si");
  const isTamil = am === "முற்பகல்" || currentLang.toLowerCase().startsWith("ta");

  if (isSinhala) {
    return standard
      .replace(/(\d{1,2}:\d{2})\s*AM/gi, "පෙ.ව. $1")
      .replace(/(\d{1,2}:\d{2})\s*PM/gi, "ප.ව. $1")
      .replace(/\bAM\b/gi, "පෙ.ව.")
      .replace(/\bPM\b/gi, "ප.ව.");
  }

  if (isTamil) {
    return standard
      .replace(/(\d{1,2}:\d{2})\s*AM/gi, "முற்பகல் $1")
      .replace(/(\d{1,2}:\d{2})\s*PM/gi, "பிற்பகல் $1")
      .replace(/\bAM\b/gi, "முற்பகல்")
      .replace(/\bPM\b/gi, "பிற்பகல்");
  }

  return standard
    .replace(/(\d+:\d+)\s*AM/gi, `$1 ${am}`)
    .replace(/(\d+:\d+)\s*PM/gi, `$1 ${pm}`)
    .replace(/\bAM\b/gi, am)
    .replace(/\bPM\b/gi, pm);
};

/**
 * Formats Ready Time according to language:
 * Sinhala: "[පෙ.ව./ප.ව.] [H:MM] ට [YYYY/MM/DD] දින" -> e.g. "ප.ව. 1:00 ට 2026/09/12 දින"
 * Tamil: "[முற்பகல்/பிற்பகல்] [H:MM] மணிக்கு [YYYY/MM/DD] அன்று" -> e.g. "பிற்பகல் 1:00 மணிக்கு 2026/09/12 அன்று"
 * English: "At [H:MM AM/PM] on [YYYY/MM/DD]" -> e.g. "At 1:00 PM on 2026/09/12"
 */
export const formatReadyDateTime = (
  packTimeInput?: string | Date | null,
  t?: any
): string => {
  if (!packTimeInput) return "";
  const date = new Date(packTimeInput);
  if (isNaN(date.getTime())) return String(packTimeInput);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const formattedDate = `${year}/${month}/${day}`;

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const isPM = hours >= 12;
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const time12 = `${hours}:${minutes}`;

  const am = t ? t("Time.AM", { defaultValue: "AM" }) : i18n.t("Time.AM", { defaultValue: "AM" });
  const isSinhala = am === "පෙ.ව." || (t && t("AddOfficerBasicDetails.LNG") === "si");
  const isTamil = am === "முற்பகல்" || (t && t("AddOfficerBasicDetails.LNG") === "ta");

  if (isSinhala) {
    const period = isPM ? "ප.ව." : "පෙ.ව.";
    return `${period} ${time12} ට ${formattedDate} දින`;
  }

  if (isTamil) {
    const period = isPM ? "பிற்பகல்" : "முற்பகல்";
    return `${period} ${time12} மணிக்கு ${formattedDate} அன்று`;
  }

  const ampm = isPM ? "PM" : "AM";
  return `At ${time12} ${ampm} on ${formattedDate}`;
};

/**
 * Formats and translates an order category or district string
 */
export const formatOrderCategory = (category?: string | null, t?: any): string => {
  if (!category) return "";
  const translate = (key: string, defVal: string) => {
    if (t) return t(key, { defaultValue: defVal });
    return i18n.t(key, { defaultValue: defVal });
  };

  const trimmed = category.trim();

  // 1. Check if it is a Pickup Order
  if (
    trimmed.toLowerCase() === "pickup order" ||
    trimmed.toLowerCase() === "pickup orders" ||
    trimmed.toLowerCase() === "pickup" ||
    trimmed.toLowerCase().includes("pickup")
  ) {
    return translate("QRHandling.Pickup Orders", translate("AssignGroups.Pickup Orders", "රැගෙන යාමේ ඇණවුම්"));
  }

  let text = trimmed;

  // 2. Check and translate any district names found within the text
  for (const dist of SRI_LANKA_DISTRICTS) {
    const regex = new RegExp(`\\b${dist}\\b`, "i");
    if (regex.test(text)) {
      const canonicalKey = dist.replace(/\s+/g, "");
      const translatedDist = translate(`Districts.${canonicalKey}`, translate(`Districts.${dist}`, dist));
      text = text.replace(regex, translatedDist);
    }
  }

  // 3. Translate the word "District" if present (e.g. "Colombo District" -> "කොළඹ දිස්ත්‍රික්කය")
  const districtWord = translate("AssignGroups.District", translate("District", "දිස්ත්‍රික්කය"));
  text = text.replace(/\bDistrict\b/gi, districtWord);

  return text;
};

/**
 * Formats order type (R -> සිල්ලර / W -> තොග)
 */
export const formatOrderType = (type?: string | null, t?: any): string => {
  const isWholesale = String(type || "").toUpperCase().startsWith("W");
  const translate = (key: string, defVal: string) => {
    if (t) return t(key, { defaultValue: defVal });
    return i18n.t(key, { defaultValue: defVal });
  };

  if (isWholesale) {
    return translate("QRHandling.Wholesale_Short", translate("AssignGroups.Wholesale", "තොග"));
  }
  return translate("QRHandling.Retail_Short", translate("AssignGroups.Retail", "සිල්ලර"));
};

/**
 * Formats position display name (e.g. "Packing Position 1" -> "ඇසුරුම් ස්ථානය 1")
 */
export const formatPositionDisplayName = (positionName?: string | null, t?: any): string => {
  if (!positionName) return "";
  const translate = (key: string, optsOrDef: any) => {
    if (t) return t(key, optsOrDef);
    return i18n.t(key, typeof optsOrDef === "string" ? { defaultValue: optsOrDef } : optsOrDef);
  };

  const trimmed = positionName.trim();
  const match = trimmed.match(/(?:Packing Position|අසුරුම් කිරීමේ ස්ථානය|ඇසුරුම් ස්ථානය|பேக்கிங் நிலை)\s*(\d+)/i);
  if (match) {
    const num = match[1];
    return translate("Packing.Packing Position {{number}}", {
      number: num,
      defaultValue: `Packing Position ${num}`,
    });
  }

  if (
    trimmed.toLowerCase() === "packing position" ||
    trimmed === "අසුරුම් කිරීමේ ස්ථානය" ||
    trimmed === "ඇසුරුම් ස්ථානය"
  ) {
    return translate("Packing.Packing Position", "Packing Position");
  }

  if (trimmed.toLowerCase().includes("qc position") || trimmed.toLowerCase() === "qc") {
    return translate("Packing.QC Position", "QC Position");
  }

  if (trimmed.toLowerCase().includes("qr handling") || trimmed.toLowerCase().includes("qr position")) {
    return translate("Packing.QR Handling Position", "QR Handling Position");
  }

  return trimmed;
};

/**
 * Formats row display name (e.g. "Row 1" -> "පේළිය 1")
 */
export const formatRowTitle = (rowName?: string | { name?: string; rowIndex?: number } | null, t?: any): string => {
  if (!rowName) return "";
  const translate = (key: string, optsOrDef: any) => {
    if (t) return t(key, optsOrDef);
    return i18n.t(key, typeof optsOrDef === "string" ? { defaultValue: optsOrDef } : optsOrDef);
  };

  const raw = typeof rowName === "string" ? rowName : (rowName.name || (rowName.rowIndex ? `Row ${rowName.rowIndex}` : ""));
  const match = raw.match(/\d+/);
  if (match) {
    const num = match[0];
    return translate("Packing.Row {{number}}", {
      number: num,
      defaultValue: translate("AssignGroups.Row {{number}}", {
        number: num,
        defaultValue: `Row ${num}`,
      }),
    });
  }
  const clean = raw.trim().toLowerCase();
  if (clean === "rows") {
    return translate("Packing.Rows", translate("AssignGroups.Rows", translate("Rows", "පේළි")));
  }
  if (clean === "row") {
    return translate("Packing.Row", translate("AssignGroups.Row", translate("Row", "පේළිය")));
  }
  return translate(raw, raw);
};

/**
 * Formats order title with localized (R)/(W) or (Retail)/(Wholesale) tag
 */
export const formatOrderTitle = (
  orderTitle?: string | null,
  typeOrT?: string | any,
  maybeT?: any
): string => {
  if (!orderTitle) return "";
  const t = typeof typeOrT === "function" ? typeOrT : maybeT;
  const rawType = typeof typeOrT === "string" ? typeOrT : "";

  const isWholesale =
    rawType.toUpperCase().startsWith("W") ||
    orderTitle.includes("(W)") ||
    orderTitle.includes("(Wholesale)") ||
    orderTitle.includes("(තොග)") ||
    orderTitle.includes("(மொத்தம்)") ||
    orderTitle.toUpperCase().endsWith(" W") ||
    orderTitle.toUpperCase().includes("(W");

  const cleanInv = orderTitle.replace(/\s*\([^\)]*\)/g, "").trim();
  const typeLabel = formatOrderType(isWholesale ? "W" : "R", t);
  return `${cleanInv} (${typeLabel})`;
};

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
