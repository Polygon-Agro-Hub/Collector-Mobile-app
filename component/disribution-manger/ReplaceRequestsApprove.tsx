import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
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
}

interface ReplaceData {
  orderId: string;
  selectedProduct: string;
  productTypeName: string;
  newProduct: string;
  newProductId: string;
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

  const replaceRequestData = route.params
    ?.replaceRequestData as ReplaceRequestData;

  const [replaceData, setReplaceData] = useState<ReplaceData>({
    orderId: replaceRequestData?.orderId || replaceRequestData?.invNo || "N/A",
    selectedProduct: replaceRequestData?.productDisplayName || "N/A",
    productTypeName: replaceRequestData?.productTypeName || "N/A",
    newProduct: "",
    newProductId: "",
    quantity: "",
    price: replaceRequestData?.price || "N/A",
    invNo: replaceRequestData?.invNo || "N/A",
    qty: replaceRequestData?.qty || "N/A",
    replaceProductDisplayName: replaceRequestData?.replaceProductDisplayName,
    replaceQty: replaceRequestData?.replaceQty,
    replacePrice: replaceRequestData?.replacePrice,
  });

  useEffect(() => {
    loadCurrentReplaceRequest();
    loadRetailItems();
  }, []);

  const loadCurrentReplaceRequest = async () => {
    try {
      setLoadingCurrentReplace(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/ordre-replace/${replaceRequestData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success && response.data.data.length > 0) {
        setCurrentReplaceRequests(response.data.data);

        const currentRequest = response.data.data[0];

        const formatQuantity = (qty: string | number): string => {
          if (!qty && qty !== 0) return "0";

          const num = typeof qty === "string" ? parseFloat(qty) : qty;

          if (isNaN(num)) return "0";

          let formatted = num.toString();

          if (formatted.includes(".")) {
            formatted = formatted.replace(/\.?0+$/, "");

            if (formatted.endsWith(".")) {
              formatted = formatted.slice(0, -1);
            }

            const decimalPart = formatted.split(".")[1];
            if (!decimalPart) {
              return formatted;
            } else if (decimalPart.length === 1 && decimalPart === "0") {
              return formatted + "0";
            }
          }

          return formatted;
        };

        const quantity = formatQuantity(replaceRequestData.qty || "0");

        setReplaceData((prev) => ({
          ...prev,
          newProduct: currentRequest.displayName || "",
          newProductId: currentRequest.productId || "",
          quantity: quantity,
          price: `Rs. ${formatPrice(currentRequest.price)}`,
        }));
      }
    } catch (error) {
      console.error("Error loading current replace request:", error);
    } finally {
      setLoadingCurrentReplace(false);
    }
  };
  const loadRetailItems = async () => {
    try {
      setLoadingRetailItems(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/retail-items/${replaceRequestData.orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
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
    const currentQty = parseFloat(replaceData.quantity) || 0;
    const productPrice = product.discountedPrice || product.normalPrice || 0;

    setReplaceData((prev) => ({
      ...prev,
      newProduct: product.displayName,
      newProductId: product.id,
      price: `Rs. ${formatPrice(currentQty * productPrice)}`,
    }));
    setShowProductModal(false);
  };

  const handleQuantityChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      let selectedProduct = retailItems.find(
        (item) =>
          item.displayName === replaceData.newProduct ||
          item.id === replaceData.newProductId,
      );

      if (!selectedProduct && currentReplaceRequests.length > 0) {
        const currentRequest = currentReplaceRequests[0];
        if (currentRequest.displayName === replaceData.newProduct) {
          const unitPrice = currentRequest.price / currentRequest.qty;

          const qty = text === "" || text === "." ? 0 : parseFloat(text) || 0;
          setReplaceData((prev) => ({
            ...prev,
            quantity: text,
            price: `Rs. ${formatPrice(qty * unitPrice)}`,
          }));
          return;
        }
      }

      const price = selectedProduct
        ? selectedProduct.discountedPrice || selectedProduct.normalPrice || 0
        : 0;

      const qty = text === "" || text === "." ? 0 : parseFloat(text) || 0;
      setReplaceData((prev) => ({
        ...prev,
        quantity: text,
        price: `Rs. ${formatPrice(qty * price)}`,
      }));
    }
  };

  const getNumericPrice = (priceString: string): number => {
    if (!priceString) return 0;
    const cleanPrice = priceString.replace(/Rs\.?\s*/gi, "").trim();
    return parseFloat(cleanPrice) || 0;
  };

  const isPriceExceeded = (): boolean => {
    const currentPrice = getNumericPrice(replaceData.price);
    const definedPrice = getNumericPrice(
      replaceRequestData.replacePrice || "0",
    );
    return currentPrice > definedPrice;
  };

  const handleApprove = async () => {
    if (!replaceData.newProduct || !replaceData.quantity) {
      Alert.alert(
        t("Error.Error"),
        t("Error.Please select a product and enter quantity"),
      );
      return;
    }

    if (isPriceExceeded()) {
      Alert.alert(
        t("Error.Error"),
        t("Error.Price exceeds defined product price"),
      );
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      const approvalData = {
        orderId: replaceData.orderId,
        replaceRequestId: replaceRequestData.id,
        newProduct: replaceData.newProduct,
        newProductId: replaceData.newProductId,
        quantity: parseFloat(replaceData.quantity),
        price: parseFloat(replaceData.price.replace(/Rs\.?\s*/gi, "")),
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
          [{ text: "OK", onPress: () => navigation.goBack() }],
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

  const isQuantityValid = parseFloat(replaceData.quantity) > 0;

  const isFormComplete =
    replaceData.newProduct &&
    replaceData.quantity &&
    isQuantityValid &&
    !isPriceExceeded();

  const modalItems = retailItems.map((item) => ({
    label: item.displayName,
    value: item.id,
    price: formatPrice(item.discountedPrice || item.normalPrice || 0),
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
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1 bg-white"
        style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5">
          <View className="border border-dashed border-[#FA0000] rounded-lg p-4 mb-6">
            <Text className="text-center text-gray-600 mb-3">
              {t("ReplaceRequestsApprove.Defined product")}
            </Text>
            <Text className="text-center font-medium mb-2">
              {replaceData.replaceProductDisplayName} - {replaceData.replaceQty}{" "}kg
              - {replaceData.replacePrice}
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
            -- {t("ReplaceRequestsApprove.Replacing Product Details")}--
          </Text>

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
              noResultsText={t("ReplaceRequestsApprove.No products available")}
              multiSelect={false}
              isLoading={loadingRetailItems}
              renderItem={(item, isSelected) => (
                <TouchableOpacity
                  className={`px-4 py-3 flex-row items-center justify-between border-b border-gray-100`}
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

          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-full p-4 bg-white"
              placeholder="Enter Quantity"
              value={replaceData.quantity}
              onChangeText={handleQuantityChange}
              keyboardType="decimal-pad"
            />
            {/* Quantity validation message */}
            {replaceData.quantity !== "" && !isQuantityValid && (
              <Text className="text-red-600 text-sm text-center mt-1 px-2">
                {t(
                  "ReplaceRequestsApprove.Please enter a value greater than 0",
                )}
              </Text>
            )}
          </View>

          <View className="mb-2">
            <View
              className={`border border-gray-300 rounded-full p-4 ${isPriceExceeded() ? "bg-red-50" : "bg-gray-50"}`}
            >
              <Text
                className={isPriceExceeded() ? "text-red-600" : "text-black"}
              >
                {replaceData.newProduct && replaceData.quantity
                  ? replaceData.price
                  : "Rs. 0.00"}
              </Text>
            </View>
          </View>

          {/* Price warning message */}
          {isPriceExceeded() && (
            <View className="mb-4 px-2">
              <Text className="text-red-600 text-sm text-center">
                Price must match defined product price (
                {replaceData.replacePrice})
              </Text>
            </View>
          )}

          <TouchableOpacity
            className={`py-3 ml-3 mr-3 rounded-full mb-4 h-[50px] justify-center mt-[5%] ${isFormComplete ? "bg-black" : "bg-gray-300"}`}
            onPress={isFormComplete ? handleApprove : undefined}
            disabled={!isFormComplete || submitting}
            style={{
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
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
  );
};

export default ReplaceRequestsApprove;
