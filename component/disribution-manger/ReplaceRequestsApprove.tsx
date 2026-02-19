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
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from '@/environment/environment';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import NetInfo from "@react-native-community/netinfo";
import i18n from "@/i18n/i18n";

type ReplaceRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReplaceRequestsApprove"
>;

interface ReplaceRequestsProps {
  navigation: ReplaceRequestsNavigationProp;
  route: ReplaceRequestsRouteProp;
}

type ReplaceRequestsRouteProp = RouteProp<RootStackParamList, "ReplaceRequestsApprove">;

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingRetailItems, setLoadingRetailItems] = useState(false);
  const [loadingCurrentReplace, setLoadingCurrentReplace] = useState(false);
  const [retailItems, setRetailItems] = useState<RetailItem[]>([]);
  const [currentReplaceRequests, setCurrentReplaceRequests] = useState<CurrentReplaceRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ordreId, setOrdreId] = useState('');
  const [id, setId] = useState('');
  
  const replaceRequestData = route.params?.replaceRequestData as ReplaceRequestData;
  
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
    replacePrice: replaceRequestData?.replacePrice
  });

  useEffect(() => {
    loadCurrentReplaceRequest();
    loadRetailItems();
  }, []);

  useEffect(() => {
    setOrdreId(replaceRequestData.orderId);
    setId(replaceRequestData.id);
  }, []);

  console.log("////////////////////////////", ordreId, id);

 const loadCurrentReplaceRequest = async () => {
  try {
    setLoadingCurrentReplace(true);
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(
      `${environment.API_BASE_URL}api/distribution-manager/ordre-replace/${replaceRequestData.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log("Current replace request data:", response.data);
    
    if (response.data.success && response.data.data.length > 0) {
      setCurrentReplaceRequests(response.data.data);
      
      const currentRequest = response.data.data[0]; 
      
      // Format quantity to 2 decimal places
      // const formatQuantity = (qty: string | number): string => {
      //   const num = typeof qty === 'string' ? parseFloat(qty) : qty;
      //   return num.toFixed(2);
      // };
      // Helper function to format quantity - remove trailing zeros but keep actual decimals
const formatQuantity = (qty: string | number): string => {
  if (!qty && qty !== 0) return "0";
  
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  
  // Handle NaN cases
  if (isNaN(num)) return "0";
  
  // Convert to string and remove trailing zeros
  let formatted = num.toString();
  
  // If it has decimal part
  if (formatted.includes('.')) {
    // Remove trailing zeros
    formatted = formatted.replace(/\.?0+$/, '');
    
    // If we removed all decimals but still have the dot, remove the dot too
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
    
    // Special case: if it ends with .00 or similar, show 2 decimal places
    const decimalPart = formatted.split('.')[1];
    if (!decimalPart) {
      // No decimal part left, return as integer
      return formatted;
    } else if (decimalPart.length === 1 && decimalPart === '0') {
      // Single zero after decimal, show one decimal
      return formatted + '0';
    }
  }
  
  return formatted;
};
      
      const quantity = formatQuantity(replaceRequestData.qty || "0");
      
      setReplaceData(prev => ({
        ...prev,
        newProduct: currentRequest.displayName || '',
        newProductId: currentRequest.productId || '', 
        quantity: quantity,
        price: `Rs.${currentRequest.price.toFixed(2)}`
      }));
    }
  } catch (error) {
    console.error('Error loading current replace request:', error);
  } finally {
    setLoadingCurrentReplace(false);
  }
};
  const loadRetailItems = async () => {
    try {
      setLoadingRetailItems(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/retail-items/${replaceRequestData.orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log("Retail items data:", response.data);
      
      if (response.data.success) {
        setRetailItems(response.data.data);
      }
    } catch (error) {
      console.error('Error loading retail items:', error);
    } finally {
      setLoadingRetailItems(false);
    }
  };

  const handleProductSelect = (product: RetailItem) => {
    const currentQty = parseFloat(replaceData.quantity) || 0;
    const productPrice = product.discountedPrice || product.normalPrice || 0;
    
    setReplaceData(prev => ({
      ...prev,
      newProduct: product.displayName,
      newProductId: product.id, 
      price: `Rs.${(currentQty * productPrice).toFixed(2)}`
    }));
    setShowDropdown(false);
  };

 const handleQuantityChange = (text: string) => {
  // Allow empty string, digits, and decimal point
  if (text === '' || /^\d*\.?\d*$/.test(text)) {
    let selectedProduct = retailItems.find(item => 
      item.displayName === replaceData.newProduct || item.id === replaceData.newProductId
    );
    
    if (!selectedProduct && currentReplaceRequests.length > 0) {
      const currentRequest = currentReplaceRequests[0];
      if (currentRequest.displayName === replaceData.newProduct) {
        const unitPrice = currentRequest.price / currentRequest.qty;
        // Parse quantity, but keep original text for display
        const qty = (text === '' || text === '.') ? 0 : parseFloat(text) || 0;
        setReplaceData(prev => ({
          ...prev,
          quantity: text, // Keep the original text input
          price: `Rs.${(qty * unitPrice).toFixed(2)}`
        }));
        return;
      }
    }
    
    const price = selectedProduct ? (selectedProduct.discountedPrice || selectedProduct.normalPrice || 0) : 0;
    // Parse quantity, but keep original text for display
    const qty = (text === '' || text === '.') ? 0 : parseFloat(text) || 0;
    setReplaceData(prev => ({
      ...prev,
      quantity: text, // Keep the original text input
      price: `Rs.${(qty * price).toFixed(2)}`
    }));
  }
};
  // Helper function to extract numeric price from string
  const getNumericPrice = (priceString: string): number => {
    if (!priceString) return 0;
    const cleanPrice = priceString.replace(/Rs\.?/gi, '').trim();
    return parseFloat(cleanPrice) || 0;
  };

  // Check if current price exceeds defined product price
  const isPriceExceeded = (): boolean => {
    const currentPrice = getNumericPrice(replaceData.price);
    const definedPrice = getNumericPrice(replaceRequestData.replacePrice || '0');
    return currentPrice > definedPrice;
  };

  const handleApprove = async () => {
    if (!replaceData.newProduct || !replaceData.quantity) {
      Alert.alert(t("Error.Error"), t("Error.Please select a product and enter quantity"));
      return;
    }

    // Check if price exceeds defined product price
    if (isPriceExceeded()) {
      Alert.alert(
        t("Error.Error"), 
        t("Error.Price exceeds defined product price")
      );
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return; 
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      
      const approvalData = {
        orderId: replaceData.orderId,
        replaceRequestId: replaceRequestData.id, 
        newProduct: replaceData.newProduct,
        newProductId: replaceData.newProductId, 
        quantity: parseFloat(replaceData.quantity), 
        price: parseFloat(replaceData.price.replace('Rs.', '')), 
        originalProductId: replaceRequestData.productId,
        originalProductName: replaceRequestData.productDisplayName,
        originalQuantity: replaceRequestData.qty,
        originalPrice: replaceRequestData.price
      };
      
      const response = await axios.post(
        `${environment.API_BASE_URL}api/distribution-manager/approve`,
        approvalData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Alert.alert(t("Error.Success"), t("Error.Replace request approved successfully"), [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      }
    } catch (error) {
      console.error('Error approving replace request:', error);
      Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  };

  // Updated validation: form complete AND price does not exceed defined product price
  const isFormComplete = replaceData.newProduct && replaceData.quantity && !isPriceExceeded();
  
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = retailItems.filter((product) =>
    product.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingCurrentReplace) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-2 text-gray-600">{t("ReplaceRequestsApprove.Loading replace request")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white px-4 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity className="mr-4 bg-[#F6F6F680] rounded-full p-2 z-50" onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={24} color="#333" />
        </TouchableOpacity>
        <View className="flex-1 justify-center items-center">
          <Text 
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                ? { fontSize: 12 }
                : { fontSize: 15 }
            ]}
            className="text-gray-800 text-lg font-medium"
          >
            {t("ReplaceRequestsApprove.Order ID")} {replaceData.invNo}
          </Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 bg-white"
        style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5">
          <View className="border border-dashed border-[#FA0000] rounded-lg p-4 mb-6">
            <Text className="text-center text-gray-600 mb-3">{t("ReplaceRequestsApprove.Defined product")}</Text>
            <Text className="text-center font-medium mb-2">
              {replaceData.replaceProductDisplayName} - {replaceData.replaceQty} - {replaceData.replacePrice}
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
            {showDropdown ? (
              <View> 
                <View className="">
                  <TextInput
                    placeholder={t("PendingOrderScreen.Search products...")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="w-full p-3 border border-gray-300 rounded-full flex-row justify-between items-center bg-white"
                    placeholderTextColor="#888"
                  />
                </View>
                <View className="border border-t-0 border-gray-300 rounded-b-lg bg-white max-h-40 mt-1">
                  <ScrollView>
                    {loadingRetailItems ? (
                      <View className="p-4 items-center">
                        <ActivityIndicator size="small" color="#000" />
                      </View>
                    ) : filteredItems.length > 0 ? (
                      filteredItems.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          className="p-3 border-b border-gray-100"
                          onPress={() => {
                            handleProductSelect(product);
                            setShowDropdown(false);
                            setSearchQuery("");
                          }}
                        >
                          <Text className="font-medium">{product.displayName}</Text>
                          <Text className="text-xs text-gray-500">
                            {t("PendingOrderScreen.Rs")}.
                            {(product.discountedPrice || product.normalPrice || 0).toFixed(2)}
                          </Text>
                        </TouchableOpacity> 
                      ))
                    ) : (
                      <View className="p-4 items-center">
                        <Text className="text-gray-500">{t("ReplaceRequestsApprove.No products available")}</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="border border-gray-300 rounded-full p-4 flex-row justify-between items-center bg-white"
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text className={replaceData.newProduct ? "text-black" : "text-gray-400"}>
                  {replaceData.newProduct || "Select Product"}
                </Text>
                <AntDesign name={showDropdown ? "up" : "down"} size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-full p-4 bg-white"
              placeholder="Enter Quantity"
              value={replaceData.quantity}
              onChangeText={handleQuantityChange}
              keyboardType="decimal-pad"
            />
          </View>

          <View className="mb-2">
            <View className={`border border-gray-300 rounded-full p-4 ${isPriceExceeded() ? 'bg-red-50' : 'bg-gray-50'}`}>
              <Text className={isPriceExceeded() ? "text-red-600" : "text-black"}>
                {replaceData.newProduct && replaceData.quantity ? replaceData.price : "Rs.0.00"}
              </Text>
            </View>
          </View>

          {/* Price warning message */}
          {isPriceExceeded() && (
            <View className="mb-4 px-2">
              <Text className="text-red-600 text-sm text-center">
                Price must match defined product price ({replaceData.replacePrice})
              </Text>
            </View>
          )}

          <TouchableOpacity
            className={`py-3 ml-3 mr-3 rounded-full mb-4 ${isFormComplete ? 'bg-black' : 'bg-gray-300'}`}
            onPress={isFormComplete ? handleApprove : undefined}
            disabled={!isFormComplete || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium text-base">
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