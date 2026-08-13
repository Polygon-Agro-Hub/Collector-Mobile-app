import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  BackHandler,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { scale } from "react-native-size-matters";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RootStackParamList } from "@/types/types";
import { environment } from "@/environment/environment";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { Entypo } from "@expo/vector-icons";
import { Modal } from "react-native";

type TransactionListNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TransactionList"
>;
type TranscationListRouteProp = RouteProp<RootStackParamList, "OfficerSummary">;

interface TransactionListProps {
  navigation: TransactionListNavigationProp;
  route: TranscationListRouteProp;
}

interface Transaction {
  registeredFarmerId: number;
  userId: number;
  phoneNumber: string;
  address: string;
  bankAddress: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  branchName: string | null;
  id: number;
  firstName: string;
  lastName: string;
  NICnumber: string;
  totalAmount: number;
}

const TransactionList: React.FC<TransactionListProps> = ({
  route,
  navigation,
}) => {
  const {
    officerId,
    collectionOfficerId,
    phoneNumber1,
    phoneNumber2,
    officerName,
  } = route.params;

  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useFocusEffect(
    React.useCallback(() => {
      setSelectedDate(new Date());
      setShowDatePicker(false);
      return () => {};
    }, []),
  );

  const fetchTransactions = async (date: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/transaction-list?collectionOfficerId=${collectionOfficerId}&date=${date}`,
      );
      const data = await response.json();

      if (response.ok) {
        const formattedData = data.map((transaction: any) => ({
          id: transaction.registeredFarmerId ?? Math.random(),
          registeredFarmerId: transaction.registeredFarmerId || 0,
          userId: transaction.userId || 0,
          firstName: transaction.firstName || "",
          lastName: transaction.lastName || "",
          phoneNumber: transaction.phoneNumber || "",
          address: transaction.address || "",
          NICnumber: transaction.NICnumber || "",
          totalAmount: parseFloat(transaction.totalAmount) || 0,
          bankAddress: transaction.bankAddress || null,
          accountNumber: transaction.accountNumber || null,
          accountHolderName: transaction.accountHolderName || null,
          bankName: transaction.bankName || null,
          branchName: transaction.branchName || null,
        }));

        setTransactions(formattedData);
        setFilteredTransactions(formattedData);
      } else {
        console.error("Error fetching transactions:", data.error);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");

    if (!normalizedQuery) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter((transaction: any) => {
      const firstName = (transaction.firstName || "").trim().toLowerCase();
      const lastName = (transaction.lastName || "").trim().toLowerCase();
      const nicNumber = (transaction.NICnumber || "")
        .replace(/[^\w\s]/gi, "")
        .toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");

      return (
        firstName.includes(normalizedQuery) ||
        lastName.includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        nicNumber.includes(normalizedQuery)
      );
    });

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    fetchTransactions(getCurrentDate());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      fetchTransactions(formattedDate);
    }
  }, [selectedDate]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions(getCurrentDate());
      setSearchQuery("");
    }, []),
  );

  const handleBackPress = useCallback(() => {
    navigation.navigate("OfficerSummary" as any, {
      collectionOfficerId,
      officerId,
      phoneNumber1,
      phoneNumber2,
      officerName,
    });
    return true;
  }, [
    navigation,
    collectionOfficerId,
    officerId,
    phoneNumber1,
    phoneNumber2,
    officerName,
  ]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );
      return () => subscription.remove();
    }, [handleBackPress]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#980775" }}>
      <View
        style={{
          backgroundColor: "#980775",
          paddingHorizontal: 16,
          paddingBottom: 40,
          marginTop: 10,
        }}
      >
        <View
          style={{
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {/* Back Button - absolute left */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("OfficerSummary" as any, {
                collectionOfficerId,
                officerId,
                phoneNumber1,
                phoneNumber2,
                officerName,
              })
            }
            style={{
              position: "absolute",
              left: 0,
              backgroundColor: "#FFFFFF1A",
              borderRadius: 999,
              padding: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Entypo name="chevron-left" size={25} color="white" />
          </TouchableOpacity>

          {/* Centered EMP ID + Selected Date */}
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              EMP {t("ManagerTransactions.ID")} : {officerId}
            </Text>
            <Text style={{ color: "white", fontSize: 16, marginTop: 4 }}>
              {t("ManagerTransactions.Selected Date")}{" "}
              {selectedDate
                ? selectedDate.toISOString().split("T")[0].replace(/-/g, "/")
                : "N/A"}
            </Text>
          </View>

          {/* Calendar Icon - absolute right */}
          <TouchableOpacity
            onPress={() => setShowDatePicker((prev) => !prev)}
            style={{ position: "absolute", right: 0 }}
          >
            <Ionicons name="calendar-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: "white",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          marginTop: -20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "white",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#444444",
            marginHorizontal: 16,
            marginTop: -22,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
            height: 50,
          }}
          className="items-center justify-center"
        >
          <TextInput
            style={{ flex: 1, fontSize: 16, fontStyle: "italic", color: "#000000" }}
            placeholder={t("ManagerTransactions.Search")}
            placeholderTextColor="grey"
            value={searchQuery}
            onChangeText={(text) => {
              const cleanedText = text.replace(/[^a-zA-Z0-9\s]/g, "");
              const finalText = cleanedText.replace(/^\s+/, "");
              handleSearch(finalText);
            }}
            className="h-[50px]"
          />
          <TouchableOpacity onPress={() => handleSearch(searchQuery)}>
            <Image
              source={require("../../../../assets/images/collection-manager/search-transaction.webp")}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}

        {showDatePicker && Platform.OS === "ios" && (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            >
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity activeOpacity={1}>
                  <View
                    style={{
                      backgroundColor: "#ffffff", // solid, not translucent
                      borderRadius: 12,
                      padding: 8,
                      // force a real opaque surface behind the blur
                      overflow: "hidden",
                    }}
                  >
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="inline"
                      themeVariant="light"
                      style={{
                        width: 320,
                        height: 260,
                        backgroundColor: "#ffffff",
                      }}
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setSelectedDate(date);
                      }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "black",
              marginBottom: 16,
            }}
          >
            {t("ManagerTransactions.Transaction List")}{" "}
            <Text style={{ fontWeight: "normal" }}>
              ({t("ManagerTransactions.All")} {filteredTransactions.length})
            </Text>
          </Text>
        </View>

        <View style={{ flex: 1, marginBottom: 8 }}>
          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <LottieView
                source={require("../../../../assets/lottie/loading.json")}
                autoPlay
                loop
                style={{ width: 150, height: 150 }}
              />
              <Text style={{ color: "#6b7280", marginTop: 16 }}>
                {t("ManagerTransactions.Loading")}
              </Text>
            </View>
          ) : (
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredTransactions}
              keyExtractor={(item) =>
                item.id ? item.id.toString() : Math.random().toString()
              }
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 16,
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 35,
                    backgroundColor: "#f3f4f6",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                  onPress={() => {
                    navigation.navigate("TransactionReport" as any, {
                      registeredFarmerId: item.registeredFarmerId,
                      userId: item.userId,
                      firstName: item.firstName,
                      lastName: item.lastName,
                      phoneNumber: item.phoneNumber,
                      address: item.address,
                      NICnumber: item.NICnumber,
                      totalAmount: item.totalAmount,
                      bankAddress: item.bankAddress,
                      accountNumber: item.accountNumber,
                      accountHolderName: item.accountHolderName,
                      bankName: item.bankName,
                      branchName: item.branchName,
                      selectedDate: selectedDate.toISOString().split("T")[0],
                      selectedTime: selectedDate
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                        .toUpperCase(),
                    });
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      overflow: "hidden",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                      backgroundColor: "white",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Image
                      source={require("../../../../assets/images/collection-manager/avetar.webp")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>
                      {t("ManagerTransactions.NIC")} {item.NICnumber}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>
                      {t("ManagerTransactions.TotalRs")}
                      {item.totalAmount
                        ? item.totalAmount.toLocaleString()
                        : "N/A"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={scale(20)}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: "40%" }}>
                  <LottieView
                    source={require("../../../../assets/lottie/no-data.json")}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text
                    style={{ fontSize: 14, marginTop: -20, color: "#6b7280" }}
                  >
                    {t("ManagerTransactions.Notransactions")}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default TransactionList;
