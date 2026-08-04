import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import UploadFile, { UploadFileItem } from "../../../commons/UploadFile";

type ReceivedCashTransferNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReceivedCashTransfer"
>;

type ReceivedCashTransferRouteProp = RouteProp<
  RootStackParamList,
  "ReceivedCashTransfer"
>;

interface ReceivedCashTransferProps {
  navigation: ReceivedCashTransferNavigationProp;
  route: ReceivedCashTransferRouteProp;
}

const COMPANY_BANK_DETAILS = {
  accountName: "Polygon Holdings Pvt Ltd",
  accountNumber: "7010201617​63",
  bankName: "Hatton National Bank",
  branchName: "Colombo Metro",
};

const ReceivedCashTransfer: React.FC<ReceivedCashTransferProps> = ({
  navigation,
  route,
}) => {
  const { totalCash, selectedDate } = route.params;
  const [file, setFile] = useState<UploadFileItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formattedTotal = totalCash.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async () => {
    if (!file) {
      Alert.alert("Required", "Please upload the payment slip before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const formData = new FormData();
      formData.append("totalCash", totalCash.toString());
      formData.append("selectedDate", selectedDate);
      formData.append("accountName", COMPANY_BANK_DETAILS.accountName);
      formData.append("accountNumber", COMPANY_BANK_DETAILS.accountNumber);
      formData.append("bankName", COMPANY_BANK_DETAILS.bankName);
      formData.append("branchName", COMPANY_BANK_DETAILS.branchName);

      if (file) {
        formData.append("paymentSlip", {
          uri: file.uri,
          name: file.name,
          type: "image/jpeg",
        } as any);
      }

      const response = await fetch(
        `${environment.API_BASE_URL}api/pickup/deposit-to-company`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Payment slip submitted successfully.", [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("Main", { screen: "ReceivedCash" }),
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to submit payment slip.");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to submit payment slip. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{
            position: "absolute",
            left: 16,
            backgroundColor: "#F6F6F680",
            borderRadius: 50,
            padding: 12,
            zIndex: 50,
          }}
          onPress={() => navigation.goBack()}
        >
          <Entypo name="chevron-left" size={25} color="#000" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginLeft: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
            Deposit to Company
          </Text>
          <Text style={{ fontSize: 13, color: "#000" }}>
            On <Text style={{ fontWeight: "700" }}>{selectedDate}</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {/* Full Total Box */}
          <View style={{ alignItems: "center", marginBottom: 24 , marginTop: 16}}>
            <View
              style={{
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: "#980775",
                borderRadius: 12,
                backgroundColor: "#fff",
                paddingHorizontal: 24,
                paddingVertical: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontWeight: "500", color: "#000", fontSize: 14 }}>
                  Full Total :{" "}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#980775",
                  }}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  Rs.{formattedTotal}
                </Text>
              </View>
            </View>
          </View>

          {/* Bank Details Card */}
          <View
            style={{
              backgroundColor: "#F4F7FD",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#F4F7FD",
              padding: 16,
              marginBottom: 8,
            }}
          >
            {[
              { label: "Account Name", value: COMPANY_BANK_DETAILS.accountName },
              { label: "Account Number", value: COMPANY_BANK_DETAILS.accountNumber },
              { label: "Bank Name", value: COMPANY_BANK_DETAILS.bankName },
              { label: "Branch Name", value: COMPANY_BANK_DETAILS.branchName },
            ].map((detail, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  marginBottom: index < 3 ? 10 : 0,
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 13,
                    width: 130,
                    flexShrink: 0,
                  }}
                >
                  {detail.label}
                </Text>
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 13,
                    marginRight: 6,
                  }}
                >
                  :
                </Text>
                <Text
                  style={{
                    color: "#111827",
                    fontSize: 13,
                    fontWeight: "500",
                    flex: 1,
                  }}
                >
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Upload File Component */}
          <UploadFile file={file} onFileChange={setFile} maxSizeMB={5} />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: 8,
          backgroundColor: "#fff",
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? "#c4619c" : "#980775",
            borderRadius: 50,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : null}
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {submitting ? "Submitting..." : "Submit Payment Slip"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReceivedCashTransfer;
