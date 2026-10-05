import axios from "axios";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import environment from "@/environment/environment";

export const sendOTP = async (
  formattedPhonenumber: string,
  navigation: any,
) => {
  try {
    const response = await axios.post(
      `${environment.API_BASE_URL}api/farmer/send-otp`,
      {
        phoneNumber: formattedPhonenumber,
      },
    );

    if (response.data?.referenceId) {
      await AsyncStorage.setItem("referenceId", response.data.referenceId);
    }

    // Navigate to the OTPE screen with the mobile number
    navigation.navigate("OTPEOLDUSER", {
      mobileNumber: formattedPhonenumber,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    Alert.alert("Error", "Failed to send OTP. Please try again.");
  }
};
