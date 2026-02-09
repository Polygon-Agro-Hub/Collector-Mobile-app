import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import Timer from "@/component/distribution-common/TimerContainer ";
import NetInfo from "@react-native-community/netinfo";
import i18n from "@/i18n/i18n";

interface OrderItem {
  id: string;
  invoiceNo: string;
  varietyNameEnglish: string;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  grade: string;
  target: number;
  complete: number;
  todo: number;
  status: "Pending" | "Opened" | "Completed" | "In Progress"; // Add 'In Progress' here
  createdAt: string;
  updatedAt: string;
  completedTime?: string | null;
}

interface FamilyPackItem {
  id: string;
  name: string;
  weight: string;
  selected: boolean;
  price: string;
  productType: number;
  packageQty: number;
  productTypeName: string;
  packageId: number;
  packageName: string;
  originalItemId: number;
}

interface PackageGroup {
  packageId: number;
  packageName: string;
  items: FamilyPackItem[];
  allSelected: boolean;
  someSelected: boolean;
}

interface AdditionalItem {
  id: string;
  name: string;
  weight: string;
  selected: boolean;
  price: string;
}

interface ReplaceProductData {
  selectedProduct: string;
  selectedProductPrice: string;
  productType: number;
  newProduct: string;
  quantity: string;
  price: string;
  productTypeName: string;
}

interface PackageItem {
  id: number;
  productType: string;
  productId: number;
  qty: number;
  price: number;
  isPacked: number;
  productName: string;
  category: string;
  normalPrice: number;
  productTypeName: string;
}

interface BackendAdditionalItem {
  id: number;
  productId: number;
  qty: string;
  unit: string;
  price: string;
  discount: string;
  isPacked: number;
  productName: string;
  category: string;
  normalPrice: string;
}

interface PackageData {
  id: number;
  packageId: number;
  packageQty: number;
  packingStatus: string;
  createdAt: string;
  items: PackageItem[];
}

interface OrderInfo {
  orderId: number;
  isPackage: number;
  orderUserId: number;
  orderApp: string;
  buildingType: string;
  sheduleType: string;
  sheduleDate: string;
  sheduleTime: string;
  orderCreatedAt: string;
}

interface RetailItem {
  id: number;
  varietyId: string;
  displayName: string;
  category: string;
  normalPrice: number;
  discountedPrice: number;
  discount: number;
  promo: number;
  unitType: string;
  startValue: number;
  changeby: string;
  displayType: string;
  tags: string;
  createdAt: string;
  maxQuantity: number;
}

interface BackendOrderData {
  orderInfo: OrderInfo;
  additionalItems: BackendAdditionalItem[];
  packageData: PackageData;
}

type PendingOrderScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "PendingOrderScreen"
>;
type PendingOrderScreenRouteProp = RouteProp<
  RootStackParamList,
  "PendingOrderScreen"
>;

interface PendingOrderScreenProps {
  navigation: PendingOrderScreenNavigationProps;
  route: PendingOrderScreenRouteProp;
}

const { width, height } = Dimensions.get("window");
const RedIcon = require("@/assets/images/squareMin.webp");
const disable = require("@/assets/images/squaresolidRed.png");

const PendingOrderScreen: React.FC<PendingOrderScreenProps> = ({
  navigation,
  route,
}) => {
  const { item, centerCode, status } = route.params;
  const { t } = useTranslation();

  const [orderData, setOrderData] = useState<OrderItem>(
    item as unknown as OrderItem,
  );

  const [additionalItemsExpanded, setAdditionalItemsExpanded] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedItemForReplace, setSelectedItemForReplace] =
    useState<FamilyPackItem | null>(null);
  const [packageExpansions, setPackageExpansions] = useState<{
    [key: number]: boolean;
  }>({});
  const [showWarning, setShowWarning] = useState(false);
  const [completedTime, setCompletedTime] = useState<string | null>(null); // Track completion time
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [countdownInterval, setCountdownInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [orderStatus, setOrderStatus] = useState<
    "Pending" | "Opened" | "Completed" | "In Progress"
  >(status || item.status || "Pending");

  const [isUserInitiatedCompletion, setIsUserInitiatedCompletion] =
    useState(false);
  const [isReplacementPriceHigher, setIsReplacementPriceHigher] =
    useState(false);

  const [packageName, setPackageName] = useState<string>("Family Pack");
  const [packageId, setPackageId] = useState<number | null>(null);

  const [orderCompletionState, setOrderCompletionState] = useState<
    "idle" | "completing" | "completed"
  >("idle");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [typeName, setTypeeName] = useState<string>("");

  const [familyPackItems, setFamilyPackItems] = useState<FamilyPackItem[]>([]);
  const [retailItems, setRetailItems] = useState<RetailItem[]>([]);
  const [loadingRetailItems, setLoadingRetailItems] = useState(false);

  const [completingOrder, setCompletingOrder] = useState(false);

  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  console.log("pending order status", status);

  console.log("ordreid", item.orderId);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(loadingTimer);
  }, []);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("User not authenticated");
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/user-profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const role = response.data?.data?.jobRole || null;
      setJobRole(role);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setError("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  console.log("Current job role:", jobRole);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const fetchOrderData = async (orderId: string) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(t("Error.error"), t("Error.User not authenticated."));
        return null;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution/order-data/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data && response.data.success) {
        setIsDataLoaded(true);
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to fetch order data");
      }
    } catch (error) {
      console.error("Error fetching order data:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          Alert.alert(t("Error.Error"), t("Error.Session expired"));

          return null;
        } else if (error.response?.status === 404) {
          Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
          return null;
        }
      }

      Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      return null;
    }
  };

  const loadOrderData = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }

    const orderData = await fetchOrderData(item.orderId);

    if (orderData) {
      if (orderData.packageData && Array.isArray(orderData.packageData)) {
        orderData.packageData.forEach(
          (packageInfo: any, packageIndex: number) => {
            if (packageInfo.items && Array.isArray(packageInfo.items)) {
              packageInfo.items.forEach((item: any, itemIndex: number) => {});
            }
          },
        );
      }

      if (
        orderData.additionalItems &&
        Array.isArray(orderData.additionalItems)
      ) {
      }

      let allFamilyPackItems: FamilyPackItem[] = [];
      let packageNames: string[] = [];
      let typeNames: string[] = [];

      if (orderData.packageData && Array.isArray(orderData.packageData)) {
        orderData.packageData.forEach(
          (packageInfo: any, packageIndex: number) => {
            const packageQty = packageInfo.packageQty || 1;

            if (packageInfo.packageName) {
              const displayName =
                packageQty > 1
                  ? `${packageInfo.packageName} (x${packageQty})`
                  : packageInfo.packageName;
              packageNames.push(displayName);
            }

            if (packageIndex === 0 && packageInfo.id) {
              setPackageId(packageInfo.id);
            }

            if (packageInfo.items && Array.isArray(packageInfo.items)) {
              const packageItems: FamilyPackItem[] = packageInfo.items.map(
                (item: any) => {
                  const isPackedValue =
                    item.isPacked === 1 ||
                    item.isPacked === "1" ||
                    item.isPacked === true;

                  return {
                    id: `${packageInfo.id}_${item.id}`,
                    name: item.productName,
                    weight: `${item.qty} `,
                    selected: isPackedValue,
                    price: item.price || item.normalPrice || "0",
                    productType: item.productType,
                    productTypeName: item.productTypeName,
                    packageId: packageInfo.id,
                    packageName: packageInfo.packageName,
                    packageQty: packageQty,
                    originalItemId: item.id,
                  };
                },
              );

              allFamilyPackItems = [...allFamilyPackItems, ...packageItems];

              const packageTypeNames = packageInfo.items
                .map((item: any) => item.productTypeName)
                .filter((name: string) => name && !typeNames.includes(name));
              typeNames = [...typeNames, ...packageTypeNames];
            }
          },
        );
      }

      const mappedAdditionalItems: AdditionalItem[] =
        orderData.additionalItems?.map((item: any) => {
          const isPackedValue =
            item.isPacked === 1 ||
            item.isPacked === "1" ||
            item.isPacked === true;

          return {
            id: item.id.toString(),
            name: item.productName,
            weight: `${item.qty}`,
            selected: isPackedValue,
            price: item.price || item.normalPrice || "0",
          };
        }) || [];

      if (packageNames.length > 0) {
        setPackageName(packageNames.join(" + "));
      }

      if (typeNames.length > 0) {
        setTypeeName(typeNames.join(", "));
      }

      setFamilyPackItems(allFamilyPackItems);
      setAdditionalItems(mappedAdditionalItems);

      const allFamilyPacked =
        allFamilyPackItems.length === 0 ||
        allFamilyPackItems.every((item) => item.selected);
      const allAdditionalPacked =
        mappedAdditionalItems.length === 0 ||
        mappedAdditionalItems.every((item) => item.selected);
      const someFamilyPacked = allFamilyPackItems.some((item) => item.selected);
      const someAdditionalPacked = mappedAdditionalItems.some(
        (item) => item.selected,
      );

      if (
        allFamilyPackItems.length === 0 &&
        mappedAdditionalItems.length === 0
      ) {
        setOrderStatus("Pending");
      } else if (allFamilyPacked && allAdditionalPacked) {
        setOrderStatus("Completed");
        setCompletedTime(new Date().toLocaleString());
      } else if (someFamilyPacked || someAdditionalPacked) {
        setOrderStatus("Opened");
      } else {
        setOrderStatus("Pending");
      }

      setError(null);
    } else {
      setError(t("Failed to load order data"));
    }

    if (!isRefreshing) {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderData();
    fetchSelectedLanguage();
  }, [item.orderId, t]);

  useEffect(() => {
    if (orderStatus === "Completed") {
      const timer = setTimeout(() => {
        loadOrderData(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orderStatus]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadOrderData(true);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadOrderData();
    }, []),
  );

  useEffect(() => {
    if (orderStatus === "Completed") {
      setHasUnsavedChanges(false);
      setShowCompletionPrompt(false);
      resetCountdown();
    }
  }, [orderStatus]);

  const toggleFamilyPackItem = (id: string) => {
    if (orderStatus === "Completed") return;

    console.log("Toggling item ID:", id);

    setFamilyPackItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return { ...item, selected: !item.selected };
        }
        return item;
      });

      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const toggleAdditionalItem = (id: string) => {
    if (orderStatus === "Completed") return;

    setAdditionalItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          console.log(
            `Toggling ${item.name} from ${item.selected} to ${!item.selected}`,
          );
          return { ...item, selected: !item.selected };
        }
        return item;
      });

      return updated;
    });
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (
      orderCompletionState !== "idle" ||
      orderStatus === "Completed" ||
      isUserInitiatedCompletion
    )
      return;

    const hasFamily = familyPackItems.length > 0;
    const hasAdditional = additionalItems.length > 0;

    let allSelected = false;

    if (hasFamily && hasAdditional) {
      allSelected =
        areAllFamilyPackItemsSelected() && areAllAdditionalItemsSelected();
    } else if (hasFamily && !hasAdditional) {
      allSelected = areAllFamilyPackItemsSelected();
    } else if (!hasFamily && hasAdditional) {
      allSelected = areAllAdditionalItemsSelected();
    }

    if (allSelected) {
      console.log("All items selected - updating status only");
    }
  }, [familyPackItems, additionalItems, orderStatus]);

  const hasFamilyPackSelections = () => {
    return (
      familyPackItems.length > 0 &&
      familyPackItems.some((item) => item.selected)
    );
  };

  const hasAdditionalItemSelections = () => {
    return (
      additionalItems.length > 0 &&
      additionalItems.some((item) => item.selected)
    );
  };

  const areAllFamilyPackItemsSelected = () => {
    return (
      familyPackItems.length === 0 ||
      familyPackItems.every((item) => item.selected)
    );
  };

  const areAllAdditionalItemsSelected = () => {
    return (
      additionalItems.length === 0 ||
      additionalItems.every((item) => item.selected)
    );
  };

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor:
          orderStatus === "Completed"
            ? "#D4F7D4"
            : orderStatus === "Opened"
              ? "#FDFF99"
              : "#FFCDCD",
      },
      headerTintColor:
        orderStatus === "Completed"
          ? "#2E7D32"
          : orderStatus === "Opened"
            ? "#A8A100"
            : "#D16D6A",
    });
  }, [orderStatus, navigation]);

  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const handleCompleteOrder = async () => {
    if (orderCompletionState !== "idle") {
      console.log(
        "handleCompleteOrder blocked - state is:",
        orderCompletionState,
      );
      return;
    }

    console.log("Starting order completion...");
    setCompletingOrder(true);
    setOrderCompletionState("completing");

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setCompletingOrder(false);
      return;
    }

    try {
      setOrderStatus("Completed");
      setCompletedTime(new Date().toLocaleString());
      setShowCompletionPrompt(false);
      resetCountdown();

      const flatPackageItems = familyPackItems.map((item) => ({
        id: item.originalItemId,
        isPacked: 1,
      }));

      const selectedAdditionalItems = additionalItems.map((item) => ({
        id: parseInt(item.id),
        isPacked: 1,
      }));

      const updateData = {
        orderId: item.orderId,
        packageItems: flatPackageItems,
        additionalItems: selectedAdditionalItems,
        status: "Completed",
        isComplete: 1,
      };

      const token = await AsyncStorage.getItem("token");
      const response = await axios.put(
        `${environment.API_BASE_URL}api/distribution/update-order/${item.orderId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setFamilyPackItems((prev) =>
          prev.map((item) => ({ ...item, selected: true })),
        );
        setAdditionalItems((prev) =>
          prev.map((item) => ({ ...item, selected: true })),
        );
        setHasUnsavedChanges(false);

        try {
          await axios.put(
            `${environment.API_BASE_URL}api/distribution/update-distributed-target/${item.orderId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
          console.log("Distributed target updated successfully");
        } catch (distributedTargetError) {
          console.error(
            "Error updating distributed target:",
            distributedTargetError,
          );
        }

        setOrderCompletionState("completed");
        setShowSuccessModal(true);
        setCompletingOrder(false);
      } else {
        throw new Error(
          response.data.message ||
            t("PendingOrderScreen.Failed to complete order"),
        );
      }
    } catch (error) {
      console.error("Error completing order:", error);

      setCompletingOrder(false);

      setCompletingOrder(false);
      setOrderCompletionState("idle");
      setOrderStatus("Opened");
      setCompletedTime(null);

      Alert.alert(t("Error.Error"), t("Error.Failed to complete order"), [
        {
          text: t("Error.Ok"),
          onPress: () => {
            setShowCompletionPrompt(true);
            startCountdown();
          },
        },
      ]);
    }
  };

  const startCountdown = () => {
    if (orderCompletionState !== "idle") {
      return;
    }

    setCountdown(30);
    setShowCompletionPrompt(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCountdownInterval(null);

          if (orderCompletionState === "idle") {
            handleCompleteOrder();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCountdownInterval(interval as any);
  };

  const [replaceData, setReplaceData] = useState<ReplaceProductData>({
    selectedProduct: "",
    selectedProductPrice: "",
    productType: 0,
    newProduct: "",
    quantity: "",
    price: "",
    productTypeName: "",
  });

  const isFormComplete =
    replaceData.newProduct && replaceData.quantity && replaceData.price;

  const togglePackageExpansion = (packageId: number) => {
    setPackageExpansions((prev) => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
  };

  const isPackageExpanded = (packageId: number) => {
    return packageExpansions[packageId] || false;
  };

  const getPackageGroups = () => {
    const groups: { [key: number]: FamilyPackItem[] } = {};

    familyPackItems.forEach((item) => {
      if (!groups[item.packageId]) {
        groups[item.packageId] = [];
      }
      groups[item.packageId].push(item);
    });

    return Object.entries(groups).map(([packageId, items]) => {
      const packageQty = items[0]?.packageQty || 1;
      const basePackageName = items[0]?.packageName || `Package ${packageId}`;

      return {
        packageId: parseInt(packageId),
        packageName: basePackageName,
        packageQty: packageQty,
        items,
        allSelected: items.every((item) => item.selected),
        someSelected: items.some((item) => item.selected),
      };
    });
  };

  const filteredItems = retailItems.filter((product) =>
    product.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleReplaceProduct = (item: FamilyPackItem) => {
    if (orderStatus === "Completed") {
      Alert.alert(
        t("Error.Info"),
        t("Error.Cannot replace products in completed orders"),
      );
      return;
    }

    setTimeout(() => {
      const weightKg = parseFloat(item.weight) || 0;
      const itemPrice = parseFloat(item.price) || 0;
      const totalPrice = itemPrice.toFixed();

      const numericPrice = itemPrice;

      setReplaceData({
        selectedProduct: `${item.name} - ${item.weight}Kg - Rs.${totalPrice}`,
        selectedProductPrice: numericPrice.toString(),
        productType: item.productType || 0,
        newProduct: "",
        quantity: "",
        price: `Rs.${totalPrice}`,
        productTypeName: item.productTypeName || "",
      });

      setIsReplacementPriceHigher(false);
      setSelectedItemForReplace(item);
      setShowReplaceModal(true);
    }, 100);
  };

  const handleReplaceSubmit = async () => {
    if (
      !replaceData.newProduct ||
      !replaceData.quantity ||
      !replaceData.price
    ) {
      Alert.alert(t("Error.Error"), t("Error.Please fill all required fields"));
      return;
    }

    if (!packageId) {
      Alert.alert(t("Error.Error"), t("Error.Package ID not found"));
      return;
    }

    if (!selectedItemForReplace) {
      Alert.alert(
        t("Error.Error"),
        t("Error.No item selected for replacement"),
      );
      return;
    }

    setRequestLoading(true);
    try {
      const selectedRetailItem = retailItems.find(
        (item) => item.displayName === replaceData.newProduct,
      );

      if (!selectedRetailItem) {
        throw new Error(t("PendingOrderScreen.Selected product not found"));
      }

      const priceValue = (() => {
        if (!replaceData.price) return 0;

        const priceString = replaceData.price.toString();

        const match = priceString.match(/\d+\.?\d*/);

        if (!match) return 0;

        const numericValue = match[0];

        const parsed = parseFloat(numericValue);

        return isNaN(parsed) ? 0 : parsed;
      })();

      const replacementRequest = {
        orderPackageId: packageId,
        replaceId: selectedItemForReplace.originalItemId,
        originalItemId: selectedItemForReplace.originalItemId,
        productType: selectedItemForReplace.productType,
        productId: selectedRetailItem.id,
        qty: replaceData.quantity,
        price: priceValue,
        status: "Pending",
      };

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(t("Error.error"), t("Error.User not authenticated."));
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      const response = await axios.post(
        `${environment.API_BASE_URL}api/distribution/replace-order-package`,
        replacementRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const successMessage =
          jobRole === "Distribution Centre Manager"
            ? t("Error.Product replacement successful!")
            : t("Error.Replacement request submitted successfully");

        Alert.alert(t("Error.Success"), successMessage, [
          {
            text: t("Error.Ok"),
            onPress: () => {
              setShowReplaceModal(false);
              setShowDropdown(false);
              setSelectedItemForReplace(null);
              setSearchQuery("");
              setReplaceData({
                selectedProduct: "",
                selectedProductPrice: "",
                productType: 0,
                newProduct: "",
                quantity: "",
                price: "",
                productTypeName: "",
              });
            },
          },
        ]);
      } else {
        throw new Error(
          response.data.message ||
            t("PendingOrderScreen.Failed to submit replacement request"),
        );
      }
    } catch (error) {
      console.error("Error submitting replacement request:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          console.log("403 Error Details:", error.response?.data);
          const errorMessage =
            error.response?.data?.message ||
            "You don't have permission to create replacement requests.";

          Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
        } else if (error.response?.status === 401) {
          Alert.alert(
            t("Error.Authentication Error"),
            t("Error.Your session has expired"),
          );
        } else if (error.response?.status === 400) {
          console.log("400 Error Response:", error.response?.data);
          Alert.alert(
            t("Error.Invalid Request"),
            t("Error.Please check your input data and try again"),
          );
        } else if (error.response?.status === 500) {
          Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
        } else {
          Alert.alert(
            t("Error.Error"),
            t("Error.Failed to submit replacement request"),
          );
        }
      } else {
        Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      }
    } finally {
      setRequestLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowReplaceModal(false);
    setShowDropdown(false);
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return;
    }
    try {
      const flatPackageItems = familyPackItems.map((item) => ({
        id: item.originalItemId,
        isPacked: item.selected ? 1 : 0,
      }));

      const selectedAdditionalItems = additionalItems.map((item) => ({
        id: parseInt(item.id),
        isPacked: item.selected ? 1 : 0,
      }));

      const allFamilyPacked =
        familyPackItems.length === 0 ||
        familyPackItems.every((item) => item.selected);
      const allAdditionalPacked =
        additionalItems.length === 0 ||
        additionalItems.every((item) => item.selected);
      const newStatus =
        allFamilyPacked && allAdditionalPacked ? "Completed" : "Opened";

      const updateData = {
        orderId: item.orderId,
        packageItems: flatPackageItems,
        additionalItems: selectedAdditionalItems,
        status: newStatus,
        isComplete: newStatus === "Completed" ? 1 : 0,
      };

      const token = await AsyncStorage.getItem("token");

      const response = await axios.put(
        `${environment.API_BASE_URL}api/distribution/update-order/${item.orderId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        setOrderStatus(newStatus);
        if (newStatus === "Completed") {
          setCompletedTime(new Date().toLocaleString());

          try {
            const distributedTargetResponse = await axios.put(
              `${environment.API_BASE_URL}api/distribution/update-distributed-target/${item.orderId}`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (distributedTargetResponse.data.success) {
            } else {
              console.warn(
                "Distributed target update failed:",
                distributedTargetResponse.data.message,
              );
            }
          } catch (distributedTargetError) {
            console.error(
              "Error updating distributed target:",
              distributedTargetError,
            );
          }
        }

        Alert.alert(t("Error.Success"), t("Error.Order updated successfully"), [
          { text: t("Error.Ok"), onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.data.message || t("Error.somethingWentWrong"));
      }

      setHasUnsavedChanges(false);
      setShowSubmitModal(false);
    } catch (error) {
      console.error("Error updating order:", error);

      Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      setShowSubmitModal(false);
    }
  };

  const handleSubmitPress = () => {
    const hasFamily = familyPackItems.length > 0;
    const hasAdditional = additionalItems.length > 0;

    let allSelected = false;

    if (hasFamily && hasAdditional) {
      allSelected =
        areAllFamilyPackItemsSelected() && areAllAdditionalItemsSelected();
    } else if (hasFamily && !hasAdditional) {
      allSelected = areAllFamilyPackItemsSelected();
    } else if (!hasFamily && hasAdditional) {
      allSelected = areAllAdditionalItemsSelected();
    }

    if (allSelected) {
      setIsUserInitiatedCompletion(true);
      setShowCompletionPrompt(true);
      startCountdown();
    } else {
      handleSubmit();
    }
  };

  const handleBackToEdit = () => {
    setShowCompletionPrompt(false);
    setIsUserInitiatedCompletion(false);
    setCompletingOrder(false);
    resetCountdown();
  };

  useEffect(() => {
    const hasFamily = familyPackItems.length > 0;
    const hasAdditional = additionalItems.length > 0;

    let hasSelections = false;

    if (hasFamily && hasAdditional) {
      hasSelections =
        hasFamilyPackSelections() || hasAdditionalItemSelections();
    } else if (hasFamily && !hasAdditional) {
      hasSelections = hasFamilyPackSelections();
    } else if (!hasFamily && hasAdditional) {
      hasSelections = hasAdditionalItemSelections();
    }

    setShowWarning(hasSelections);
  }, [familyPackItems, additionalItems]);

  const renderCheckbox = (selected: boolean) => (
    <View
      className={`w-6 h-6 border-2 rounded ${selected ? "bg-black border-black" : "border-gray-300 bg-white"} items-center justify-center ${orderStatus === "Completed" ? "opacity-50" : ""}`}
    >
      {selected && <AntDesign name="check" size={14} color="white" />}
    </View>
  );

  const statusText = () => {
    switch (orderStatus) {
      case "Completed":
        return t("Completed");
      case "Opened":
        return t("Opened");
      case "In Progress":
        return t("InProgress");
      default:
        return t("Pending");
    }
  };

  const fetchRetailItems = async () => {
    try {
      setLoadingRetailItems(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(t("Error.error"), t("Error.User not authenticated."));
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution/all-retail-items/${item.orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data && Array.isArray(response.data)) {
        const processedItems = response.data.map((item) => ({
          ...item,
          normalPrice: parseFloat(item.normalPrice) || 0,
          discountedPrice: parseFloat(item.discountedPrice) || 0,
        }));
        setRetailItems(processedItems);
      } else {
        console.error("Invalid retail items response:", response.data);
        setRetailItems([]);
      }
    } catch (error) {
      console.error("Error fetching retail items:", error);

      Alert.alert(t("Error.Error"), t("Error.somethingWentWrong"));
      setRetailItems([]);
    } finally {
      setLoadingRetailItems(false);
    }
  };

  useEffect(() => {
    if (showReplaceModal) {
      fetchRetailItems();
    }
  }, [showReplaceModal]);

  const renderReplaceModal = () => {
    const isFormComplete =
      replaceData.newProduct && replaceData.quantity && replaceData.price;

    const handleProductSelect = (product: RetailItem) => {
      const selectedProductPrice =
        parseFloat(replaceData.selectedProductPrice) || 0;
      const newProductPrice =
        product.discountedPrice || product.normalPrice || 0;

      setReplaceData((prev) => ({
        ...prev,
        newProduct: product.displayName,
        price: `Rs.${newProductPrice.toFixed(2)}`,
      }));

      setIsReplacementPriceHigher(newProductPrice > selectedProductPrice);
      setShowDropdown(false);
    };

    const handleQuantityChange = (text: string) => {
      if (/^\d*\.?\d*$/.test(text)) {
        const selectedProduct = retailItems.find(
          (item) => item.displayName === replaceData.newProduct,
        );
        const price = selectedProduct
          ? selectedProduct.discountedPrice || selectedProduct.normalPrice || 0
          : 0;
        const totalPrice = text ? parseFloat(text) * price : price;
        const selectedProductPrice =
          parseFloat(replaceData.selectedProductPrice) || 0;

        setReplaceData((prev) => ({
          ...prev,
          quantity: text,
          price: text
            ? `Rs.${totalPrice.toFixed(2)}`
            : `Rs.${price.toFixed(2)}`,
        }));

        setIsReplacementPriceHigher(totalPrice > selectedProductPrice);
      }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReplaceModal}
        onRequestClose={handleModalClose}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-lg mx-6 p-6 w-80">
            <View className="justify-between items-center mb-4">
              <Text className="text-lg font-semibold">
                {t("PendingOrderScreen.Replace Product")}
              </Text>
            </View>

            <View>
              <View className="border border-red-300 rounded-lg p-3 mb-4 justify-center items-center">
                <Text className="text-sm text-[#7B7B7B] mb-1">
                  {t("PendingOrderScreen.Selected product")}
                </Text>
                <Text className="font-medium mb-2">
                  {replaceData.selectedProduct}
                </Text>
                <Text className="text-sm text-[#7B7B7B] mb-1">
                  {t("PendingOrderScreen.Product Type")}
                </Text>
                <Text className="font-medium">
                  {replaceData.productTypeName}
                </Text>
              </View>

              <Text className="text-center text-black mb-4">
                -- {t("PendingOrderScreen.New Product Details")}--
              </Text>

              {/* Product Selection */}
              <View className="mb-4">
                {showDropdown ? (
                  <View>
                    <View className="">
                      <TextInput
                        placeholder={t("PendingOrderScreen.Search products...")}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="w-full p-3 border border-black rounded-full flex-row justify-between items-center bg-white"
                        placeholderTextColor="#888"
                      />
                    </View>
                    <View className="border border-t-0 border-gray-300 rounded-b-lg bg-white max-h-32">
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {loadingRetailItems ? (
                          <View className="p-3 items-center">
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
                              <Text className="font-medium">
                                {product.displayName}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {t("PendingOrderScreen.Rs")}.
                                {(
                                  product.discountedPrice ||
                                  product.normalPrice ||
                                  0
                                ).toFixed(2)}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View className="p-3 items-center">
                            <Text className="text-gray-500">
                              {t("PendingOrderScreen.No products available")}
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="border border-black rounded-full p-3 flex-row justify-between items-center bg-white"
                    onPress={() => setShowDropdown(!showDropdown)}
                  >
                    <Text
                      className={
                        replaceData.newProduct ? "text-black" : "text-gray-400"
                      }
                    >
                      {replaceData.newProduct || "--Select New Product--"}
                    </Text>
                    <AntDesign
                      name={showDropdown ? "up" : "down"}
                      size={16}
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Quantity Input */}
              <View className="mb-4">
                <TextInput
                  className="border border-black rounded-full p-3 bg-white"
                  placeholder="Enter Quantity"
                  value={replaceData.quantity}
                  onChangeText={handleQuantityChange}
                  keyboardType="numeric"
                />
              </View>

              {/* Price Display (read-only) */}
              <View className="mb-6">
                <View className="border border-black rounded-full p-3 bg-gray-100">
                  <Text className="text-black">{replaceData.price}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  className={`py-3 rounded-full px-3 ${
                    isFormComplete && !isReplacementPriceHigher
                      ? "bg-[#FA0000]"
                      : "bg-[#FA0000]/50"
                  }`}
                  onPress={
                    isFormComplete && !isReplacementPriceHigher
                      ? handleReplaceSubmit
                      : undefined
                  }
                  disabled={
                    !isFormComplete ||
                    isReplacementPriceHigher ||
                    requestLoading == true
                  }
                >
                  {requestLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-medium">
                      {jobRole === "Distribution Centre Manager"
                        ? t("PendingOrderScreen.Update")
                        : t("PendingOrderScreen.Send Replace Request")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-[#D9D9D9] py-3 rounded-full px-3"
                  onPress={handleModalClose}
                >
                  <Text className="text-[#686868] text-center font-medium">
                    {" "}
                    {t("PendingOrderScreen.Go Back")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getDynamicStatus = (): "Pending" | "Opened" | "Completed" => {
    const hasFamily = familyPackItems.length > 0;
    const hasAdditional = additionalItems.length > 0;

    if (!hasFamily && !hasAdditional) {
      return "Pending";
    }

    const packageGroups = getPackageGroups();

    // Count package states
    let completedPackagesCount = 0;
    let openedPackagesCount = 0;
    let pendingPackagesCount = 0;

    if (packageGroups.length > 0) {
      packageGroups.forEach((packageGroup) => {
        const allSelected = packageGroup.items.every((item) => item.selected);
        const someSelected = packageGroup.items.some((item) => item.selected);

        if (allSelected) {
          completedPackagesCount++;
        } else if (someSelected) {
          openedPackagesCount++;
        } else {
          pendingPackagesCount++;
        }
      });
    }

    const additionalAllSelected = areAllAdditionalItemsSelected();
    const additionalSomeSelected = hasAdditionalItemSelections();
    const additionalNoneSelected =
      !additionalSomeSelected && additionalItems.length > 0;

    if (hasFamily && hasAdditional) {
      const allPackagesCompleted =
        completedPackagesCount === packageGroups.length;

      if (allPackagesCompleted && additionalAllSelected) {
        return "Completed";
      }

      if (pendingPackagesCount > 0 || additionalNoneSelected) {
        return "Pending";
      }

      if (openedPackagesCount > 0 || additionalSomeSelected) {
        return "Opened";
      }

      return "Pending";
    } else if (hasFamily && !hasAdditional) {
      if (completedPackagesCount === packageGroups.length) {
        return "Completed";
      }

      if (pendingPackagesCount > 0) {
        return "Pending";
      }

      if (openedPackagesCount > 0) {
        return "Opened";
      }

      return "Pending";
    } else if (!hasFamily && hasAdditional) {
      if (additionalAllSelected) {
        return "Completed";
      } else if (additionalSomeSelected) {
        return "Opened";
      } else {
        return "Pending";
      }
    }

    return "Pending";
  };

  const getStatusText = (
    status: "Pending" | "Opened" | "Completed" | "In Progress",
  ) => {
    switch (status) {
      case "Pending":
        return selectedLanguage === "si"
          ? "අපරිපූර්ණ"
          : selectedLanguage === "ta"
            ? "நிலுவையில்"
            : t("Status.Pending") || "Pending";
      case "Opened":
        return selectedLanguage === "si"
          ? "විවෘත කළ"
          : selectedLanguage === "ta"
            ? "திறக்கப்பட்டது"
            : t("Status.Opened") || "Opened";
      case "In Progress":
        return selectedLanguage === "si"
          ? "සිදු කෙරේ"
          : selectedLanguage === "ta"
            ? "செயல்பாட்டில்"
            : t("Status.InProgress") || "In Progress";
      case "Completed":
        return selectedLanguage === "si"
          ? "සම්පූර්ණයි"
          : selectedLanguage === "ta"
            ? "நிறைவானது"
            : t("Status.Completed") || "Completed";
      default:
        return status;
    }
  };

  // Get styling based on status
  const getStatusStyling = (
    status: "Pending" | "Opened" | "Completed" | "In Progress",
  ) => {
    switch (status) {
      case "Completed":
        return {
          badge: "bg-[#D4F7D4] border border-[#4CAF50]",
          text: "text-[#2E7D32]",
        };
      case "Opened":
        return {
          badge: "bg-[#FFF9C4] border border-[#F9CC33]",
          text: "text-[#B8860B]",
        };
      case "In Progress":
        return {
          badge: "bg-[#E3F2FD] border border-[#2196F3]",
          text: "text-[#1565C0]",
        };
      default: // Pending
        return {
          badge: "bg-[#FFB9B7] border border-[#FFB9B7]",
          text: "text-[#D16D6A]",
        };
    }
  };

  const DynamicStatusBadge = () => {
    // Use the dynamic getDynamicStatus() instead of static route params
    const currentStatus = getDynamicStatus();
    const styling = getStatusStyling(currentStatus);
    const statusText = getStatusText(currentStatus);

    return (
      <View className="mx-4 mt-4 mb-3 justify-center items-center">
        <View className={`px-3 py-2 rounded-full ${styling.badge}`}>
          <Text className={`font-medium text-sm ${styling.text}`}>
            {statusText}
          </Text>
        </View>
      </View>
    );
  };

  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal && orderCompletionState === "completed"}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowSuccessModal(false);
        // setOrderCompletionState('idle'); // Reset for next time
        navigation.goBack();
      }}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            {/* Success icon can go here */}
          </View>
          <Text className="text-xl font-bold text-center mb-2">
            {t("PendingOrderScreen.Completed Successfully")}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {t("PendingOrderScreen.TheOrder")}
          </Text>

          <TouchableOpacity
            className="bg-black py-3 rounded-full"
            onPress={() => {
              setShowSuccessModal(false);
              setOrderCompletionState("idle");
              setTimeout(() => {
                navigation.goBack();
              }, 100);
            }}
          >
            <Text className="text-white text-center font-medium">
              {t("PendingOrderScreen.OK")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  useEffect(() => {
    return () => {
      setShowSuccessModal(false);
      setShowCompletionPrompt(false);
      setOrderCompletionState("idle");
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, []);

  const resetCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setCountdown(30);
    setShowCompletionPrompt(false);
  };

  const getWarningMessage = (allSelected: boolean) => {
    if (allSelected) {
      if (selectedLanguage === "si") {
        return (
          <>
            සියල්ල පරීක්ෂා කර ඇත. ඇණවුම සුරකින විට{" "}
            <Text style={{ fontWeight: "bold" }}>'සම්පූර්ණයි'</Text> තත්වයට මාරු
            වේ.
          </>
        );
      } else if (selectedLanguage === "ta") {
        return (
          <>
            அனைத்தும் சரிபார்க்கப்பட்டது. சேமிக்கும்போது ஆர்டர்{" "}
            <Text style={{ fontWeight: "bold" }}>'நிறைவானது'</Text> நிலைக்கு
            மாறும்.
          </>
        );
      } else {
        return (
          <>
            All checked. Order will move to{" "}
            <Text style={{ fontWeight: "bold" }}>'Completed'</Text> on save.
          </>
        );
      }
    } else {
      const currentStatus = getDynamicStatus();

      if (currentStatus !== "Opened") {
        return null;
      }

      if (selectedLanguage === "si") {
        return (
          <>
            පරීක්ෂා නොකළ අයිතම ඉතිරිව ඇත. දැන් සුරැකීමෙන් ඇණවුම{" "}
            <Text style={{ fontWeight: "bold" }}>'විවෘත කර ඇත'</Text> තත්වයේ
            පවතී.
          </>
        );
      } else if (selectedLanguage === "ta") {
        return (
          <>
            சரிபார்க்கப்படாத உருப்படிகள் உள்ளன. இப்போது சேமிப்பது ஆர்டரை{" "}
            <Text style={{ fontWeight: "bold" }}>'திறக்கப்பட்டது'</Text>{" "}
            நிலையில் வைத்திருக்கும்.
          </>
        );
      } else {
        return (
          <>
            Unchecked items remain. Saving now keeps the order in{" "}
            <Text style={{ fontWeight: "bold" }}>'Opened'</Text> Status.
          </>
        );
      }
    }
  };

  const getFinishUpMessage = () => {
    if (selectedLanguage === "si") {
      return "අවසන් කරන්න!";
    } else if (selectedLanguage === "ta") {
      return "முடிக்கவும்!";
    } else {
      return "Finish up!";
    }
  };

  const getMarkingAsMessage = () => {
    if (selectedLanguage === "si") {
      return "තත්පර 30 කින් සම්පූර්ණ ලෙස සලකුණු වේ.";
    } else if (selectedLanguage === "ta") {
      return "30 வினாடிகளில் முழுமையானதாக குறிக்கப்படுகிறது.";
    } else {
      return "Marking as completed in 30 seconds.";
    }
  };

  const getTapGoBackMessage = () => {
    if (selectedLanguage === "si") {
      return "සංස්කරණය කිරීමට 'සංස්කරණය වෙත ආපසු' ස්පර්ශ කරන්න.";
    } else if (selectedLanguage === "ta") {
      return "திருத்த 'திருத்தத்திற்கு திரும்பவும்' என்பதைத் தொடவும்.";
    } else {
      return "Tap 'Go Back' to edit.";
    }
  };

  const calculateAllSelected = () => {
    const hasFamily = familyPackItems.length > 0;
    const hasAdditional = additionalItems.length > 0;

    if (hasFamily && hasAdditional) {
      return areAllFamilyPackItemsSelected() && areAllAdditionalItemsSelected();
    } else if (hasFamily && !hasAdditional) {
      return areAllFamilyPackItemsSelected();
    } else if (!hasFamily && hasAdditional) {
      return areAllAdditionalItemsSelected();
    }
    return false;
  };

  const UnsavedChangesModal = () => (
    <Modal
      visible={showUnsavedModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowUnsavedModal(false)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-lg font-semibold text-center mb-2">
            {t("PendingOrderScreen.You have unsubmitted changes")}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {t(
              "OpenedOrderScreen.If you leave this page now, your changes will be lost.",
            )}
            {"\n"}
            {t("OpenedOrderScreen.Do you want to continue without saving?")}
          </Text>

          <TouchableOpacity
            className="bg-black py-3 rounded-full mb-3"
            onPress={() => setShowUnsavedModal(false)}
          >
            <Text className="text-white text-center font-medium">
              {t("OpenedOrderScreen.Stay on page")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-200 py-3 rounded-full"
            onPress={() => {
              setShowUnsavedModal(false);
              navigation.goBack();
            }}
          >
            <Text className="text-gray-700 text-center">
              {t("OpenedOrderScreen.Leave without Submitting")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const SubmitModal = () => (
    <Modal
      visible={showSubmitModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSubmitModal(false)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <Text className="text-lg font-semibold text-center mb-2">
            {t("PendingOrderScreen.You have unsubmitted changes")}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {t(
              "OpenedOrderScreen.If you leave this page now, your changes will be lost.",
            )}
            {"\n"}
            {t("OpenedOrderScreen.Do you want to continue without saving?")}
          </Text>

          <TouchableOpacity
            className="bg-black py-3 rounded-full mb-3"
            onPress={() => {
              setShowSubmitModal(false);
              handleSubmit();
            }}
          >
            <Text className="text-white text-center font-medium">
              {t("OpenedOrderScreen.Stay on page")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-200 py-3 rounded-full"
            onPress={() => setShowSubmitModal(false)}
          >
            <Text className="text-gray-700 text-center">
              {" "}
              {t("PendingOrderScreen.Leave without Submitting")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  {
    /* Completion Prompt Modal */
  }
  <Modal
    visible={showCompletionPrompt}
    transparent={true}
    animationType="fade"
    onRequestClose={() => {
      handleBackToEdit();
    }}
  >
    <View className="flex-1 bg-black/50 justify-center items-center px-6">
      <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
        {/* Title */}
        <Text className="text-xl font-bold text-center mb-2">
          {t("PendingOrderScreen.FinishUp")}
        </Text>

        {/* Description text */}
        <Text className="text-gray-600 text-center mb-2">
          {t("PendingOrderScreen.Marking as completed in")}
          {countdown} {t("PendingOrderScreen.seconds")}
        </Text>
        <Text className="text-gray-500 text-sm text-center mb-6">
          {t("PendingOrderScreen.TapGoback")}
        </Text>

        {/* Countdown timer - styled as 00:30 format */}
        <View className="flex-row justify-center mb-6">
          <Text className="text-3xl font-bold text-gray-800">
            00:{countdown.toString().padStart(2, "0")}
          </Text>
        </View>

        <TouchableOpacity
          className="bg-[#4CAF50] py-4 rounded-full mb-3 flex-row justify-center items-center"
          onPress={handleCompleteOrder}
          disabled={completingOrder}
        >
          {completingOrder ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white text-center font-bold text-base">
              {t("PendingOrderScreen.Mark as Completed")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Secondary action button - light gray */}
        <TouchableOpacity
          className="bg-gray-200 py-4 rounded-full"
          onPress={handleBackToEdit}
        >
          <Text className="text-gray-700 text-center font-medium text-base">
            {t("PendingOrderScreen.Back to Edit")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 flex-row items-center ">
        <TouchableOpacity
          onPress={handleBackPress}
          className="absolute left-4 bg-[#F6F6F680] rounded-full p-2 z-10"
        >
          <AntDesign name="left" size={24} color="#333" />
        </TouchableOpacity>
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-800 text-lg font-medium">
            {t("OpenedOrderScreen.INV No")} {orderData.invoiceNo}
          </Text>
        </View>
      </View>

      {isLoading || !isDataLoaded || completingOrder ? (
        <View className="flex-1 justify-center items-center py-20">
          <LottieView
            source={require("../../assets/lottie/newLottie.json")}
            autoPlay
            loop
            style={{ width: 200, height: 200 }}
          />
          {completingOrder && (
            <Text className="mt-4 text-gray-600 font-medium">
              {t("PendingOrderScreen.Completing order")}
            </Text>
          )}
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: orderStatus === "Completed" ? 20 : 100,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#000000"]}
                tintColor={"#000000"}
              />
            }
          >
            {/* Dynamic Status Badge */}
            <View className="mx-4 mt-4 mb-3 justify-center items-center">
              <DynamicStatusBadge />
            </View>

            {familyPackItems.length > 0 && (
              <View className="mx-4 mb-3">
                {getPackageGroups().map((packageGroup, index) => (
                  <View
                    key={packageGroup.packageId}
                    className={index > 0 ? "mt-3" : ""}
                  >
                    <TouchableOpacity
                      className={`px-4 py-3 rounded-lg flex-row justify-between items-center ${
                        packageGroup.allSelected || orderStatus === "Completed"
                          ? "bg-[#D4F7D4] border border-[#4CAF50]"
                          : packageGroup.someSelected
                            ? "bg-[#FFF9C4] border border-[#F9CC33]"
                            : "bg-[#FFF8F8] border border-[#D16D6A]"
                      } ${orderStatus === "Completed" ? "opacity-100" : ""}`}
                      onPress={() =>
                        togglePackageExpansion(packageGroup.packageId)
                      }
                    >
                      <View className="flex-row items-center">
                        <Text className="text-[#000000] font-normal">
                          {packageGroup.packageName}
                        </Text>
                        {packageGroup.packageQty > 1 && (
                          <Text className="text-black font-bold ml-1">
                            (x{packageGroup.packageQty})
                          </Text>
                        )}
                        {orderStatus === "Completed" &&
                          packageGroup.allSelected && (
                            <Text className="text-[#000000] font-medium ml-1">
                              ✓
                            </Text>
                          )}
                      </View>
                      <AntDesign
                        name={
                          isPackageExpanded(packageGroup.packageId)
                            ? "up"
                            : "down"
                        }
                        size={16}
                        color="#000000"
                      />
                    </TouchableOpacity>

                    {/* Expanded content remains the same */}
                    {isPackageExpanded(packageGroup.packageId) && (
                      <View
                        className={`bg-white border border-t-0 rounded-b-lg px-4 py-4 ${
                          packageGroup.allSelected ||
                          orderStatus === "Completed"
                            ? "border-[#4CAF50]"
                            : packageGroup.someSelected
                              ? "border-[#F9CC33]"
                              : "border-[#D16D6A]"
                        }`}
                      >
                        {packageGroup.items.map((item) => (
                          <View
                            key={item.id}
                            className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                          >
                            <View className="flex-row items-center flex-1">
                              {orderStatus !== "Completed" && (
                                <View className="w-8 h-8 items-center justify-center mr-3">
                                  {item.selected ? (
                                    // Show disabled image (not clickable)
                                    <Image
                                      source={disable}
                                      style={{
                                        width: 20,
                                        height: 20,
                                        opacity: 0.5,
                                      }}
                                    />
                                  ) : (
                                    // Show clickable red icon
                                    <TouchableOpacity
                                      onPress={() => handleReplaceProduct(item)}
                                    >
                                      <Image
                                        source={RedIcon}
                                        style={{ width: 20, height: 20 }}
                                      />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                              <View className="flex-1">
                                <Text
                                  className={`font-medium text-black ${
                                    orderStatus === "Completed" && item.selected
                                      ? "text-black"
                                      : orderStatus === "Completed"
                                        ? "text-black"
                                        : "text-black"
                                  }`}
                                >
                                  {item.name}
                                </Text>
                                <Text className="text-gray-500 text-sm">
                                  {item.weight}Kg
                                </Text>
                              </View>
                            </View>

                            {/* Show different indicators for completed vs active orders */}
                            {orderStatus === "Completed" ? (
                              <View className="w-6 h-6 items-center justify-center">
                                {item.selected ? (
                                  <AntDesign
                                    name="check-circle"
                                    size={20}
                                    color="black"
                                  />
                                ) : (
                                  <AntDesign
                                    name="close-circle"
                                    size={20}
                                    color="#F44336"
                                  />
                                )}
                              </View>
                            ) : (
                              <TouchableOpacity
                                onPress={() => toggleFamilyPackItem(item.id)}
                              >
                                {renderCheckbox(item.selected)}
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Additional Items Section - User controls expansion for all order statuses */}
            {additionalItems.length > 0 && (
              <View className="mx-4 mb-6">
                <TouchableOpacity
                  className={`px-4 py-3 rounded-lg flex-row justify-between items-center ${
                    orderStatus === "Completed"
                      ? "bg-[#D4F7D4] border border-[#4CAF50]"
                      : areAllAdditionalItemsSelected()
                        ? "bg-[#D4F7D4] border border-[#4CAF50]"
                        : hasAdditionalItemSelections()
                          ? "bg-[#FFF9C4] border border-[#F9CC33]"
                          : "bg-[#FFF8F8] border border-[#D16D6A]"
                  }`}
                  onPress={() =>
                    setAdditionalItemsExpanded(!additionalItemsExpanded)
                  }
                >
                  <Text className="text-[#000000] font-medium">
                    {t("PendingOrderScreen.Custom Selected Items")}
                    {orderStatus === "Completed" &&
                      areAllAdditionalItemsSelected() &&
                      " ✓"}
                  </Text>
                  <AntDesign
                    name={additionalItemsExpanded ? "up" : "down"}
                    size={16}
                    color="#000000"
                  />
                </TouchableOpacity>

                {additionalItemsExpanded && (
                  <View
                    className={`bg-white border border-t-0 rounded-b-lg px-4 py-4 ${
                      orderStatus === "Completed"
                        ? "border-[#4CAF50]"
                        : areAllAdditionalItemsSelected()
                          ? "border-[#4CAF50]"
                          : hasAdditionalItemSelections()
                            ? "border-[#F9CC33]"
                            : "border-[#D16D6A]"
                    }`}
                  >
                    {additionalItems.map((item) => (
                      <View
                        key={item.id}
                        className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text
                            className={`font-medium ${
                              orderStatus === "Completed" && item.selected
                                ? "text-black"
                                : orderStatus === "Completed"
                                  ? "text-gray-600 line-through"
                                  : "text-black"
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {item.weight}Kg
                          </Text>
                        </View>

                        {/* Show completion status for completed orders */}
                        {orderStatus === "Completed" ? (
                          <View className="w-6 h-6 items-center justify-center">
                            {item.selected ? (
                              <AntDesign
                                name="check-circle"
                                size={20}
                                color="black"
                              />
                            ) : (
                              <AntDesign
                                name="close-circle"
                                size={20}
                                color="#F44336"
                              />
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => toggleAdditionalItem(item.id)}
                          >
                            {renderCheckbox(item.selected)}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {showWarning && orderStatus !== "Completed" && (
              <View className="mx-4 mb-4 bg-white px-4 py-2">
                <Text
                  className="text-sm text-center italic"
                  style={{
                    color: (() => {
                      const allSelected = calculateAllSelected();
                      return allSelected ? "#308233" : "#FA0000";
                    })(),
                  }}
                >
                  {getWarningMessage(calculateAllSelected())}
                </Text>
              </View>
            )}
          </ScrollView>

          <UnsavedChangesModal />
          <SubmitModal />
          <SuccessModal />

          {orderStatus !== "Completed" && (
            <View className="absolute bottom-0 left-2 right-2 bg-white px-4 py-4">
              <TouchableOpacity
                className={`py-3 rounded-full px-3 ${showWarning ? "bg-black" : "bg-gray-400"}`}
                onPress={handleSubmitPress}
                disabled={!showWarning}
              >
                <View className="justify-center items-center">
                  <Text className="text-white font-medium text-base">
                    {t("PendingOrderScreen.Save")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Modals - Only show for non-completed orders */}
          {orderStatus !== "Completed" && (
            <>
              <UnsavedChangesModal />
              <SubmitModal />
              <SuccessModal />
              {renderReplaceModal()}

              {!completingOrder && (
                <Modal
                  visible={showCompletionPrompt}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={handleBackToEdit}
                >
                  <View className="flex-1 bg-black/50 justify-center items-center px-6">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                      <Text
                        className="text-xl font-bold text-center mb-2"
                        style={[
                          i18n.language === "si"
                            ? { fontSize: 12 }
                            : i18n.language === "ta"
                              ? { fontSize: 12 }
                              : { fontSize: 15 },
                        ]}
                      >
                        {getFinishUpMessage()}
                      </Text>
                      <Text
                        className="text-gray-600 text-center mb-2"
                        style={[
                          i18n.language === "si"
                            ? { fontSize: 12 }
                            : i18n.language === "ta"
                              ? { fontSize: 12 }
                              : { fontSize: 15 },
                        ]}
                      >
                        {getMarkingAsMessage()}
                      </Text>
                      <Text
                        className="text-gray-500 text-sm text-center mb-6"
                        style={[
                          i18n.language === "si"
                            ? { fontSize: 12 }
                            : i18n.language === "ta"
                              ? { fontSize: 12 }
                              : { fontSize: 15 },
                        ]}
                      >
                        {getTapGoBackMessage()}
                      </Text>

                      {/* Timer Component */}
                      <View className="justify-center items-center mb-6">
                        <Timer
                          size={150}
                          fontSize={24}
                          minutes={0.5} // 30 seconds
                          fillColor="#000000"
                          bgColor="#FFFFFF"
                          backgroundColor="#E5E7EB"
                          showMs={false}
                          //onComplete={handleCompleteOrder}
                          onComplete={() => {
                            if (!completingOrder) {
                              handleCompleteOrder();
                            }
                          }}
                          running={showCompletionPrompt}
                          strokeWidth={6}
                        />
                      </View>

                      <TouchableOpacity
                        className="bg-[#000000] py-4 rounded-full mb-3"
                        onPress={handleCompleteOrder}
                      >
                        <Text
                          className="text-white text-center font-bold text-base"
                          style={[
                            i18n.language === "si"
                              ? { fontSize: 12 }
                              : i18n.language === "ta"
                                ? { fontSize: 12 }
                                : { fontSize: 15 },
                          ]}
                        >
                          {t("PendingOrderScreen.Mark as Completed")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="bg-gray-200 py-4 rounded-full"
                        onPress={handleBackToEdit}
                      >
                        <Text
                          className="text-gray-700 text-center font-medium text-base"
                          style={[
                            i18n.language === "si"
                              ? { fontSize: 12 }
                              : i18n.language === "ta"
                                ? { fontSize: 12 }
                                : { fontSize: 15 },
                          ]}
                        >
                          {t("PendingOrderScreen.Back to Edit")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
};

export default PendingOrderScreen;
