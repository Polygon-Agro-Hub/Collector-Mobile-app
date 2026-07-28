import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Modal,
} from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import CustomHeader from "@/component/navigations/CustomHeader";

export default function PurchaseProduct({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { product } = route.params || {};
  const productName = product?.name || "Batana";
  const defaultKg = product?.kg || 20;
  const productImage =
    product?.image ||
    "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=200&auto=format&fit=crop&q=80";

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

  // Flow State
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [buyingQty, setBuyingQty] = useState<string>(String(defaultKg));
  const [purchasingPrice, setPurchasingPrice] = useState<string>("");
  const [priceError, setPriceError] = useState<string>("");

  // Step 2 State
  const [uploadedFile, setUploadedFile] = useState<{
    uri: string;
    name: string;
    size: string;
  } | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);

  // Validate Step 1 Purchase
  const handlePurchaseSubmit = () => {
    if (!purchasingPrice.trim()) {
      setPriceError("Purchasing Price per kg is required.");
      return;
    }

    const priceNum = parseFloat(purchasingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError("Please enter a valid price per kg.");
      return;
    }

    // Maximum price limit check (Rs. 320.00)
    if (priceNum > 320) {
      setPriceError("Price cannot exceed Rs. 320.00");
      return;
    }

    setPriceError("");
    setStep(2);
  };

  // Image Picker for Invoice Upload
  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access gallery is required to upload invoice photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadedFile({
          uri: asset.uri,
          name: asset.fileName || "Transfer_Slip_21652024.png",
          size: "1.2 MB",
        });
      }
    } catch (err) {
      setUploadedFile({
        uri: productImage,
        name: "Transfer_Slip_21652024.png",
        size: "1.2 MB",
      });
    }
  };

  const handleConfirmOrder = () => {
    if (!uploadedFile) {
      Alert.alert(
        "Invoice Required",
        "Please upload the invoice photo before confirming."
      );
      return;
    }

    Alert.alert(
      "Purchase Confirmed",
      `Successfully recorded purchase for ${productName}!`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
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

        {/* Product Overview Header (Bigger Image) */}
        <View className="items-center mb-6">
          <Image
            source={{ uri: productImage }}
            className="w-28 h-28 rounded-2xl mb-3 bg-gray-100"
            resizeMode="cover"
          />
          <Text className="text-xl font-black text-[#030E25]">{productName}</Text>
          <Text className="text-sm font-bold text-[#54617D] mt-1">
            {step === 1 ? "Collect : " : "Collected : "}
            <Text className="text-[#980775] font-extrabold">
              {buyingQty || defaultKg} kg
            </Text>
          </Text>
          <Text className="text-xs font-semibold text-[#54617D] mt-0.5">
            Price per kg :{" "}
            <Text className="font-bold text-[#54617D]">
              Rs. {purchasingPrice ? parseFloat(purchasingPrice).toFixed(2) : "300.00"}
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
                  if (priceError) setPriceError("");
                }}
                keyboardType="numeric"
                placeholder="--Enter Purchasing Price per kg--"
                placeholderTextColor="#9EA5B4"
                className={`bg-[#F0F3F6] rounded-full px-5 h-[50px] text-sm font-semibold text-[#030E25] ${
                  priceError ? "border border-red-500 bg-red-50/20" : ""
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
            <Text className="text-sm font-extrabold text-[#030E25] mb-4 text-center">
              Upload Invoice Photo
            </Text>

            {!uploadedFile ? (
              /* Dotted Upload Box (Background set to White) */
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.8}
                className="border-2 border-dashed border-[#4D82F3] rounded-3xl p-8 items-center bg-white justify-center"
              >
                <View className="w-12 h-12 rounded-full bg-[#EBF2FF] justify-center items-center mb-3">
                  <MaterialIcons name="cloud-upload" size={24} color="#1861F4" />
                </View>
                <Text className="font-extrabold text-[#030E25] text-base mb-1">
                  Tap to Upload
                </Text>
                <Text className="text-xs font-semibold text-[#676771]">
                  JPG, PNG up to 5MB
                </Text>
              </TouchableOpacity>
            ) : (
              /* Uploaded File Preview Box (Bigger Preview Image) */
              <View className="border-2 border-dashed border-[#4D82F3] rounded-3xl p-5 bg-white">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="checkmark-circle" size={18} color="#980775" />
                  <Text className="text-xs font-bold text-[#980775] ml-1.5">
                    File Uploaded
                  </Text>
                </View>

                <View className="flex-col items-center bg-white p-4 rounded-2xl border border-gray-200 mb-4 shadow-sm relative">
                  <TouchableOpacity
                    onPress={() => setUploadedFile(null)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 z-10"
                  >
                    <Feather name="x" size={16} color="#676771" />
                  </TouchableOpacity>

                  {/* Bigger Image Preview */}
                  <Image
                    source={{ uri: uploadedFile.uri }}
                    className="w-32 h-32 rounded-2xl mb-3 bg-gray-100"
                    resizeMode="cover"
                  />

                  <Text
                    numberOfLines={1}
                    className="font-bold text-sm text-[#030E25] text-center mb-0.5"
                  >
                    {uploadedFile.name}
                  </Text>
                  <Text className="text-xs text-gray-400 font-medium mb-3">
                    {uploadedFile.size}
                  </Text>

                  {/* Preview Full Image Button */}
                  <TouchableOpacity
                    onPress={() => setPreviewModalVisible(true)}
                    className="w-full py-2.5 bg-white border border-[#030E25] rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                  >
                    <Feather name="eye" size={16} color="#030E25" />
                    <Text className="font-extrabold text-xs text-[#030E25] ml-2">
                      Preview Full Image
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Buttons */}
      <View className="px-6 pt-3 pb-8 bg-white gap-3 border-t border-gray-100">
        {step === 1 ? (
          <>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
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
              className="w-full h-[50px] bg-[#E9ECF1] rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-[#030E25] font-extrabold text-sm">Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmOrder}
              className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-md"
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-sm">Confirm</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modal for Previewing Full Image */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center px-4">
          <TouchableOpacity
            onPress={() => setPreviewModalVisible(false)}
            className="absolute top-12 right-6 p-2 rounded-full bg-white/20 z-10"
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>

          {uploadedFile && (
            <Image
              source={{ uri: uploadedFile.uri }}
              className="w-full h-[70%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
