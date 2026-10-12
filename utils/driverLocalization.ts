export interface LocalizedDriverItem {
  driverName?: string | null;
  fullName?: string | null;
  driverNameEnglish?: string | null;
  driverNameSinhala?: string | null;
  driverNameTamil?: string | null;
  fullNameEnglish?: string | null;
  fullNameSinhala?: string | null;
  fullNameTamil?: string | null;
  firstNameEnglish?: string | null;
  firstNameSinhala?: string | null;
  firstNameTamil?: string | null;
  lastNameEnglish?: string | null;
  lastNameSinhala?: string | null;
  lastNameTamil?: string | null;
}

/**
 * Returns the driver's full name localized according to the current application language.
 * Uses individual DB fields (firstNameSinhala, lastNameSinhala, etc.) with fallbacks.
 */
export const getLocalizedDriverName = (
  driver?: LocalizedDriverItem | null,
  lang?: string
): string => {
  if (!driver) return "";

  const clean = (val?: string | null) => (typeof val === "string" ? val.trim() : "");
  const currentLang = (lang || "").toLowerCase().trim();

  const fnEn = clean(driver.firstNameEnglish);
  const lnEn = clean(driver.lastNameEnglish);
  const englishName =
    `${fnEn} ${lnEn}`.trim() ||
    clean(driver.driverNameEnglish) ||
    clean(driver.fullNameEnglish) ||
    clean(driver.driverName) ||
    clean(driver.fullName);

  if (currentLang.startsWith("si")) {
    const fnSi = clean(driver.firstNameSinhala);
    const lnSi = clean(driver.lastNameSinhala);
    if (fnSi || lnSi) {
      const fromFields = `${fnSi || fnEn} ${lnSi || lnEn}`.trim();
      return fromFields || englishName;
    }
    const nameSi = clean(driver.driverNameSinhala) || clean(driver.fullNameSinhala);
    if (nameSi) return nameSi;
    return englishName;
  }

  if (currentLang.startsWith("ta")) {
    const fnTa = clean(driver.firstNameTamil);
    const lnTa = clean(driver.lastNameTamil);
    if (fnTa || lnTa) {
      const fromFields = `${fnTa || fnEn} ${lnTa || lnEn}`.trim();
      return fromFields || englishName;
    }
    const nameTa = clean(driver.driverNameTamil) || clean(driver.fullNameTamil);
    if (nameTa) return nameTa;
    return englishName;
  }

  return englishName;
};

