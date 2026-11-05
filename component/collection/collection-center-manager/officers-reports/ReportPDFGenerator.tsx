import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import environment from "@/environment/environment";
import i18n from "@/i18n/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ReportLanguage = "en" | "si" | "ta";

// Pulls a fixed-language translator scoped to the "PDFReport" namespace/section
// of your en/si/ta JSON files, so this file stays in sync with the rest of
// the app's translations instead of keeping its own copy.
const getPdfTranslator = (language: ReportLanguage) => {
  const fixedT = i18n.getFixedT(language);
  return (key: string, vars?: Record<string, string>) =>
    fixedT(`PDFReport.${key}`, vars);
};

// Converts a raw "AM"/"PM" time string into the Sinhala/Tamil equivalent,
// same convention used in the TransactionReport screen.
const formatDisplayTime = (timeStr: string, lang: ReportLanguage): string => {
  if (!timeStr) return "";
  if (lang === "si") {
    return timeStr
      .replace(/\s*AM/gi, " පෙ.ව.")
      .replace(/\s*PM/gi, " ප.ව.")
      .trim();
  }
  if (lang === "ta") {
    return timeStr
      .replace(/\s*AM/gi, " மு.ப.")
      .replace(/\s*PM/gi, " பி.ப.")
      .trim();
  }
  return timeStr;
};

const normalizeResponseDate = (dateString: string): string => {
  const [month, day, year] = dateString.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

interface PaymentDataItem {
  date: string;
  TCount: number;
  total: number;
}

const normalizeDate = (dateString: string): string => {
  return dateString.replace(/\//g, "-");
};

const validateAndFormatDate = (dateString: string): string | null => {
  const normalizedDate = normalizeDate(dateString);
  const date = new Date(normalizedDate);
  if (isNaN(date.getTime())) {
    console.error(`Invalid date: ${dateString}`);
    return null;
  }
  return date.toISOString().split("T")[0];
};

const reportCounters: { [key: string]: number } = {};


const getTranslatedJobRole = (role: string, lang: ReportLanguage): string => {
  if (!role) return "";
  const normalized = role.trim().toLowerCase();
  if (lang === "ta") {
    switch (normalized) {
      case "collection officer":
        return "சேகரிப்பு அதிகாரி";
      case "customer officer":
        return "வாடிக்கையாளர் அதிகாரி";
      case "distribution officer":
        return "விநியோகிப்பதற்கான அதிகாரி";
      case "driver":
        return "சாரதி";
      case "collection manager":
      case "center manager":
      case "manager":
        return "சேகரிப்பு முகாமையாளர்";
      default:
        return role;
    }
  }
  if (lang === "si") {
    switch (normalized) {
      case "collection officer":
        return "එක්රැස් කිරීමේ නිලධාරී";
      case "customer officer":
        return "පාරිභෝගික නිලධාරී";
      case "distribution officer":
        return "බෙදාහැරීමේ නිලධාරී";
      case "driver":
        return "රියදුරු";
      case "collection manager":
      case "center manager":
      case "manager":
        return "කළමනාකරු";
      default:
        return role;
    }
  }
  return role;
};

const generateReportId = (officerId: string): string => {
  if (!reportCounters[officerId]) {
    reportCounters[officerId] = 1;
  } else {
    reportCounters[officerId] += 1;
  }

  const paddedCount = reportCounters[officerId].toString().padStart(3, "0");
  return `${officerId}M${paddedCount}`;
};

export const handleGeneratePDF = async (
  fromDate: string,
  toDate: string,
  officerId: string,
  collectionOfficerId: number,
  language?: string,
) => {
  try {
    let resolvedLang: ReportLanguage = (language as ReportLanguage);
    if (!resolvedLang || !["en", "si", "ta"].includes(resolvedLang)) {
      try {
        const stored = await AsyncStorage.getItem("@user_language");
        const storedBase = stored?.toLowerCase().slice(0, 2);
        if (storedBase === "si" || storedBase === "ta" || storedBase === "en") {
          resolvedLang = storedBase as ReportLanguage;
        }
      } catch (e) {}
    }
    if (!resolvedLang || !["en", "si", "ta"].includes(resolvedLang)) {
      const current = (i18n.language || "").toLowerCase().slice(0, 2);
      resolvedLang = (["en", "si", "ta"].includes(current) ? current : "en") as ReportLanguage;
    }

    const t = getPdfTranslator(resolvedLang);
    const isSinhala = resolvedLang === "si";
    const isTamil = resolvedLang === "ta";

    const formattedFromDate = validateAndFormatDate(fromDate);
    const formattedToDate = validateAndFormatDate(toDate);

    if (!formattedFromDate || !formattedToDate) {
      console.error("Invalid date input. Unable to generate PDF.");
      return null;
    }

    const reportId = generateReportId(officerId);

    const officerResponse = await axios.get(
      `${environment.API_BASE_URL}api/collection-manager/employee/${officerId}`,
      { params: { language: resolvedLang } },
    );
    if (officerResponse.data.status !== "success") {
      console.error(
        "Failed to fetch officer details:",
        officerResponse.data.message,
      );
      return null;
    }
    const { firstName, lastName, jobRole } = officerResponse.data.data;
    const translatedJobRole = getTranslatedJobRole(jobRole, resolvedLang);

    const farmerPaymentsResponse = await axios.get(
      `${environment.API_BASE_URL}api/collection-manager/farmer-payments-summary`,
      {
        params: {
          collectionOfficerId,
          fromDate: formattedFromDate,
          toDate: formattedToDate,
        },
      },
    );

    if (farmerPaymentsResponse.data.status !== "success") {
      console.error(
        "Failed to fetch farmer payments summary:",
        farmerPaymentsResponse.data.message,
      );
      return null;
    }

    const paymentData: PaymentDataItem[] = farmerPaymentsResponse.data.data;

    const formattedData = paymentData.map((item: PaymentDataItem) => ({
      ...item,
      date: normalizeResponseDate(item.date),
    }));

    const totalWeight = paymentData.reduce(
      (sum: number, item: { total: number }) => sum + item.total,
      0,
    );
    const totalFarmers = paymentData.reduce(
      (sum: number, item: { TCount: number }) => sum + item.TCount,
      0,
    );

    // Pad single-digit collection counts to match the "08", "05"-style
    // formatting shown in the report design.
    const formatCount = (count: number): string =>
      count.toString().padStart(2, "0");

    const tableRows = formattedData.length
      ? formattedData
          .map(
            (item) => `
              <tr>
                <td>${item.date}</td>
                <td>${item.total > 0 ? `${item.total}kg` : `<em>${t("noData")}</em>`}</td>
                <td>${item.TCount > 0 ? formatCount(item.TCount) : `<em>${t("noData")}</em>`}</td>
              </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="text-align: center; font-style: italic;">${t(
          "noTransactions",
          { from: fromDate, to: toDate },
        )}</td></tr>`;

    const now = new Date();
    const generatedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const generatedTime = formatDisplayTime(
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
      resolvedLang,
    );

    const fontFamily = isSinhala
      ? "'Noto Sans Sinhala', 'Iskoola Pota', 'Sinhala Sangam MN', Arial, sans-serif"
      : isTamil
        ? "'Noto Sans Tamil', 'Latha', 'Tamil Sangam MN', Arial, sans-serif"
        : "Arial, sans-serif";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${resolvedLang}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${t("title")}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: ${fontFamily};
            margin: 0;
            padding: 0;
            color: #333;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
          }
          h1 {
            text-align: center;
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: 600;
          }

          /* ---- Header info table (From / To / EMP ID / Role / etc.) ---- */
          .header-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 10px;
            table-layout: fixed;
          }
          .header-table td {
            padding: 0 6px;
            vertical-align: middle;
          }
          .header-label {
            width: 22%;
            font-size: 13px;
            color: #333;
            padding-left: 0;
          }
          .header-value {
            width: 28%;
            padding: 10px 12px;
            border: 1px solid #e2e2e2;
            border-radius: 8px;
            background-color: #f7f7f7;
            font-size: 13px;
            color: #333;
          }

          /* ---- Data table (Date / Total Weight / Total Collections) ---- */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            border: 1px solid #e2e2e2;
          }
          table.data-table th,
          table.data-table td {
            border: 1px solid #e2e2e2;
            padding: 10px;
            text-align: center;
            font-size: 13px;
          }
          table.data-table th {
            background-color: #ece7e1;
            font-weight: 600;
          }

          .footer {
            margin-top: 16px;
            font-size: 11px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${t("title")}</h1>

          <table class="header-table">
            <tr>
              <td class="header-label">${t("from")}</td>
              <td class="header-value">${fromDate}</td>
              <td class="header-label">${t("to")}</td>
              <td class="header-value">${toDate}</td>
            </tr>
            <tr>
              <td class="header-label">${t("empId")}</td>
              <td class="header-value">${officerId}</td>
              <td class="header-label">${t("role")}</td>
              <td class="header-value">${translatedJobRole}</td>
            </tr>
            <tr>
              <td class="header-label">${t("firstName")}</td>
              <td class="header-value">${firstName}</td>
              <td class="header-label">${t("lastName")}</td>
              <td class="header-value">${lastName}</td>
            </tr>
            <tr>
              <td class="header-label">${t("weight")}</td>
              <td class="header-value">${totalWeight}kg</td>
              <td class="header-label">${t("collections")}</td>
              <td class="header-value">${totalFarmers}</td>
            </tr>
          </table>

          <table class="data-table">
            <tr>
              <th>${t("date")}</th>
              <th>${t("totalWeight")}</th>
              <th>${t("totalCollections")}</th>
            </tr>
            ${tableRows}
          </table>

          <div class="footer">${t("generatedOn", {
            date: generatedDate,
            time: generatedTime,
          })}</div>
        </div>
      </body>
      </html>
    `;

    const { uri, base64 } = await Print.printToFileAsync({
      html: htmlContent,
      base64: true,
    });



    const cleanOfficerId = (officerId || "all").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanFromDate = (formattedFromDate || "").replace(/[^a-zA-Z0-9_-]/g, "-");
    const cleanToDate = (formattedToDate || "").replace(/[^a-zA-Z0-9_-]/g, "-");

    let fileName = `Report_${cleanOfficerId}_From_${cleanFromDate}_To_${cleanToDate}.pdf`;
    if (isSinhala) {
      fileName = `වාර්තාව_${cleanOfficerId}_${cleanFromDate}_සිට_${cleanToDate}_දක්වා.pdf`;
    } else if (isTamil) {
      fileName = `அறிக்கை_${cleanOfficerId}_${cleanFromDate}_இருந்து_${cleanToDate}_வரை.pdf`;
    }

    const fileUri = `${(FileSystem as any).cacheDirectory}${fileName}`;
    if (base64) {
      try {
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return fileUri;
      } catch (writeErr) {
        console.warn("writeAsStringAsync failed, falling back:", writeErr);
      }
    }

    try {
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });
      return fileUri;
    } catch (copyErr) {
      console.warn("copyAsync failed, returning original print URI:", copyErr);
      return uri;
    }
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return null;
  }
};
