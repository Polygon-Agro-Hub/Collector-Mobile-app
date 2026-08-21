import store from "@/services/reducxStore";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import {
  FontAwesome5,
  FontAwesome6,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "@/types/types";
import LottieView from "lottie-react-native";
import { useTranslation } from "react-i18next";
import axios from "axios";
import environment from "@/environment/environment";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import authState, { RootState } from "@/services/reducxStore";
import { useSelector } from "react-redux";
import { ROLES } from "@/constants/user-roles";
import useUserStore from "@/store/userStore";

type CollectionOfficersListNavigationProps = StackNavigationProp<
  RootStackParamList,
  "ReadytoPickupOrders"
>;

interface CollectionOfficersListProps {
  navigation: CollectionOfficersListNavigationProps;
}

interface Order {
  orderId: string;
  userId: number;
  orderApp: string;
  createdAt: string;
  delivaryMethod: string;
  fullTotal: number;
  total: number;
  buildingType: string;
  sheduleDate: string;
  sheduleTime: string;
  processOrderId: number;
  invNo: string;
  transactionId: string;
  paymentMethod: string;
  isPaid: boolean;
  amount: number;
  packTime: string;
  creditPaid: number | null;
  remainingAmount: number;
  isFullyPaid: number;
  status: string;
  cusId: string;
  title: string;
  firstName: string;
  lastName: string;
  phoneCode: string;
  phoneNumber: string;
  phoneCode2: string;
  phoneNumber2: string;
  email: string;
  buyerType: string;
  companyName: string;
  companyPhoneCode: string;
  companyPhone: string;
  customerCity: string;
  houseNo: string;
  streetName: string;
  distributionDistrict: string;
  centerName: string;
  regCode: string;
  officerFirstName: string;
  officerLastName: string;
  fullName: string;
  outDlvrDate: string;
}

interface Customer {
  id: number;
  cusId: string;
  title: string;
  firstName: string;
  lastName: string;
  phoneCode: string;
  phoneCode2: string;
  phoneNumber: string;
  phoneNumber2: string;
}

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

interface EmptyStateProps {
  message: string;
}

const ReadytoPickupOrders: React.FC<CollectionOfficersListProps> = ({
  navigation,
}) => {
  const [searchPhone, setSearchPhone] = useState("");
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchState, setSearchState] = useState<
    "initial" | "results" | "no-orders" | "no-user" | "no-orders-at-all"
  >("initial");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const reduxRole = useSelector((state: RootState) => state.auth.jobRole);
  const storeUserRole = useUserStore((state) => state.userRole);
  const userRole = storeUserRole || reduxRole;

  const isDistributionOfficer =
    userRole === ROLES.DISTRIBUTION_OFFICER ||
    userRole === "Distribution Officer";
  const clearSearchPaddingBottom = isDistributionOfficer
    ? Math.max(insets.bottom + 16, 50)
    : Math.max(5);

  const paddingBottom = isDistributionOfficer
    ? (insets.bottom + 16, 50)
    : Math.max(0);

  const isSearching = searchPhone.trim().length > 0;

  useFocusEffect(
    useCallback(() => {
      setSearchPhone("");
      setErrorMessage("");

      fetchInitialData();
    }, []),
  );

  const fetchInitialData = async () => {
    await Promise.all([fetchOrders(), fetchCustomers()]);
  };

  const fetchCustomers = async () => {
    try {
      const token = store.getState().auth.token;

      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/pickup/check-customer`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.status === "success" && response.data.data) {
        setCustomers(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = store.getState().auth.token;

      if (!token) {
        setErrorMessage(t("Error.No authentication token found"));
        return;
      }

      const response = await axios.get(
        `${environment.API_BASE_URL}api/pickup/get-pickupOrders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success && response.data.data) {
        const ordersData = response.data.data;
        setOrders(ordersData);
        setFilteredOrders(ordersData);

        if (ordersData.length === 0) {
          setSearchState("no-orders-at-all");
        } else {
          setSearchState("initial");
        }
      } else {
        setOrders([]);
        setFilteredOrders([]);
        setSearchState("no-orders-at-all");
        setErrorMessage(
          response.data.message || t("Error.Failed to fetch orders"),
        );
      }
    } catch (error: any) {
      console.error("Error fetching pickup orders:", error);
      setOrders([]);
      setFilteredOrders([]);
      setSearchState("no-orders-at-all");

      if (error.response?.status === 404) {
        setErrorMessage(t("Error.No pickup orders available"));
      } else if (error.response?.status === 401) {
        setErrorMessage(t("Error.Authentication failed"));
      } else {
        setErrorMessage(t("Error.An error occurred while fetching orders"));
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizePhone = (phone: string): string => {
    return phone
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/^\+94/g, "")
      .replace(/^94/g, "")
      .replace(/^0/, "");
  };

  const handleSearchChange = (text: string) => {
    const numericText = text.replace(/\D/g, "");

    const limitedText = numericText.slice(0, 9);

    setSearchPhone(limitedText);

    if (limitedText.trim()) {
      const normalizedSearch = normalizePhone(limitedText);

      const results = orders.filter((order) => {
        const phone1 = normalizePhone(order.phoneNumber);
        const phone2 = order.phoneNumber2
          ? normalizePhone(order.phoneNumber2)
          : "";

        return (
          phone1 === normalizedSearch ||
          phone2 === normalizedSearch ||
          phone1.startsWith(normalizedSearch) ||
          phone2.startsWith(normalizedSearch)
        );
      });

      if (results.length > 0) {
        setFilteredOrders(results);
        setSearchState("results");
        return;
      }

      const customerExists = customers.some((customer) => {
        const phone1 = normalizePhone(customer.phoneNumber);
        const phone2 = customer.phoneNumber2
          ? normalizePhone(customer.phoneNumber2)
          : "";

        return (
          phone1 === normalizedSearch ||
          phone2 === normalizedSearch ||
          phone1.startsWith(normalizedSearch) ||
          phone2.startsWith(normalizedSearch)
        );
      });

      if (customerExists) {
        setFilteredOrders([]);
        setSearchState("no-orders");
      } else {
        setFilteredOrders([]);
        setSearchState("no-user");
      }
    } else {
      setFilteredOrders(orders);
      setSearchState(orders.length === 0 ? "no-orders-at-all" : "initial");
    }
  };
  const handleClearSearch = () => {
    setSearchPhone("");
    setFilteredOrders(orders);
    setSearchState(orders.length === 0 ? "no-orders-at-all" : "initial");
  };

  const handleOrderClick = (order: Order) => {
    navigation.navigate("ViewPickupOrders", {
      order,
      orderId: order.orderId,
    });
  };

  const formatCount = (count: number) => {
    if (count === 0) {
      return "0";
    } else if (count < 10) {
      return `0${count}`;
    } else {
      return count.toString();
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Main", { screen: "DistridutionaDashboard" });
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  const NoOrdersState = () => {
    return (
      <View className="flex-1 justify-center items-center mt-[-25%] px-4">
        <View className="items-center">
          <LottieView
            source={require("../../../../assets/lottie/no-data.json")}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
        </View>
        <Text className="text-[#828282] mb-2 text-center italic">
          - {t("ReadytoPickupOrders.No orders to be picked up")} -
        </Text>
        {errorMessage && (
          <Text className="text-red-500 text-sm mt-2 text-center">
            {errorMessage}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <LottieView
          source={require("../../../../assets/lottie/loading.json")}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
        <Text className="mt-4 text-gray-600">
          {t("ReadytoPickupOrders.Loading orders")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("ReadytoPickupOrders.Ready to Pickup Orders")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() =>
          navigation.navigate("Main", { screen: "DistridutionaDashboard" })
        }
      />

      <View className="flex-1 w-full mx-auto">
        {/* Search Bar */}
        <View className="flex-row items-center h-[50px] mx-6 mt-2 pl-4 border border-[#C0C0C0] rounded-full overflow-hidden">
          <TextInput
            className="flex-1 text-base text-black py-2"
            placeholder={t("ReadytoPickupOrders.Search by phone number")}
            placeholderTextColor="#ADADAD"
            value={searchPhone}
            onChangeText={handleSearchChange}
            keyboardType="phone-pad"
            maxLength={9}
            returnKeyType="search"
            style={{ color: "#000000" }}
          />
          {searchPhone ? (
            <TouchableOpacity
              className="w-[50px] h-full bg-[#C0C0C0] items-center justify-center border-[#C0C0C0] rounded-full"
              onPress={handleClearSearch}
            >
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          ) : (
            <View className="w-[50px] h-full bg-[#C0C0C0] items-center justify-center rounded-full border-[#C0C0C0]">
              <Ionicons name="search" size={20} color="black" />
            </View>
          )}
        </View>

        {!isSearching && (
          <View className="px-8  mt-6 flex-row items-center">
            <Text className="text-base font-medium text-gray-900">
              {t("ReadytoPickupOrders.All")} ({formatCount(orders.length)})
            </Text>
          </View>
        )}

        {isSearching && (
          <View className="px-4 py-3 flex-row items-center">
            <Text className="text-sm font-medium text-gray-900"></Text>
          </View>
        )}

        {/* Content Area */}
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            style={{ paddingBottom: paddingBottom }}
          >
            {searchState === "no-orders-at-all" && <NoOrdersState />}

            {(searchState === "initial" || searchState === "results") &&
              orders.length > 0 && (
                <View
                  style={{
                    padding: 16,
                    paddingBottom: isSearching
                      ? 16
                      : isDistributionOfficer
                        ? Math.max(insets.bottom + 24, 60)
                        : Math.max(insets.bottom + 16, 24),
                  }}
                >
                  {filteredOrders.map((order, index) => (
                    <OrderCard
                      key={`${order.orderId}-${index}`}
                      order={order}
                      onPress={() => handleOrderClick(order)}
                    />
                  ))}
                </View>
              )}

            {searchState === "no-orders" && (
              <EmptyState
                message={t(
                  "ReadytoPickupOrders.No orders from this user for pickup",
                )}
              />
            )}

            {searchState === "no-user" && (
              <EmptyState
                message={t(
                  "ReadytoPickupOrders.No registered customer using this phone number",
                )}
              />
            )}
          </ScrollView>

          {/* Clear Search Button - sits in normal flow below the list, above the tab bar. Nothing renders behind it. */}
          {isSearching && (
            <View
              className="bg-white px-6 pt-3"
              style={{ paddingBottom: clearSearchPaddingBottom }}
            >
              <TouchableOpacity
                onPress={handleClearSearch}
                style={{
                  backgroundColor: "#000000",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                }}
                className="bg-black px-8 py-3 rounded-full w-full items-center justify-center"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="close"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white text-base font-semibold">
                    {t("ReadytoPickupOrders.Clear Search")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const formatDateYMD = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid date";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const { t } = useTranslation();

  const formatPhoneNumber = (code: string, number: string) => {
    return `${code} ${number}`;
  };

  const phone1 = formatPhoneNumber(order.phoneCode, order.phoneNumber);
  const phone2 =
    order.phoneCode2 && order.phoneNumber2
      ? formatPhoneNumber(order.phoneCode2, order.phoneNumber2)
      : null;
  const phoneDisplay = phone2 ? `${phone1}, ${phone2}` : phone1;

  const scheduledDate = formatDateYMD(order.sheduleDate);
  const scheduledDisplay = `${scheduledDate} (${order.sheduleTime})`;

  const readyDate = new Date(order.packTime);
  const readyMonth = String(readyDate.getMonth() + 1).padStart(2, "0");
  const readyDay = String(readyDate.getDate()).padStart(2, "0");
  const readyTimeDisplay = `At ${readyDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} on ${readyDate.getFullYear()}/${readyMonth}/${readyDay}`;

  const formatCurrency = (amount: number | undefined | null): string => {
    const numericAmount = Number(amount) || 0;

    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const remaining = order.remainingAmount ?? order.fullTotal;
  const shouldShowAmount = !(order.isPaid && order.paymentMethod === "Card");
  const cashAmount = formatCurrency(remaining);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: "#F7F7F7",
        shadowColor: "#000000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View className="flex-row mb-2">
        <Text className="text-base font-semibold">
          {t("ReadytoPickupOrders.Order ID")} :
        </Text>
        <Text className="text-base font-semibold ml-1">{order.invNo}</Text>
      </View>

      <View className="flex-row mb-2 items-center">
        <FontAwesome5
          name="phone-alt"
          size={16}
          color="black"
          style={{ marginRight: 8 }}
        />
        <Text className="text-sm text-[#565559]">
          {t("ReadytoPickupOrders.Phone")} :{" "}
        </Text>
        <Text className="text-sm font-semibold ml-1">{phoneDisplay}</Text>
      </View>

      <View className="flex-row items-center mb-2">
        {shouldShowAmount ? (
          <>
            <FontAwesome5
              name="coins"
              size={16}
              color="black"
              style={{ marginRight: 8 }}
            />
            <Text className="text-sm text-[#565559]">
              {t("ViewPickupOrders.Cash")} :{" "}
            </Text>
            <Text className="text-sm font-semibold ml-1">
              {t("ViewPickupOrders.Rs")}. {cashAmount}
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="black"
              style={{ marginRight: 8 }}
            />
            <Text className="text-sm font-semibold text-[#565559]">
              {" "}
              {t("ViewPickupOrders.Already Paid") || "Already Paid!"}
            </Text>
          </>
        )}
      </View>

      <View className="flex-row mb-2 items-center">
        <FontAwesome5
          name="clock"
          size={16}
          color="black"
          style={{ marginRight: 8 }}
        />
        <Text className="text-sm text-[#565559]">
          {t("ReadytoPickupOrders.Scheduled")} :{" "}
        </Text>
        <Text className="text-sm font-semibold ml-1">{scheduledDisplay}</Text>
      </View>

      <View className="flex-row items-center mb-2">
        <FontAwesome6
          name="clock-rotate-left"
          size={16}
          color="black"
          style={{ marginRight: 8 }}
        />
        <Text className="text-sm text-[#565559]">
          {t("ReadytoPickupOrders.Ready Time")} :{" "}
        </Text>
        <Text className="text-sm font-semibold ml-1">{readyTimeDisplay}</Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <View className="flex-1 justify-center items-center mt-[-15%] px-4 pb-24">
      <View className="relative">
        <Image
          source={require("../../../../assets/images/collection-common/notfound.webp")}
          className="h-[200px] w-[200px] rounded-lg"
          resizeMode="contain"
        />
      </View>

      <Text className="text-sm text-[#828282] text-center mb-8 mt-4 italic">
        - {message} -
      </Text>
    </View>
  );
};

export default ReadytoPickupOrders;
