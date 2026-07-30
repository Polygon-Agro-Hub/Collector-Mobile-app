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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import UploadFile, { UploadFileItem } from "@/component/commons/UploadFile";
import { AlertModal } from "@/component/commons/AlertModal";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";

export default function PurchaseProduct({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { product } = route.params || {};
  const productName = product?.name || "Batana";
  const defaultKg = product?.kg !== undefined ? product.kg : 20;
  const assignedQty = product?.assignedQty !== undefined ? product.assignedQty : defaultKg;
  const gradeAPrice = product?.gradeAPrice || 200;
  const ceilingPercent = product?.ceilingPercent || 15;
  const ceilingPrice =
    product?.ceilingPrice ||
    gradeAPrice + gradeAPrice * (ceilingPercent / 100);
  const srtAssignId = product?.srtAssignId;
  const productImage =
    product?.image ||
    "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=200&auto=format&fit=crop&q=80";

  // Flow State
  const [step, setStep] = useState<1 | 2>(1);

  // Hide Bottom Navigation Bar on Mount & Handle Hardware Back Press
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

  useEffect(() => {
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
      onBackPress
    );
    return () => backHandler.remove();
  }, [step, navigation]);

  // Form State
  const [buyingQty, setBuyingQty] = useState<string>(String(defaultKg));
  const [purchasingPrice, setPurchasingPrice] = useState<string>("");
  const [priceError, setPriceError] = useState<string>("");

  // Step 2 State
  const [uploadedFile, setUploadedFile] = useState<UploadFileItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      setStep(1);
      setPurchasingPrice("");
      setPriceError("");
      setUploadedFile(null);
      if (product?.kg !== undefined) {
        setBuyingQty(String(product.kg));
      }
    }, [product])
  );

  // Validate Step 1 Purchase
  const handlePurchaseSubmit = () => {
    const qtyNum = parseFloat(buyingQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setPriceError("Please enter a valid quantity in kg.");
      return;
    }

    if (qtyNum > defaultKg) {
      setPriceError(`Quantity cannot exceed remaining shortage of ${defaultKg} kg.`);
      return;
    }

    if (!purchasingPrice.trim()) {
      setPriceError("Purchasing Price per kg is required.");
      return;
    }

    const priceNum = parseFloat(purchasingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError("Please enter a valid price per kg.");
      return;
    }

    // Dynamic Maximum ceiling price limit check
    if (priceNum > ceilingPrice) {
      setPriceError(`Price cannot exceed Rs. ${ceilingPrice.toFixed(2)}`);
      return;
    }

    setPriceError("");
    setStep(2);
  };

  const handleConfirmOrder = async () => {
    if (!uploadedFile) {
      Alert.alert(
        "Invoice Required",
        "Please upload the invoice photo before confirming."
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${environment.API_BASE_URL}api/purchase-shortage/submit`,
        {
          srtAssignId: srtAssignId || 1,
          prchQty: parseFloat(buyingQty),
          prchPrice: parseFloat(purchasingPrice),
          slip: uploadedFile.base64 || uploadedFile.uri,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      setSuccessModalVisible(true);
    } catch (err: any) {
      console.error("Error submitting purchase:", err);
      Alert.alert(
        "Submission Error",
        err.response?.data?.message || "Failed to submit purchase. Please try again."
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

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title=""
        subtitle={
          <View className="flex-row items-center justify-center gap-2 w-36">
            <View
              className={`h-1.5 flex-1 rounded-full ${
                step === 1 ? "bg-[#030E25]" : "bg-[#E1E7EE]"
              }`}
            />
            <View
              className={`h-1.5 flex-1 rounded-full ${
                step === 2 ? "bg-[#030E25]" : "bg-[#E1E7EE]"
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
      >
        {/* Product Overview Header */}
        <View className="items-center mb-6">
          <Image
            source={{ uri: productImage }}
            className="w-28 h-28 rounded-2xl mb-3"
            resizeMode="cover"
          />
          <Text className="text-xl font-black text-[#030E25]">{productName}</Text>
          <Text className="text-sm font-bold text-[#54617D] mt-1">
            {step === 1 ? "Collect : " : "Collected : "}
            <Text className="text-[#980775] font-extrabold">
              {assignedQty} kg
            </Text>
          </Text>
          <Text className="text-xs font-semibold text-[#54617D] mt-0.5">
            Price per kg :{" "}
            <Text style={{ color: "#AC7F5E" }} className="font-bold">
              Rs. {gradeAPrice.toFixed(2)}
            </Text>
          </Text>
        </View>

        {step === 1 ? (
          /* STEP 1: Purchase Details Form */
          <View className="gap-5">
            {/* Buying Quantity in kg */}
            <View>
              <Text className="text-xs font-bold text-[#030E25] mb-2">
                Buying Quantity in kg
              </Text>
              <TextInput
                value={buyingQty}
                onChangeText={setBuyingQty}
                keyboardType="numeric"
                className="bg-[#F0F3F6] rounded-full px-5 h-[50px] text-base font-bold text-[#030E25]"
              />
            </View>

            {/* Purchasing Price per kg (Rs.) */}
            <View>
              <Text className="text-xs font-bold text-[#030E25] mb-2">
                Purchasing Price per kg (Rs.)
              </Text>
              <TextInput
                value={purchasingPrice}
                onChangeText={(text) => {
                  setPurchasingPrice(text);
                  if (!text.trim()) {
                    setPriceError("");
                    return;
                  }
                  const priceNum = parseFloat(text);
                  if (isNaN(priceNum) || priceNum <= 0) {
                    setPriceError("");
                    return;
                  }
                  if (priceNum > ceilingPrice) {
                    setPriceError(
                      `Price cannot exceed Rs. ${ceilingPrice.toFixed(2)}`
                    );
                    return;
                  }
                  setPriceError("");
                }}
                keyboardType="numeric"
                placeholder="--Enter Purchasing Price per kg--"
                placeholderTextColor="#9EA5B4"
                className={`rounded-full px-5 h-[50px] text-sm font-semibold text-[#030E25] ${
                  priceError ? "border border-red-500 bg-[#E9ECF1]" : "bg-[#F0F3F6]"
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
          /* STEP 2: Upload Invoice Photo */
          <View className="mt-2">
            <Text className="text-sm font-extrabold text-[#030E25] mb-2 text-center">
              Upload Invoice Photo
            </Text>

            <UploadFile
              file={uploadedFile}
              onFileChange={setUploadedFile}
              maxSizeMB={5}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Buttons */}
      <View className="px-6 pt-3 pb-8 bg-white gap-3">
        {step === 1 ? (
          <>
            <TouchableOpacity
              onPress={handleBack}
              className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-[#030E25] font-extrabold text-sm">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePurchaseSubmit}
              className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-md"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-sm">Purchase</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setStep(1)}
              disabled={submitting}
              className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-[#030E25] font-extrabold text-sm">Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmOrder}
              disabled={submitting}
              className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-md flex-row"
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
              ) : null}
              <Text className="text-white font-extrabold text-sm">
                {submitting ? "Submitting..." : "Confirm"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {/* Success Popup Modal with successful.json animation */}
      <AlertModal
        visible={successModalVisible}
        title="Purchase Confirmed"
        message={`Successfully recorded purchase for ${productName}!`}
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
