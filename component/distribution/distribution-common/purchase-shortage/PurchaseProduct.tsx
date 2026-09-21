import store from "@/services/reducxStore";
import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import UploadFile, {
  UploadFileItem,
  convertUriToBase64,
} from "@/component/components/file-management/UploadFile";
import { AlertModal } from "@/component/components/popup/AlertModal";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import environment from "@/environment/environment";

const formatKg = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return "0";
  const rounded = Math.round(num * 1000) / 1000;
  return String(rounded);
};

const formatPriceWithCommas = (
  val: number | string | undefined | null,
): string => {
  if (val === undefined || val === null || val === "") return "";
  const rawStr = String(val).replace(/,/g, "").trim();
  if (!rawStr) return "";
  const parts = rawStr.split(".");
  const intNum = parseInt(parts[0] || "0", 10);
  if (isNaN(intNum)) return "";
  const formattedInt = intNum.toLocaleString("en-US");
  if (parts.length > 1) {
    return `${formattedInt}.${parts[1].slice(0, 2)}`;
  }
  return formattedInt;
};

const sanitizeDecimalInput = (text: string): string => {
  if (!text) return "";
  let raw = text.replace(/,/g, "");
  // Remove negative signs, special characters, keeping only digits and dot
  let sanitized = raw.replace(/[^0-9.]/g, "");
  // Block multiple decimal points
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }
  // Maximum 2 decimal places
  const subParts = sanitized.split(".");
  if (subParts.length >= 2) {
    sanitized = `${subParts[0]}.${subParts[1].slice(0, 2)}`;
  }
  return sanitized;
};

export default function PurchaseProduct({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { product } = route.params || {};
  const productName = product?.name || "Batana";
  const defaultKg = product?.kg !== undefined ? product.kg : 20;
  const assignedQty =
    product?.assignedQty !== undefined ? product.assignedQty : defaultKg;
  const gradeAPrice = product?.gradeAPrice || 200;
  const ceilingPercent = product?.ceilingPercent || 15;
  const ceilingPrice =
    product?.ceilingPrice || gradeAPrice + gradeAPrice * (ceilingPercent / 100);
  const srtAssignId = product?.srtAssignId;
  const productImage = product?.image || "";

  // Flow State
  const [step, setStep] = useState<1 | 2>(1);

  // Hide Bottom Navigation Bar on Mount
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  // Handle Hardware Back Press using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (step === 2) {
          setStep(1);
          return true;
        }
        navigation.navigate("PurchaseShortage");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [step, navigation]),
  );

  // Form State
  const [buyingQty, setBuyingQty] = useState<string>(formatKg(defaultKg));
  const [purchasingPrice, setPurchasingPrice] = useState<string>("");
  const [qtyError, setQtyError] = useState<string>("");
  const [priceError, setPriceError] = useState<string>("");

  // Step 2 State
  const [uploadedFile, setUploadedFile] = useState<UploadFileItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successModalVisible, setSuccessModalVisible] =
    useState<boolean>(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStep(1);
      setBuyingQty(formatKg(defaultKg));
      setPurchasingPrice("");
      setQtyError("");
      setPriceError("");
      setUploadedFile(null);
    }, [product, defaultKg]),
  );

  // Validate Step 1 Purchase
  const handlePurchaseSubmit = () => {
    let hasError = false;
    setQtyError("");
    setPriceError("");

    const qtyNum = parseFloat(buyingQty);
    if (!buyingQty.trim() || isNaN(qtyNum) || qtyNum <= 0) {
      setQtyError(t("PurchaseShortage.Please enter a valid quantity in kg.", "Please enter a valid quantity in kg."));
      hasError = true;
    } else if (qtyNum > defaultKg) {
      setQtyError(
        t("PurchaseShortage.Quantity cannot exceed remaining shortage", {
          kg: formatKg(defaultKg),
          defaultValue: `Quantity cannot exceed remaining shortage of ${formatKg(defaultKg)} kg.`,
        }),
      );
      hasError = true;
    }

    const priceNum = parseFloat(purchasingPrice.replace(/,/g, ""));
    if (!purchasingPrice.trim() || isNaN(priceNum) || priceNum <= 0) {
      setPriceError(t("PurchaseShortage.Please enter a valid price per kg.", "Please enter a valid price per kg."));
      hasError = true;
    } else if (priceNum > ceilingPrice) {
      setPriceError(
        t("PurchaseShortage.Price cannot exceed ceiling", {
          price: formatPriceDisplay(ceilingPrice),
          defaultValue: `Price cannot exceed Rs. ${formatPriceDisplay(ceilingPrice)}`,
        }),
      );
      hasError = true;
    }

    if (!hasError) {
      setStep(2);
    }
  };

  const handleConfirmOrder = async () => {
    if (!uploadedFile) {
      Alert.alert(
        t("PurchaseShortage.Invoice Required", "Invoice Required"),
        t("PurchaseShortage.Please upload invoice before confirming", "Please upload the invoice file before confirming."),
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = store.getState().auth.token;

      const isPdf =
        uploadedFile.type === "pdf" ||
        uploadedFile.name?.toLowerCase().endsWith(".pdf");

      // Determine the correct extension and MIME type
      const fileMime = isPdf ? "application/pdf" : (() => {
        const ext = uploadedFile.name?.split(".").pop()?.toLowerCase();
        if (ext === "png") return "image/png";
        if (ext === "webp") return "image/webp";
        if (ext === "heic") return "image/heic";
        if (ext === "heif") return "image/heif";
        return "image/jpeg";
      })();

      // Build correct file name with proper extension (critical for multer fileFilter)
      const correctExt = isPdf ? "pdf"
        : fileMime === "image/png" ? "png"
        : fileMime === "image/webp" ? "webp"
        : fileMime === "image/heic" ? "heic"
        : fileMime === "image/heif" ? "heif"
        : "jpg";

      const baseName = (uploadedFile.name || `Transfer_Slip_${Date.now()}`)
        .replace(/\.[^/.]+$/, ""); // strip existing extension
      const safeFileName = `${baseName}.${correctExt}`;

      const formData = new FormData();
      formData.append("srtAssignId", String(srtAssignId || 1));
      formData.append("prchQty", String(parseFloat(buyingQty)));
      formData.append("prchPrice", String(parseFloat(purchasingPrice.replace(/,/g, ""))));
      formData.append("reqStatus", "Pending");

      formData.append("slip", {
        uri: uploadedFile.uri,
        name: safeFileName,
        type: fileMime,
      } as any);

      await axios.post(
        `${environment.API_BASE_URL}api/purchase-shortage/submit`,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setSuccessModalVisible(true);
    } catch (err: any) {
      console.error("Error submitting purchase:", err);
      Alert.alert(
        "Submission Error",
        err.response?.data?.message ||
        "Failed to submit purchase. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.navigate("PurchaseShortage");
    }
  };

  const formatPriceDisplay = (
    val: number | string | undefined | null,
  ): string => {
    if (val === undefined || val === null || val === "") return "0.00";
    const rawStr = String(val).replace(/,/g, "").trim();
    if (!rawStr) return "0.00";
    const num = parseFloat(rawStr);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title=""
        subtitle={
          <View className="flex-row items-center justify-center gap-2 w-36">
            <View
              className={`h-1.5 flex-1 rounded-full ${step === 1 ? "bg-[#030E25]" : "bg-[#E1E7EE]"
                }`}
            />
            <View
              className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-[#030E25]" : "bg-[#E1E7EE]"
                }`}
            />
          </View>
        }
        navigation={navigation}
        onBackPress={handleBack}
      />

      <ScrollView
        className="flex-1 bg-white px-6 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingBottom: Math.max(insets.bottom + 16, 24),
        }}
      >
          <View>
            {/* Product Overview Header */}
            <View className="items-center mb-6">
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  className="w-28 h-28 rounded-2xl mb-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-28 h-28 rounded-2xl bg-gray-100 items-center justify-center mb-3">
                  <MaterialCommunityIcons name="sprout" size={48} color="#54617D" />
                </View>
              )}
              <Text className="text-xl font-black text-[#030E25]">
                {productName}
              </Text>
              <Text className="text-md text-[#54617D] mt-1">
                {step === 1 ? t("PurchaseProduct.Collect", "Collect :") : t("PurchaseShortage.Collected", "Collected : ")}
                <Text className="text-[#980775] font-extrabold">
                  {step === 1
                    ? `${formatKg(defaultKg)} ${t("PurchaseShortage.kg", "kg")}`
                    : `${formatKg(buyingQty)} ${t("PurchaseShortage.kg", "kg")}`}
                </Text>
              </Text>
              <Text className="text-md text-[#54617D] mt-0.5">
                {t("PurchaseShortage.Price per kg", "Price per kg : ")}
                <Text style={{ color: "#AC7F5E" }} className="font-bold">
                  {t("PurchaseShortage.Rs. ", "Rs. ")}
                  {step === 1
                    ? formatPriceDisplay(gradeAPrice)
                    : formatPriceDisplay(purchasingPrice)}
                </Text>
              </Text>
            </View>

            {step === 1 ? (
              /* STEP 1: Purchase Details Form */
              <View className="gap-5">
                {/* Buying Quantity in kg */}
                <View>
                  <Text className="text-sm font-bold text-[#030E25] mb-2">
                    {t("PurchaseShortage.Buying Quantity in kg", "Buying Quantity in kg")}
                  </Text>
                  <TextInput
                    value={buyingQty}
                    onChangeText={(text) => {
                      const sanitized = sanitizeDecimalInput(text);
                      setBuyingQty(sanitized);
                      if (qtyError) setQtyError("");
                    }}
                    keyboardType="decimal-pad"
                    placeholder={t("PurchaseShortage.Enter Buying Quantity placeholder", "--Enter Buying Quantity in kg--")}
                    placeholderTextColor="#576879"
                    style={{
                      fontStyle: buyingQty ? "normal" : "italic",
                      color: buyingQty ? "#000000" : "#576879",
                    }}
                    className={`rounded-full px-5 h-[50px] text-sm font-semibold ${qtyError
                      ? "border border-red-500 bg-[#E9ECF1]"
                      : "bg-[#F0F3F6]"
                      }`}
                  />
                  {qtyError ? (
                    <View className="flex-row items-center mt-2 pl-2">
                      <Ionicons name="warning" size={14} color="#EF4444" />
                      <Text className="text-xs font-bold text-red-500 ml-1">
                        {qtyError}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Purchasing Price per kg (Rs.) */}
                <View>
                  <Text className="text-sm font-bold text-[#030E25] mb-2">
                    {t("PurchaseShortage.Purchasing Price (Rs.)", "Purchasing Price per kg (Rs.)")}
                  </Text>
                  <TextInput
                    value={purchasingPrice}
                    onChangeText={(text) => {
                      const sanitized = sanitizeDecimalInput(text);
                      const formatted = formatPriceWithCommas(sanitized);
                      setPurchasingPrice(formatted);
                      if (priceError) setPriceError("");
                    }}
                    keyboardType="decimal-pad"
                    placeholder={t("PurchaseShortage.Enter Purchasing Price placeholder", "--Enter Purchasing Price per kg--")}
                    placeholderTextColor="#576879"
                    style={{
                      fontStyle: purchasingPrice ? "normal" : "italic",
                      color: purchasingPrice ? "#000000" : "#576879",
                    }}
                    className={`rounded-full px-5 h-[50px] text-sm font-semibold ${priceError
                      ? "border border-red-500 bg-[#E9ECF1]"
                      : "bg-[#F0F3F6]"
                      }`}
                  />
                  {priceError ? (
                    <View className="flex-row items-center mt-2 pl-2">
                      <Ionicons name="warning" size={14} color="#EF4444" />
                      <Text className="text-xs font-bold text-red-500 ml-1">
                        {priceError}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              /* STEP 2: Upload Invoice File */
              <View className="mt-2">
                <Text className="text-sm font-extrabold text-[#030E25] mb-2 text-center">
                  {t("PurchaseShortage.Upload Invoice", "Upload Invoice File")}
                </Text>

                <UploadFile
                  file={uploadedFile}
                  onFileChange={setUploadedFile}
                  maxSizeMB={5}
                />
              </View>
            )}
          </View>

          {/* Action Buttons Section inside ScrollView (Hidden when keyboard is open) */}
          {!isKeyboardVisible && (
            <View className="pt-6 pb-2">
              {step === 1 ? (
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={handleBack}
                    className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center"
                    activeOpacity={0.8}
                    style={{
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.12,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text
                      className="text-[#030E25] text-center font-extrabold text-sm"
                      style={{
                        color: "#030E25",
                        fontSize: 14,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {t("Packing.Cancel", "Cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePurchaseSubmit}
                    className="w-full h-[50px] bg-black rounded-full items-center justify-center"
                    activeOpacity={0.8}
                    style={{
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text
                      className="text-white text-center font-extrabold text-sm"
                      style={{
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {t("PurchaseShortage.Purchase", "Purchase")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    disabled={submitting}
                    className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center px-4 flex-row"
                    activeOpacity={0.8}
                    style={{
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.12,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text
                      className="text-[#030E25] text-center font-extrabold text-sm"
                      numberOfLines={1}
                      style={{
                        color: "#030E25",
                        fontSize: 14,
                        fontWeight: "800",
                        textAlign: "center",
                        includeFontPadding: false,
                      }}
                    >
                      {t("PurchaseProduct.Go Back", t("Common.Go Back", "Go Back"))}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmOrder}
                    disabled={submitting}
                    className="w-full h-[50px] bg-black rounded-full items-center justify-center flex-row"
                    activeOpacity={0.8}
                    style={{
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator
                        size="small"
                        color="#ffffff"
                        className="mr-2"
                      />
                    ) : null}
                    <Text
                      className="text-white text-center font-extrabold text-sm"
                      style={{
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {submitting
                        ? t("Common.Submitting", "Submitting...")
                        : t("AssignGroups.Confirm", "Confirm")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Success Popup Modal with successful.json animation */}
        <AlertModal
          visible={successModalVisible}
          title={t("PurchaseShortage.Purchase Confirmed", "Purchase Confirmed")}
          message={t(
            "PurchaseShortage.The Product Has Been Purchased Successfully",
            "The Product Has Been Purchased Successfully"
          )}
          type="success"
          autoClose={true}
          duration={3000}
          showOkButton={true}
          onClose={() => {
            setSuccessModalVisible(false);
            navigation.navigate("PurchaseShortage");
          }}
        />
      </View>
  );
}
