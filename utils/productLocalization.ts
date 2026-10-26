export interface LocalizedProductItem {
  displayName?: string;
  name?: string;
  cropName?: string;
  varietyLabel?: string;
  cropLabel?: string;
  varietyNameEnglish?: string;
  varietyNameSinhala?: string;
  varietyNameTamil?: string;
  cropNameEnglish?: string;
  cropNameSinhala?: string;
  cropNameTamil?: string;
}

/**
 * Returns the localized name of a crop/variety according to current language code.
 */
export const getLocalizedProductName = (
  item?: LocalizedProductItem | null,
  lang?: string
): string => {
  if (!item) return "";
  if (item.displayName) {
    return item.displayName;
  }
  const currentLang = (lang || "").toLowerCase();
  if (currentLang.startsWith("si")) {
    return (
      item.varietyNameSinhala ||
      item.cropNameSinhala ||
      item.name ||
      item.cropName ||
      item.varietyNameEnglish ||
      item.cropNameEnglish ||
      item.varietyLabel ||
      item.cropLabel ||
      ""
    );
  }
  if (currentLang.startsWith("ta")) {
    return (
      item.varietyNameTamil ||
      item.cropNameTamil ||
      item.name ||
      item.cropName ||
      item.varietyNameEnglish ||
      item.cropNameEnglish ||
      item.varietyLabel ||
      item.cropLabel ||
      ""
    );
  }
  return (
    item.varietyNameEnglish ||
    item.cropNameEnglish ||
    item.name ||
    item.cropName ||
    item.varietyLabel ||
    item.cropLabel ||
    ""
  );
};

/**
 * Extracts the single grade letter (e.g. "A", "B", "C") from a localized grade title.
 */
export const extractGradeLetter = (title?: string): string => {
  if (!title) return "A";
  return (
    title
      .replace(/Grade/gi, "")
      .replace(/ශ්‍රේණිය/g, "")
      .replace(/ශ්‍රේණිය/g, "")
      .replace(/தரம்/g, "")
      .trim() || "A"
  );
};
