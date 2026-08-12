import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { environment } from "@/environment/environment";

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
) => {
  try {
    const formattedFromDate = validateAndFormatDate(fromDate);
    const formattedToDate = validateAndFormatDate(toDate);

    if (!formattedFromDate || !formattedToDate) {
      console.error("Invalid date input. Unable to generate PDF.");
      return null;
    }

    const reportId = generateReportId(officerId);

    const officerResponse = await axios.get(
      `${environment.API_BASE_URL}api/collection-manager/employee/${officerId}`,
    );
    if (officerResponse.data.status !== "success") {
      console.error(
        "Failed to fetch officer details:",
        officerResponse.data.message,
      );
      return null;
    }
    const { firstName, lastName, jobRole } = officerResponse.data.data;

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
                <td>${item.total > 0 ? `${item.total}kg` : "<em>-No Data-</em>"}</td>
                <td>${item.TCount > 0 ? formatCount(item.TCount) : "<em>-No Data-</em>"}</td>
              </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="text-align: center; font-style: italic;">No transactions occurred between ${fromDate} and ${toDate}</td></tr>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Collection Officer Report</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
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
          <h1>Collection Officer Report</h1>

          <table class="header-table">
            <tr>
              <td class="header-label">From</td>
              <td class="header-value">${fromDate}</td>
              <td class="header-label">To</td>
              <td class="header-value">${toDate}</td>
            </tr>
            <tr>
              <td class="header-label">EMP ID</td>
              <td class="header-value">${officerId}</td>
              <td class="header-label">Role</td>
              <td class="header-value">${jobRole}</td>
            </tr>
            <tr>
              <td class="header-label">First Name</td>
              <td class="header-value">${firstName}</td>
              <td class="header-label">Last Name</td>
              <td class="header-value">${lastName}</td>
            </tr>
            <tr>
              <td class="header-label">Weight</td>
              <td class="header-value">${totalWeight}kg</td>
              <td class="header-label">Collections</td>
              <td class="header-value">${totalFarmers}</td>
            </tr>
          </table>

          <table class="data-table">
            <tr>
              <th>Date</th>
              <th>Total Weight</th>
              <th>Total Collections</th>
            </tr>
            ${tableRows}
          </table>

          <div class="footer">This report is generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    const fileUri = `${(FileSystem as any).documentDirectory}Report_${officerId}_From_${formattedFromDate}_To_${formattedToDate}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: fileUri,
    });

    return fileUri;
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return null;
  }
};