import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import NetInfo from "@react-native-community/netinfo";
import CustomHeader from "../navigations/CustomHeader";
import LottieView from "lottie-react-native";
import GlobalSearchModal from "../commons/GlobalSearchModal";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReplaceRequestsApprove"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<
  RootStackParamList,
  "ReplaceRequestsApprove"
>;

interface RetailItem {
  id: string;
  displayName: string;
  normalPrice: number;
  discountedPrice?: number;
  unitType: string;
}

interface ReplaceRequestData {
  id: string;
  orderId: string;
  orderPackageId: string;
  productDisplayName: string;
  productTypeName: string;
  originalPrice: string;
  originalQty: string;
  status: string;
  createdAt: string;
  invNo: string;
  productType: string;
  productId: string;
  userId: string;
  packageId?: string;
  productNormalPrice?: string;
  productDiscountedPrice?: string;
  qty: string;
  price: string;
  replaceProductDisplayName: string;
  replaceQty?: string;
  replacePrice?: string;
  replceId?: string;
}

interface ReplaceData {
  orderId: string;
  selectedProduct: string;
  productTypeName: string;
  newProduct: string;
  newProductId: string;
  selectedProductUnitPrice: number;
  quantity: string;
  price: string;
  invNo: string;
  qty: string;
  replaceProductDisplayName: string;
  replaceQty?: string;
  replacePrice?: string;
}

interface CurrentReplaceRequest {
  replceId: string;
  id: string;
  orderPackageId: string;
  productType: string;
  productId: string;
  qty: number;
  price: number;
  status: string;
  userId: string;
  createdAt: string;
  displayName: string;
}

interface OriginalPackageItem {
  id: number;
  productType: number;
  productId: number;
  qty: number;
  price: number;
  isPacked: number;
  orderPackageId: number;
  displayName: string;
  productTypeName: string;
}

const ReplaceRequestsApprove: React.FC<ReplaceRequestsProps> = ({
  route,
  navigation,
}) => {
  const { t } = useTranslation();

  const formatPrice = (amount: number): string =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const [showProductModal, setShowProductModal] = useState(false);
  const [loadingRetailItems, setLoadingRetailItems] = useState(false);
  const [loadingCurrentReplace, setLoadingCurrentReplace] = useState(false);
  const [retailItems, setRetailItems] = useState<RetailItem[]>([]);
    const [currentReplaceRequests, setCurrentReplaceRequests] = useState<
    CurrentReplaceRequest[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [originalItemPrice, setOriginalItemPrice] = useState<number>(0);
  const [originalItemQty, setOriginalItemQty] = useState<number>(0);

  const replaceRequestData = route.params
    ?.replaceRequestData as ReplaceRequestData;

  const [replaceData, setReplaceData] = useState<ReplaceData>({
    orderId: replaceRequestData?.orderId || replaceRequestData?.invNo || "N/A",
    selectedProduct: replaceRequestData?.productDisplayName || "N/A",
    productTypeName: replaceRequestData?.productTypeName || "N/A",
    newProduct: "",
    newProductId: "",
    selectedProductUnitPrice: 0,
    quantity: "",
    price: "Rs. 0.00",
    invNo: replaceRequestData?.invNo || "N/A",
    qty: replaceRequestData?.qty || "N/A",
    replaceProductDisplayName:
      replaceRequestData?.replaceProductDisplayName || "",
    replaceQty: replaceRequestData?.replaceQty,
    replacePrice: replaceRequestData?.replacePrice,
  });

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        navigation.navigate("Main" as any, { screen: "ReplaceRequestsScreen" });
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      const freshData = route.params?.replaceRequestData as ReplaceRequestData;

      if (!freshData) return () => subscription.remove();

      setReplaceData({
        orderId: freshData?.orderId || freshData?.invNo || "N/A",
        selectedProduct: freshData?.productDisplayName || "N/A",
        productTypeName: freshData?.productTypeName || "N/A",
        newProduct: "",
        newProductId: "",
        selectedProductUnitPrice: 0,
        quantity: "",
        price: "Rs. 0.00",
        invNo: freshData?.invNo || "N/A",
        qty: freshData?.qty || "N/A",
        replaceProductDisplayName: freshData?.replaceProductDisplayName || "",
        replaceQty: freshData?.replaceQty,
        replacePrice: freshData?.replacePrice,
      });

      setCurrentReplaceRequests([]);
      setRetailItems([]);
      setOriginalItemPrice(0);
      setOriginalItemQty(0);

      loadOriginalPackageItem(freshData);
      loadCurrentReplaceRequest(freshData);
      loadRetailItems(freshData);

      return () => subscription.remove();
    }, [navigation, route.params]),
  );

  const loadOriginalPackageItem = async (freshData?: ReplaceRequestData) => {
    const data =
      freshData ?? (route.params?.replaceRequestData as ReplaceRequestData);
    try {
      const token = await AsyncStorage.getItem("token");

      if (!data?.replceId) {
        console.warn("replceId is missing from replaceRequestData");
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/order-package-item/${data.replceId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        const item: OriginalPackageItem = response.data.data;
        setOriginalItemPrice(item.price);
        setOriginalItemQty(item.qty);

        setReplaceData((prev) => ({
          ...prev,
          replaceQty: item.qty.toString(),
          replacePrice: item.price.toString(),
        }));
      }
    } catch (error) {
      console.error("Error loading original package item:", error);
    }
  };

  const loadCurrentReplaceRequest = async (freshData?: ReplaceRequestData) => {
    const data =
      freshData ?? (route.params?.replaceRequestData as ReplaceRequestData);
    try {
      setLoadingCurrentReplace(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/ordre-replace/${data.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data.length > 0) {
        setCurrentReplaceRequests(response.data.data);
        const currentRequest = response.data.data[0];

        const rawQty = currentRequest.qty?.toString() || "0";
        const qty = parseFloat(rawQty) > 0 ? parseFloat(rawQty).toString() : "0";
        const qtyNum = parseFloat(qty) || 0;
        const totalPrice = parseFloat(currentRequest.price) || 0;
        const unitPrice = qtyNum > 0 ? totalPrice / qtyNum : totalPrice;

        setReplaceData((prev) => ({
          ...prev,
          newProduct: currentRequest.displayName || "",
          newProductId: currentRequest.productId || "",
          selectedProductUnitPrice: unitPrice,
          quantity: qty,
          price: `Rs. ${formatPrice(totalPrice)}`,
        }));
      }
    } catch (error) {
      console.error("Error loading current replace request:", error);
    } finally {
      setLoadingCurrentReplace(false);
    }
  };

  const loadRetailItems = async (freshData?: ReplaceRequestData) => {
    const data =
      freshData ?? (route.params?.replaceRequestData as ReplaceRequestData);
    try {
      setLoadingRetailItems(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/retail-items/${data.orderId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setRetailItems(response.data.data);
      }
    } catch (error) {
      console.error("Error loading retail items:", error);
    } finally {
      setLoadingRetailItems(false);
    }
  };

  const handleProductSelect = (product: RetailItem) => {
    const unitPrice = product.discountedPrice ?? product.normalPrice ?? 0;
    const qtyNum = parseFloat(replaceData.quantity) || 0;
    const totalPrice = unitPrice * qtyNum;

    setReplaceData((prev) => ({
      ...prev,
      newProduct: product.displayName,
      newProductId: product.id,
      selectedProductUnitPrice: unitPrice,
      price: `Rs. ${formatPrice(totalPrice)}`,
    }));
    setShowProductModal(false);
  };

  const handleQuantityChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const qtyNum = parseFloat(text) || 0;
      const totalPrice = replaceData.selectedProductUnitPrice * qtyNum;

      setReplaceData((prev) => ({
        ...prev,
        quantity: text,
        price:
          text === "" || qtyNum === 0
            ? "Rs. 0.00"
            : `Rs. ${formatPrice(totalPrice)}`,
      }));
    }
  };

  const definedTotalPrice =
    originalItemPrice > 0
      ? originalItemPrice
      : parseFloat(replaceData.replacePrice || "0");

  const currentTotalPrice =
    replaceData.selectedProductUnitPrice *
    (parseFloat(replaceData.quantity) || 0);

  const isPriceExceeded =
    replaceData.quantity !== "" &&
    parseFloat(replaceData.quantity) > 0 &&
    replaceData.newProduct !== "" &&
    currentTotalPrice > definedTotalPrice;

  const isQuantityValid = parseFloat(replaceData.quantity) > 0;

  const isFormComplete =
    !!replaceData.newProduct &&
    !!replaceData.quantity &&
    isQuantityValid &&
    !isPriceExceeded;

  const handleApprove = async () => {
    if (!replaceData.newProduct || !replaceData.quantity) {
      Alert.alert(
        t("Error.Error"),
        t("Error.Please select a product and enter quantity"),
      );
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      const qtyNum = parseFloat(replaceData.quantity);
      const calculatedPrice = replaceData.selectedProductUnitPrice * qtyNum;

      const approvalData = {
        orderId: replaceData.orderId,
        replaceRequestId: replaceRequestData.id,
        newProduct: replaceData.newProduct,
        newProductId: replaceData.newProductId,
        quantity: qtyNum,
        price: calculatedPrice,
        originalProductId: replaceRequestData.productId,
        originalProductName: replaceRequestData.productDisplayName,
        originalQuantity: replaceRequestData.qty,
        originalPrice: replaceRequestData.price,
      };

      const response = await axios.post(
        `${environment.API_BASE_URL}api/distribution-manager/approve`,
        approvalData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        Alert.alert(
          t("Error.Success"),
          t("Error.Replace request approved successfully"),
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate("Main" as any, {
                  screen: "ReplaceRequestsScreen",
                }),
            },
          ],
        );
      } else {
        Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      }
    } catch (error) {
      console.error("Error approving replace request:", error);
      Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const modalItems = retailItems.map((item) => ({
    label: item.displayName,
    value: item.id,
    price: formatPrice(item.discountedPrice ?? item.normalPrice ?? 0),
  }));

  if (loadingCurrentReplace) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <LottieView
          source={require("../../assets/lottie/loading.json")}
          autoPlay
          loop
          style={{ width: 150, height: 150 }}
        />
        <Text className="mt-2 text-gray-600">
          {t("ReplaceRequestsApprove.Loading replace request")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={`${t("ReplaceRequestsApprove.Order ID")} ${replaceData.invNo}`}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main" as any, {
            screen: "ReplaceRequestsScreen",
          })
        }
      />

      <View className="flex-1 w-full max-w-[500px] mx-auto">
        <ScrollView
          className="flex-1 bg-white"
          style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5">
            {/* Defined product box */}
            <View className="border border-dashed border-[#FA0000] rounded-lg p-4 mb-6">
              <Text className="text-center text-gray-600 mb-1">
                {t("ReplaceRequestsApprove.Defined product")}
              </Text>
              <Text className="text-center font-medium mb-1">
                {replaceData.replaceProductDisplayName ||
                  replaceData.selectedProduct}
              </Text>
              <Text className="text-center font-medium mb-2">
                {originalItemQty > 0 ? originalItemQty : replaceData.replaceQty}{" "}
                kg - Rs.{" "}
                {formatPrice(
                  originalItemPrice > 0
                    ? originalItemPrice
                    : parseFloat(replaceData.replacePrice || "0"),
                )}
              </Text>
              <Text className="text-center text-gray-600 text-sm mb-1">
                {t("ReplaceRequestsApprove.Relevant Product Type")}
              </Text>
              <Text className="text-center font-medium">
                {replaceData.productTypeName}
              </Text>
            </View>
          </View>

          <View className="px-2 mt-2">
            <Text className="text-center text-black mb-4 font-medium">
              -- {t("ReplaceRequestsApprove.Replacing Product Details")} --
            </Text>

            {/* Product selector */}
            <View className="mb-4">
              <TouchableOpacity
                className="border border-gray-300 rounded-full p-4 flex-row justify-between items-center bg-white"
                onPress={() => setShowProductModal(true)}
              >
                <Text
                  className={
                    replaceData.newProduct ? "text-black" : "text-gray-400"
                  }
                >
                  {replaceData.newProduct ||
                    t("PendingOrderScreen.Select Product")}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              <GlobalSearchModal
                visible={showProductModal}
                onClose={() => setShowProductModal(false)}
                title={t("PendingOrderScreen.Select Product")}
                data={modalItems}
                selectedItems={
                  replaceData.newProductId ? [replaceData.newProductId] : []
                }
                onSelect={(selected) => {
                  if (selected.length > 0) {
                    const product = retailItems.find(
                      (item) => item.id === selected[0],
                    );
                    if (product) handleProductSelect(product);
                  }
                }}
                searchPlaceholder={t("PendingOrderScreen.Search products...")}
                noResultsText={t(
                  "ReplaceRequestsApprove.No products available",
                )}
                multiSelect={false}
                isLoading={loadingRetailItems}
                renderItem={(item, isSelected) => (
                  <TouchableOpacity
                    className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100"
                    onPress={() => {
                      const product = retailItems.find(
                        (p) => p.id === item.value,
                      );
                      if (product) {
                        handleProductSelect(product);
                        setShowProductModal(false);
                      }
                    }}
                  >
                    <View className="flex-1">
                      <Text className="text-base text-gray-800">
                        {item.label}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Rs. {item.price}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color="#21202B" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Quantity input */}
            <View className="mb-4">
              <TextInput
                className="border border-gray-300 rounded-full p-4 bg-white"
                placeholder="Enter Quantity"
                value={replaceData.quantity}
                onChangeText={handleQuantityChange}
                keyboardType="decimal-pad"
              />
              {replaceData.quantity !== "" && !isQuantityValid && (
                <Text className="text-red-600 text-sm text-center mt-1 px-2">
                  {t(
                    "ReplaceRequestsApprove.Please enter a value greater than 0",
                  )}
                </Text>
              )}
            </View>

            {/* Price display */}
            <View className="mb-6">
              <View
                className={`border rounded-full p-4 ${
                  isPriceExceeded
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <Text
                  className={isPriceExceeded ? "text-red-500" : "text-black"}
                >
                  {replaceData.price}
                </Text>
              </View>

              {isPriceExceeded && (
                <Text className="text-red-600 text-sm text-center mt-1 px-2">
                  {t(
                    "ReplaceRequestsApprove.Price must match defined product price",
                  )}
                </Text>
              )}
            </View>

            {/* Approve button */}
            <TouchableOpacity
              className={`py-3 ml-3 mr-3 rounded-full mb-4 h-[50px] justify-center mt-[5%] ${
                isFormComplete ? "bg-black" : "bg-gray-300"
              }`}
              onPress={isFormComplete ? handleApprove : undefined}
              disabled={!isFormComplete || submitting}
              style={{
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-center font-medium text-lg">
                  {t("ReplaceRequestsApprove.Approve")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default ReplaceRequestsApprove;
