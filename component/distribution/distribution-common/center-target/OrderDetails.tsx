import store from "@/services/reducxStore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import axios from "axios";
import environment from "@/environment/environment";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  formatTimeSlot,
  formatOrderCategory,
  formatOrderType,
  formatRowTitle,
  formatOrderTitle,
} from "@/constants/packing/time-slots";

interface PackagedItem {
  id: number;
  name: string;
  weight: string;
  packedByEmpId: string;
  packedTime: string;
  image: string;
}

interface ItemPackageGroup {
  id: number;
  title: string;
  count: number;
  type: "package" | "alacarte";
  items: PackagedItem[];
}

interface OrderDetailsData {
  orderId: number;
  orderNumber: string;
  formattedOrderNumber: string;
  timeSlotLabel: string;
  category: string;
  statusLabel: string;
  qrPrintedByEmpId: string;
  qrPrintedTime: string;
  qrHasNotification?: boolean;
  packageGroups: ItemPackageGroup[];
  qcDoneByEmpId: string;
  qcDoneTime: string;
  qcBadgeType?: "P" | "N";
}

const formatWeight = (weightStr: string | number) => {
  if (!weightStr) return "";
  const str = String(weightStr).trim();
  const match = str.match(/^([\d\.]+)(\s*\w*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2];
    return `${num}${unit}`;
  }
  return str;
};

export default function OrderDetails({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { t } = useTranslation();
  const params = route.params || {};
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<OrderDetailsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleBack = () => {
    navigation.navigate("DistributionCenterTarget");
  };

  useEffect(() => {
    fetchOrderDetails();

    const onBackPress = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, []);

  const buildMinimalDetails = (p: any): OrderDetailsData => ({
    orderId: Number(p.orderId) || 0,
    orderNumber: p.orderNumber || "",
    formattedOrderNumber: p.formattedOrderNumber || p.orderNumber || "",
    timeSlotLabel: p.timeSlotLabel || "",
    category: p.category || "",
    statusLabel: p.statusLabel || "",
    qrPrintedByEmpId: p.qrPrintedByEmpId || "-",
    qrPrintedTime: p.qrPrintedTime || "-",
    packageGroups: p.packageGroups || [],
    qcDoneByEmpId: p.qcDoneByEmpId || "-",
    qcDoneTime: p.qcDoneTime || "-",
  });

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
      const orderId = params.orderId;

      if (params.isTestData || !token || !orderId) {
        setDetails(buildMinimalDetails(params));
        setLoading(false);
        return;
      }

      const response = await axios
        .get(`${environment.API_BASE_URL}api/packing/order-details/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => null);

      if (response && response.data && response.data.success && response.data.data) {
        setDetails(response.data.data);
      } else {
        setDetails(buildMinimalDetails(params));
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setDetails(buildMinimalDetails(params));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("DistributionCenterTarget.Order Details", "Order Details")}
        navigation={navigation}
        onBackPress={handleBack}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#980775" />
          <Text className="text-[#54617D] text-sm font-semibold mt-3">
            {t("DistributionCenterTarget.Loading order details...", "Loading order details...")}
          </Text>
        </View>
      ) : details ? (
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1 px-6 pt-4"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          >
            <View className="w-full max-w-[600px] mx-auto">
              {/* Header Summary Card */}
              {(() => {
                const rowName = (details as any)?.rowName || params.rowName || "Row 1";
                let rawStatus = (details as any)?.status || details.statusLabel || params.statusLabel || "Out";

                let rName = rowName;
                let sName = rawStatus;

                const matchRow = rawStatus.match(/^\(([^)]+)\)\s*(.*)$/);
                if (matchRow) {
                  rName = matchRow[1];
                  sName = matchRow[2];
                }

                const sTranslated =
                  sName.toLowerCase().includes("out") ||
                  sName.includes("පිටත්") ||
                  sName.includes("නිම") ||
                  sName.includes("முடி") ||
                  sName.toLowerCase().includes("completed")
                    ? t("DistributionCenterTarget.OutStatus", "නිම කරන ලද")
                    : sName.toLowerCase().includes("open") || sName.includes("සකස්") || sName.includes("திற")
                    ? t("DistributionCenterTarget.Opened", "සකස් කරමින්")
                    : sName.toLowerCase().includes("pend") || sName.includes("අසම්පූර්ණ") || sName.includes("நிலு")
                    ? t("DistributionCenterTarget.Pending", "අසම්පූර්ණයි")
                    : sName;

                const statusDisplay = `(${formatRowTitle(rName, t)}) ${sTranslated}`;

                return (
                  <View className="bg-white rounded-2xl p-4 mb-5 border border-[#000000] items-center shadow-sm">
                    <Text className="font-extrabold text-slate-950 text-base text-center">
                      {formatOrderTitle(
                        details.formattedOrderNumber || details.orderNumber,
                        (details as any)?.type || params.type,
                        t
                      )}
                    </Text>
                    <Text className="font-bold text-slate-900 text-sm mt-0.5 text-center">
                      {formatTimeSlot(details.timeSlotLabel || params.timeSlotLabel, t)}
                    </Text>
                    <Text className="text-xs text-[#54617D] mt-0.5 font-medium text-center">
                      {formatOrderCategory(details.category || params.category, t)}
                    </Text>
                    <Text className="text-xs font-extrabold mt-0.5 text-[#980775] text-center">
                      {statusDisplay}
                    </Text>
                  </View>
                );
              })()}

              {/* Step 1: QR Printed By Card */}
              <View className="bg-white rounded-2xl p-4 mb-6 border border-[#F5C400] flex-row justify-between items-center shadow-sm">
                <View>
                  <Text className="text-[#54617D] text-xs font-semibold">
                    {t("DistributionCenterTarget.QR Printed By", "QR Printed By")}
                  </Text>
                  <Text className="text-slate-950 font-extrabold text-sm mt-0.5">
                    {details.qrPrintedByEmpId}
                  </Text>
                </View>
                <Text className="text-[#54617D] text-xs font-semibold">
                  {formatTimeSlot(details.qrPrintedTime, t)}
                </Text>
              </View>

              {/* Step 2: Package Groups & Item List */}
              {details.packageGroups.map((group) => {
                const isAlacarte =
                  group.type === "alacarte" ||
                  (group.title && /alacarte|a\s*la\s*carte/i.test(group.title));
                const groupTitleColor = isAlacarte
                  ? "text-[#AC7F5E]"
                  : "text-[#980775]";

                let translatedGroupTitle = group.title || "";
                if (isAlacarte) {
                  translatedGroupTitle = translatedGroupTitle.replace(
                    /A\s*La\s*Carte|Alacarte/gi,
                    t("DistributionCenterTarget.ALaCarte", "A La Carte")
                  );
                } else {
                  translatedGroupTitle = translatedGroupTitle.replace(
                    /Package/gi,
                    t("DistributionCenterTarget.Package", "පැකේජය")
                  );
                }

                return (
                  <View key={String(group.id)} className="mb-6">
                    <Text
                      className={`font-extrabold text-sm mb-2.5 ${groupTitleColor}`}
                    >
                      {translatedGroupTitle}
                    </Text>

                    <View className="gap-2.5">
                      {group.items.map((item, idx) => (
                        <View
                          key={`${group.id}_${item.id}_${idx}`}
                          className="bg-white rounded-2xl p-3 border border-slate-200 flex-row items-center justify-between shadow-sm"
                        >
                          <View className="flex-row items-center flex-1 pr-2">
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                className="w-14 h-14 rounded-xl mr-3"
                                resizeMode="contain"
                              />
                            ) : (
                              <View
                                className="w-14 h-14 rounded-xl mr-3 items-center justify-center"
                                style={{ backgroundColor: isAlacarte ? "#FDF3E7" : "#F9EEF6" }}
                              >
                                <Text
                                  className="font-extrabold text-sm"
                                  style={{ color: isAlacarte ? "#AC7F5E" : "#980775" }}
                                >
                                  {(item.name || "?")[0].toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View className="flex-1">
                              <Text className="text-slate-900 font-bold text-xs" numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text className="text-[#54617D] text-[11px] font-medium mt-0.5">
                                {formatWeight(item.weight)}
                              </Text>
                              <Text className="text-[#54617D] text-[11px] font-semibold mt-0.5">
                                {t("DistributionCenterTarget.Packed By", "Packed By")}
                              </Text>
                              <Text className="text-slate-950 font-extrabold text-xs mt-0.5">
                                {item.packedByEmpId}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-[#54617D] text-xs font-medium">
                            {formatTimeSlot(item.packedTime, t)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Step 3: QC Done By Card */}
              <View className="bg-white rounded-2xl p-4 mb-6 border border-[#F5C400] flex-row justify-between items-center shadow-sm">
                <View>
                  <Text className="text-[#54617D] text-xs font-semibold">
                    {t("DistributionCenterTarget.QC Done By", "QC Done By")}
                  </Text>
                  <Text className="text-slate-950 font-extrabold text-sm mt-0.5">
                    {details.qcDoneByEmpId}
                  </Text>
                </View>
                <Text className="text-[#54617D] text-xs font-semibold">
                  {formatTimeSlot(details.qcDoneTime, t)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Fixed Close Button */}
          <View className="px-6 pt-3 bg-white" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="w-full max-w-[600px] mx-auto">
              <TouchableOpacity
                onPress={handleBack}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">
                  {t("DistributionCenterTarget.Close", "Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
