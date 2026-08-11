import store from "@/services/reducxStore";
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
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import UploadFile, { UploadFileItem } from "@/component/components/file-management/UploadFile";
import { useTranslation } from "react-i18next";
import axios from "axios";

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
  const { t } = useTranslation();
  const { totalCash, selectedDate, pickupOrderIds } = route.params;

  const [file, setFile] = useState<UploadFileItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitDisabled = !file || submitting;

  const handleSubmit = async () => {
    if (!file) {
      Alert.alert(
        t("ReceivedCashTransfer.Error"),
        t("ReceivedCashTransfer.Please upload the transfer slip"),
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = store.getState().auth.token;

      if (!token) {
        Alert.alert(
          t("ReceivedCashTransfer.Error"),
          t("ReceivedCashTransfer.Authentication token not found"),
        );
        return;
      }

      const validIds = (pickupOrderIds || []).filter(
        (id) => id !== undefined && id !== null,
      );

      const formData = new FormData();
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileMime =
        file.type === "pdf"
          ? "application/pdf"
          : `image/${fileExt === "png" ? "png" : "jpeg"}`;

      formData.append("slip", {
        uri: file.uri,
        name: file.name,
        type: fileMime,
      } as any);
      formData.append("pickupOrderIds", JSON.stringify(validIds));

      const response = await axios.post(
        `${environment.API_BASE_URL}api/pickup/deposit-cash`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.status === "success") {
        Alert.alert(
          t("ReceivedCashTransfer.Success"),
          t("ReceivedCashTransfer.Deposit submitted for review"),
          [
            {
              text: t("ReceivedCashTransfer.OK"),
              onPress: () =>
                navigation.navigate("Main", {
                  screen: "DistridutionaDashboard",
                }),
            },
          ],
        );
      } else {
        Alert.alert(
          t("ReceivedCashTransfer.Error"),
          response.data.message ||
            t("ReceivedCashTransfer.Failed to submit deposit"),
        );
      }
    } catch (error: any) {
      console.error("Error submitting deposit:", error);
      Alert.alert(
        t("ReceivedCashTransfer.Error"),
        error.response?.data?.message ||
          t("ReceivedCashTransfer.Failed to submit deposit"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 flex-row items-center">
        <TouchableOpacity
          className="absolute left-4 bg-[#F6F6F680] rounded-full p-3 z-50"
          onPress={() => navigation.goBack()}
        >
          <Entypo name="chevron-left" size={25} color="#000" />
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center ml-2">
          <Text className="text-lg font-semibold text-gray-900">
            {t("ReceivedCashTransfer.Transfer to Company")}
          </Text>
          <Text className="text-sm text-black">
            {t("ReceivedCashTransfer.On")}{" "}
            <Text className="font-bold">{selectedDate}</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 w-full max-w-[500px] mx-auto"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Cash Summary */}
        <View className="mt-4 items-center">
          <View
            style={{
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: "#980775",
              borderRadius: 12,
              backgroundColor: "white",
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <View className="flex-row items-center justify-center flex-wrap">
              <Text className="font-medium text-black" numberOfLines={1}>
                {t("ReceivedCashTransfer.Full Total")} :{" "}
              </Text>
              <Text
                className="text-xl font-bold text-[#980775]"
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.6}
              >
                {t("ReceivedCashTransfer.Rs")}
                {totalCash.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Order count info */}
        <Text className="mt-3 text-center text-sm text-[#848484]">
          {t("ReceivedCashTransfer.Orders included")}:{" "}
          {(pickupOrderIds || []).filter((id) => id).length}
        </Text>

        {/* Company Bank Details Card */}
        <View className="mt-5 rounded-2xl bg-[#F5F7FA] border border-[#E3E7ED] px-4 py-4">
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-[#848484]">
              {t("ReceivedCashTransfer.Account Name")}
            </Text>
            <Text className="text-sm font-semibold text-gray-900">
              {COMPANY_BANK_DETAILS.accountName}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-[#848484]">
              {t("ReceivedCashTransfer.Account Number")}
            </Text>
            <Text className="text-sm font-semibold text-gray-900">
              {COMPANY_BANK_DETAILS.accountNumber}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-[#848484]">
              {t("ReceivedCashTransfer.Bank Name")}
            </Text>
            <Text className="text-sm font-semibold text-gray-900">
              {COMPANY_BANK_DETAILS.bankName}
            </Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-[#848484]">
              {t("ReceivedCashTransfer.Branch Name")}
            </Text>
            <Text className="text-sm font-semibold text-gray-900">
              {COMPANY_BANK_DETAILS.branchName}
            </Text>
          </View>
        </View>

        {/* Slip Upload */}
        <UploadFile file={file} onFileChange={setFile} maxSizeMB={5} />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          activeOpacity={0.85}
          style={{
            backgroundColor: isSubmitDisabled ? "#D1B8CB" : "#980775",
            borderRadius: 50,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
            >
              {t("ReceivedCashTransfer.Submit Payment Slip")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ReceivedCashTransfer;
