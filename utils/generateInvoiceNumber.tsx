import store from "@/services/reducxStore";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "../environment/environment";

const generateInvoiceNumber = async (): Promise<string | null> => {
  try {
    // Retrieve empId from AsyncStorage
    const empId = store.getState().auth.empId;

    if (!empId) {
      console.error("Error: Employee ID not found in AsyncStorage");
      return null;
    }

    // Get the current date in the format YYYYMMDD
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, "0"); 
    const day = String(now.getDate()).padStart(2, "0"); 
    const currentDate = `${year}${month}${day}`;

    console.log("Employee ID:", empId);

    // Get the latest invoice number for the current date from the API
    const response = await axios.get(
      `${environment.API_BASE_URL}api/unregisteredfarmercrop/invoice/latest/${empId}/${currentDate}`,
    );

    let invoiceNumber = `${empId}${currentDate}00001`; 

    console.log("Response in invoice:", response.data);

    // If the backend provides an invoice number, use that without modifying it
    if (response.data && response.data.invoiceNumber) {
      invoiceNumber = response.data.invoiceNumber; 
    }

    console.log("Generated Invoice Number:", invoiceNumber);

    return invoiceNumber;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    return null;
  }
};

export default generateInvoiceNumber;
