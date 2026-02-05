// ReportPDFGenerator.ts
import * as Print from 'expo-print';
//import * as FileSystem from 'expo-file-system';
import * as FileSystem from "expo-file-system/legacy";
import axios from 'axios';
import {environment }from '@/environment/environment';


const normalizeResponseDate = (dateString: string): string => {
  const [month, day, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

interface PaymentDataItem {
  date: string;
  TCount: number;
  total: number;
  invNo: string;
  sheduleDate:string;
  sheduleTime:string;
}


// sending the correct date form to the backend
const normalizeDate = (dateString: string): string => {

  return dateString.replace(/\//g, '-');
};

const validateAndFormatDate = (dateString: string): string | null => {
  const normalizedDate = normalizeDate(dateString);
  const date = new Date(normalizedDate);
  if (isNaN(date.getTime())) {
    console.error(`Invalid date: ${dateString}`);
    return null;
  }
  return date.toISOString().split('T')[0]; 
};



const reportCounters: { [key: string]: number } = {}; 

const generateReportId = (officerId: string): string => {
  
  if (!reportCounters[officerId]) {
    reportCounters[officerId] = 1;
  } else {
    reportCounters[officerId] += 1; 
  }


  const paddedCount = reportCounters[officerId].toString().padStart(3, '0'); // Pads the count to 3 digits
  return `${officerId}M${paddedCount}`;
};

export const handleGeneratePDF = async (
  fromDate: string,
  toDate: string,
  officerId: string,
  collectionOfficerId: number
) => {
  try {
    const formattedFromDate = validateAndFormatDate(fromDate);
    const formattedToDate = validateAndFormatDate(toDate);
    
    if (!formattedFromDate || !formattedToDate) {
      console.error('Invalid date input. Unable to generate PDF.');
      return null;
    }

  
    const reportId = generateReportId(officerId);

  
    const officerResponse = await axios.get(`${environment.API_BASE_URL}api/distribution-manager/employee/${officerId}`);
    if (officerResponse.data.status !== 'success') {
      console.error('Failed to fetch officer details:', officerResponse.data.message);
      return null;
    }
    const { firstName, lastName, jobRole } = officerResponse.data.data;

   
    const farmerPaymentsResponse = await axios.get(
      `${environment.API_BASE_URL}api/distribution-manager/distributionOfficer-payments-summary`, {
        params: { collectionOfficerId, fromDate: formattedFromDate, toDate: formattedToDate },
        
      }
      
    );



    if (farmerPaymentsResponse.data.status !== 'success') {
      console.error('Failed to fetch farmer payments summary:', farmerPaymentsResponse.data.message);
      return null;
    }

    const paymentData: PaymentDataItem[] = farmerPaymentsResponse.data.data;

   // console.log("kkkkkkkkkkkkkkkkkkkkkkk",paymentData)

     const totalorders = paymentData.length


    const formattedData = paymentData.map((item: PaymentDataItem) => ({
      ...item,
      date: normalizeResponseDate(item.date),
      
    }));

   // console.log('Formatted Payment Data:', formattedData);




   const tableRows = formattedData.length
   ? formattedData.map(
       item =>
         `<tr><td> ${item.invNo}</td><td>${item.date}</td><td>${item.sheduleDate} ${item.sheduleTime}</td></tr>`
     ).join('')
   : `<tr><td colspan="3" style="text-align: center; font-style: italic;">No transactions occurred between ${fromDate} and ${toDate}</td></tr>`;

  const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Collection Officer Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
          }
          .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 2px solid #ddd;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
          }
          h1 {
            text-align: center;
            margin-bottom: 10px;
          }
          .header {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            margin-top: 20px;
          }
          .header-item {
            width: 48%;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
          }
          .header-item span {
            display: inline-block;
            width: 48%;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
             page-break-inside: avoid;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }
          table th {
            background-color: #e0dbd4;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            
            font-size: 12px;
            
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Distribution Officer Report</h1>
          
          <div class="header">
            <div class="header-item"><span>From</span><span>${fromDate}</span></div>
            <div class="header-item"><span>To</span><span>${toDate}</span></div>
            <div class="header-item"><span>EMP ID</span><span>${officerId}</span></div>
             <div class="header-item"><span>Role</span><span>${jobRole}</span></div>
            <div class="header-item"><span>First Name</span><span>${firstName}</span></div>
            <div class="header-item"><span>Last Name</span><span>${lastName}</span></div>
            <div class="header-item"><span>All Orders</span><span>${totalorders}</span></div>
       
          </div>

          <table>
          <tr><th>Order ID</th><th>Completed Time</th><th>Order Scheduled To</th></tr>
          ${tableRows}
          </table>

           <div class="footer">This report is generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        </div>
      </body>
      </html>
    `;
 // Generate PDF
 const { uri } = await Print.printToFileAsync({
  html: htmlContent,
  base64: false,
});

// Move the file to app document directory for easier access
const fileUri = `${(FileSystem as any).documentDirectory}report_${officerId}.pdf`;
await FileSystem.moveAsync({
  from: uri,
  to: fileUri,
});

console.log('PDF generated at:', fileUri);
return fileUri;
} catch (error) {
console.error('Failed to generate PDF:', error);
return null;
}
};
